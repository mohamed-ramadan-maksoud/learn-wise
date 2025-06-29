/**
 * AI Repository Layer
 * Handles all data access operations for AI features
 */

class AIRepository {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Get items by IDs from a specific table
   */
  async getItemsByIds(tableName, itemIds) {
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .in('id', itemIds);

    if (error) {
      throw new Error(`Failed to fetch items from ${tableName}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get exam papers by IDs
   */
  async getExamPapersByIds(examPaperIds) {
    const { data, error } = await this.supabase
      .from('exam_papers')
      .select('id, title, subject, year, grade, term, exam_type')
      .in('id', examPaperIds);

    if (error) {
      throw new Error(`Failed to fetch exam papers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get table name and type label for search type
   */
  getTableInfo(searchType) {
    switch (searchType) {
      case 'questions':
        return { tableName: 'questions', typeLabel: 'question' };
      case 'tutorials':
        return { tableName: 'tutorials', typeLabel: 'tutorial' };
      case 'exams':
        return { tableName: 'exam_papers', typeLabel: 'exam' };
      default:
        return null;
    }
  }
}

module.exports = AIRepository;
