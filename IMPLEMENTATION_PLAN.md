# Implementation Plan: LaTeX Questions & Document Upload Feature

## Overview

This document outlines the implementation plan for adding two major features to the MTH-Backend quiz application:

1. **LaTeX Question Support**: Allow admins to create questions with LaTeX mathematical notation
2. **Document Upload & Question Extraction**: Upload documents (PDF, DOCX, TXT) and automatically extract questions

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Required Dependencies](#required-dependencies)
- [Database Schema Updates](#database-schema-updates)
- [New Endpoints](#new-endpoints)
- [Implementation Steps](#implementation-steps)
- [File Structure](#file-structure)
- [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Feature 1: LaTeX Question Support

**Flow:**

1. Admin creates question with LaTeX notation in question/options/explanation
2. Backend stores LaTeX as-is in the database
3. Frontend renders LaTeX using a library like KaTeX or MathJax
4. Questions can be created via regular POST or bulk upload

**Example LaTeX Question:**

```json
{
  "question": "Solve for $x$: $\\frac{d}{dx}(x^2 + 3x) = ?$",
  "options": ["$2x + 3$", "$x^2 + 3$", "$2x$", "$3x$"],
  "correctAnswer": 0,
  "course": "Calculus",
  "hasLatex": true
}
```

### Feature 2: Document Upload & Question Extraction

**Flow:**

1. Admin uploads document (PDF, DOCX, TXT)
2. Backend extracts text from document
3. AI/Parser extracts questions based on patterns
4. Admin reviews extracted questions
5. Admin approves and saves questions to database

**Supported Formats:**

- **PDF**: Extract text and parse questions
- **DOCX**: Extract text and parse questions
- **TXT**: Parse questions directly
- **JSON**: Bulk import pre-formatted questions

---

## Required Dependencies

### Install the following packages:

```bash
npm install multer              # File upload handling
npm install pdf-parse           # PDF text extraction
npm install mammoth             # DOCX text extraction
npm install openai              # OpenAI API for intelligent extraction (optional)
npm install @google/generative-ai  # Google Gemini API (alternative to OpenAI)
```

### Optional (for advanced features):

```bash
npm install sharp               # Image processing (if questions have images)
npm install tesseract.js        # OCR for scanned PDFs
```

---

## Database Schema Updates

### Update Question Model

Add new fields to support LaTeX and metadata:

```javascript
// models/Question.js - Add these fields

const questionSchema = new mongoose.Schema({
  // ... existing fields ...

  hasLatex: {
    type: Boolean,
    default: false,
  },
  images: [
    {
      url: String,
      caption: String,
    },
  ],
  metadata: {
    source: {
      type: String, // 'manual', 'document', 'bulk'
      default: "manual",
    },
    documentName: String,
    extractedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
});
```

### Create Upload Model

Track uploaded documents:

```javascript
// models/Upload.js

const uploadSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["pdf", "docx", "txt", "json"],
      required: true,
    },
    fileSize: Number,
    filePath: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    extractedQuestions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
    totalQuestionsExtracted: {
      type: Number,
      default: 0,
    },
    errorMessage: String,
  },
  {
    timestamps: true,
  },
);
```

---

## New Endpoints

### 1. Upload Document for Question Extraction

```http
POST /api/admin/questions/upload
```

**Description:** Upload a document and extract questions

**Request:**

- Content-Type: `multipart/form-data`
- Body:
  - `file`: Document file (PDF, DOCX, TXT, JSON)
  - `course`: Course name (optional)
  - `difficulty`: Default difficulty (optional)
  - `autoApprove`: Boolean - auto-save questions (optional)

**Response:**

```json
{
  "success": true,
  "uploadId": "507f1f77bcf86cd799439011",
  "fileName": "calculus_questions.pdf",
  "extractedQuestions": [
    {
      "question": "What is the derivative of $x^2$?",
      "options": ["$2x$", "$x$", "$2$", "$x^2$"],
      "correctAnswer": 0,
      "hasLatex": true,
      "confidence": 0.95
    }
  ],
  "totalExtracted": 25,
  "message": "Questions extracted successfully. Review and approve to save."
}
```

### 2. Review Extracted Questions

```http
GET /api/admin/questions/uploads/:uploadId
```

**Description:** Get details of an upload and its extracted questions

### 3. Approve Extracted Questions

```http
POST /api/admin/questions/uploads/:uploadId/approve
```

**Description:** Approve and save extracted questions to database

**Request Body:**

```json
{
  "questionIds": ["temp_id_1", "temp_id_2"], // IDs of questions to approve
  "course": "Calculus",
  "difficulty": "medium"
}
```

### 4. Create LaTeX Question

```http
POST /api/admin/questions/latex
```

**Description:** Create a question with LaTeX support (validates LaTeX syntax)

**Request Body:**

```json
{
  "question": "Solve: $\\int x^2 dx = ?$",
  "options": [
    "$\\frac{x^3}{3} + C$",
    "$2x + C$",
    "$x^3 + C$",
    "$\\frac{x^2}{2} + C$"
  ],
  "correctAnswer": 0,
  "course": "Calculus",
  "difficulty": "medium",
  "explanation": "Using the power rule: $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$"
}
```

---

## Implementation Steps

### Phase 1: Setup & Dependencies (Day 1)

1. **Install required packages**

   ```bash
   npm install multer pdf-parse mammoth openai
   ```

2. **Create uploads directory**

   ```bash
   mkdir uploads
   mkdir uploads/temp
   mkdir uploads/documents
   ```

3. **Update .gitignore**

   ```
   uploads/
   ```

4. **Add environment variables** (`.env`)
   ```env
   OPENAI_API_KEY=your_openai_api_key  # Optional for AI extraction
   GEMINI_API_KEY=your_gemini_api_key  # Alternative to OpenAI
   MAX_FILE_SIZE=10485760  # 10MB
   ```

### Phase 2: Database Models (Day 1)

1. **Update Question Model** (`models/Question.js`)
   - Add `hasLatex`, `images`, `metadata` fields

2. **Create Upload Model** (`models/Upload.js`)
   - Track document uploads and extraction status

### Phase 3: File Upload Middleware (Day 2)

1. **Create upload middleware** (`middleware/uploadMiddleware.js`)

   ```javascript
   const multer = require("multer");
   const path = require("path");

   const storage = multer.diskStorage({
     destination: (req, file, cb) => {
       cb(null, "uploads/documents");
     },
     filename: (req, file, cb) => {
       const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
       cb(
         null,
         file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
       );
     },
   });

   const fileFilter = (req, file, cb) => {
     const allowedTypes = /pdf|docx|txt|json/;
     const extname = allowedTypes.test(
       path.extname(file.originalname).toLowerCase(),
     );
     const mimetype = allowedTypes.test(file.mimetype);

     if (mimetype && extname) {
       return cb(null, true);
     } else {
       cb(new Error("Only PDF, DOCX, TXT, and JSON files are allowed"));
     }
   };

   const upload = multer({
     storage: storage,
     limits: { fileSize: process.env.MAX_FILE_SIZE || 10485760 }, // 10MB
     fileFilter: fileFilter,
   });

   module.exports = upload;
   ```

### Phase 4: Document Processing Utilities (Day 2-3)

1. **Create document parser** (`utils/documentParser.js`)

   ```javascript
   const pdfParse = require("pdf-parse");
   const mammoth = require("mammoth");
   const fs = require("fs").promises;

   // Extract text from PDF
   async function extractFromPDF(filePath) {
     const dataBuffer = await fs.readFile(filePath);
     const data = await pdfParse(dataBuffer);
     return data.text;
   }

   // Extract text from DOCX
   async function extractFromDOCX(filePath) {
     const result = await mammoth.extractRawText({ path: filePath });
     return result.value;
   }

   // Extract text from TXT
   async function extractFromTXT(filePath) {
     return await fs.readFile(filePath, "utf-8");
   }

   module.exports = {
     extractFromPDF,
     extractFromDOCX,
     extractFromTXT,
   };
   ```

2. **Create question extractor** (`utils/questionExtractor.js`)

   ```javascript
   // Pattern-based extraction for structured documents
   function extractQuestionsFromText(text) {
     const questions = [];

     // Pattern 1: Numbered questions with options
     // Example:
     // 1. What is 2+2?
     // A) 3
     // B) 4
     // C) 5
     // Answer: B

     const pattern =
       /(\d+)\.\s*(.+?)\n(?:([A-F])\)\s*(.+?)\n)+(?:Answer|Correct):\s*([A-F])/gi;

     // ... extraction logic ...

     return questions;
   }

   // AI-powered extraction using OpenAI/Gemini
   async function extractQuestionsWithAI(text, apiKey) {
     // Use OpenAI or Gemini to intelligently extract questions
     // ... AI logic ...
   }

   module.exports = {
     extractQuestionsFromText,
     extractQuestionsWithAI,
   };
   ```

### Phase 5: Controllers (Day 3-4)

1. **Create upload controller** (`controllers/uploadController.js`)
   - Handle file upload
   - Extract text from document
   - Parse questions
   - Return extracted questions for review

2. **Update admin controller** (`controllers/adminController.js`)
   - Add LaTeX question creation
   - Add question approval endpoint

### Phase 6: Routes (Day 4)

1. **Create upload routes** (`routes/uploadRoutes.js`)

   ```javascript
   const express = require("express");
   const router = express.Router();
   const upload = require("../middleware/uploadMiddleware");
   const { protect } = require("../middleware/authMiddleware");
   const {
     uploadDocument,
     getUploadDetails,
     approveQuestions,
     getUploads,
   } = require("../controllers/uploadController");

   router.use(protect);

   router.post("/upload", upload.single("file"), uploadDocument);
   router.get("/uploads", getUploads);
   router.get("/uploads/:uploadId", getUploadDetails);
   router.post("/uploads/:uploadId/approve", approveQuestions);

   module.exports = router;
   ```

2. **Update main app** (`index.js`)
   ```javascript
   const uploadRoutes = require("./routes/uploadRoutes");
   app.use("/api/admin/questions", uploadRoutes);
   ```

### Phase 7: Frontend Integration (Day 5)

1. **LaTeX Rendering**
   - Use KaTeX or MathJax on frontend
   - Add `hasLatex` flag to conditionally render

2. **File Upload UI**
   - Drag-and-drop file upload
   - Progress indicator
   - Question review interface

### Phase 8: Testing (Day 6)

1. Test file uploads
2. Test question extraction
3. Test LaTeX rendering
4. Test approval workflow

---

## File Structure

```
MTH-Backend/
├── controllers/
│   ├── adminController.js (updated)
│   ├── authController.js
│   ├── quizController.js
│   └── uploadController.js (new)
├── middleware/
│   ├── authMiddleware.js
│   └── uploadMiddleware.js (new)
├── models/
│   ├── Admin.js
│   ├── Question.js (updated)
│   ├── QuizSession.js
│   └── Upload.js (new)
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── quizRoutes.js
│   └── uploadRoutes.js (new)
├── utils/
│   ├── documentParser.js (new)
│   ├── questionExtractor.js (new)
│   └── latexValidator.js (new)
├── uploads/
│   ├── documents/
│   └── temp/
├── .env
├── .gitignore (updated)
├── index.js (updated)
└── package.json (updated)
```

---

## Question Extraction Patterns

### Pattern 1: Standard Multiple Choice

```
1. What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
Answer: B
Explanation: Paris is the capital of France.
```

### Pattern 2: LaTeX Questions

```
1. Solve for x: $x^2 + 5x + 6 = 0$
A) $x = -2, -3$
B) $x = 2, 3$
C) $x = -1, -6$
D) $x = 1, 6$
Answer: A
```

### Pattern 3: JSON Format

```json
[
  {
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": 1,
    "course": "Mathematics",
    "difficulty": "easy"
  }
]
```

---

## AI-Powered Extraction (Optional)

### Using OpenAI GPT

```javascript
const OpenAI = require("openai");

async function extractWithOpenAI(text) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
Extract quiz questions from the following text. 
Format each question as JSON with fields: question, options (array), correctAnswer (index), explanation.
Preserve any LaTeX notation using $ delimiters.

Text:
${text}
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Using Google Gemini

```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function extractWithGemini(text) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
Extract quiz questions from the following text...
${text}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text());
}
```

---

## Testing Strategy

### Unit Tests

1. **Document Parser Tests**
   - Test PDF extraction
   - Test DOCX extraction
   - Test TXT extraction

2. **Question Extractor Tests**
   - Test pattern matching
   - Test LaTeX preservation
   - Test edge cases

### Integration Tests

1. **Upload Endpoint Tests**
   - Test file upload
   - Test file validation
   - Test extraction workflow

2. **Approval Endpoint Tests**
   - Test question approval
   - Test bulk approval

### Manual Testing

1. Upload sample documents
2. Verify question extraction accuracy
3. Test LaTeX rendering on frontend
4. Test approval workflow

---

## Sample Documents for Testing

### Sample 1: calculus_questions.txt

```
1. What is the derivative of $x^2$?
A) $2x$
B) $x$
C) $2$
D) $x^2$
Answer: A
Explanation: Using the power rule, $\frac{d}{dx}(x^n) = nx^{n-1}$

2. Evaluate: $\int_0^1 x dx$
A) $\frac{1}{2}$
B) $1$
C) $0$
D) $2$
Answer: A
```

### Sample 2: questions.json

```json
{
  "questions": [
    {
      "question": "Solve: $\\lim_{x \\to 0} \\frac{\\sin x}{x}$",
      "options": ["$0$", "$1$", "$\\infty$", "undefined"],
      "correctAnswer": 1,
      "course": "Calculus",
      "difficulty": "medium",
      "hasLatex": true
    }
  ]
}
```

---

## Security Considerations

1. **File Validation**
   - Validate file types
   - Limit file sizes
   - Scan for malware (optional)

2. **Authentication**
   - Only authenticated admins can upload
   - Track who uploaded what

3. **Storage**
   - Store files securely
   - Clean up temporary files
   - Implement file retention policy

4. **Rate Limiting**
   - Limit upload frequency
   - Prevent abuse

---

## Performance Optimization

1. **Async Processing**
   - Process large documents asynchronously
   - Use job queues (Bull, BullMQ)

2. **Caching**
   - Cache extracted questions
   - Cache document metadata

3. **Cleanup**
   - Delete processed files after extraction
   - Implement cleanup cron job

---

## Future Enhancements

1. **Image Support**
   - Extract images from PDFs
   - Support questions with diagrams

2. **OCR Support**
   - Extract text from scanned PDFs
   - Use Tesseract.js

3. **Batch Processing**
   - Upload multiple documents
   - Process in background

4. **Question Templates**
   - Define custom extraction patterns
   - Support different question formats

5. **Collaborative Review**
   - Multiple admins review questions
   - Approval workflow

---

## Estimated Timeline

- **Phase 1-2**: 1 day (Setup & Models)
- **Phase 3-4**: 2 days (Middleware & Utils)
- **Phase 5-6**: 2 days (Controllers & Routes)
- **Phase 7**: 1 day (Frontend Integration)
- **Phase 8**: 1 day (Testing)

**Total**: ~7 days for full implementation

---

## Next Steps

1. Review this implementation plan
2. Install required dependencies
3. Start with Phase 1 (Setup)
4. Implement features incrementally
5. Test thoroughly before deployment

---

## Questions?

If you have any questions or need clarification on any part of this implementation plan, please let me know!
