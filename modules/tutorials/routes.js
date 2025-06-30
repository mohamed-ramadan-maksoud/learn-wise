const tutorialSchemas = require('../../schemas/tutorials');
const { generateEmbedding, vectorSearch } = require('../../utils/ai');
const { v4: uuidv4 } = require('uuid');
const TutorialService = require('./tutorial.service');
const TutorialHelper = require('./tutorial.helper');

async function tutorialRoutes(fastify, options) {
  const service = new TutorialService(fastify.supabase);

  // Create a new tutorial
  fastify.post('/', {
    schema: {
      description: 'Create a new tutorial',
      tags: ['Tutorials'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title', 'content', 'subject'],
        properties: tutorialSchemas.tutorial.properties
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            tutorial: tutorialSchemas.tutorialResponse
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate, fastify.authorize(['teacher', 'admin'])]
  }, async (request, reply) => {
    try {
      const tutorialData = request.body;
      const userId = request.user.id;

      // Generate embedding for the tutorial
      const tutorialText = `${tutorialData.title} ${tutorialData.content}`;
      const embedding = await generateEmbedding(tutorialText);

      // Create tutorial
      const { data: tutorial, error } = await fastify.supabase
        .from('tutorials')
        .insert([{
          id: uuidv4(),
          title: tutorialData.title,
          content: tutorialData.content,
          subject: tutorialData.subject,
          tags: tutorialData.tags || [],
          difficulty: tutorialData.difficulty || 'beginner',
          grade: tutorialData.grade,
          type: tutorialData.type || 'text',
          media_url: tutorialData.mediaUrl,
          duration: tutorialData.duration,
          prerequisites: tutorialData.prerequisites || [],
          author_id: userId,
          embedding: embedding
        }])
        .select(`
          *,
          users!tutorials_author_id_fkey(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Format response
      const formattedTutorial = {
        id: tutorial.id,
        title: tutorial.title,
        content: tutorial.content,
        subject: tutorial.subject,
        tags: tutorial.tags,
        difficulty: tutorial.difficulty,
        grade: tutorial.grade,
        type: tutorial.type,
        mediaUrl: tutorial.media_url,
        duration: tutorial.duration,
        prerequisites: tutorial.prerequisites,
        authorId: tutorial.author_id,
        authorName: tutorial.users.full_name,
        viewCount: tutorial.view_count || 0,
        rating: tutorial.rating || 0,
        createdAt: tutorial.created_at,
        updatedAt: tutorial.updated_at
      };

      reply.code(201).send({
        success: true,
        message: 'Tutorial created successfully',
        tutorial: formattedTutorial
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get all tutorials with pagination and filters
  fastify.get('/', {
    schema: {
      description: 'Get all tutorials with pagination and filters',
      tags: ['Tutorials'],
      querystring: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          grade: { type: 'string' },
          type: { type: 'string', enum: ['text', 'video', 'audio'] },
          limit: { type: 'number', default: 10 },
          offset: { type: 'number', default: 0 },
          sortBy: { type: 'string', enum: ['created_at', 'view_count', 'rating'], default: 'created_at' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tutorials: {
              type: 'array',
              items: tutorialSchemas.tutorialResponse
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { subject, difficulty, grade, type, limit = 10, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = request.query;

      let query = fastify.supabase
        .from('tutorials')
        .select('*', { count: 'exact' });

      // Apply filters
      if (subject) query = query.eq('subject', subject);
      if (difficulty) query = query.eq('difficulty', difficulty);
      if (grade) query = query.eq('grade', grade);
      if (type) query = query.eq('type', type);

      // Apply sorting and pagination
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data: tutorials, error, count } = await query;

      if (error) {
        throw error;
      }

      // Get author names
      const authorIds = [...new Set(tutorials.map(t => t.author_id))];
      const { data: authors } = await fastify.supabase
        .from('users')
        .select('id, full_name')
        .in('id', authorIds);

      const authorMap = authors.reduce((map, author) => {
        map[author.id] = author.full_name;
        return map;
      }, {});

      // Format response
      const formattedTutorials = tutorials.map(t => ({
        id: t.id,
        title: t.title,
        content: t.content,
        subject: t.subject,
        tags: t.tags,
        difficulty: t.difficulty,
        grade: t.grade,
        type: t.type,
        mediaUrl: t.media_url,
        duration: t.duration,
        prerequisites: t.prerequisites,
        authorId: t.author_id,
        authorName: authorMap[t.author_id] || 'Unknown',
        viewCount: t.view_count || 0,
        rating: t.rating || 0,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      }));

      reply.send({
        success: true,
        tutorials: formattedTutorials,
        total: count,
        limit,
        offset
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get tutorial by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get tutorial by ID',
      tags: ['Tutorials'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tutorial: tutorialSchemas.tutorialResponse
          }
        },
        404: {
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
      const { id } = request.params;

      // Get tutorial with author info
      const { data: tutorial, error: tutorialError } = await fastify.supabase
        .from('tutorials')
        .select(`
          *,
          users!tutorials_author_id_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (tutorialError || !tutorial) {
        return reply.code(404).send({
          success: false,
          message: 'Tutorial not found'
        });
      }

      // Increment view count
      await fastify.supabase
        .from('tutorials')
        .update({ view_count: (tutorial.view_count || 0) + 1 })
        .eq('id', id);

      // Format tutorial
      const formattedTutorial = {
        id: tutorial.id,
        title: tutorial.title,
        content: tutorial.content,
        subject: tutorial.subject,
        tags: tutorial.tags,
        difficulty: tutorial.difficulty,
        grade: tutorial.grade,
        type: tutorial.type,
        mediaUrl: tutorial.media_url,
        duration: tutorial.duration,
        prerequisites: tutorial.prerequisites,
        authorId: tutorial.author_id,
        authorName: tutorial.users.full_name,
        viewCount: (tutorial.view_count || 0) + 1,
        rating: tutorial.rating || 0,
        createdAt: tutorial.created_at,
        updatedAt: tutorial.updated_at
      };

      reply.send({
        success: true,
        tutorial: formattedTutorial
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Vector search for tutorials
  fastify.post('/search', {
    schema: {
      description: 'Search tutorials using vector similarity',
      tags: ['Tutorials'],
      body: {
        type: 'object',
        required: ['query'],
        properties: tutorialSchemas.tutorialSearch.properties
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tutorials: {
              type: 'array',
              items: tutorialSchemas.tutorialResponse
            },
            query: { type: 'string' },
            totalResults: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { query, limit = 5 } = request.body;

      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);

      // Perform vector search
      const similarTutorials = await vectorSearch(queryEmbedding, 'tutorials', limit);

      // Get full tutorial details for the similar tutorials
      if (similarTutorials.length > 0) {
        const tutorialIds = similarTutorials.map(t => t.id);
        
        const { data: tutorials, error } = await fastify.supabase
          .from('tutorials')
          .select(`
            *,
            users!tutorials_author_id_fkey(full_name)
          `)
          .in('id', tutorialIds);

        if (error) {
          throw error;
        }

        // Format response
        const formattedTutorials = tutorials.map(t => ({
          id: t.id,
          title: t.title,
          content: t.content,
          subject: t.subject,
          tags: t.tags,
          difficulty: t.difficulty,
          grade: t.grade,
          type: t.type,
          mediaUrl: t.media_url,
          duration: t.duration,
          prerequisites: t.prerequisites,
          authorId: t.author_id,
          authorName: t.users.full_name,
          viewCount: t.view_count || 0,
          rating: t.rating || 0,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));

        reply.send({
          success: true,
          tutorials: formattedTutorials,
          query,
          totalResults: tutorials.length
        });
      } else {
        reply.send({
          success: true,
          tutorials: [],
          query,
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

  // Rate tutorial
  fastify.post('/:id/rate', {
    schema: {
      description: 'Rate a tutorial',
      tags: ['Tutorials'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['rating'],
        properties: tutorialSchemas.tutorialRating.properties
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const { id: tutorialId } = request.params;
      const { rating, review } = request.body;
      const userId = request.user.id;

      // Check if tutorial exists
      const { data: tutorial, error: tutorialError } = await fastify.supabase
        .from('tutorials')
        .select('id, rating')
        .eq('id', tutorialId)
        .single();

      if (tutorialError || !tutorial) {
        return reply.code(404).send({
          success: false,
          message: 'Tutorial not found'
        });
      }

      // For simplicity, we'll just update the average rating
      // In a real application, you might want to store individual ratings
      const currentRating = tutorial.rating || 0;
      const newRating = (currentRating + rating) / 2;

      const { error } = await fastify.supabase
        .from('tutorials')
        .update({ rating: newRating })
        .eq('id', tutorialId);

      if (error) {
        throw error;
      }

      reply.send({
        success: true,
        message: 'Tutorial rated successfully'
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Update tutorial
  fastify.put('/:id', {
    schema: {
      description: 'Update a tutorial',
      tags: ['Tutorials'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: tutorialSchemas.tutorial.properties
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            tutorial: tutorialSchemas.tutorialResponse
          }
        }
      }
    },
    preHandler: [fastify.authenticate, fastify.authorize(['teacher', 'admin'])]
  }, async (request, reply) => {
    try {
      const { id: tutorialId } = request.params;
      const updateData = request.body;
      const userId = request.user.id;

      // Check if tutorial exists and user owns it
      const { data: tutorial, error: tutorialError } = await fastify.supabase
        .from('tutorials')
        .select('*')
        .eq('id', tutorialId)
        .eq('author_id', userId)
        .single();

      if (tutorialError || !tutorial) {
        return reply.code(404).send({
          success: false,
          message: 'Tutorial not found or you do not have permission to edit it'
        });
      }

      // Generate new embedding if content changed
      let embedding = tutorial.embedding;
      if (updateData.title || updateData.content) {
        const tutorialText = `${updateData.title || tutorial.title} ${updateData.content || tutorial.content}`;
        embedding = await generateEmbedding(tutorialText);
      }

      // Update tutorial
      const { data: updatedTutorial, error } = await fastify.supabase
        .from('tutorials')
        .update({
          ...updateData,
          embedding,
          updated_at: new Date().toISOString()
        })
        .eq('id', tutorialId)
        .select(`
          *,
          users!tutorials_author_id_fkey(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Format response
      const formattedTutorial = {
        id: updatedTutorial.id,
        title: updatedTutorial.title,
        content: updatedTutorial.content,
        subject: updatedTutorial.subject,
        tags: updatedTutorial.tags,
        difficulty: updatedTutorial.difficulty,
        grade: updatedTutorial.grade,
        type: updatedTutorial.type,
        mediaUrl: updatedTutorial.media_url,
        duration: updatedTutorial.duration,
        prerequisites: updatedTutorial.prerequisites,
        authorId: updatedTutorial.author_id,
        authorName: updatedTutorial.users.full_name,
        viewCount: updatedTutorial.view_count || 0,
        rating: updatedTutorial.rating || 0,
        createdAt: updatedTutorial.created_at,
        updatedAt: updatedTutorial.updated_at
      };

      reply.send({
        success: true,
        message: 'Tutorial updated successfully',
        tutorial: formattedTutorial
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Upload/Upsert endpoint
  fastify.post('/upload', {
    schema: {
      description: 'Upload or update a tutorial with paragraph-level embeddings',
      tags: ['Tutorials'],
      body: {
        type: 'object',
        required: ['id', 'title', 'content', 'subject', 'author_id'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          subject: { type: 'string' },
          chapter: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          difficulty: { type: 'string' },
          type: { type: 'string' },
          media_url: { type: ['string', 'null'] },
          duration: { type: ['number', 'null'] },
          author_id: { type: 'string' }
        }
      },
      response: { 200: { type: 'object' } }
    }
  }, async (request, reply) => {
    const payload = request.body;
    // Always chunk content into paragraphs
    payload.paragraphs = TutorialHelper.chunkContentToParagraphs(payload.content);
    const results = await service.uploadTutorial(payload);
    reply.send({ success: true, results });
  });

  // RAG search endpoint
  fastify.post('/rag-search', {
    schema: {
      description: 'RAG search for tutorial paragraphs',
      tags: ['Tutorials'],
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Search query for tutorial content' },
          maxResults: { type: 'number', default: 5, description: 'Maximum number of results' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            query_answer: { type: 'string', description: 'AI-generated answer to the query' },
            summary_by_ai: { type: 'string', description: 'AI-generated summary of tutorial content' },
            generated_questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  subject: { type: 'string' },
                  difficulty: { type: 'string' },
                  topic: { type: 'string' },
                  choices: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            },
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  subject: { type: 'string' },
                  chapter: { type: 'string' },
                  paragraph_number: { type: 'number' },
                  content: { type: 'string' },
                  similarity: { type: 'number' }
                }
              }
            },
            query: { type: 'string' },
            timestamp: { type: 'string' }
          }
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
    const { query, maxResults = 5 } = request.body;
    const { data, error } = await service.ragSearch(query, maxResults);
    if (error) {
      reply.code(400).send({ success: false, message: error.message });
    } else {
      reply.send(data);
    }
  });
}

module.exports = tutorialRoutes;
