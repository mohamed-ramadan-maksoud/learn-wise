// Service for tutorials business logic
const TutorialRepository = require('./tutorial.repository');
const { generateEmbedding } = require('../../utils/ai');

class TutorialService {
  constructor(supabase) {
    this.supabase = supabase;
    this.repo = new TutorialRepository(supabase);
  }

  async uploadTutorial(tutorialPayload) {
    const results = [];
    for (const para of tutorialPayload.paragraphs) {
      // Generate embedding for each paragraph using AI
      const embedding = await generateEmbedding(para.content);
      const paragraph = {
        id: tutorialPayload.id,
        title: tutorialPayload.title,
        subject: tutorialPayload.subject,
        chapter: tutorialPayload.chapter,
        tags: tutorialPayload.tags,
        difficulty: tutorialPayload.difficulty,
        type: tutorialPayload.type,
        media_url: tutorialPayload.media_url,
        duration: tutorialPayload.duration,
        author_id: tutorialPayload.author_id,
        paragraph_number: para.paragraph_number,
        content: para.content,
        embedding
      };
      const { data, error } = await this.repo.upsertParagraph(paragraph);
      results.push({ data, error });
    }
    return results;
  }

  async ragSearch(query, maxResults = 5) {
    const queryEmbedding = await generateEmbedding(query);
    const { data: topSources, error } = await this.repo.getParagraphsByQueryEmbedding(queryEmbedding, maxResults);
    if (error) {
      return { data: undefined, error, queryEmbedding };
    }
    // Create AIService instance and use _generateStructuredResponse
    const AIService = require('../ai/ai.service');
    const aiService = new AIService(this.supabase);
    const structuredResponse = await aiService._generateStructuredResponse(query, topSources);

    // Transform the response for tutorial-specific schema
    if (structuredResponse && structuredResponse.question_exam_answer) {
      structuredResponse.summary_by_ai = structuredResponse.question_exam_answer;
      delete structuredResponse.question_exam_answer;
    }

    // Transform generated_similar_questions to generated_questions
    if (structuredResponse && structuredResponse.generated_similar_questions) {
      structuredResponse.generated_questions = structuredResponse.generated_similar_questions;
      delete structuredResponse.generated_similar_questions;
    }

    return { data: structuredResponse, error: null, queryEmbedding };
  }
}

module.exports = TutorialService;
