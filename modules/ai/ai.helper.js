/**
 * AI Helper Layer
 * Contains utility functions for formatting, response building, and data transformation
 */

class AIHelper {
  /**
   * Format items based on table type
   */
  static formatItems(items, typeLabel, similarItems, examMetaMap = {}) {
    if (typeLabel === 'question') {
      return items.map(item => {
        const examMetaObj = item.exam_paper_id ? examMetaMap[item.exam_paper_id] : undefined;
        // Debug log for exam_paper_id and examMetaObj
                 console.log('[AIHelper] Question ID:', item.id, 'exam_paper_id:', item.exam_paper_id, 'examMetaObj:', examMetaObj);

        if (item.exam_paper_id) {
          console.log('[AIHelper] Question ID:', item.id, 'exam_paper_id:', item.exam_paper_id, 'examMetaObj:', examMetaObj);
        }
        // Warn if examMetaObj is empty or missing
        if (item.exam_paper_id && (!examMetaObj || (typeof examMetaObj === 'object' && !Array.isArray(examMetaObj) && Object.keys(examMetaObj).length === 0))) {
          console.log('[AIHelper] examMetaObj is empty or missing for exam_paper_id:', item.exam_paper_id, 'item.id:', item.id);
        }
        // Only include examMeta if it is a plain object and has at least one non-empty, non-null, non-undefined property
        let hasExamMeta = false;
        if (
          examMetaObj &&
          typeof examMetaObj === 'object' &&
          !Array.isArray(examMetaObj) &&
          Object.values(examMetaObj).some(v => v !== null && v !== undefined && v !== '')
        ) {
          hasExamMeta = true;
        }
        return {
          id: item.id,
          type: typeLabel,
          title: item.title,
          content: item.content || item.description || '',
          tags: item.tags,
          grade: item.grade,
          choices: item.choices || [],
          meta_data: item.meta_data || undefined,
          similarity: similarItems.find(s => s.id === item.id)?.similarity || 0,
          ...(hasExamMeta ? { examMeta: examMetaObj } : {})
        };
      });
    } else {
      return items.map(item => ({
        id: item.id,
        type: typeLabel,
        title: item.title,
        content: item.content || item.description || '',
        similarity: similarItems.find(s => s.id === item.id)?.similarity || 0
      }));
    }
  }

  /**
   * Create exam metadata map from exam papers array
   */
  static createExamMetaMap(examPapers) {
    return (examPapers || []).reduce((map, exam) => {
      map[exam.id] = exam;
      return map;
    }, {});
  }

  /**
   * Sort sources by similarity and take top results
   */
  static sortAndLimitSources(sources, maxResults) {
    return sources
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Build RAG response object
   */
  static buildRAGResponse({
    success = true,
    query_answer = undefined,
    question_exam_answer = undefined,
    generated_similar_questions = undefined,
    answer = undefined,
    sources = [],
    query = '',
    timestamp = undefined
  }) {
    const response = {
      success,
      sources,
      query,
      timestamp: timestamp || new Date().toISOString()
    };

    if (typeof query_answer !== 'undefined') response.query_answer = query_answer;
    if (typeof question_exam_answer !== 'undefined') response.question_exam_answer = question_exam_answer;
    if (typeof generated_similar_questions !== 'undefined') response.generated_similar_questions = generated_similar_questions;
    if (typeof answer !== 'undefined') response.answer = answer;

    return response;
  }

  /**
   * Build embedding response
   */
  static buildEmbeddingResponse(embedding) {
    return {
      success: true,
      embedding,
      dimension: embedding.length
    };
  }

  /**
   * Build error response
   */
  static buildErrorResponse(message) {
    return {
      success: false,
      message
    };
  }

  /**
   * Get test structured answer for fallback scenarios
   */
  static getTestStructuredAnswer() {
    return {
      query_answer: "The correct choice is 'multilingual'.",
      question_exam_answer: "multilingual - A multilingual website supports multiple languages, making content accessible to diverse audiences.",
      generated_similar_questions: [
        {
          question: "The company's new app is designed to be _____, supporting users worldwide.",
          subject: "English",
          difficulty: "medium",
          topic: "Vocabulary"
        }
      ]
    };
  }

  /**
   * Extract unique exam paper IDs from questions
   */
  static extractExamPaperIds(items) {
    return [...new Set(items.map(q => q.exam_paper_id).filter(Boolean))];
  }
}

module.exports = AIHelper;
