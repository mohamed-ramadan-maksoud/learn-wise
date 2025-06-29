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

  // RAG: Generate answer using retrieved context
  fastify.post('/rag-answer', {
    schema: {
      description: 'Generate answer using RAG (Retrieval-Augmented Generation)',
      tags: ['AI'],
      body: aiSchemas.ragRequest,
      response: {
        200: aiSchemas.ragResponse,
        400: aiSchemas.errorResponse
      }
    }
  }, async (request, reply) => {
    try {
      const { query, searchTypes = ['questions', 'tutorials'], maxResults = 5, structured = false } = request.body;
      const result = await aiService.generateRAGAnswer(query, searchTypes, maxResults, structured);
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
}

module.exports = aiRoutes;
