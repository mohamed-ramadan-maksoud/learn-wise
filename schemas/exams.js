const examSchemas = {
  examPaper: {
    type: 'object',
    required: ['title', 'subject', 'year'],
    properties: {
      title: {
        type: 'string',
        minLength: 5,
        maxLength: 200,
        description: 'Exam paper title'
      },
      subject: {
        type: 'string',
        description: 'Subject category'
      },
      year: {
        type: 'number',
        minimum: 2000,
        maximum: 2030,
        description: 'Exam year'
      },
      description: {
        type: 'string',
        description: 'Exam paper description'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Exam paper tags'
      },
      grade: {
        type: 'string',
        description: 'Target grade level'
      },
      term: {
        type: 'string',
        enum: ['first', 'second', 'final'],
        description: 'Academic term'
      },
      examType: {
        type: 'string',
        enum: ['midterm', 'final', 'quiz'],
        description: 'Type of exam'
      },
      duration: {
        type: 'number',
        description: 'Exam duration in minutes'
      },
      totalMarks: {
        type: 'number',
        description: 'Total marks for the exam'
      },
      fileUrl: {
        type: 'string',
        description: 'URL to the exam paper file'
      },
      answerKeyUrl: {
        type: 'string',
        description: 'URL to the answer key file (optional)'
      },
      exam_type: {
        type: 'string',
        pattern: '^(final|practice|mock|guide(_[a-zA-Z0-9]+)?)$',
        default: 'final',
        description: 'Type of exam (final, guide, guide_1, guide_2, practice, mock, etc)'
      },
      region: {
        type: 'string',
        default: 'egypt',
        description: 'Region or country of the exam (default: egypt)'
      },
      exam_version: {
        type: 'integer',
        default: 1,
        description: 'Version of the exam paper (default: 1)'
      }
    }
  },
  examPaperResponse: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      subject: { type: 'string' },
      year: { type: 'number' },
      description: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      grade: { type: 'string' },
      term: { type: 'string' },
      examType: { type: 'string' },
      duration: { type: 'number' },
      totalMarks: { type: 'number' },
      fileUrl: { type: 'string' },
      answerKeyUrl: { type: 'string' },
      uploaderId: { type: 'string' },
      uploaderName: { type: 'string' },
      downloadCount: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },
  examSearch: {
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
      year: {
        type: 'number',
        description: 'Filter by year'
      },
      grade: {
        type: 'string',
        description: 'Filter by grade'
      },
      term: {
        type: 'string',
        enum: ['first', 'second', 'final'],
        description: 'Filter by term'
      },
      examType: {
        type: 'string',
        enum: ['midterm', 'final', 'quiz'],
        description: 'Filter by exam type'
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
  fileUpload: {
    type: 'object',
    required: ['file'],
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: 'Exam paper file (PDF, DOC, DOCX)'
      }
    }
  }
};

module.exports = examSchemas;