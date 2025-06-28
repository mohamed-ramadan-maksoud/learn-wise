const authSchemas = {
  register: {
    type: 'object',
    required: ['email', 'password', 'fullName', 'role'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      },
      password: {
        type: 'string',
        minLength: 6,
        description: 'User password (minimum 6 characters)'
      },
      fullName: {
        type: 'string',
        minLength: 2,
        description: 'User full name'
      },
      role: {
        type: 'string',
        enum: ['student', 'teacher', 'admin'],
        description: 'User role'
      },
      grade: {
        type: 'string',
        description: 'Student grade (required for students)'
      },
      subject: {
        type: 'string',
        description: 'Teaching subject (required for teachers)'
      }
    }
  },
  login: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      },
      password: {
        type: 'string',
        description: 'User password'
      }
    }
  },
  loginResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean'
      },
      token: {
        type: 'string',
        description: 'JWT token'
      },
      user: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          fullName: { type: 'string' },
          role: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  userProfile: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      fullName: { type: 'string' },
      role: { type: 'string' },
      grade: { type: 'string' },
      subject: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  }
};

module.exports = authSchemas; 