/**
 * AI Schemas
 * Contains all OpenAPI/Fastify schema definitions for AI routes
 */

const aiSchemas = {
  // Embedding request schema
  embeddingRequest: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', description: 'Text to generate embedding for' }
    }
  },

  // Embedding response schema
  embeddingResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      embedding: { type: 'array', items: { type: 'number' } },
      dimension: { type: 'number' }
    }
  },

  // RAG request schema
  ragRequest: {
    type: 'object',
    required: ['query'],
    properties: {
      query: { type: 'string', description: 'Query for RAG answer generation' },
      searchTypes: {
        type: 'array',
        items: { type: 'string', enum: ['questions', 'tutorials', 'exams'] },
        default: ['questions', 'tutorials']
      },
      maxResults: { type: 'number', default: 5, minimum: 1, maximum: 20 },
      structured: { type: 'boolean', default: false }
    }
  },

  // RAG response schema
  ragResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      query_answer: { type: 'string' },
      question_exam_answer: { type: 'string' },
      generated_similar_questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            subject: { type: 'string' },
            difficulty: { type: 'string' },
            topic: { type: 'string' },
            choices: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      answer: { type: 'string' },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            similarity: { type: 'number' },
            choices: { type: 'array', items: { type: 'string' } },
            meta_data: { type: 'object', additionalProperties: true },
            tags: { type: 'array', items: { type: 'string' } },
            grade: { type: 'string' },
            examMeta: {
              type: 'object',
              additionalProperties: true,
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                subject: { type: 'string' },
                year: { type: 'number' },
                grade: { type: 'string' },
                term: { type: 'string' },
                exam_type: { type: ['string', 'null'] }
              }
            }
          },
          additionalProperties: true
        }
      },
      query: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  // Vector search request schema
  vectorSearchRequest: {
    type: 'object',
    required: ['query'],
    properties: {
      query: { type: 'string', description: 'Query for vector search' },
      searchTypes: {
        type: 'array',
        items: { type: 'string', enum: ['questions', 'tutorials', 'exams'] },
        default: ['questions', 'tutorials']
      },
      maxResults: { type: 'number', default: 5, minimum: 1, maximum: 20 }
    }
  },

  // Vector search response schema
  vectorSearchResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            similarity: { type: 'number' },
            choices: { type: 'array', items: { type: 'string' } },
            meta_data: { type: 'object' },
            tags: { type: 'array', items: { type: 'string' } },
            grade: { type: 'string' },
            examMeta: { type: 'object' }
          }
        }
      },
      query: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' }
    }
  },

  // Error response schema
  errorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      message: { type: 'string' }
    }
  }
};

module.exports = aiSchemas;