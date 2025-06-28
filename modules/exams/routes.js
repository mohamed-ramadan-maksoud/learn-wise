const examSchemas = require('../../schemas/exams');
const { generateEmbedding, vectorSearch } = require('../../utils/ai');
const { v4: uuidv4 } = require('uuid');

async function examRoutes(fastify, options) {
  // Create a new exam paper
  fastify.post('/', {
    schema: {
      description: 'Create a new exam paper',
      tags: ['Exams'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['title', 'subject', 'year'],
        properties: examSchemas.examPaper.properties
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            examPaper: examSchemas.examPaperResponse
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
    preHandler: [fastify.authenticate, fastify.authorize(['teacher', 'admin'])]
  }, async (request, reply) => {
    try {
      const examData = request.body;
      const userId = request.user.id;

      // Generate embedding for the exam paper
      const examText = `${examData.title} ${examData.description || ''} ${examData.subject}`;
      const embedding = await generateEmbedding(examText);

      // Create exam paper
      const { data: examPaper, error } = await fastify.supabase
        .from('exam_papers')
        .insert([{
          id: uuidv4(),
          title: examData.title,
          subject: examData.subject,
          year: examData.year,
          description: examData.description,
          tags: examData.tags || [],
          grade: examData.grade,
          term: examData.term,
          exam_type: examData.examType,
          duration: examData.duration,
          total_marks: examData.totalMarks,
          file_url: examData.fileUrl,
          answer_key_url: examData.answerKeyUrl,
          uploader_id: userId,
          embedding: embedding
        }])
        .select(`
          *,
          users!exam_papers_uploader_id_fkey(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Format response
      const formattedExamPaper = {
        id: examPaper.id,
        title: examPaper.title,
        subject: examPaper.subject,
        year: examPaper.year,
        description: examPaper.description,
        tags: examPaper.tags,
        grade: examPaper.grade,
        term: examPaper.term,
        examType: examPaper.exam_type,
        duration: examPaper.duration,
        totalMarks: examPaper.total_marks,
        fileUrl: examPaper.file_url,
        answerKeyUrl: examPaper.answer_key_url,
        uploaderId: examPaper.uploader_id,
        uploaderName: examPaper.users.full_name,
        downloadCount: examPaper.download_count || 0,
        createdAt: examPaper.created_at,
        updatedAt: examPaper.updated_at
      };

      reply.code(201).send({
        success: true,
        message: 'Exam paper created successfully',
        examPaper: formattedExamPaper
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Get all exam papers with pagination and filters
  fastify.get('/', {
    schema: {
      description: 'Get all exam papers with pagination and filters',
      tags: ['Exams'],
      querystring: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          year: { type: 'number' },
          grade: { type: 'string' },
          term: { type: 'string', enum: ['first', 'second', 'final'] },
          examType: { type: 'string', enum: ['midterm', 'final', 'quiz'] },
          limit: { type: 'number', default: 10 },
          offset: { type: 'number', default: 0 },
          sortBy: { type: 'string', enum: ['created_at', 'year', 'download_count'], default: 'created_at' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            examPapers: {
              type: 'array',
              items: examSchemas.examPaperResponse
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
      const { subject, year, grade, term, examType, limit = 10, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = request.query;

      let query = fastify.supabase
        .from('exam_papers')
        .select('*', { count: 'exact' });

      // Apply filters
      if (subject) query = query.eq('subject', subject);
      if (year) query = query.eq('year', year);
      if (grade) query = query.eq('grade', grade);
      if (term) query = query.eq('term', term);
      if (examType) query = query.eq('exam_type', examType);

      // Apply sorting and pagination
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data: examPapers, error, count } = await query;

      if (error) {
        throw error;
      }

      // Get uploader names
      const uploaderIds = [...new Set(examPapers.map(e => e.uploader_id))];
      const { data: uploaders } = await fastify.supabase
        .from('users')
        .select('id, full_name')
        .in('id', uploaderIds);

      const uploaderMap = uploaders.reduce((map, uploader) => {
        map[uploader.id] = uploader.full_name;
        return map;
      }, {});

      // Format response
      const formattedExamPapers = examPapers.map(e => ({
        id: e.id,
        title: e.title,
        subject: e.subject,
        year: e.year,
        description: e.description,
        tags: e.tags,
        grade: e.grade,
        term: e.term,
        examType: e.exam_type,
        duration: e.duration,
        totalMarks: e.total_marks,
        fileUrl: e.file_url,
        answerKeyUrl: e.answer_key_url,
        uploaderId: e.uploader_id,
        uploaderName: uploaderMap[e.uploader_id] || 'Unknown',
        downloadCount: e.download_count || 0,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      }));

      reply.send({
        success: true,
        examPapers: formattedExamPapers,
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

  // Get exam paper by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get exam paper by ID',
      tags: ['Exams'],
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
            examPaper: examSchemas.examPaperResponse
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

      // Get exam paper with uploader info
      const { data: examPaper, error: examError } = await fastify.supabase
        .from('exam_papers')
        .select(`
          *,
          users!exam_papers_uploader_id_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (examError || !examPaper) {
        return reply.code(404).send({
          success: false,
          message: 'Exam paper not found'
        });
      }

      // Format exam paper
      const formattedExamPaper = {
        id: examPaper.id,
        title: examPaper.title,
        subject: examPaper.subject,
        year: examPaper.year,
        description: examPaper.description,
        tags: examPaper.tags,
        grade: examPaper.grade,
        term: examPaper.term,
        examType: examPaper.exam_type,
        duration: examPaper.duration,
        totalMarks: examPaper.total_marks,
        fileUrl: examPaper.file_url,
        answerKeyUrl: examPaper.answer_key_url,
        uploaderId: examPaper.uploader_id,
        uploaderName: examPaper.users.full_name,
        downloadCount: examPaper.download_count || 0,
        createdAt: examPaper.created_at,
        updatedAt: examPaper.updated_at
      };

      reply.send({
        success: true,
        examPaper: formattedExamPaper
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Vector search for exam papers
  fastify.post('/search', {
    schema: {
      description: 'Search exam papers using vector similarity',
      tags: ['Exams'],
      body: {
        type: 'object',
        required: ['query'],
        properties: examSchemas.examSearch.properties
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            examPapers: {
              type: 'array',
              items: examSchemas.examPaperResponse
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
      const similarExams = await vectorSearch(queryEmbedding, 'exam_papers', limit);

      // Get full exam details for the similar exams
      if (similarExams.length > 0) {
        const examIds = similarExams.map(e => e.id);
        
        const { data: examPapers, error } = await fastify.supabase
          .from('exam_papers')
          .select(`
            *,
            users!exam_papers_uploader_id_fkey(full_name)
          `)
          .in('id', examIds);

        if (error) {
          throw error;
        }

        // Format response
        const formattedExamPapers = examPapers.map(e => ({
          id: e.id,
          title: e.title,
          subject: e.subject,
          year: e.year,
          description: e.description,
          tags: e.tags,
          grade: e.grade,
          term: e.term,
          examType: e.exam_type,
          duration: e.duration,
          totalMarks: e.total_marks,
          fileUrl: e.file_url,
          answerKeyUrl: e.answer_key_url,
          uploaderId: e.uploader_id,
          uploaderName: e.users.full_name,
          downloadCount: e.download_count || 0,
          createdAt: e.created_at,
          updatedAt: e.updated_at
        }));

        reply.send({
          success: true,
          examPapers: formattedExamPapers,
          query,
          totalResults: examPapers.length
        });
      } else {
        reply.send({
          success: true,
          examPapers: [],
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

  // Download exam paper (increment download count)
  fastify.post('/:id/download', {
    schema: {
      description: 'Record exam paper download',
      tags: ['Exams'],
      security: [{ bearerAuth: [] }],
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
            message: { type: 'string' },
            downloadUrl: { type: 'string' }
          }
        }
      }
    },
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const { id: examId } = request.params;

      // Check if exam paper exists
      const { data: examPaper, error: examError } = await fastify.supabase
        .from('exam_papers')
        .select('id, file_url, download_count')
        .eq('id', examId)
        .single();

      if (examError || !examPaper) {
        return reply.code(404).send({
          success: false,
          message: 'Exam paper not found'
        });
      }

      // Increment download count
      const { error } = await fastify.supabase
        .from('exam_papers')
        .update({ download_count: (examPaper.download_count || 0) + 1 })
        .eq('id', examId);

      if (error) {
        throw error;
      }

      reply.send({
        success: true,
        message: 'Download recorded successfully',
        downloadUrl: examPaper.file_url
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Update exam paper
  fastify.put('/:id', {
    schema: {
      description: 'Update an exam paper',
      tags: ['Exams'],
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
        properties: examSchemas.examPaper.properties
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            examPaper: examSchemas.examPaperResponse
          }
        }
      }
    },
    preHandler: [fastify.authenticate, fastify.authorize(['teacher', 'admin'])]
  }, async (request, reply) => {
    try {
      const { id: examId } = request.params;
      const updateData = request.body;
      const userId = request.user.id;

      // Check if exam paper exists and user owns it
      const { data: examPaper, error: examError } = await fastify.supabase
        .from('exam_papers')
        .select('*')
        .eq('id', examId)
        .eq('uploader_id', userId)
        .single();

      if (examError || !examPaper) {
        return reply.code(404).send({
          success: false,
          message: 'Exam paper not found or you do not have permission to edit it'
        });
      }

      // Generate new embedding if content changed
      let embedding = examPaper.embedding;
      if (updateData.title || updateData.description) {
        const examText = `${updateData.title || examPaper.title} ${updateData.description || examPaper.description} ${updateData.subject || examPaper.subject}`;
        embedding = await generateEmbedding(examText);
      }

      // Update exam paper
      const { data: updatedExamPaper, error } = await fastify.supabase
        .from('exam_papers')
        .update({
          ...updateData,
          embedding,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId)
        .select(`
          *,
          users!exam_papers_uploader_id_fkey(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Format response
      const formattedExamPaper = {
        id: updatedExamPaper.id,
        title: updatedExamPaper.title,
        subject: updatedExamPaper.subject,
        year: updatedExamPaper.year,
        description: updatedExamPaper.description,
        tags: updatedExamPaper.tags,
        grade: updatedExamPaper.grade,
        term: updatedExamPaper.term,
        examType: updatedExamPaper.exam_type,
        duration: updatedExamPaper.duration,
        totalMarks: updatedExamPaper.total_marks,
        fileUrl: updatedExamPaper.file_url,
        answerKeyUrl: updatedExamPaper.answer_key_url,
        uploaderId: updatedExamPaper.uploader_id,
        uploaderName: updatedExamPaper.users.full_name,
        downloadCount: updatedExamPaper.download_count || 0,
        createdAt: updatedExamPaper.created_at,
        updatedAt: updatedExamPaper.updated_at
      };

      reply.send({
        success: true,
        message: 'Exam paper updated successfully',
        examPaper: formattedExamPaper
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });

  // Delete exam paper
  fastify.delete('/:id', {
    schema: {
      description: 'Delete an exam paper',
      tags: ['Exams'],
      security: [{ bearerAuth: [] }],
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
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate, fastify.authorize(['teacher', 'admin'])]
  }, async (request, reply) => {
    try {
      const { id: examId } = request.params;
      const userId = request.user.id;

      // Check if exam paper exists and user owns it
      const { data: examPaper, error: examError } = await fastify.supabase
        .from('exam_papers')
        .select('id')
        .eq('id', examId)
        .eq('uploader_id', userId)
        .single();

      if (examError || !examPaper) {
        return reply.code(404).send({
          success: false,
          message: 'Exam paper not found or you do not have permission to delete it'
        });
      }

      // Delete exam paper
      const { error } = await fastify.supabase
        .from('exam_papers')
        .delete()
        .eq('id', examId);

      if (error) {
        throw error;
      }

      reply.send({
        success: true,
        message: 'Exam paper deleted successfully'
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        message: error.message
      });
    }
  });
}

module.exports = examRoutes; 