// Utility to select between OpenAI and Cohere for embeddings and RAG
const OpenAI = require('openai');
let cohere = null;
try {
  const { CohereClient } = require('cohere-ai');
  cohere = new CohereClient({ apiKey: process.env.COHERE_API_KEY });
} catch (e) {
  console.error('Failed to load Cohere:', e);
  cohere = null;
}

const VECTOR_DIMENSION = parseInt(process.env.VECTOR_DIMENSION) || 1024;
const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7;

const PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
console.log('[AI PROVIDER]', PROVIDER);

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (PROVIDER === 'cohere' && !cohere) {
  throw new Error('AI_PROVIDER is set to "cohere" but the cohere-ai package is not installed or failed to load. Please run `npm install cohere-ai` and check your COHERE_API_KEY.');
}

/**
 * Generate an embedding vector for the given text using the configured AI provider.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  try {
    console.log('[AI PROVIDER] Embedding using:', PROVIDER, 'Cohere loaded:', !!cohere);
    if (PROVIDER === 'cohere' && cohere) {
      const response = await cohere.embed({
        texts: [text],
        model: process.env.COHERE_EMBEDDING_MODEL || 'embed-multilingual-v3.0',
        input_type: 'search_document',
      });
      if (!response.embeddings || !Array.isArray(response.embeddings) || !response.embeddings[0]) {
        throw new Error('Cohere embedding response missing embeddings');
      }
      return response.embeddings[0];
    } else {
      const response = await openai.embeddings.create({
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
        input: text,
      });
      if (!response.data || !Array.isArray(response.data) || !response.data[0]?.embedding) {
        throw new Error('OpenAI embedding response missing embedding');
      }
      return response.data[0].embedding;
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate a RAG answer for a query using the provided context.
 * Retries up to 3 times if the answer is not structured.
 * @param {string} query
 * @param {Array} context
 * @param {Object} [options]
 * @returns {Promise<Object>} Always returns a structured response.
 */
async function generateRAGAnswer(query, context, options = {}) {
  let attempts = 0;
  let result;
  while (attempts < 3) {
    attempts++;
    try {
      console.log('[AI PROVIDER] RAG using:', PROVIDER, 'Cohere loaded:', !!cohere);

      const contextText = context.map(item => {
        let meta = '';
        if (item.examMeta !== undefined) {
          if (typeof item.examMeta === 'object' && item.examMeta !== null) {
            // Format examMeta fields, skipping empty ones
            const metaFields = [
              item.examMeta.title && `Title: ${item.examMeta.title}`,
              item.examMeta.subject && `Subject: ${item.examMeta.subject}`,
              item.examMeta.year && `Year: ${item.examMeta.year}`,
              item.examMeta.grade && `Grade: ${item.examMeta.grade}`,
              item.examMeta.term && `Term: ${item.examMeta.term}`,
              item.examMeta.exam_type && `Type: ${item.examMeta.exam_type}`
            ].filter(Boolean).join(', ');
            meta = metaFields ? `\n[Exam Info: ${metaFields}]` : '';
          } else {
            console.warn('[RAG] examMeta is present but not an object:', item.examMeta);
          }
        }
        if (item.type === 'question') {
          let choicesText = '';
          if (item.choices && Array.isArray(item.choices) && item.choices.length > 0) {
            choicesText = `\nChoices: ${item.choices.join(' | ')}`;
          }
          return `Question: ${item.title || ''}${meta}\nContent: ${item.content || ''}${choicesText}`;
        } else if (item.type === 'tutorial') {
          return `Tutorial: ${item.title || ''}\nContent: ${item.content || ''}`;
        } else if (item.type === 'exam') {
          return `Exam Paper: ${item.title || ''}\nDescription: ${item.description || ''}`;
        } else {
          console.warn('[RAG] Unknown context item type:', item.type, item);
          return '';
        }
      }).join('\n\n');

      const prompt = `You are an educational assistant for Egyptian secondary school students.\nAnswer the following question based on the provided context.\nIf the context doesn't contain enough information, say so and provide a general helpful response.\n\nContext:\n${contextText}\n\nQuestion: ${query}\n\nAnswer:`;

      if (PROVIDER === 'cohere' && cohere) {
        const response = await cohere.generate({
          model: process.env.COHERE_MODEL || 'command-r-plus',
          prompt,
          max_tokens: 500,
          temperature: 0.7,
        });
        if (!response.generations || !Array.isArray(response.generations) || !response.generations[0]?.text) {
          throw new Error('Cohere generation response missing text');
        }
        return response.generations[0].text.trim();
      } else {
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful educational assistant for Egyptian secondary school students. Provide clear, accurate, and helpful answers.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        });
        if (!response.choices || !Array.isArray(response.choices) || !response.choices[0]?.message?.content) {
          throw new Error('OpenAI chat completion response missing content');
        }
        return response.choices[0].message.content.trim();
      }
    } catch (error) {
      if (attempts >= 3) throw error;
    }
  }
  // If all attempts fail, return a fallback structured response
  return buildStructuredRAGResponse({
    answer_query: 'Unable to generate a structured response at this time.',
    answer_question: 'Unable to generate a structured response at this time.',
    similar_questions: []
  });
}

/**
 * Generate a structured RAG answer for a query using the provided context.
 * @param {string} query
 * @param {Array} context
 * @returns {Promise<Object>}
 */
async function generateStructuredRAGAnswer(query, context) {
  try {
    console.log('[AI PROVIDER] Structured RAG using:', PROVIDER, 'Cohere loaded:', !!cohere);

    const contextText = context.map(item => {
      let meta = '';
      if (item.examMeta !== undefined) {
        if (typeof item.examMeta === 'object' && item.examMeta !== null) {
          const metaFields = [
            item.examMeta.title && `Title: ${item.examMeta.title}`,
            item.examMeta.subject && `Subject: ${item.examMeta.subject}`,
            item.examMeta.year && `Year: ${item.examMeta.year}`,
            item.examMeta.grade && `Grade: ${item.examMeta.grade}`,
            item.examMeta.term && `Term: ${item.examMeta.term}`,
            item.examMeta.exam_type && `Type: ${item.examMeta.exam_type}`
          ].filter(Boolean).join(', ');
          meta = metaFields ? `\n[Exam Info: ${metaFields}]` : '';
        }
      }
      if (item.type === 'question') {
        let choicesText = '';
        if (item.choices && Array.isArray(item.choices) && item.choices.length > 0) {
          choicesText = `\nChoices: ${item.choices.join(' | ')}`;
        }
        return `Question: ${item.title || ''}${meta}\nContent: ${item.content || ''}${choicesText}`;
      } else if (item.type === 'tutorial') {
        return `Tutorial: ${item.title || ''}\nContent: ${item.content || ''}`;
      } else if (item.type === 'exam') {
        return `Exam Paper: ${item.title || ''}\nDescription: ${item.description || ''}`;
      } else {
        return '';
      }
    }).join('\n\n');

    const prompt = `You are an educational assistant for Egyptian secondary school students.\nBased on the provided context, generate a structured response in JSON format with exactly these fields:\n\n{\n  "query_answer": "Direct answer to the student's question (simple, clear explanation)",\n  "question_exam_answer": "Detailed exam-focused answer with step-by-step solution if applicable",\n  "generated_similar_questions": [\n    {\n      "question": "Similar question text",\n      "subject": "Subject name",\n      "difficulty": "easy/medium/hard",\n      "topic": "Topic name",\n      "choices": ["Option 1", "Option 2", "Option 3", "Option 4"]\n    }\n  ]\n}\n\nFor each generated similar question, include a "choices" array with at least 4 plausible options.\n\nContext:\n${contextText}\n\nQuestion: ${query}\n\nRespond only with valid JSON:`;

    let responseText;
    if (PROVIDER === 'cohere' && cohere) {
      const response = await cohere.generate({
        model: process.env.COHERE_MODEL || 'command-r-plus',
        prompt,
        max_tokens: 1000,
        temperature: 0.7,
      });
      if (!response.generations || !Array.isArray(response.generations) || !response.generations[0]?.text) {
        throw new Error('Cohere generation response missing text');
      }
      responseText = response.generations[0].text.trim();
    } else {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful educational assistant for Egyptian secondary school students. Always respond with valid JSON in the exact format requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
      if (!response.choices || !Array.isArray(response.choices) || !response.choices[0]?.message?.content) {
        throw new Error('OpenAI chat completion response missing content');
      }
      responseText = response.choices[0].message.content.trim();
    }

    // Parse JSON response
    try {
      // Clean up response text - remove markdown code blocks if present
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.log('[AI PROVIDER] Cleaned response text:', cleanedResponse);

      const structuredResponse = JSON.parse(cleanedResponse);
      console.log('[AI PROVIDER] Parsed structured response:', structuredResponse);

      // Validate and ensure proper structure
      return {
        query_answer: structuredResponse.query_answer || 'No answer provided',
        question_exam_answer: structuredResponse.question_exam_answer || 'No detailed answer provided',
        generated_similar_questions: (structuredResponse.generated_similar_questions || []).slice(0, 5)
      };
    } catch (parseError) {
      console.error('Failed to parse structured response JSON:', parseError);
      console.error('Raw response text length:', responseText.length);
      console.error('Raw response (first 500 chars):', responseText.substring(0, 500));

      // Try to extract JSON from the response if it contains other text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const structuredResponse = JSON.parse(jsonMatch[0]);
          console.log('[AI PROVIDER] Successfully parsed JSON from match:', structuredResponse);
          return {
            query_answer: structuredResponse.query_answer || 'No answer provided',
            question_exam_answer: structuredResponse.question_exam_answer || 'No detailed answer provided',
            generated_similar_questions: (structuredResponse.generated_similar_questions || []).slice(0, 5)
          };
        } catch (matchError) {
          console.error('Failed to parse matched JSON:', matchError);
        }
      }

      // Fallback: generate basic structured response
      return {
        query_answer: 'Unable to generate a structured response at this time.',
        question_exam_answer: 'Please try again or rephrase your question.',
        generated_similar_questions: []
      };
    }
  } catch (error) {
    console.error('Error generating structured RAG answer:', error);
    throw new Error('Failed to generate structured answer');
  }
}

module.exports = {
  generateEmbedding,
  generateRAGAnswer,
  generateStructuredRAGAnswer,
  VECTOR_DIMENSION,
  SIMILARITY_THRESHOLD,
};