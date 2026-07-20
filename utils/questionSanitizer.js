/**
 * Normalize + validate question objects returned by an AI extractor,
 * dropping anything that doesn't resolve to a usable question.
 */
function sanitizeExtractedQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions
    .filter(
      (q) =>
        q &&
        typeof q.question === "string" &&
        q.question.trim() &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.length <= 6 &&
        Number.isInteger(q.correctAnswer) &&
        q.correctAnswer >= 0 &&
        q.correctAnswer < q.options.length,
    )
    .map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => String(o).trim()),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ? String(q.explanation).trim() : undefined,
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty)
        ? q.difficulty
        : undefined,
      hasLatex:
        /\$[^$]+\$/.test(q.question) ||
        q.options.some((o) => /\$[^$]+\$/.test(String(o))),
      metadata: { source: "ai" },
    }));
}

module.exports = { sanitizeExtractedQuestions };
