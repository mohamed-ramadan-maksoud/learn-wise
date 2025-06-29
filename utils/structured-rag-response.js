// utils/structured-rag-response.js
// Utility to build a structured RAG response for question answering

/**
 * Build a structured RAG response for a question.
 * @param {Object} params
 * @param {string} params.answer_query - The main answer for the query.
 * @param {string} params.answer_question - The answer/explanation for the question (can be more detailed or technical).
 * @param {Array<Object>} params.similar_questions - Array of similar question objects (title, content, etc).
 * @param {Array<string>} [params.choices] - Array of choices for the question (if applicable).
 * @param {string} params.question - The question being answered.
 * @param {string} params.subject - The subject related to the question.
 * @param {string} params.difficulty - The difficulty level of the question.
 * @param {string} params.topic - The topic related to the question.
 * @param {Array<Object>} params.generated_similar_questions - Array of similar question objects (should include choices, etc).
 * @returns {Object}
 */
function buildStructuredRAGResponse({ answer_query, answer_question, similar_questions, choices, question, subject, difficulty, topic, generated_similar_questions }) {
  const result = {
    answer_query,
    answer_question,
    question,
    subject,
    difficulty,
    topic,
    choices: Array.isArray(choices) ? choices : undefined,
    similar_questions: Array.isArray(similar_questions) ? similar_questions : [],
    generated_similar_questions: Array.isArray(generated_similar_questions)
      ? generated_similar_questions.map(q => {
          // If choices are present and non-empty, use as is
          if (Array.isArray(q.choices) && q.choices.length > 0) return q;
          // Otherwise, fallback to generic
          return {
            ...q,
            choices: ["Option 1", "Option 2", "Option 3", "Option 4"]
          };
        })
      : []
  };
    console.log('test test');

  console.log('[RAG][STRUCTURED RESPONSE]', JSON.stringify(result, null, 2));
  return result;
}

module.exports = {
  buildStructuredRAGResponse
};
