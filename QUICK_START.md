# Quick Start Guide: LaTeX & Document Upload Feature

## 🚀 Getting Started

This guide will help you quickly implement the LaTeX questions and document upload features.

---

## Step 1: Install Dependencies

Run this command to install all required packages:

```bash
npm install multer pdf-parse mammoth openai @google/generative-ai
```

**Optional packages:**

```bash
npm install sharp tesseract.js  # For image processing and OCR
```

---

## Step 2: Update Environment Variables

Add these to your `.env` file:

```env
# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=uploads/documents

# AI Configuration (Optional - choose one)
OPENAI_API_KEY=your_openai_api_key_here
# OR
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Step 3: Create Directory Structure

```bash
mkdir -p uploads/documents uploads/temp
```

Update `.gitignore`:

```
uploads/
```

---

## Step 4: Update Question Model

Add LaTeX support to your Question model:

**File: `models/Question.js`**

Add these fields after the existing fields:

```javascript
hasLatex: {
  type: Boolean,
  default: false,
},
metadata: {
  source: {
    type: String,
    enum: ['manual', 'document', 'bulk'],
    default: 'manual'
  },
  documentName: String,
  extractedAt: Date,
}
```

---

## Step 5: Create Upload Model

**File: `models/Upload.js`** (New file)

```javascript
const mongoose = require("mongoose");

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
    extractedQuestions: Number,
    errorMessage: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Upload", uploadSchema);
```

---

## Step 6: Create Upload Middleware

**File: `middleware/uploadMiddleware.js`** (New file)

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

  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX, TXT, and JSON files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter: fileFilter,
});

module.exports = upload;
```

---

## Step 7: Create Document Parser Utility

**File: `utils/documentParser.js`** (New file)

```javascript
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
```

---

## Step 8: Create Question Extractor Utility

**File: `utils/questionExtractor.js`** (New file)

```javascript
/**
 * Extract questions from text using pattern matching
 * Supports multiple question formats
 */
function extractQuestionsFromText(text) {
  const questions = [];

  // Split text into potential question blocks
  const blocks = text.split(/\n\s*\n/);

  for (const block of blocks) {
    const question = parseQuestionBlock(block);
    if (question) {
      questions.push(question);
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
  const questionMatch = lines[0].match(/^\d+\.\s*(.+)$/);
  if (!questionMatch) return null;

  const questionText = questionMatch[1].trim();

  // Extract options
  const options = [];
  const optionPattern = /^([A-F])\)\s*(.+)$/;

  for (let i = 1; i < lines.length; i++) {
    const optionMatch = lines[i].match(optionPattern);
    if (optionMatch) {
      options.push(optionMatch[2].trim());
    }
  }

  if (options.length < 2) return null;

  // Extract answer
  const answerLine = lines.find((line) => line.match(/^(Answer|Correct):/i));
  if (!answerLine) return null;

  const answerMatch = answerLine.match(/^(?:Answer|Correct):\s*([A-F])/i);
  if (!answerMatch) return null;

  const answerLetter = answerMatch[1].toUpperCase();
  const correctAnswer = answerLetter.charCodeAt(0) - "A".charCodeAt(0);

  // Extract explanation (optional)
  const explanationLine = lines.find((line) => line.match(/^Explanation:/i));
  const explanation = explanationLine
    ? explanationLine.replace(/^Explanation:\s*/i, "").trim()
    : undefined;

  // Check if question contains LaTeX
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
```

---

## Step 9: Create Upload Controller

**File: `controllers/uploadController.js`** (New file)

```javascript
const Upload = require("../models/Upload");
const Question = require("../models/Question");
const { extractText } = require("../utils/documentParser");
const {
  extractQuestionsFromText,
  extractQuestionsFromJSON,
} = require("../utils/questionExtractor");
const fs = require("fs").promises;
const path = require("path");

/**
 * Upload document and extract questions
 * @route POST /api/admin/questions/upload
 */
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { course, difficulty, autoApprove } = req.body;
    const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();

    // Create upload record
    const upload = await Upload.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      filePath: req.file.path,
      uploadedBy: req.admin._id,
      status: "processing",
    });

    try {
      // Extract text from document
      const extractedContent = await extractText(req.file.path, fileType);

      // Extract questions
      let extractedQuestions;
      if (fileType === "json") {
        extractedQuestions = extractQuestionsFromJSON(extractedContent);
      } else {
        extractedQuestions = extractQuestionsFromText(extractedContent);
      }

      // Add default values
      extractedQuestions = extractedQuestions.map((q) => ({
        ...q,
        course: q.course || course || "General",
        difficulty: q.difficulty || difficulty || "medium",
        points: q.points || 10,
        isActive: false, // Set to false until approved
        metadata: {
          source: "document",
          documentName: req.file.originalname,
          extractedAt: new Date(),
        },
      }));

      // If autoApprove is true, save questions immediately
      if (autoApprove === "true") {
        const savedQuestions = await Question.insertMany(
          extractedQuestions.map((q) => ({ ...q, isActive: true })),
        );

        upload.status = "completed";
        upload.extractedQuestions = savedQuestions.length;
        await upload.save();

        // Clean up file
        await fs.unlink(req.file.path);

        return res.status(201).json({
          success: true,
          message: "Questions extracted and saved successfully",
          uploadId: upload._id,
          totalExtracted: savedQuestions.length,
          questions: savedQuestions,
        });
      }

      // Otherwise, return for review
      upload.status = "completed";
      upload.extractedQuestions = extractedQuestions.length;
      await upload.save();

      res.json({
        success: true,
        message:
          "Questions extracted successfully. Review and approve to save.",
        uploadId: upload._id,
        fileName: req.file.originalname,
        totalExtracted: extractedQuestions.length,
        extractedQuestions,
      });
    } catch (extractionError) {
      upload.status = "failed";
      upload.errorMessage = extractionError.message;
      await upload.save();

      // Clean up file
      await fs.unlink(req.file.path);

      throw extractionError;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get upload details
 * @route GET /api/admin/questions/uploads/:uploadId
 */
exports.getUploadDetails = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.uploadId).populate(
      "uploadedBy",
      "username email",
    );

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    res.json({
      success: true,
      data: upload,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Approve and save extracted questions
 * @route POST /api/admin/questions/uploads/:uploadId/approve
 */
exports.approveQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide questions array",
      });
    }

    // Set questions as active and save
    const questionsToSave = questions.map((q) => ({
      ...q,
      isActive: true,
    }));

    const savedQuestions = await Question.insertMany(questionsToSave);

    res.status(201).json({
      success: true,
      message: "Questions approved and saved successfully",
      count: savedQuestions.length,
      data: savedQuestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all uploads
 * @route GET /api/admin/questions/uploads
 */
exports.getUploads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const uploads = await Upload.find()
      .populate("uploadedBy", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Upload.countDocuments();

    res.json({
      success: true,
      data: uploads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
```

---

## Step 10: Create Upload Routes

**File: `routes/uploadRoutes.js`** (New file)

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

// All routes require authentication
router.use(protect);

router.post("/upload", upload.single("file"), uploadDocument);
router.get("/uploads", getUploads);
router.get("/uploads/:uploadId", getUploadDetails);
router.post("/uploads/:uploadId/approve", approveQuestions);

module.exports = router;
```

---

## Step 11: Update Main App

**File: `index.js`**

Add this line after other route imports:

```javascript
const uploadRoutes = require("./routes/uploadRoutes");

// ... existing routes ...

app.use("/api/admin/questions", uploadRoutes);
```

---

## Step 12: Test the Implementation

### Test 1: Create a sample text file

**File: `test_questions.txt`**

```
1. What is the derivative of $x^2$?
A) $2x$
B) $x$
C) $2$
D) $x^2$
Answer: A
Explanation: Using the power rule, $\frac{d}{dx}(x^n) = nx^{n-1}$

2. What is $2 + 2$?
A) 3
B) 4
C) 5
D) 6
Answer: B
Explanation: Basic arithmetic
```

### Test 2: Upload using cURL

```bash
curl -X POST http://localhost:5000/api/admin/questions/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_questions.txt" \
  -F "course=Mathematics" \
  -F "difficulty=easy"
```

### Test 3: Upload using Postman

1. Method: POST
2. URL: `http://localhost:5000/api/admin/questions/upload`
3. Headers: `Authorization: Bearer YOUR_TOKEN`
4. Body: form-data
   - Key: `file`, Type: File, Value: Select your file
   - Key: `course`, Type: Text, Value: `Mathematics`
   - Key: `difficulty`, Type: Text, Value: `easy`

---

## 📝 Summary of New Endpoints

| Method | Endpoint                                         | Description                           |
| ------ | ------------------------------------------------ | ------------------------------------- |
| POST   | `/api/admin/questions/upload`                    | Upload document and extract questions |
| GET    | `/api/admin/questions/uploads`                   | Get all uploads                       |
| GET    | `/api/admin/questions/uploads/:uploadId`         | Get upload details                    |
| POST   | `/api/admin/questions/uploads/:uploadId/approve` | Approve extracted questions           |

---

## 🎯 Next Steps

1. ✅ Install dependencies
2. ✅ Update models
3. ✅ Create utilities
4. ✅ Create controllers and routes
5. ✅ Test with sample files
6. 🔄 Integrate with frontend
7. 🔄 Add AI-powered extraction (optional)

---

## 💡 Tips

- Start with simple TXT files for testing
- Test LaTeX rendering on frontend with KaTeX
- Use the pattern matching extractor first
- Add AI extraction later for better accuracy
- Always review extracted questions before approval

---

## 🐛 Troubleshooting

**File upload fails:**

- Check `uploads/documents` directory exists
- Check file size limits
- Check file type validation

**Question extraction fails:**

- Verify question format matches pattern
- Check for proper Answer: line
- Ensure options are labeled A), B), C), etc.

**LaTeX not rendering:**

- Verify `hasLatex` flag is set
- Check LaTeX syntax with $ delimiters
- Use KaTeX or MathJax on frontend

---

Need help? Check the full `IMPLEMENTATION_PLAN.md` for detailed information!
