const { sanitizeExtractedQuestions } = require("./questionSanitizer");

const ENDPOINT = "https://ai.hackclub.com/proxy/v1/chat/completions";
const MODEL = process.env.HACKCLUB_MODEL || "qwen/qwen3-32b";
const MAX_TEXT_LENGTH = 100000;

const SYSTEM_PROMPT =
  "You extract multiple-choice quiz questions and their correct answers from raw, messy " +
  "document text. Formatting may be inconsistent (numbered lists, lettered options, inline " +
  "answers, an answer key at the end, etc). Identify every distinct question you can " +
  "confidently match to its options and correct answer; skip anything you can't confidently " +
  "resolve rather than guessing. Preserve math notation (LaTeX between $ signs) exactly. " +
  'Respond with ONLY a JSON object of the exact shape {"questions":[{"question":string,' +
  '"options":string[2..6],"correctAnswer":number (zero-based index into options),' +
  '"explanation":string (optional),"difficulty":"easy"|"medium"|"hard" (optional)}]} ' +
  "and nothing else - no markdown fences, no commentary.";

function extractJSON(content) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1] : content;
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in AI response");
  }
  return JSON.parse(jsonText.slice(start, end + 1));
}

/**
 * Free, keyless fallback for AI-based question deciphering, using Hack
 * Club's OpenAI-compatible chat completions proxy (https://ai.hackclub.com).
 * Used when ANTHROPIC_API_KEY isn't configured, so extraction still works
 * out of the box without requiring any paid API setup.
 */
async function extractQuestionsWithHackClub(text) {
  const truncated = text.slice(0, MAX_TEXT_LENGTH);

  const headers = { "Content-Type": "application/json" };
  if (process.env.HACKCLUB_API_KEY) {
    headers.Authorization = `Bearer ${process.env.HACKCLUB_API_KEY}`;
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract every multiple-choice question, its options, and the correct answer from this document:\n\n${truncated}`,
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Hack Club AI request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Hack Club AI returned an empty response");
  }

  const parsed = extractJSON(content);
  const questions = sanitizeExtractedQuestions(parsed.questions);
  if (questions.length === 0) {
    throw new Error("Hack Club AI extraction returned no usable questions");
  }
  return questions;
}

function isConfigured() {
  return Boolean(process.env.HACKCLUB_API_KEY);
}

module.exports = { extractQuestionsWithHackClub, isConfigured };
