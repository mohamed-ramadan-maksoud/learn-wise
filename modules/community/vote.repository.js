// Community voting repository
const { v4: uuidv4 } = require('uuid');

async function voteOnItem(supabase, { user_id, post_id, question_id, answer_id, vote_type }) {
  // Only one target allowed
  const targets = [post_id, question_id, answer_id].filter(Boolean);
  if (targets.length !== 1) throw new Error('Vote must target exactly one item');
  let insertObj = { id: uuidv4(), user_id, vote_type };
  if (post_id) insertObj.post_id = post_id;
  if (question_id) insertObj.question_id = question_id;
  if (answer_id) insertObj.answer_id = answer_id;
  // Remove existing vote for this user/item
  if (post_id) await supabase.from('votes').delete().eq('user_id', user_id).eq('post_id', post_id);
  if (question_id) await supabase.from('votes').delete().eq('user_id', user_id).eq('question_id', question_id);
  if (answer_id) await supabase.from('votes').delete().eq('user_id', user_id).eq('answer_id', answer_id);
  const { data, error } = await supabase.from('votes').insert(insertObj).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function getVoteCounts(supabase, { post_id, question_id, answer_id }) {
  if (![post_id, question_id, answer_id].filter(Boolean).length) throw new Error('Must provide post_id, question_id, or answer_id');
  let filter = {};
  if (post_id) filter.post_id = post_id;
  if (question_id) filter.question_id = question_id;
  if (answer_id) filter.answer_id = answer_id;
  const { data, error } = await supabase.from('votes').select('vote_type, count:votes.id').match(filter).group('vote_type');
  if (error) throw new Error(error.message);
  return data;
}

module.exports = {
  voteOnItem,
  getVoteCounts
};
