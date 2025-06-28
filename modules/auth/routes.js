const authSchemas = require('../../schemas/auth');

async function authRoutes(fastify, options) {
  // Register user
  fastify.post('/register', {
    schema: {
      description: 'Register a new user',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password', 'fullName', 'role'],
        properties: authSchemas.register.properties
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            user: authSchemas.userProfile
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
    try {
      const userData = request.body;
      
      // Validate role-specific requirements
      if (userData.role === 'student' && !userData.grade) {
        return reply.code(400).send({
          success: false,
          message: 'Grade is required for students'
        });
      }
      
      if (userData.role === 'teacher' && !userData.subject) {
        return reply.code(400).send({
          success: false,
          message: 'Subject is required for teachers'
        });
      }

      const user = await fastify.registerUser(userData);
      
      reply.code(201).send({
        success: true,
        message: 'User registered successfully',
        user
      });
    } catch (error) {
      console.error('Registration error:', error, error && error.stack, JSON.stringify(error));
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Login user
  fastify.post('/login', {
    schema: {
      description: 'Login user',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: authSchemas.login.properties
      },
      response: {
        200: {
          type: 'object',
          properties: authSchemas.loginResponse.properties
        },
        401: {
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
      const { email, password } = request.body;
      
      const result = await fastify.loginUser(email, password);
      
      reply.send({
        success: true,
        token: result.token,
        user: result.user
      });
    } catch (error) {
      reply.code(401).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get current user profile
  fastify.get('/profile', {
    schema: {
      description: 'Get current user profile',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: authSchemas.userProfile
          }
        },
        401: {
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
      const user = await fastify.getCurrentUser(request.user.id);
      
      reply.send({
        success: true,
        user
      });
    } catch (error) {
      reply.code(401).send({
        success: false,
        message: error.message
      });
    }
  });

  // Update user profile
  fastify.put('/profile', {
    schema: {
      description: 'Update current user profile',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          fullName: { type: 'string', minLength: 2 },
          grade: { type: 'string' },
          subject: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            user: authSchemas.userProfile
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
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const { fullName, grade, subject } = request.body;
      const userId = request.user.id;
      
      const { data: user, error } = await fastify.supabase
        .from('users')
        .update({
          full_name: fullName,
          grade,
          subject,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, email, full_name, role, grade, subject, created_at, updated_at')
        .single();

      if (error) {
        throw error;
      }

      reply.send({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Logout (client-side token removal)
  fastify.post('/logout', {
    schema: {
      description: 'Logout user (client should remove token)',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
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
    // In a stateless JWT system, logout is handled client-side
    // You could implement a blacklist here if needed
    reply.send({
      success: true,
      message: 'Logged out successfully'
    });
  });
}

module.exports = authRoutes;