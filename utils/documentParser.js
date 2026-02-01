const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs").promises;

/**
 * Extract text from PDF file
 */
async function extractFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from DOCX file
 */
async function extractFromDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from TXT file
 */
async function extractFromTXT(filePath) {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    throw new Error(`TXT extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from JSON file
 */
async function extractFromJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}

/**
 * Main extraction function - routes to appropriate extractor
 */
async function extractText(filePath, fileType) {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return await extractFromPDF(filePath);
    case "docx":
      return await extractFromDOCX(filePath);
    case "txt":
      return await extractFromTXT(filePath);
    case "json":
      return await extractFromJSON(filePath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

module.exports = {
  extractText,
  extractFromPDF,
  extractFromDOCX,
  extractFromTXT,
  extractFromJSON,
};
