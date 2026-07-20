const Upload = require("../models/Upload");
const Question = require("../models/Question");
const { extractText } = require("../utils/documentParser");
const {
  extractQuestionsFromText,
  extractQuestionsFromJSON,
  extractQuestionsFromCSV,
} = require("../utils/questionExtractor");
const {
  extractQuestionsWithHackClub,
  isConfigured: isHackClubConfigured,
} = require("../utils/hackclubQuestionExtractor");
const fs = require("fs").promises;
const path = require("path");

function validateQuestionPayload(q, index) {
  const errors = [];
  if (!q || typeof q !== "object") {
    return [`Question ${index + 1}: must be an object`];
  }
  if (!q.question || !String(q.question).trim()) {
    errors.push(`Question ${index + 1}: question text is required`);
  }
  if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
    errors.push(`Question ${index + 1}: must have between 2 and 6 options`);
  } else if (q.options.some((o) => !String(o || "").trim())) {
    errors.push(`Question ${index + 1}: options cannot be empty`);
  }
  if (
    !Number.isInteger(q.correctAnswer) ||
    !Array.isArray(q.options) ||
    q.correctAnswer < 0 ||
    q.correctAnswer >= q.options.length
  ) {
    errors.push(`Question ${index + 1}: correctAnswer must be a valid option index`);
  }
  if (!q.course || !String(q.course).trim()) {
    errors.push(`Question ${index + 1}: course is required`);
  }
  return errors;
}

/**
 * Extract questions from already-extracted document text/content,
 * preferring AI-based deciphering for free-form document types and
 * falling back to pattern matching if AI is unavailable or fails.
 */
async function extractQuestions(fileType, extractedContent) {
  if (fileType === "json") {
    return { questions: extractQuestionsFromJSON(extractedContent), method: "json", skipped: 0 };
  }

  if (fileType === "csv") {
    const { questions, skipped } = extractQuestionsFromCSV(extractedContent);
    return { questions, method: "csv", skipped };
  }

  if (isHackClubConfigured()) {
    try {
      const questions = await extractQuestionsWithHackClub(extractedContent);
      if (questions.length > 0) {
        return { questions, method: "ai", skipped: 0 };
      }
    } catch (hackClubError) {
      console.error("Hack Club AI extraction failed, falling back to pattern matching:", hackClubError.message);
    }
  }

  const { questions, skipped } = extractQuestionsFromText(extractedContent);
  return { questions, method: "pattern", skipped };
}

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
      console.log(`Processing file: ${req.file.path}`);
      // Note: for JSON, extractText returns the parsed object
      const extractedContent = await extractText(req.file.path, fileType);

      // Extract questions (AI-first for free-form docs, with a
      // pattern-matching fallback; JSON/CSV are already structured)
      const { questions: rawQuestions, method, skipped } = await extractQuestions(
        fileType,
        extractedContent,
      );

      // Add default values and metadata
      let extractedQuestions = rawQuestions.map((q) => ({
        ...q,
        course: q.course || course || "General",
        difficulty: q.difficulty || difficulty || "medium",
        points: q.points || 10,
        isActive: false, // Set to false until approved
        metadata: {
          source: method === "ai" ? "ai" : "document",
          documentName: req.file.originalname,
          extractedAt: new Date(),
        },
      }));

      // The original file is no longer needed once text has been
      // extracted, regardless of whether the admin auto-approves.
      await fs.unlink(req.file.path).catch((unlinkError) => {
        console.error("Failed to clean up uploaded file:", unlinkError.message);
      });

      // If autoApprove is true, save questions immediately
      if (autoApprove === "true" || autoApprove === true) {
        const savedQuestions = await Question.insertMany(
          extractedQuestions.map((q) => ({ ...q, isActive: true })),
        );

        upload.status = "approved";
        upload.extractionMethod = method;
        upload.extractedQuestions = savedQuestions.length;
        upload.skippedBlocks = skipped;
        await upload.save();

        return res.status(201).json({
          success: true,
          message: "Questions extracted and saved successfully",
          uploadId: upload._id,
          extractionMethod: method,
          totalExtracted: savedQuestions.length,
          skipped,
          questions: savedQuestions,
        });
      }

      // Otherwise, persist the preview on the upload record so the admin
      // can come back and review/edit before approving.
      upload.status = "completed";
      upload.extractionMethod = method;
      upload.extractedQuestions = extractedQuestions.length;
      upload.skippedBlocks = skipped;
      upload.questions = extractedQuestions;
      await upload.save();

      res.json({
        success: true,
        message:
          "Questions extracted successfully. Review and approve to save.",
        uploadId: upload._id,
        fileName: req.file.originalname,
        extractionMethod: method,
        totalExtracted: extractedQuestions.length,
        skipped,
        extractedQuestions,
      });
    } catch (extractionError) {
      console.error("Extraction Error:", extractionError);
      upload.status = "failed";
      upload.errorMessage = extractionError.message;
      await upload.save();

      // Clean up file if extraction fails
      await fs.unlink(req.file.path).catch((unlinkError) => {
        console.error("Unlink Error:", unlinkError.message);
      });

      return res.status(422).json({
        success: false,
        message: `Extraction failed: ${extractionError.message}`,
      });
    }
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get upload details (includes persisted extracted-question preview)
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
 * Approve and save extracted questions (possibly edited by the admin
 * during review) for a given upload.
 * @route POST /api/admin/questions/uploads/:uploadId/approve
 */
exports.approveQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    const upload = await Upload.findById(req.params.uploadId);

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of questions to approve",
      });
    }

    const validationErrors = questions.flatMap((q, i) => validateQuestionPayload(q, i));
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more questions are invalid",
        errors: validationErrors,
      });
    }

    // Set questions as active and save
    const questionsToSave = questions.map((q) => ({
      ...q,
      isActive: true,
    }));

    const savedQuestions = await Question.insertMany(questionsToSave);

    upload.status = "approved";
    upload.extractedQuestions = savedQuestions.length;
    await upload.save();

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
 * Reject/discard an upload's extracted preview without saving any questions.
 * @route DELETE /api/admin/questions/uploads/:uploadId
 */
exports.rejectUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.uploadId);

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: "Upload not found",
      });
    }

    upload.status = "rejected";
    upload.questions = undefined;
    await upload.save();

    res.json({
      success: true,
      message: "Upload rejected",
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
      .select("-questions")
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
