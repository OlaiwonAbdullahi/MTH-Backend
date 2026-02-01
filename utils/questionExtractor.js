/**
 * Extract questions from text using pattern matching
 * Supports multiple question formats
 */
function extractQuestionsFromText(text) {
  const questions = [];

  // Split text into potential question blocks
  // Looking for pattern: number followed by question, then options A), B)...
  const blocks = text.split(/(?=\d+\.\s+)/);

  for (const block of blocks) {
    if (block.trim()) {
      const question = parseQuestionBlock(block);
      if (question) {
        questions.push(question);
      }
    }
  }

  return questions;
}

/**
 * Parse a single question block
 * Format:
 * 1. Question text?
 * A) Option 1
 * B) Option 2
 * C) Option 3
 * D) Option 4
 * Answer: A
 * Explanation: ... (optional)
 */
function parseQuestionBlock(block) {
  const lines = block.trim().split("\n");

  // Extract question (first line, remove number)
  // Pattern: "1. Question text" or "1 Question text"
  const questionMatch = lines[0].match(/^\d+[\.\s]+(.+)$/);
  if (!questionMatch) return null;

  const questionText = questionMatch[1].trim();

  // Extract options
  const options = [];
  const optionLetterMap = new Map();
  const optionPattern = /^([A-F])[)\]\.]\s*(.+)$/;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const optionMatch = line.match(optionPattern);
    if (optionMatch) {
      const letter = optionMatch[1].toUpperCase();
      const text = optionMatch[2].trim();
      optionLetterMap.set(letter, options.length);
      options.push(text);
    }
  }

  if (options.length < 2) return null;

  // Extract answer
  // Looking for "Answer: A" or "Correct: B" or just "A" at the end of a line
  const answerLine = lines.find((line) => line.match(/^(Answer|Correct):/i));
  let correctAnswer = -1;

  if (answerLine) {
    const answerMatch = answerLine.match(/^(?:Answer|Correct):\s*([A-F])/i);
    if (answerMatch) {
      const answerLetter = answerMatch[1].toUpperCase();
      if (optionLetterMap.has(answerLetter)) {
        correctAnswer = optionLetterMap.get(answerLetter);
      }
    }
  }

  if (correctAnswer === -1) return null;

  // Extract explanation (optional)
  const explanationLine = lines.find((line) => line.match(/^Explanation:/i));
  const explanation = explanationLine
    ? explanationLine.replace(/^Explanation:\s*/i, "").trim()
    : undefined;

  // Check if question contains LaTeX (basic check for $ notation)
  const hasLatex =
    /\$[^$]+\$/.test(questionText) ||
    options.some((opt) => /\$[^$]+\$/.test(opt));

  return {
    question: questionText,
    options,
    correctAnswer,
    explanation,
    hasLatex,
    metadata: {
      source: "document",
    },
  };
}

/**
 * Extract questions from JSON format
 */
function extractQuestionsFromJSON(jsonData) {
  if (Array.isArray(jsonData)) {
    return jsonData;
  } else if (jsonData.questions && Array.isArray(jsonData.questions)) {
    return jsonData.questions;
  }
  throw new Error(
    "Invalid JSON format. Expected array of questions or {questions: [...]}",
  );
}

module.exports = {
  extractQuestionsFromText,
  extractQuestionsFromJSON,
  parseQuestionBlock,
};
