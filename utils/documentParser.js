const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs").promises;

/**
 * Extract text from PDF file
 */
async function extractFromPDF(filePath) {
  try {
    console.log(`Reading PDF file at: ${filePath}`);
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error reading file at ${filePath}:`, error);
    throw new Error(`PDF extraction failed at ${filePath}: ${error.message}`);
  }
}

/**
 * Extract text from DOCX file
 */
async function extractFromDOCX(filePath) {
  try {
    console.log(`Reading DOCX file at: ${filePath}`);
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error(`Error reading DOCX at ${filePath}:`, error);
    throw new Error(`DOCX extraction failed at ${filePath}: ${error.message}`);
  }
}

/**
 * Extract text from TXT file
 */
async function extractFromTXT(filePath) {
  try {
    console.log(`Reading TXT file at: ${filePath}`);
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    console.error(`Error reading TXT at ${filePath}:`, error);
    throw new Error(`TXT extraction failed at ${filePath}: ${error.message}`);
  }
}

/**
 * Extract text from JSON file
 */
async function extractFromJSON(filePath) {
  try {
    console.log(`Reading JSON file at: ${filePath}`);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading JSON at ${filePath}:`, error);
    throw new Error(`JSON parsing failed at ${filePath}: ${error.message}`);
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
