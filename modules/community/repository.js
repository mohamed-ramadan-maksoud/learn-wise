// Community post repository
const { v4: uuidv4 } = require('uuid');

async function createPost(supabase, { user_id, content, post_type, question_id }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ id: uuidv4(), user_id, content, post_type, question_id: question_id || null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function listPosts(supabase, { question_id } = {}) {
  let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (question_id) query = query.eq('question_id', question_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

module.exports = {
  createPost,
  listPosts
};
