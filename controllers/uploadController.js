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
      // Note: for JSON, extractText returns the parsed object
      const extractedContent = await extractText(req.file.path, fileType);

      // Extract questions
      let extractedQuestions;
      if (fileType === "json") {
        extractedQuestions = extractQuestionsFromJSON(extractedContent);
      } else {
        extractedQuestions = extractQuestionsFromText(extractedContent);
      }

      // Add default values and metadata
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
      if (autoApprove === "true" || autoApprove === true) {
        const savedQuestions = await Question.insertMany(
          extractedQuestions.map((q) => ({ ...q, isActive: true })),
        );

        upload.status = "completed";
        upload.extractedQuestions = savedQuestions.length;
        await upload.save();

        // Optional: Clean up file after processing
        // await fs.unlink(req.file.path);

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
      console.error("Extraction Error:", extractionError);
      upload.status = "failed";
      upload.errorMessage = extractionError.message;
      await upload.save();

      // Clean up file if extraction fails
      if (req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Unlink Error:", unlinkError);
        }
      }

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
        message: "Please provide an array of questions to approve",
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
