// Community posts and voting API routes
const { v4: uuidv4 } = require('uuid');

async function communityRoutes(fastify, opts) {
  // Create a post
  fastify.post('/posts', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['content', 'post_type'],
        properties: {
          content: { type: 'string' },
          post_type: { type: 'string', enum: ['discussion', 'question', 'announcement'] },
          question_id: { type: 'string', nullable: true }
        }
      }
    }
  }, async (request, reply) => {
    const { content, post_type, question_id } = request.body;
    const user_id = request.user.id;
    if (post_type === 'question' && !question_id) {
      return reply.code(400).send({ success: false, message: 'question_id required for question post' });
    }
    const { data, error } = await fastify.supabase
      .from('posts')
      .insert({ id: uuidv4(), user_id, content, post_type, question_id: question_id || null })
      .select()
      .single();
    if (error) return reply.code(400).send({ success: false, message: error.message });
    reply.send({ success: true, post: data });
  });

  // List posts (optionally filter by question_id)
  fastify.get('/posts', async (request, reply) => {
    const { question_id } = request.query;
    // Join users table to get author's full_name
    let query = fastify.supabase
      .from('posts')
      .select('*, user:users(full_name)')
      .order('created_at', { ascending: false });
    if (question_id) query = query.eq('question_id', question_id);
    const { data, error } = await query;
    if (error) return reply.code(400).send({ success: false, message: error.message });
    reply.send({ success: true, posts: data });
  });

  // Vote on a post, question, or answer
  fastify.post('/votes', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['vote_type'],
        properties: {
          post_id: { type: 'string', nullable: true },
          question_id: { type: 'string', nullable: true },
          answer_id: { type: 'string', nullable: true },
          vote_type: { type: 'string', enum: ['upvote', 'downvote'] }
        }
      }
    }
  }, async (request, reply) => {
    const { post_id, question_id, answer_id, vote_type } = request.body;
    const user_id = request.user.id;
    // Only one target allowed
    const targets = [post_id, question_id, answer_id].filter(Boolean);
    if (targets.length !== 1) {
      return reply.code(400).send({ success: false, message: 'Vote must target exactly one item' });
    }
    // Insert or update vote
    let insertObj = { id: uuidv4(), user_id, vote_type };
    if (post_id) insertObj.post_id = post_id;
    if (question_id) insertObj.question_id = question_id;
    if (answer_id) insertObj.answer_id = answer_id;
    // Remove existing vote for this user/item
    if (post_id) await fastify.supabase.from('votes').delete().eq('user_id', user_id).eq('post_id', post_id);
    if (question_id) await fastify.supabase.from('votes').delete().eq('user_id', user_id).eq('question_id', question_id);
    if (answer_id) await fastify.supabase.from('votes').delete().eq('user_id', user_id).eq('answer_id', answer_id);
    const { data, error } = await fastify.supabase.from('votes').insert(insertObj).select().single();
    if (error) return reply.code(400).send({ success: false, message: error.message });
    reply.send({ success: true, vote: data });
  });

  // Get vote counts for a post, question, or answer
  fastify.get('/votes/counts', async (request, reply) => {
    const { post_id, question_id, answer_id } = request.query;
    if (![post_id, question_id, answer_id].filter(Boolean).length) {
      return reply.code(400).send({ success: false, message: 'Must provide post_id, question_id, or answer_id' });
    }
    let filter = {};
    if (post_id) filter.post_id = post_id;
    if (question_id) filter.question_id = question_id;
    if (answer_id) filter.answer_id = answer_id;
    // Fetch all votes for the target
    const { data, error } = await fastify.supabase.from('votes').select('vote_type').match(filter);
    if (error) return reply.code(400).send({ success: false, message: error.message });
    // Aggregate counts in JS
    const counts = { upvote: 0, downvote: 0 };
    for (const vote of data) {
      if (vote.vote_type === 'upvote') counts.upvote++;
      if (vote.vote_type === 'downvote') counts.downvote++;
    }
    reply.send({ success: true, counts });
  });
}

module.exports = communityRoutes;
