const questionSchemas = {
  question: {
    type: 'object',
    required: ['title', 'content', 'subject'],
    properties: {
      title: {
        type: 'string',
        minLength: 5,
        maxLength: 200,
        description: 'Question title'
      },
      content: {
        type: 'string',
        minLength: 10,
        description: 'Question content'
      },
      subject: {
        type: 'string',
        description: 'Subject category'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Question tags'
      },
      difficulty: {
        type: 'string',
        enum: ['easy', 'medium', 'hard'],
        description: 'Question difficulty level'
      },
      grade: {
        type: 'string',
        description: 'Target grade level'
      }
    }
  },
  questionResponse: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      content: { type: 'string' },
      subject: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      difficulty: { type: 'string' },
      grade: { type: 'string' },
      authorId: { type: 'string' },
      authorName: { type: 'string' },
      upvotes: { type: 'number' },
      downvotes: { type: 'number' },
      answerCount: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },
  answer: {
    type: 'object',
    required: ['content'],
    properties: {
      content: {
        type: 'string',
        minLength: 10,
        description: 'Answer content'
      },
      isAccepted: {
        type: 'boolean',
        default: false,
        description: 'Whether this answer is accepted'
      }
    }
  },
  answerResponse: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      content: { type: 'string' },
      isAccepted: { type: 'boolean' },
      authorId: { type: 'string' },
      authorName: { type: 'string' },
      upvotes: { type: 'number' },
      downvotes: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },
  searchQuery: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      subject: {
        type: 'string',
        description: 'Filter by subject'
      },
      difficulty: {
        type: 'string',
        enum: ['easy', 'medium', 'hard'],
        description: 'Filter by difficulty'
      },
      grade: {
        type: 'string',
        description: 'Filter by grade'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags'
      },
      limit: {
        type: 'number',
        default: 10,
        description: 'Number of results to return'
      },
      offset: {
        type: 'number',
        default: 0,
        description: 'Number of results to skip'
      }
    }
  },
  vote: {
    type: 'object',
    required: ['voteType'],
    properties: {
      voteType: {
        type: 'string',
        enum: ['upvote', 'downvote'],
        description: 'Type of vote'
      }
    }
  }
};

module.exports = questionSchemas; 