// Repository for AI Generated Questions
const { v4: uuidv4 } = require('uuid');

/**
 * Save an AI-generated question to the database using Supabase.
 * @param {Object} supabase - Supabase client instance
 * @param {Object} questionData
 * @returns {Promise<Object>}
 */
async function saveAIGeneratedQuestion(supabase, questionData) {
  const {
    parent_exam_q_id,
    subject,
    content,
    choices,
    answer,
    ai_search_type,
    metadata = null
  } = questionData;
  const id = uuidv4();
  const { data, error } = await supabase
    .from('ai_generated_questions')
    .insert([
      { id, parent_exam_q_id, subject, content, choices, answer, ai_search_type, metadata }
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Fuzzy search AI-generated questions by subject and query using Supabase.
 * @param {Object} supabase - Supabase client instance
 * @param {string} subject
 * @param {string} queryText
 * @returns {Promise<Array>}
 */
async function fuzzySearchAIGeneratedQuestions(supabase, subject, queryText) {
  const { data, error } = await supabase
    .from('ai_generated_questions')
    .select('*')
    .eq('subject', subject)
    .or(`content.ilike.%${queryText}%,answer.ilike.%${queryText}%`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

module.exports = {
  saveAIGeneratedQuestion,
  fuzzySearchAIGeneratedQuestions,
};
