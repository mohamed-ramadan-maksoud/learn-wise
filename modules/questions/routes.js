const questionSchemas = require('../../schemas/questions');
const { generateEmbedding, vectorSearch } = require('../../utils/ai');
const { v4: uuidv4 } = require('uuid');

async function questionRoutes(fastify, options) {
  // Create a new question
  fastify.post('/', {
    schema: {
      description: 'Create a new question',
      tags: ['Questions'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title', 'content', 'subject'],
        properties: questionSchemas.question.properties
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            question: questionSchemas.questionResponse
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
      const questionData = request.body;
      const userId = request.user.id;

      // Generate embedding for the question
      const embedding = await generateEmbedding(questionData.content);

      // Create question
      const { data: question, error } = await fastify.supabase
        .from('questions')
        .insert([{
          id: uuidv4(),
          title: questionData.title,
          content: questionData.content,
          subject: questionData.subject,
          tags: questionData.tags || [],
          difficulty: questionData.difficulty || 'medium',
          grade: questionData.grade,
          author_id: userId,
          embedding: embedding
        }])
        .select(`
          *,
          users!questions_author_id_fkey(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Format response
      const formattedQuestion = {
        id: question.id,
        title: question.title,
        content: question.content,
        subject: question.subject,
        tags: question.tags,
        difficulty: question.difficulty,
        grade: question.grade,
        authorId: question.author_id,
        authorName: question.users.full_name,
        upvotes: 0,
        downvotes: 0,
        answerCount: 0,
        createdAt: question.created_at,
        updatedAt: question.updated_at
      };

      reply.code(201).send({
        success: true,
        message: 'Question created successfully',
        question: formattedQuestion
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get all questions with pagination and filters
  fastify.get('/', {
    schema: {
      description: 'Get all questions with pagination and filters',
      tags: ['Questions'],
      querystring: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          grade: { type: 'string' },
          limit: { type: 'number', default: 10 },
          offset: { type: 'number', default: 0 },
          sortBy: { type: 'string', enum: ['created_at', 'upvotes', 'answer_count'], default: 'created_at' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            questions: {
              type: 'array',
              items: questionSchemas.questionResponse
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { subject, difficulty, grade, limit = 10, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = request.query;

      let query = fastify.supabase
        .from('questions')
        .select(`
          *,
          users!questions_author_id_fkey(full_name),
          answers(count)
        `, { count: 'exact' });

      // Apply filters
      if (subject) query = query.eq('subject', subject);
      if (difficulty) query = query.eq('difficulty', difficulty);
      if (grade) query = query.eq('grade', grade);

      // Apply sorting and pagination
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data: questions, error, count } = await query;

      if (error) {
        throw error;
      }

      // Format response
      const formattedQuestions = questions.map(q => ({
        id: q.id,
        title: q.title,
        content: q.content,
        subject: q.subject,
        tags: q.tags,
        difficulty: q.difficulty,
        grade: q.grade,
        authorId: q.author_id,
        authorName: q.users.full_name,
        upvotes: q.upvotes || 0,
        downvotes: q.downvotes || 0,
        answerCount: q.answers[0]?.count || 0,
        createdAt: q.created_at,
        updatedAt: q.updated_at
      }));

      reply.send({
        success: true,
        questions: formattedQuestions,
        total: count,
        limit,
        offset
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get question by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get question by ID',
      tags: ['Questions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            question: questionSchemas.questionResponse,
            answers: {
              type: 'array',
              items: questionSchemas.answerResponse
            }
          }
        },
        404: {
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
      const { id } = request.params;

      // Get question with author info
      const { data: question, error: questionError } = await fastify.supabase
        .from('questions')
        .select(`
          *,
          users!questions_author_id_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (questionError || !question) {
        return reply.code(404).send({
          success: false,
          message: 'Question not found'
        });
      }

      // Get answers for this question
      const { data: answers, error: answersError } = await fastify.supabase
        .from('answers')
        .select(`
          *,
          users!answers_author_id_fkey(full_name)
        `)
        .eq('question_id', id)
        .order('is_accepted', { ascending: false })
        .order('upvotes', { ascending: false });

      if (answersError) {
        throw answersError;
      }

      // Format question
      const formattedQuestion = {
        id: question.id,
        title: question.title,
        content: question.content,
        subject: question.subject,
        tags: question.tags,
        choices: question.choices || [],
        difficulty: question.difficulty,
        grade: question.grade,
        authorId: question.author_id,
        authorName: question.users ? question.users.full_name : null,
        upvotes: question.upvotes || 0,
        downvotes: question.downvotes || 0,
        answerCount: answers.length,
        createdAt: question.created_at,
        updatedAt: question.updated_at
      };

      // Format answers
      const formattedAnswers = answers.map(a => ({
        id: a.id,
        content: a.content,
        isAccepted: a.is_accepted,
        authorId: a.author_id,
        authorName: a.users ? a.users.full_name : null,
        upvotes: a.upvotes || 0,
        downvotes: a.downvotes || 0,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));

      reply.send({
        success: true,
        question: formattedQuestion,
        answers: formattedAnswers
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Vector search for questions
  fastify.post('/search', {
    schema: {
      description: 'Search questions using vector similarity',
      tags: ['Questions'],
      body: {
        type: 'object',
        required: ['query'],
        properties: questionSchemas.searchQuery.properties
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            questions: {
              type: 'array',
              items: questionSchemas.questionResponse
            },
            query: { type: 'string' },
            totalResults: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { query, limit = 5 } = request.body;

      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);

      // Perform vector search
      const similarQuestions = await vectorSearch(queryEmbedding, 'questions', limit);

      // Get full question details for the similar questions
      if (similarQuestions.length > 0) {
        const questionIds = similarQuestions.map(q => q.id);
        
        const { data: questions, error } = await fastify.supabase
          .from('questions')
          .select(`
            *,
            users!questions_author_id_fkey(full_name),
            answers(count)
          `)
          .in('id', questionIds);

        if (error) {
          throw error;
        }

        // Format response
        const formattedQuestions = questions.map(q => ({
          id: q.id,
          title: q.title,
          content: q.content,
          subject: q.subject,
          tags: q.tags,
          difficulty: q.difficulty,
          grade: q.grade,
          authorId: q.author_id,
          authorName: q.users.full_name,
          upvotes: q.upvotes || 0,
          downvotes: q.downvotes || 0,
          answerCount: q.answers[0]?.count || 0,
          createdAt: q.created_at,
          updatedAt: q.updated_at
        }));

        reply.send({
          success: true,
          questions: formattedQuestions,
          query,
          totalResults: questions.length
        });
      } else {
        reply.send({
          success: true,
          questions: [],
          query,
          totalResults: 0
        });
      }
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Add answer to question
  fastify.post('/:id/answers', {
    schema: {
      description: 'Add answer to a question',
      tags: ['Questions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: questionSchemas.answer.properties
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            answer: questionSchemas.answerResponse
          }
        }
      }
    },
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const { id: questionId } = request.params;
      const { content } = request.body;
      const userId = request.user.id;

      // Check if question exists
      const { data: question, error: questionError } = await fastify.supabase
        .from('questions')
        .select('id')
        .eq('id', questionId)
        .single();

      if (questionError || !question) {
        return reply.code(404).send({
          success: false,
          message: 'Question not found'
        });
      }

      // Create answer
      const { data: answer, error } = await fastify.supabase
        .from('answers')
        .insert([{
          id: uuidv4(),
          content,
          question_id: questionId,
          author_id: userId
        }])
        .select(`
          *,
          users!answers_author_id_fkey(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Format response
      const formattedAnswer = {
        id: answer.id,
        content: answer.content,
        isAccepted: answer.is_accepted,
        authorId: answer.author_id,
        authorName: answer.users.full_name,
        upvotes: 0,
        downvotes: 0,
        createdAt: answer.created_at,
        updatedAt: answer.updated_at
      };

      reply.code(201).send({
        success: true,
        message: 'Answer added successfully',
        answer: formattedAnswer
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Vote on question
  fastify.post('/:id/vote', {
    schema: {
      description: 'Vote on a question',
      tags: ['Questions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['voteType'],
        properties: questionSchemas.vote.properties
      },
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
    try {
      const { id: questionId } = request.params;
      const { voteType } = request.body;
      const userId = request.user.id;

      // Check if user already voted
      const { data: existingVote } = await fastify.supabase
        .from('votes')
        .select('*')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .single();

      if (existingVote) {
        // Update existing vote
        const { error } = await fastify.supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);

        if (error) {
          throw error;
        }
      } else {
        // Create new vote
        const { error } = await fastify.supabase
          .from('votes')
          .insert([{
            id: uuidv4(),
            user_id: userId,
            question_id: questionId,
            vote_type: voteType
          }]);

        if (error) {
          throw error;
        }
      }

      reply.send({
        success: true,
        message: 'Vote recorded successfully'
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
}

module.exports = questionRoutes;