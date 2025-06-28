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
 * @param {string} query
 * @param {Array} context
 * @returns {Promise<string>}
 */
async function generateRAGAnswer(query, context) {
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
        return `Question: ${item.title || ''}${meta}\nContent: ${item.content || ''}`;
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
    console.error('Error generating RAG answer:', error);
    throw new Error('Failed to generate answer');
  }
}

module.exports = {
  generateEmbedding,
  generateRAGAnswer,
  VECTOR_DIMENSION,
  SIMILARITY_THRESHOLD,
};