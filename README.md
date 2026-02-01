# MTH-Backend API Documentation

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Admin Endpoints](#admin-endpoints)
  - [Question Extraction & Upload (NEW)](#question-extraction--upload-new)
  - [Quiz Endpoints](#quiz-endpoints)

---

## Overview

The MTH-Backend API is a RESTful API for managing quiz questions, user sessions, and leaderboards. It provides endpoints for authentication, question management, quiz sessions, and statistics.

**Version:** 1.0.0  
**Last Updated:** February 2026

---

## Base URL

```
Production: https://mth-backend-vh63.onrender.com
Local Development: http://localhost:5000
```

All endpoints are prefixed with `/api` unless otherwise specified.

---

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication. Protected endpoints require a valid JWT token in the Authorization header.

### Authorization Header Format

```
Authorization: Bearer <your_jwt_token>
```

### Token Types

- **Access Token**: Short-lived token for API requests (expires based on `JWT_EXPIRE` env variable)
- **Refresh Token**: Long-lived token for obtaining new access tokens (expires based on `JWT_REFRESH_EXPIRE` env variable)

---

## Rate Limiting

Quiz endpoints are rate-limited to prevent abuse:

- **Window:** 15 minutes
- **Max Requests:** 100 requests per IP
- **Response:** `429 Too Many Requests` with message "Too many requests, please try again later"

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Error Handling

### HTTP Status Codes

- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `400` - Bad Request: Invalid request parameters
- `401` - Unauthorized: Authentication failed or token invalid
- `404` - Not Found: Resource not found
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server error

---

## Endpoints

### Health Check

#### Get Server Health Status

```http
GET /api/health
```

**Access:** Public

**Response:**

```json
{
  "status": "OK",
  "message": "Server is running"
}
```

#### Get Welcome Message

```http
GET /
```

**Access:** Public

**Response:**

```json
{
  "status": "OK",
  "message": "Welcome Boss😀"
}
```

---

## Authentication Endpoints

### 1. Admin Login

Authenticate an admin user and receive access tokens.

```http
POST /api/auth/login
```

**Access:** Public

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

**Error Responses:**

- `400` - Missing email or password
- `401` - Invalid credentials

---

### 2. Admin Logout

Logout the current admin user and invalidate refresh token.

```http
POST /api/auth/logout
```

**Access:** Private (Requires Authentication)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 3. Refresh Access Token

Obtain a new access token using a refresh token.

```http
POST /api/auth/refresh
```

**Access:** Public

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400` - Refresh token required
- `401` - Invalid or expired refresh token

---

### 4. Verify Token

Verify the current access token and get admin information.

```http
GET /api/auth/verify
```

**Access:** Private (Requires Authentication)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Success Response (200):**

```json
{
  "success": true,
  "admin": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

---

## Admin Endpoints

All admin endpoints require authentication. Include the JWT token in the Authorization header.

### 1. Create Question

Create a new quiz question.

```http
POST /api/admin/questions
```

**Access:** Private (Admin only)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "question": "What is the capital of France?",
  "options": ["London", "Berlin", "Paris", "Madrid"],
  "correctAnswer": 2,
  "course": "Geography",
  "difficulty": "easy",
  "points": 10,
  "explanation": "Paris is the capital and most populous city of France."
}
```

**Field Descriptions:**

- `question` (string, required): The question text
- `options` (array, required): Array of 2-6 answer options
- `correctAnswer` (number, required): Index of the correct answer (0-based)
- `course` (string, required): Course/category name
- `difficulty` (string, optional): "easy", "medium", or "hard" (default: "medium")
- `points` (number, optional): Points awarded for correct answer (default: 10)
- `explanation` (string, optional): Explanation of the correct answer

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctAnswer": 2,
    "course": "Geography",
    "difficulty": "easy",
    "points": 10,
    "explanation": "Paris is the capital and most populous city of France.",
    "isActive": true,
    "createdAt": "2026-02-01T14:30:00.000Z",
    "updatedAt": "2026-02-01T14:30:00.000Z"
  }
}
```

**Error Responses:**

- `400` - Missing required fields or validation error

---

### 2. Get All Questions

Retrieve all questions with pagination and filtering.

```http
GET /api/admin/questions
```

**Access:** Private (Admin only)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `course` (string, optional): Filter by course name
- `difficulty` (string, optional): Filter by difficulty ("easy", "medium", "hard")
- `isActive` (boolean, optional): Filter by active status ("true" or "false")

**Example Request:**

```http
GET /api/admin/questions?page=1&limit=20&course=Geography&difficulty=easy
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "question": "What is the capital of France?",
      "options": ["London", "Berlin", "Paris", "Madrid"],
      "correctAnswer": 2,
      "course": "Geography",
      "difficulty": "easy",
      "points": 10,
      "explanation": "Paris is the capital and most populous city of France.",
      "isActive": true,
      "createdAt": "2026-02-01T14:30:00.000Z",
      "updatedAt": "2026-02-01T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### 3. Get Single Question

Retrieve a specific question by ID.

```http
GET /api/admin/questions/:id
```

**Access:** Private (Admin only)

**Headers:**

```
Authorization: Bearer <access_token>
```

**URL Parameters:**

- `id` (string, required): Question ID

**Example Request:**

```http
GET /api/admin/questions/507f1f77bcf86cd799439011
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctAnswer": 2,
    "course": "Geography",
    "difficulty": "easy",
    "points": 10,
    "explanation": "Paris is the capital and most populous city of France.",
    "isActive": true,
    "createdAt": "2026-02-01T14:30:00.000Z",
    "updatedAt": "2026-02-01T14:30:00.000Z"
  }
}
```

**Error Responses:**

- `404` - Question not found

---

### 4. Update Question

Update an existing question.

```http
PUT /api/admin/questions/:id
```

**Access:** Private (Admin only)

**Headers:**

```
Authorization: Bearer <access_token>
```

**URL Parameters:**

- `id` (string, required): Question ID

**Request Body:** (All fields optional, include only fields to update)

```json
{
  "question": "Updated question text?",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctAnswer": 1,
  "difficulty": "medium",
  "points": 15,
  "explanation": "Updated explanation",
  "isActive": true
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "question": "Updated question text?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctAnswer": 1,
    "course": "Geography",
    "difficulty": "medium",
    "points": 15,
    "explanation": "Updated explanation",
    "isActive": true,
    "createdAt": "2026-02-01T14:30:00.000Z",
    "updatedAt": "2026-02-01T15:45:00.000Z"
  }
}
```

**Error Responses:**

- `400` - Validation error
- `404` - Question not found

---

### 5. Delete Question

Delete a question by ID.

```http
DELETE /api/admin/questions/:id
```

**Access:** Private (Admin only)

**Headers:**

```
Authorization: Bearer <access_token>
```

**URL Parameters:**

- `id` (string, required): Question ID

**Success Response (200):**

```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

**Error Responses:**

- `404` - Question not found

---

### 6. Bulk Create Questions

Create multiple questions at once.

```http
POST /api/admin/questions/bulk
```

**Access:** Private (Admin only)

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "questions": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": 1,
      "course": "Mathematics",
      "difficulty": "easy",
      "points": 5
    },
    {
      "question": "What is the square root of 16?",
      "options": ["2", "3", "4", "5"],
      "correctAnswer": 2,
      "course": "Mathematics",
      "difficulty": "medium",
      "points": 10
    }
  ]
}
```

**Success Response (201):**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": 1,
      "course": "Mathematics",
      "difficulty": "easy",
      "points": 5,
      "isActive": true,
      "createdAt": "2026-02-01T14:30:00.000Z",
      "updatedAt": "2026-02-01T14:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "question": "What is the square root of 16?",
      "options": ["2", "3", "4", "5"],
      "correctAnswer": 2,
      "course": "Mathematics",
      "difficulty": "medium",
      "points": 10,
      "isActive": true,
      "createdAt": "2026-02-01T14:30:00.000Z",
      "updatedAt": "2026-02-01T14:30:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `400` - Invalid questions array or validation error

---

## Question Extraction & Upload (NEW)

All extraction endpoints require admin authentication.

### 1. Upload Document for Extraction (NEW)

Upload a document (PDF, DOCX, TXT, JSON) to extract questions.

```http
POST /api/admin/questions/upload
```

**Access:** Private (Admin only)

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (form-data):**

- `file`: The document file
- `course`: Default course for extracted questions (optional)
- `difficulty`: Default difficulty (optional)
- `autoApprove`: If "true", saves questions directly to DB (optional)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Questions extracted successfully. Review and approve to save.",
  "uploadId": "65bc12e4f5...",
  "totalExtracted": 2,
  "extractedQuestions": [
    {
      "question": "What is the derivative of $x^2$?",
      "options": ["$2x$", "$x$", "$2$"],
      "correctAnswer": 0,
      "hasLatex": true
    }
  ]
}
```

---

### 2. Get All Uploads (NEW)

Retrieve history of document uploads.

```http
GET /api/admin/questions/uploads
```

**Access:** Private (Admin only)

**Success Response (200):**

```json
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "total": 5, ... }
}
```

---

### 3. Approve Extracted Questions (NEW)

Bulk approve and save questions from an extraction.

```http
POST /api/admin/questions/uploads/:uploadId/approve
```

**Access:** Private (Admin only)

**Request Body:**

```json
{
  "questions": [
    {
      "question": "What is $2+2$?",
      "options": ["3", "4", "5"],
      "correctAnswer": 1,
      "course": "Mathematics"
    }
  ]
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Questions approved and saved successfully",
  "count": 1
}
```

---

## Quiz Endpoints

All quiz endpoints are rate-limited (100 requests per 15 minutes per IP).

### 1. Get Random Quiz Questions

Retrieve random quiz questions for a quiz session.

```http
GET /api/quiz/questions
```

**Access:** Public

**Query Parameters:**

- `limit` (number, optional): Number of questions to retrieve (default: 10)
- `course` (string, optional): Filter by course name
- `difficulty` (string, optional): Filter by difficulty ("easy", "medium", "hard")

**Example Request:**

```http
GET /api/quiz/questions?limit=5&course=Mathematics&difficulty=easy
```

**Success Response (200):**

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "course": "Mathematics",
      "difficulty": "easy",
      "points": 5,
      "isActive": true,
      "createdAt": "2026-02-01T14:30:00.000Z",
      "updatedAt": "2026-02-01T14:30:00.000Z"
    }
  ]
}
```

**Note:** The `correctAnswer` and `explanation` fields are excluded from the response.

---

### 2. Get Single Quiz Question

Retrieve a specific question without the answer.

```http
GET /api/quiz/questions/:id
```

**Access:** Public

**URL Parameters:**

- `id` (string, required): Question ID

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "question": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "course": "Mathematics",
    "difficulty": "easy",
    "points": 5,
    "isActive": true,
    "createdAt": "2026-02-01T14:30:00.000Z",
    "updatedAt": "2026-02-01T14:30:00.000Z"
  }
}
```

**Error Responses:**

- `404` - Question not found or inactive

**Note:** The `correctAnswer` and `explanation` fields are excluded.

---

### 3. Start Quiz Session

Start a new quiz session and receive questions.

```http
POST /api/quiz/start
```

**Access:** Public

**Request Body:**

```json
{
  "userName": "John Doe",
  "limit": 10,
  "course": "Mathematics",
  "difficulty": "medium"
}
```

**Field Descriptions:**

- `userName` (string, optional): User's name (default: "Anonymous")
- `limit` (number, optional): Number of questions (default: 10)
- `course` (string, optional): Filter by course
- `difficulty` (string, optional): Filter by difficulty

**Success Response (200):**

```json
{
  "success": true,
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "questions": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "course": "Mathematics",
      "difficulty": "easy",
      "points": 5
    }
  ]
}
```

**Error Responses:**

- `404` - No questions found matching criteria

**Note:** Save the `sessionId` to submit answers later.

---

### 4. Submit Quiz

Submit quiz answers and receive results.

```http
POST /api/quiz/submit
```

**Access:** Public

**Request Body:**

```json
{
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "userName": "John Doe",
  "answers": [
    {
      "questionId": "507f1f77bcf86cd799439011",
      "userAnswer": 1
    },
    {
      "questionId": "507f1f77bcf86cd799439012",
      "userAnswer": 2
    }
  ]
}
```

**Field Descriptions:**

- `sessionId` (string, optional): Session ID from `/api/quiz/start`
- `userName` (string, optional): User's name (default: "Anonymous")
- `answers` (array, required): Array of answer objects
  - `questionId` (string, required): Question ID
  - `userAnswer` (number, required): Index of selected answer (0-based)

**Success Response (200):**

```json
{
  "success": true,
  "score": 8,
  "totalQuestions": 10,
  "correctAnswers": 8,
  "wrongAnswers": 2,
  "totalScore": 80,
  "maxScore": 100,
  "timeTaken": "5 min 32 sec",
  "percentage": "80.00",
  "results": [
    {
      "questionId": "507f1f77bcf86cd799439011",
      "question": "What is 2 + 2?",
      "userAnswer": 1,
      "correctAnswer": 1,
      "isCorrect": true,
      "points": 10,
      "explanation": "2 + 2 equals 4"
    },
    {
      "questionId": "507f1f77bcf86cd799439012",
      "question": "What is 3 + 3?",
      "userAnswer": 2,
      "correctAnswer": 1,
      "isCorrect": false,
      "points": 0,
      "explanation": "3 + 3 equals 6"
    }
  ]
}
```

**Response Field Descriptions:**

- `score`: Number of correct answers
- `totalQuestions`: Total number of questions
- `correctAnswers`: Number of correct answers
- `wrongAnswers`: Number of wrong answers
- `totalScore`: Total points earned
- `maxScore`: Maximum possible points
- `timeTaken`: Time taken to complete (if session exists)
- `percentage`: Percentage score based on points
- `results`: Detailed results for each question

**Error Responses:**

- `400` - Missing or invalid answers array

---

### 5. Get Quiz Session

Retrieve details of a quiz session.

```http
GET /api/quiz/session/:sessionId
```

**Access:** Public

**URL Parameters:**

- `sessionId` (string, required): Session ID

**Example Request:**

```http
GET /api/quiz/session/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "userName": "John Doe",
    "questions": [
      {
        "questionId": {
          "_id": "507f1f77bcf86cd799439011",
          "question": "What is 2 + 2?",
          "options": ["3", "4", "5", "6"]
        },
        "userAnswer": 1,
        "isCorrect": true,
        "points": 10
      }
    ],
    "totalScore": 80,
    "maxScore": 100,
    "status": "completed",
    "completedAt": "2026-02-01T15:00:00.000Z",
    "createdAt": "2026-02-01T14:54:28.000Z",
    "updatedAt": "2026-02-01T15:00:00.000Z"
  }
}
```

**Error Responses:**

- `404` - Session not found

---

### 6. Get Categories

Retrieve all available quiz categories/courses.

```http
GET /api/quiz/categories
```

**Access:** Public

**Success Response (200):**

```json
{
  "success": true,
  "data": ["Mathematics", "Geography", "History", "Science", "Literature"]
}
```

---

### 7. Get Statistics

Retrieve quiz statistics including question counts by category and difficulty.

```http
GET /api/quiz/statistics
```

**Access:** Public

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "totalQuestions": 150,
    "totalCategories": 5,
    "categories": [
      {
        "course": "Mathematics",
        "count": 45
      },
      {
        "course": "Geography",
        "count": 30
      },
      {
        "course": "History",
        "count": 25
      },
      {
        "course": "Science",
        "count": 35
      },
      {
        "course": "Literature",
        "count": 15
      }
    ],
    "difficulty": [
      {
        "level": "easy",
        "count": 50
      },
      {
        "level": "medium",
        "count": 70
      },
      {
        "level": "hard",
        "count": 30
      }
    ]
  }
}
```

---

### 8. Get Leaderboard

Retrieve the top quiz scores.

```http
GET /api/quiz/leaderboard
```

**Access:** Public

**Query Parameters:**

- `limit` (number, optional): Number of top scores to retrieve (default: 10)

**Example Request:**

```http
GET /api/quiz/leaderboard?limit=5
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userName": "Alice Johnson",
      "score": 95,
      "maxScore": 100,
      "percentage": "95.00",
      "completedAt": "2026-02-01T14:30:00.000Z"
    },
    {
      "rank": 2,
      "userName": "Bob Smith",
      "score": 90,
      "maxScore": 100,
      "percentage": "90.00",
      "completedAt": "2026-02-01T14:25:00.000Z"
    },
    {
      "rank": 3,
      "userName": "Charlie Brown",
      "score": 85,
      "maxScore": 100,
      "percentage": "85.00",
      "completedAt": "2026-02-01T14:20:00.000Z"
    }
  ]
}
```

---

## Data Models

### Question Model

```javascript
{
  _id: ObjectId,
  question: String,           // Question text
  options: [String],          // Array of 2-6 options
  correctAnswer: Number,      // Index of correct answer (0-based)
  course: String,             // Course/category name
  difficulty: String,         // "easy", "medium", or "hard"
  points: Number,             // Points for correct answer (default: 10)
  explanation: String,        // Explanation of correct answer
  isActive: Boolean,          // Whether question is active (default: true)
  hasLatex: Boolean,          // (NEW) Whether LaTeX notation is detected
  metadata: {                 // (NEW) Source tracking
    source: String,           // "manual", "document", or "bulk"
    documentName: String,
    extractedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Quiz Session Model

```javascript
{
  _id: ObjectId,
  sessionId: String,          // Unique session identifier
  userName: String,           // User's name
  questions: [
    {
      questionId: ObjectId,   // Reference to Question
      userAnswer: Number,     // User's answer index
      isCorrect: Boolean,     // Whether answer was correct
      points: Number          // Points earned
    }
  ],
  totalScore: Number,         // Total points earned
  maxScore: Number,           // Maximum possible points
  status: String,             // "in-progress" or "completed"
  completedAt: Date,          // Completion timestamp
  createdAt: Date,
  updatedAt: Date
}
```

### Admin Model

````javascript
{
  _id: ObjectId,
  username: String,           // Admin username (min 3 chars)
  email: String,              // Admin email (unique)
  password: String,           // Hashed password (min 6 chars)
  refreshToken: String,       // Current refresh token
  createdAt: Date,
  updatedAt: Date
}

### Upload Model (NEW)

```javascript
{
  _id: ObjectId,
  fileName: String,           // Internal filename
  originalName: String,       // User's filename
  fileType: String,           // pdf, docx, txt, json
  fileSize: Number,
  status: String,             // processing, completed, failed
  uploadedBy: ObjectId,       // Reference to Admin
  extractedQuestions: Number,
  errorMessage: String,
  createdAt: Date
}
````

````

---

## CORS Configuration

The API accepts requests from the following origins:

- `http://localhost:3000`
- `http://localhost:5173`
- `https://mth-backend-vh63.onrender.com/`
- `https://mth-dept.vercel.app`

**Allowed Methods:** GET, POST, PUT, DELETE, PATCH, OPTIONS
**Allowed Headers:** Content-Type, Authorization
**Credentials:** Enabled

---

## Environment Variables

Required environment variables:

```env
PORT=5000
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
JWT_EXPIRE=<access_token_expiry>        # e.g., "1h", "30m"
JWT_REFRESH_EXPIRE=<refresh_token_expiry>  # e.g., "7d", "30d"
MAX_FILE_SIZE=10485760                  # (NEW) Max upload size (10MB)
UPLOAD_DIR=uploads/documents            # (NEW) Storage path
````

---

## Swagger Documentation

Interactive API documentation is available at:

```
http://localhost:5000/docs
```

---

## Examples

### Example: Complete Quiz Flow

#### 1. Start a Quiz Session

```bash
curl -X POST http://localhost:5000/api/quiz/start \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "John Doe",
    "limit": 5,
    "course": "Mathematics"
  }'
```

#### 2. Submit Quiz Answers

```bash
curl -X POST http://localhost:5000/api/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "userName": "John Doe",
    "answers": [
      {"questionId": "507f1f77bcf86cd799439011", "userAnswer": 1},
      {"questionId": "507f1f77bcf86cd799439012", "userAnswer": 2}
    ]
  }'
```

#### 3. View Results

```bash
curl -X GET http://localhost:5000/api/quiz/session/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Example: Admin Authentication Flow

#### 1. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

#### 2. Create Question (with token)

```bash
curl -X POST http://localhost:5000/api/admin/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_access_token>" \
  -d '{
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctAnswer": 2,
    "course": "Geography",
    "difficulty": "easy",
    "points": 10
  }'
```

#### 3. Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer <your_access_token>"
```

---

## Support

For issues or questions, please contact the development team or create an issue in the project repository.

**Last Updated:** February 1, 2026
