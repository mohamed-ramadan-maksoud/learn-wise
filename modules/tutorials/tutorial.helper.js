// Helper for tutorials (e.g., chunking, formatting)
class TutorialHelper {
  static chunkContentToParagraphs(content) {
    // Split by double newlines or single newlines as fallback
    return content.split(/\n\n|\n/).map((para, idx) => ({
      paragraph_number: idx + 1,
      content: para.trim()
    })).filter(p => p.content.length > 0);
  }
}

module.exports = TutorialHelper;
