const tutorialSchemas = {
  tutorial: {
    type: 'object',
    required: ['title', 'content', 'subject'],
    properties: {
      title: {
        type: 'string',
        minLength: 5,
        maxLength: 200,
        description: 'Tutorial title'
      },
      content: {
        type: 'string',
        minLength: 20,
        description: 'Tutorial content'
      },
      subject: {
        type: 'string',
        description: 'Subject category'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tutorial tags'
      },
      difficulty: {
        type: 'string',
        enum: ['beginner', 'intermediate', 'advanced'],
        description: 'Tutorial difficulty level'
      },
      grade: {
        type: 'string',
        description: 'Target grade level'
      },
      type: {
        type: 'string',
        enum: ['text', 'video', 'audio'],
        default: 'text',
        description: 'Tutorial type'
      },
      mediaUrl: {
        type: 'string',
        description: 'URL for video/audio content'
      },
      duration: {
        type: 'number',
        description: 'Duration in minutes (for video/audio)'
      },
      prerequisites: {
        type: 'array',
        items: { type: 'string' },
        description: 'Prerequisites for this tutorial'
      }
    }
  },
  tutorialResponse: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      content: { type: 'string' },
      subject: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      difficulty: { type: 'string' },
      grade: { type: 'string' },
      type: { type: 'string' },
      mediaUrl: { type: 'string' },
      duration: { type: 'number' },
      prerequisites: { type: 'array', items: { type: 'string' } },
      authorId: { type: 'string' },
      authorName: { type: 'string' },
      viewCount: { type: 'number' },
      rating: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },
  tutorialSearch: {
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
        enum: ['beginner', 'intermediate', 'advanced'],
        description: 'Filter by difficulty'
      },
      grade: {
        type: 'string',
        description: 'Filter by grade'
      },
      type: {
        type: 'string',
        enum: ['text', 'video', 'audio'],
        description: 'Filter by tutorial type'
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
  tutorialRating: {
    type: 'object',
    required: ['rating'],
    properties: {
      rating: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        description: 'Rating from 1 to 5'
      },
      review: {
        type: 'string',
        description: 'Optional review text'
      }
    }
  }
};

module.exports = tutorialSchemas; 