const aiSchemas = require('../../schemas/ai');
const { generateEmbedding, generateRAGAnswer, vectorSearch } = require('../../utils/ai');

async function aiRoutes(fastify, options) {
  // Generate embedding for text
  fastify.post('/embedding', {
    schema: {
      description: 'Generate embedding for text using OpenAI',
      tags: ['AI'],
      body: {
        type: 'object',
        required: ['text'],
        properties: aiSchemas.embeddingRequest.properties
      },
      response: {
        200: {
          type: 'object',
          properties: aiSchemas.embeddingResponse.properties
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { text } = request.body;

      const embedding = await generateEmbedding(text);

      reply.send({
        success: true,
        embedding,
        dimension: embedding.length
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // RAG: Generate answer using retrieved context
  fastify.post('/rag-answer', {
    schema: {
      description: 'Generate answer using RAG (Retrieval-Augmented Generation)',
      tags: ['AI'],
      body: {
        type: 'object',
        required: ['query'],
        properties: aiSchemas.ragRequest.properties
      },
      response: {
        200: {
          type: 'object',
          properties: aiSchemas.ragResponse.properties
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { query, searchTypes = ['questions', 'tutorials'], maxResults = 5 } = request.body;

      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      console.log('[RAG] Query:', query);
      console.log('[RAG] Query Embedding:', queryEmbedding);

      // Collect relevant content from different sources
      const allSources = [];

      for (const searchType of searchTypes) {
        try {
          let tableName;
          let typeLabel;

          switch (searchType) {
            case 'questions':
              tableName = 'questions';
              typeLabel = 'question';
              break;
            case 'tutorials':
              tableName = 'tutorials';
              typeLabel = 'tutorial';
              break;
            case 'exams':
              tableName = 'exam_papers';
              typeLabel = 'exam';
              break;
            default:
              continue;
          }

          // Perform vector search
          const similarItems = await vectorSearch(queryEmbedding, tableName, maxResults);
          console.log(`[RAG] Vector search for ${searchType} returned:`, similarItems);

          // Get full details for the similar items
          if (similarItems.length > 0) {
            const itemIds = similarItems.map(item => item.id);
            const { data: items, error } = await fastify.supabase
              .from(tableName)
              .select('*')
              .in('id', itemIds);

            if (!error && items) {
              let formattedItems;
              if (tableName === 'questions') {
                // Collect all unique exam_paper_ids
                const examPaperIds = [...new Set(items.map(q => q.exam_paper_id).filter(Boolean))];
                let examMetaMap = {};
                if (examPaperIds.length > 0) {
                  const { data: examPapers } = await fastify.supabase
                    .from('exam_papers')
                    .select('id, title, subject, year, grade, term, exam_type')
                    .in('id', examPaperIds);
                  examMetaMap = (examPapers || []).reduce((map, e) => {
                    map[e.id] = e;
                    return map;
                  }, {});
                }
                formattedItems = items.map(item => ({
                  id: item.id,
                  type: typeLabel,
                  title: item.title,
                  content: item.content || item.description || '',
                  tags: item.tags,
                  grade: item.grade,
                  choices: item.choices || [],
                  meta_data: item.meta_data || undefined,
                  similarity: similarItems.find(s => s.id === item.id)?.similarity || 0,
                  examMeta: item.exam_paper_id ? examMetaMap[item.exam_paper_id] : undefined
                }));
              } else {
                formattedItems = items.map(item => ({
                  id: item.id,
                  type: typeLabel,
                  title: item.title,
                  content: item.content || item.description || '',
                  similarity: similarItems.find(s => s.id === item.id)?.similarity || 0
                }));
              }
              allSources.push(...formattedItems);
            }
          }
        } catch (error) {
          console.error(`Error searching ${searchType}:`, error);
          // Continue with other search types
        }
      }

      // Sort all sources by similarity and take top results
      const topSources = allSources
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);

      console.log('[RAG] Top sources for answer:', topSources);

      // Generate RAG answer
      const answer = await generateRAGAnswer(query, topSources);

      reply.send({
        success: true,
        answer,
        sources: topSources,
        query,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Vector search across different content types
  fastify.post('/vector-search', {
    schema: {
      description: 'Perform vector similarity search across content',
      tags: ['AI'],
      body: {
        type: 'object',
        required: ['query', 'table'],
        properties: aiSchemas.vectorSearchRequest.properties
      },
      response: {
        200: {
          type: 'object',
          properties: aiSchemas.vectorSearchResponse.properties
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { query, table, limit = 5, threshold = 0.7 } = request.body;

      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);

      // Perform vector search
      const similarItems = await vectorSearch(queryEmbedding, table, limit);

      // Get full details for the similar items
      if (similarItems.length > 0) {
        const itemIds = similarItems.map(item => item.id);
        
        const { data: items, error } = await fastify.supabase
          .from(table)
          .select('*')
          .in('id', itemIds);

        if (error) {
          throw error;
        }

        // Format results
        const results = items.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content || item.description || '',
          similarity: similarItems.find(s => s.id === item.id)?.similarity || 0,
          metadata: {
            subject: item.subject,
            tags: item.tags,
            createdAt: item.created_at
          }
        }));

        reply.send({
          success: true,
          results,
          query,
          table,
          totalResults: results.length
        });
      } else {
        reply.send({
          success: true,
          results: [],
          query,
          table,
          totalResults: 0
        });
      }
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Multi-table vector search
  fastify.post('/multi-search', {
    schema: {
      description: 'Search across multiple content types simultaneously',
      tags: ['AI'],
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            minLength: 1,
            description: 'Search query'
          },
          tables: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['questions', 'tutorials', 'exam_papers']
            },
            default: ['questions', 'tutorials'],
            description: 'Tables to search in'
          },
          limitPerTable: {
            type: 'number',
            default: 3,
            minimum: 1,
            maximum: 10,
            description: 'Number of results per table'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            results: {
              type: 'object',
              properties: {
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      content: { type: 'string' },
                      similarity: { type: 'number' }
                    }
                  }
                },
                tutorials: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      content: { type: 'string' },
                      similarity: { type: 'number' }
                    }
                  }
                },
                exams: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      content: { type: 'string' },
                      similarity: { type: 'number' }
                    }
                  }
                }
              }
            },
            query: { type: 'string' },
            totalResults: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { query, tables = ['questions', 'tutorials'], limitPerTable = 3 } = request.body;

      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);

      const results = {
        questions: [],
        tutorials: [],
        exams: []
      };

      let totalResults = 0;

      // Search in each table
      for (const table of tables) {
        try {
          const similarItems = await vectorSearch(queryEmbedding, table, limitPerTable);

          if (similarItems.length > 0) {
            const itemIds = similarItems.map(item => item.id);
            
            const { data: items, error } = await fastify.supabase
              .from(table)
              .select('*')
              .in('id', itemIds);

            if (!error && items) {
              const formattedItems = items.map(item => ({
                id: item.id,
                title: item.title,
                content: item.content || item.description || '',
                similarity: similarItems.find(s => s.id === item.id)?.similarity || 0
              }));

              results[table] = formattedItems;
              totalResults += formattedItems.length;
            }
          }
        } catch (error) {
          console.error(`Error searching ${table}:`, error);
          // Continue with other tables
        }
      }

      reply.send({
        success: true,
        results,
        query,
        totalResults
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
}

module.exports = aiRoutes;