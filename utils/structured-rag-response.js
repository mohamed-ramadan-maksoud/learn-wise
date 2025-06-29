// utils/structured-rag-response.js
// Utility to build a structured RAG response for question answering

/**
 * Build a structured RAG response for a question.
 * @param {Object} params
 * @param {string} params.answer_query - The answer for the student (final answer).
 * @param {string} params.answer_question - The answer/explanation for the question (can be more detailed or technical).
 * @param {Array<Object>} params.similar_questions - Array of similar question objects (title, content, etc).
 * @returns {Object}
 */
function buildStructuredRAGResponse({ answer_query, answer_question, similar_questions }) {
  return {
    answer_query,
    answer_question,
    similar_questions: Array.isArray(similar_questions) ? similar_questions : []
  };
}

module.exports = {
  buildStructuredRAGResponse
};
