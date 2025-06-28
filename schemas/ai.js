const aiSchemas = {
  embeddingRequest: {
    type: 'object',
    required: ['text'],
    properties: {
      text: {
        type: 'string',
        minLength: 1,
        description: 'Text to generate embedding for'
      }
    }
  },
  embeddingResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      embedding: {
        type: 'array',
        items: { type: 'number' },
        description: 'Generated embedding vector'
      },
      dimension: { type: 'number' }
    }
  },
  ragRequest: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'User question'
      },
      searchTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['questions', 'tutorials', 'exams']
        },
        default: ['questions', 'tutorials'],
        description: 'Types of content to search in'
      },
      maxResults: {
        type: 'number',
        default: 5,
        minimum: 1,
        maximum: 10,
        description: 'Maximum number of results to retrieve'
      }
    }
  },
  ragResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      answer: {
        type: 'string',
        description: 'Generated answer'
      },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            similarity: { type: 'number' }
          }
        },
        description: 'Sources used to generate the answer'
      },
      query: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' }
    }
  },
  vectorSearchRequest: {
    type: 'object',
    required: ['query', 'table'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'Search query'
      },
      table: {
        type: 'string',
        enum: ['questions', 'tutorials', 'exam_papers'],
        description: 'Table to search in'
      },
      limit: {
        type: 'number',
        default: 5,
        minimum: 1,
        maximum: 20,
        description: 'Number of results to return'
      },
      threshold: {
        type: 'number',
        default: 0.7,
        minimum: 0,
        maximum: 1,
        description: 'Similarity threshold'
      }
    }
  },
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
            title: { type: 'string' },
            content: { type: 'string' },
            similarity: { type: 'number' },
            metadata: { type: 'object' }
          }
        }
      },
      query: { type: 'string' },
      table: { type: 'string' },
      totalResults: { type: 'number' }
    }
  }
};

module.exports = aiSchemas; 