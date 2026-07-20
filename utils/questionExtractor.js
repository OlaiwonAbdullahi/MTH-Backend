/**
 * Extract questions from text using pattern matching
 * Supports multiple question formats
 */
function extractQuestionsFromText(text) {
  const questions = [];
  let skipped = 0;

  // Split text into potential question blocks
  // Looking for pattern: number followed by question, then options A), B)...
  const blocks = text.split(/(?=\d+\.\s+)/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const question = parseQuestionBlock(block);
    if (question) {
      questions.push(question);
    } else if (/^\d+[.\s]/.test(trimmed)) {
      // Looked like a numbered question but failed to parse (missing
      // options or an "Answer:" line) - worth flagging to the admin.
      skipped += 1;
    }
  }

  return { questions, skipped };
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

/**
 * Parse a single CSV line, honoring double-quoted fields that may
 * contain commas or escaped quotes ("").
 */
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * Extract questions from CSV text.
 * Expected header row: question,option1,option2,option3,option4,answer,explanation,difficulty,points
 * `answer` may be a letter (A-F) or the 1-based option number.
 */
function extractQuestionsFromCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    throw new Error("CSV must contain a header row and at least one question");
  }

  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const questionIdx = header.indexOf("question");
  const answerIdx = header.indexOf("answer");
  const explanationIdx = header.indexOf("explanation");
  const difficultyIdx = header.indexOf("difficulty");
  const pointsIdx = header.indexOf("points");
  const optionIndexes = header
    .map((h, idx) => ({ h, idx }))
    .filter(({ h }) => /^option\d*$/.test(h))
    .map(({ idx }) => idx);

  if (questionIdx === -1 || answerIdx === -1 || optionIndexes.length < 2) {
    throw new Error(
      "CSV header must include: question, option1, option2 (up to option6), answer",
    );
  }

  const questions = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const questionText = fields[questionIdx]?.trim();
    const options = optionIndexes
      .map((idx) => fields[idx]?.trim())
      .filter((opt) => opt);

    if (!questionText || options.length < 2) {
      skipped += 1;
      continue;
    }

    const rawAnswer = fields[answerIdx]?.trim();
    let correctAnswer = -1;
    if (/^[A-Fa-f]$/.test(rawAnswer)) {
      correctAnswer = rawAnswer.toUpperCase().charCodeAt(0) - 65;
    } else if (/^\d+$/.test(rawAnswer)) {
      correctAnswer = Number(rawAnswer) - 1;
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      skipped += 1;
      continue;
    }

    questions.push({
      question: questionText,
      options,
      correctAnswer,
      explanation:
        explanationIdx !== -1 ? fields[explanationIdx]?.trim() || undefined : undefined,
      difficulty:
        difficultyIdx !== -1 ? fields[difficultyIdx]?.trim() || undefined : undefined,
      points: pointsIdx !== -1 && fields[pointsIdx] ? Number(fields[pointsIdx]) : undefined,
      hasLatex:
        /\$[^$]+\$/.test(questionText) ||
        options.some((opt) => /\$[^$]+\$/.test(opt)),
      metadata: { source: "document" },
    });
  }

  return { questions, skipped };
}

module.exports = {
  extractQuestionsFromText,
  extractQuestionsFromJSON,
  extractQuestionsFromCSV,
  parseQuestionBlock,
};
