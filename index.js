require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const { supabase } = require('./config/database');

// Register plugins
fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true
});

fastify.register(require('@fastify/env'), {
  schema: {
    type: 'object',
    required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    properties: {
      PORT: { type: 'number', default: 3000 },
      HOST: { type: 'string', default: '0.0.0.0' },
      NODE_ENV: { type: 'string', default: 'development' },
      SUPABASE_URL: { type: 'string' },
      SUPABASE_ANON_KEY: { type: 'string' },
      JWT_SECRET: { type: 'string', default: 'your-secret-key' },
      JWT_EXPIRES_IN: { type: 'string', default: '7d' },
      OPENAI_API_KEY: { type: 'string' }
    }
  }
});

// Register authentication plugin
fastify.register(require('./plugins/auth'));

// Register Swagger/OpenAPI documentation
fastify.register(require('@fastify/swagger'), {
  routePrefix: '/docs',
  swagger: {
    info: {
      title: 'LearnWise API',
      description: 'AI-powered educational platform API for Egyptian secondary school students',
      version: '1.0.0',
      contact: {
        name: 'LearnWise Team',
        email: 'support@learnwise.com'
      }
    },
    host: `${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`,
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'JWT token in format: Bearer <token>'
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Questions', description: 'Q&A module endpoints' },
      { name: 'Tutorials', description: 'Tutorials module endpoints' },
      { name: 'Exams', description: 'Exam papers module endpoints' },
      { name: 'AI', description: 'AI and vector search endpoints' },
      { name: 'Admin', description: 'Admin management endpoints' }
    ]
  },
  exposeRoute: true
});

// Register Swagger UI
fastify.register(require('@fastify/swagger-ui'), {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  },
  uiHooks: {
    onRequest: function (request, reply, next) {
      next();
    },
    preHandler: function (request, reply, next) {
      next();
    }
  },
  staticCSP: true,
  transformStaticCSP: (header) => header
});

// Add Supabase to fastify instance
fastify.decorate('supabase', supabase);

// Register route modules
fastify.register(require('./modules/auth/routes'), { prefix: '/api/v1/auth' });
fastify.register(require('./modules/questions/routes'), { prefix: '/api/v1/questions' });
fastify.register(require('./modules/ai/routes'), { prefix: '/api/v1/ai' });
fastify.register(require('./modules/exams/routes'), { prefix: '/api/v1/exams' });
fastify.register(require('./modules/tutorials/routes'), { prefix: '/api/v1/tutorials' });
fastify.register(require('./modules/community/routes'), { prefix: '/api/v1/community' });

// Health check endpoint
fastify.get('/health', {
  schema: {
    description: 'Health check endpoint',
    tags: ['System'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          uptime: { type: 'number' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// Root endpoint
fastify.get('/', {
  schema: {
    description: 'API root endpoint',
    tags: ['System'],
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          version: { type: 'string' },
          documentation: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    message: 'Welcome to LearnWise API',
    version: '1.0.0',
    documentation: '/docs'
  };
});

// Error handler
fastify.setErrorHandler(function (error, request, reply) {
  fastify.log.error(error);
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return reply.code(401).send({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return reply.code(401).send({
      success: false,
      message: 'Token expired'
    });
  }

  // Validation errors
  if (error.validation) {
    return reply.code(400).send({
      success: false,
      message: 'Validation error',
      errors: error.validation
    });
  }

  // Default error
  reply.code(500).send({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
fastify.setNotFoundHandler(function (request, reply) {
  reply.code(404).send({
    success: false,
    message: 'Route not found',
    path: request.url
  });
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log(`🚀 LearnWise API server running on http://${host}:${port}`);
    console.log(`📚 API Documentation available at http://${host}:${port}/docs`);
    console.log(`🏥 Health check available at http://${host}:${port}/health`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();