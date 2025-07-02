/**
 * AI Service Layer
 * Contains all business logic for AI features
 */

const { generateEmbedding, generateRAGAnswer, generateStructuredRAGAnswer, vectorSearch } = require('../../utils/ai');
const AIRepository = require('./ai.repository');
const AIHelper = require('./ai.helper');
const aiGenRepo = require('./ai-generated-questions.repository');

class AIService {
  constructor(supabase) {
    this.repository = new AIRepository(supabase);
  }

  /**
   * Generate embedding for text
   */
  async generateTextEmbedding(text) {
    try {
      const embedding = await generateEmbedding(text);
      return AIHelper.buildEmbeddingResponse(embedding);
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate RAG answer with retrieval-augmented generation
   */
  async generateRAGAnswer(query, searchTypes = ['questions', 'tutorials'], maxResults = 5, structured = false) {
    try {
      console.log('[RAG] Query:', query);
      console.log('[RAG] Structured response requested:', structured);

      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);
      console.log('[RAG] Query Embedding generated');

      // Collect relevant content from different sources
      const allSources = await this._collectSourcesFromSearchTypes(queryEmbedding, searchTypes, maxResults);

      // Sort all sources by similarity and take top results
      const topSources = AIHelper.sortAndLimitSources(allSources, maxResults);
      console.log('[RAG] Top sources for answer:', topSources);

      if (structured) {
        return await this._generateStructuredResponse(query, topSources);
      } else {
        return await this._generateRegularResponse(query, topSources);
      }
    } catch (error) {
      throw new Error(`Failed to generate RAG answer: ${error.message}`);
    }
  }

  /**
   * Enhanced: Generate RAG answer and save AI-generated questions
   */
  async generateRAGAnswerAndSave(query, searchTypes = ['questions', 'tutorials'], maxResults = 5, structured = false, subject = null) {
    const ragResult = await this.generateRAGAnswer(query, searchTypes, maxResults, structured);
    // Save generated questions if present
    if (ragResult && ragResult.generated_similar_questions && Array.isArray(ragResult.generated_similar_questions)) {
      for (const q of ragResult.generated_similar_questions) {
        if (!q || typeof q !== 'object') continue; // Defensive: skip invalid
        await aiGenRepo.saveAIGeneratedQuestion(this.repository.supabase, {
          parent_exam_q_id: q.parent_exam_q_id || null,
          subject: subject || q.subject || '',
          content: q.content || '',
          choices: q.choices || [],
          answer: q.answer || '',
          ai_search_type: 'rag',
          metadata: q.metadata || null
        });
      }
    }
    return ragResult;
  }

  /**
   * Perform vector search across content types
   */
  async performVectorSearch(query, searchTypes = ['questions', 'tutorials'], maxResults = 5) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query);

      // Collect sources
      const allSources = await this._collectSourcesFromSearchTypes(queryEmbedding, searchTypes, maxResults);

      // Sort and limit results
      const topSources = AIHelper.sortAndLimitSources(allSources, maxResults);

      return {
        success: true,
        results: topSources,
        query,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to perform vector search: ${error.message}`);
    }
  }

  /**
   * Fuzzy search: combine original and AI-generated questions by subject
   */
  async fuzzySearchQuestions(queryText, subject) {
    // 1. Fuzzy search original questions
    const origQuestions = await this.repository.supabase
      .from('questions')
      .select('*')
      .ilike('subject', subject)
      .or(`content.ilike.%${queryText}%,answer.ilike.%${queryText}%`);
    // 2. Fuzzy search AI-generated questions
    const aiQuestions = await aiGenRepo.fuzzySearchAIGeneratedQuestions(subject, queryText);
    // 3. Combine and format
    return [
      ...(origQuestions.data || []),
      ...aiQuestions
    ];
  }

  /**
   * Private method to collect sources from different search types
   */
  async _collectSourcesFromSearchTypes(queryEmbedding, searchTypes, maxResults) {
    const allSources = [];

    for (const searchType of searchTypes) {
      try {
        const tableInfo = this.repository.getTableInfo(searchType);
        if (!tableInfo) continue;

        const { tableName, typeLabel } = tableInfo;

        // Perform vector search
        const similarItems = await vectorSearch(queryEmbedding, tableName, maxResults);
        console.log(`[RAG] Vector search for ${searchType} returned:`, similarItems);

        // Get full details for the similar items
        if (similarItems.length > 0) {
          const itemIds = similarItems.map(item => item.id);
          const items = await this.repository.getItemsByIds(tableName, itemIds);

          if (items.length > 0) {
            let examMetaMap = {};

            // Get exam metadata for questions
            if (tableName === 'questions') {
              const examPaperIds = AIHelper.extractExamPaperIds(items);

              if (examPaperIds.length > 0) {
                const examPapers = await this.repository.getExamPapersByIds(examPaperIds);
                examMetaMap = AIHelper.createExamMetaMap(examPapers);
              }
            }

            const formattedItems = AIHelper.formatItems(items, typeLabel, similarItems, examMetaMap);
            allSources.push(...formattedItems);
          }
        }
      } catch (error) {
        console.error(`Error searching ${searchType}:`, error);
        // Continue with other search types
      }
    }

    return allSources;
  }

  /**
   * Private method to generate structured response
   */
  async _generateStructuredResponse(query, topSources) {
    try {
      console.log('[RAG] Attempting to generate structured response...');

      let structuredAnswer;
      try {
        structuredAnswer = await generateStructuredRAGAnswer(query, topSources);
        console.log('[RAG] AI-generated structured response:', structuredAnswer);
      } catch (aiError) {
        console.log('[RAG] AI generation failed, using test response:', aiError.message);
        structuredAnswer = AIHelper.getTestStructuredAnswer();
      }

      const responseData = AIHelper.buildRAGResponse({
        query_answer: structuredAnswer.query_answer,
        question_exam_answer: structuredAnswer.question_exam_answer,
        generated_similar_questions: structuredAnswer.generated_similar_questions,
        sources: topSources,
        query
      });

      console.log('[RAG] Sending structured response');
      return responseData;
    } catch (structuredError) {
      console.error('[RAG] Failed to generate structured response:', structuredError);

      // Fallback to regular response with structured format
      try {
        const regularAnswer = await generateRAGAnswer(query, topSources);
        const fallbackData = AIHelper.buildRAGResponse({
          query_answer: regularAnswer,
          question_exam_answer: "Unable to generate detailed exam answer due to AI service limitations.",
          generated_similar_questions: [],
          sources: topSources,
          query
        });
        console.log('[RAG] Sending fallback structured response');
        return fallbackData;
      } catch (fallbackError) {
        console.error('[RAG] Fallback also failed:', fallbackError);
        const errorData = AIHelper.buildRAGResponse({
          query_answer: "Unable to generate AI response at this time. Please check your query or try again later.",
          question_exam_answer: "AI service temporarily unavailable.",
          generated_similar_questions: [],
          sources: topSources,
          query
        });
        console.log('[RAG] Sending error structured response');
        return errorData;
      }
    }
  }

  /**
   * Private method to generate regular response
   */
  async _generateRegularResponse(query, topSources) {
    const answer = await generateRAGAnswer(query, topSources);
    const regularData = AIHelper.buildRAGResponse({
      answer,
      sources: topSources,
      query
    });
    console.log('[RAG] Sending regular response');
    return regularData;
  }
}

module.exports = AIService;
