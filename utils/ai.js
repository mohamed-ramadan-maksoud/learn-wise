// Switch to configurable AI provider
const { generateEmbedding, generateRAGAnswer, generateStructuredRAGAnswer, VECTOR_DIMENSION, SIMILARITY_THRESHOLD } = require('./ai-provider');

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
  generateStructuredRAGAnswer,
  vectorSearch,
  VECTOR_DIMENSION,
  SIMILARITY_THRESHOLD
};