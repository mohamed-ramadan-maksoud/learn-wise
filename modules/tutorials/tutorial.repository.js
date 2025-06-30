// Repository for tutorials table access
class TutorialRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async upsertParagraph(paragraph) {
    // Upsert by id and paragraph_number
    const { data, error } = await this.supabase
      .from('tutorials')
      .upsert([paragraph], { onConflict: ['id', 'paragraph_number'] });
    return { data, error };
  }

  async getParagraphsByQueryEmbedding(queryEmbedding, maxResults = 5) {
    // Vector search using pgvector extension
    const { data, error } = await this.supabase.rpc('tutorials_vector_search', {
      query_embedding: queryEmbedding,
      match_count: maxResults
    });
    return { data, error };
  }
}

module.exports = TutorialRepository;
