const aiSchemas = require('../../schemas/ai');
const AIService = require('./ai.service');
const AIHelper = require('./ai.helper');

async function aiRoutes(fastify) {
  // Initialize AI service with Supabase instance
  const aiService = new AIService(fastify.supabase);

  // Generate embedding for text
  fastify.post('/embedding', {
    schema: {
      description: 'Generate embedding for text using OpenAI',
      tags: ['AI'],
      body: aiSchemas.embeddingRequest,
      response: {
        200: aiSchemas.embeddingResponse,
        400: aiSchemas.errorResponse
      }
    }
  }, async (request, reply) => {
    try {
      const { text } = request.body;
      const result = await aiService.generateTextEmbedding(text);
      reply.send(result);
    } catch (error) {
      reply.code(400).send(AIHelper.buildErrorResponse(error.message));
    }
  });

  // Vector search across different content types
  fastify.post('/vector-search', {
    schema: {
      description: 'Perform vector search across different content types',
      tags: ['AI'],
      body: aiSchemas.vectorSearchRequest,
      response: {
        200: aiSchemas.vectorSearchResponse,
        400: aiSchemas.errorResponse
      }
    }
  }, async (request, reply) => {
    try {
      const { query, searchTypes = ['questions', 'tutorials'], maxResults = 5 } = request.body;
      const result = await aiService.performVectorSearch(query, searchTypes, maxResults);
      reply.send(result);
    } catch (error) {
      reply.code(400).send(AIHelper.buildErrorResponse(error.message));
    }
  });

  // Unified exam search endpoint (RAG or Fuzzy)
  fastify.post('/exam-search', {
    schema: {
      description: 'Exam search using AI RAG or Fuzzy search, optionally filterable by subject',
      tags: ['AI'],
      body: {
        type: 'object',
        required: ['query', 'searchType'],
        properties: {
          query: { type: 'string' },
          searchType: { type: 'string', enum: ['rag', 'fuzzy'] },
          subject: { type: 'string' },
          searchTypes: { type: 'array', items: { type: 'string' } },
          maxResults: { type: 'number' },
          structured: { type: 'boolean' }
        }
      },
      response: {
        200: aiSchemas.ragResponse,
        400: aiSchemas.errorResponse
      }
    }
  }, async (request, reply) => {
    const { query, searchType, subject, searchTypes, maxResults, structured } = request.body;
    try {
      if (searchType === 'rag') {
        const result = await aiService.generateRAGAnswerAndSave(query, searchTypes, maxResults, structured, subject);
        reply.send({
          success: true,
          query_answer: result.query_answer || '',
          question_exam_answer: result.question_exam_answer || '',
          generated_similar_questions: result.generated_similar_questions || [],
          answer: result.answer || '',
          sources: result.sources || [],
          query: result.query || query,
          timestamp: result.timestamp || new Date().toISOString()
        });
      } else if (searchType === 'fuzzy') {
        const results = await aiService.fuzzySearchQuestions(query, subject);
        // Separate AI-generated questions (with parent_exam_q_id) from originals
        const generated = (results || []).filter(q => q.parent_exam_q_id);
        const originals = (results || []).filter(q => !q.parent_exam_q_id);
        // Format sources to match schema
        const formattedSources = (originals || []).map(q => ({
          id: q.id || '',
          type: 'question',
          title: q.title || '',
          content: q.content || '',
          similarity: 1, // Fuzzy search does not have similarity, set to 1
          choices: q.choices || [],
          meta_data: q.meta_data || {},
          tags: q.tags || [],
          grade: q.grade || '',
          examMeta: q.examMeta || null
        }));
        // Format generated_similar_questions
        const formattedGenerated = (generated || []).map(q => ({
          id: q.id || '',
          question: q.content || '',
          subject: q.subject || '',
          difficulty: q.difficulty || '',
          topic: q.topic || '',
          choices: q.choices || []
        }));
        reply.send({
          success: true,
          query_answer: '',
          question_exam_answer: '',
          generated_similar_questions: formattedGenerated,
          answer: '',
          sources: formattedSources,
          query,
          timestamp: new Date().toISOString()
        });
      } else {
        reply.code(400).send(AIHelper.buildErrorResponse('Invalid searchType.'));
      }
    } catch (error) {
      reply.code(400).send(AIHelper.buildErrorResponse(error.message));
    }
  });
}

module.exports = aiRoutes;
