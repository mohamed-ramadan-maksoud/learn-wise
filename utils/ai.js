const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_DIMENSION = parseInt(process.env.VECTOR_DIMENSION) || 1536;
const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7;

/**
 * Generate embeddings for text using OpenAI
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<number[]>} - Embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate RAG answer using retrieved context
 * @param {string} query - User query
 * @param {Array} context - Retrieved relevant content
 * @returns {Promise<string>} - Generated answer
 */
async function generateRAGAnswer(query, context) {
  try {
    const contextText = context.map(item => {
      if (item.type === 'question') {
        return `Question: ${item.title}\nContent: ${item.content}`;
      } else if (item.type === 'tutorial') {
        return `Tutorial: ${item.title}\nContent: ${item.content}`;
      } else if (item.type === 'exam') {
        return `Exam Paper: ${item.title}\nDescription: ${item.description}`;
      }
      return '';
    }).join('\n\n');

    const prompt = `You are an educational assistant for Egyptian secondary school students. 
    Answer the following question based on the provided context. 
    If the context doesn't contain enough information, say so and provide a general helpful response.
    
    Context:
    ${contextText}
    
    Question: ${query}
    
    Answer:`;

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

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating RAG answer:', error);
    throw new Error('Failed to generate answer');
  }
}

/**
 * Perform vector similarity search
 * @param {number[]} queryEmbedding - Query embedding
 * @param {string} table - Table to search in
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} - Similar items
 */
async function vectorSearch(queryEmbedding, table, limit = 5) {
  try {
    const { supabase } = require('../config/database');
    
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: limit,
      table_name: table
    });

    if (error) {
      console.error('Vector search error:', error);
      throw new Error('Vector search failed');
    }

    return data || [];
  } catch (error) {
    console.error('Error in vector search:', error);
    throw new Error('Vector search failed');
  }
}

module.exports = {
  generateEmbedding,
  generateRAGAnswer,
  vectorSearch,
  VECTOR_DIMENSION,
  SIMILARITY_THRESHOLD
}; 