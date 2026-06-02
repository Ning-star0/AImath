-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'FILL_BLANK', 'SHORT_ANSWER');

-- CreateEnum
CREATE TYPE "ExerciseStatus" AS ENUM ('PENDING', 'SUBMITTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MasteryLevel" AS ENUM ('WEAK', 'BASIC', 'GOOD', 'EXCELLENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "className" TEXT,
    "schoolName" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "learningProfile" JSONB,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMemorySnapshot" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "preferredSubject" TEXT NOT NULL DEFAULT 'MATH',
    "challengeLevel" INTEGER NOT NULL DEFAULT 1,
    "clearedStages" INTEGER NOT NULL DEFAULT 0,
    "totalAnswered" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unresolvedWrongCount" INTEGER NOT NULL DEFAULT 0,
    "aiQaCount" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "lastAiInteractionAt" TIMESTAMP(3),
    "weakKnowledgePoints" TEXT[],
    "recentMistakeTypes" TEXT[],
    "summary" TEXT,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "recommendations" TEXT[],
    "confidence" TEXT NOT NULL DEFAULT 'LOW',
    "rawProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMemorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMemoryHistory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'MATH',
    "challengeLevel" INTEGER NOT NULL DEFAULT 1,
    "clearedStages" INTEGER NOT NULL DEFAULT 0,
    "totalAnswered" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unresolvedWrongCount" INTEGER NOT NULL DEFAULT 0,
    "aiQaCount" INTEGER NOT NULL DEFAULT 0,
    "weakKnowledgePoints" TEXT[],
    "recentMistakeTypes" TEXT[],
    "summary" TEXT,
    "recommendations" TEXT[],
    "rawProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentMemoryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teacherCode" TEXT,
    "subject" TEXT DEFAULT 'MATH',
    "schoolName" TEXT,
    "classInfo" JSONB,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentBinding" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationLabel" TEXT NOT NULL,
    "bindingStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" "Role",
    "source" TEXT NOT NULL DEFAULT 'TRIAL',
    "feedbackType" TEXT NOT NULL DEFAULT 'GENERAL',
    "contactName" TEXT,
    "contactPhone" TEXT,
    "schoolName" TEXT,
    "studentGrade" INTEGER,
    "rating" INTEGER,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "attachmentMeta" JSONB,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilotFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "targetType" TEXT,
    "targetId" TEXT,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'MATH',
    "questionType" "QuestionType" NOT NULL,
    "grade" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "answer" TEXT NOT NULL,
    "options" JSONB,
    "analysis" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "source" TEXT,
    "knowledgeGraphHint" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgePoint" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "grade" INTEGER NOT NULL,
    "chapter" TEXT,
    "parentId" TEXT,
    "graphMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionKnowledgePoint" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionKnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "status" "ExerciseStatus" NOT NULL DEFAULT 'PENDING',
    "grade" INTEGER,
    "subject" TEXT DEFAULT 'MATH',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "summary" JSONB,
    "recommendationDraft" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseRecordDetail" (
    "id" TEXT NOT NULL,
    "exerciseRecordId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentAnswer" TEXT,
    "correctAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "knowledgeSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseRecordDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrongQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "questionId" TEXT NOT NULL,
    "subject" TEXT DEFAULT 'MATH',
    "knowledgePointId" TEXT,
    "exerciseRecordId" TEXT,
    "exerciseDetailId" TEXT,
    "wrongCount" INTEGER NOT NULL DEFAULT 1,
    "lastWrongAnswer" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT DEFAULT 'PENDING',
    "archivedAt" TIMESTAMP(3),
    "recommendationDraft" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WrongQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiQaRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "originalQuestion" TEXT NOT NULL,
    "finalAnswer" TEXT NOT NULL,
    "parsedResult" JSONB,
    "sourceContext" JSONB,
    "grade" INTEGER,
    "subject" TEXT DEFAULT 'MATH',
    "modelName" TEXT,
    "recommendedDrafts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiQaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "knowledgePointId" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'MATH',
    "periodType" TEXT NOT NULL DEFAULT 'WEEKLY',
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "masteryLevel" "MasteryLevel" NOT NULL DEFAULT 'BASIC',
    "trendSummary" TEXT,
    "reportPayload" JSONB,
    "recommendationPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentCode_key" ON "Student"("studentCode");

-- CreateIndex
CREATE INDEX "Student_grade_idx" ON "Student"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMemorySnapshot_studentId_key" ON "StudentMemorySnapshot"("studentId");

-- CreateIndex
CREATE INDEX "StudentMemorySnapshot_preferredSubject_idx" ON "StudentMemorySnapshot"("preferredSubject");

-- CreateIndex
CREATE INDEX "StudentMemorySnapshot_accuracyRate_idx" ON "StudentMemorySnapshot"("accuracyRate");

-- CreateIndex
CREATE INDEX "StudentMemorySnapshot_updatedAt_idx" ON "StudentMemorySnapshot"("updatedAt");

-- CreateIndex
CREATE INDEX "StudentMemoryHistory_studentId_createdAt_idx" ON "StudentMemoryHistory"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentMemoryHistory_eventType_createdAt_idx" ON "StudentMemoryHistory"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "StudentMemoryHistory_subject_idx" ON "StudentMemoryHistory"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_teacherCode_key" ON "Teacher"("teacherCode");

-- CreateIndex
CREATE INDEX "ParentBinding_studentId_idx" ON "ParentBinding"("studentId");

-- CreateIndex
CREATE INDEX "ParentBinding_bindingStatus_idx" ON "ParentBinding"("bindingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ParentBinding_parentUserId_studentId_key" ON "ParentBinding"("parentUserId", "studentId");

-- CreateIndex
CREATE INDEX "PilotFeedback_role_idx" ON "PilotFeedback"("role");

-- CreateIndex
CREATE INDEX "PilotFeedback_feedbackType_idx" ON "PilotFeedback"("feedbackType");

-- CreateIndex
CREATE INDEX "PilotFeedback_createdAt_idx" ON "PilotFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_module_createdAt_idx" ON "SystemLog"("module", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_actorUserId_idx" ON "SystemLog"("actorUserId");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "Question_grade_idx" ON "Question"("grade");

-- CreateIndex
CREATE INDEX "Question_subject_idx" ON "Question"("subject");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "Question_questionType_idx" ON "Question"("questionType");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgePoint_code_key" ON "KnowledgePoint"("code");

-- CreateIndex
CREATE INDEX "KnowledgePoint_grade_idx" ON "KnowledgePoint"("grade");

-- CreateIndex
CREATE INDEX "KnowledgePoint_parentId_idx" ON "KnowledgePoint"("parentId");

-- CreateIndex
CREATE INDEX "QuestionKnowledgePoint_knowledgePointId_idx" ON "QuestionKnowledgePoint"("knowledgePointId");

-- CreateIndex
CREATE INDEX "QuestionKnowledgePoint_questionId_idx" ON "QuestionKnowledgePoint"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionKnowledgePoint_questionId_knowledgePointId_key" ON "QuestionKnowledgePoint"("questionId", "knowledgePointId");

-- CreateIndex
CREATE INDEX "ExerciseRecord_userId_createdAt_idx" ON "ExerciseRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExerciseRecord_subject_idx" ON "ExerciseRecord"("subject");

-- CreateIndex
CREATE INDEX "ExerciseRecord_studentId_idx" ON "ExerciseRecord"("studentId");

-- CreateIndex
CREATE INDEX "ExerciseRecord_status_idx" ON "ExerciseRecord"("status");

-- CreateIndex
CREATE INDEX "ExerciseRecordDetail_exerciseRecordId_idx" ON "ExerciseRecordDetail"("exerciseRecordId");

-- CreateIndex
CREATE INDEX "ExerciseRecordDetail_questionId_idx" ON "ExerciseRecordDetail"("questionId");

-- CreateIndex
CREATE INDEX "ExerciseRecordDetail_isCorrect_idx" ON "ExerciseRecordDetail"("isCorrect");

-- CreateIndex
CREATE INDEX "WrongQuestion_userId_resolved_idx" ON "WrongQuestion"("userId", "resolved");

-- CreateIndex
CREATE INDEX "WrongQuestion_subject_idx" ON "WrongQuestion"("subject");

-- CreateIndex
CREATE INDEX "WrongQuestion_studentId_idx" ON "WrongQuestion"("studentId");

-- CreateIndex
CREATE INDEX "WrongQuestion_questionId_idx" ON "WrongQuestion"("questionId");

-- CreateIndex
CREATE INDEX "WrongQuestion_knowledgePointId_idx" ON "WrongQuestion"("knowledgePointId");

-- CreateIndex
CREATE INDEX "WrongQuestion_archivedAt_idx" ON "WrongQuestion"("archivedAt");

-- CreateIndex
CREATE INDEX "AiQaRecord_userId_idx" ON "AiQaRecord"("userId");

-- CreateIndex
CREATE INDEX "AiQaRecord_subject_idx" ON "AiQaRecord"("subject");

-- CreateIndex
CREATE INDEX "AiQaRecord_studentId_idx" ON "AiQaRecord"("studentId");

-- CreateIndex
CREATE INDEX "AiQaRecord_grade_idx" ON "AiQaRecord"("grade");

-- CreateIndex
CREATE INDEX "AiQaRecord_createdAt_idx" ON "AiQaRecord"("createdAt");

-- CreateIndex
CREATE INDEX "LearningReport_userId_reportDate_idx" ON "LearningReport"("userId", "reportDate");

-- CreateIndex
CREATE INDEX "LearningReport_subject_reportDate_idx" ON "LearningReport"("subject", "reportDate");

-- CreateIndex
CREATE INDEX "LearningReport_studentId_reportDate_idx" ON "LearningReport"("studentId", "reportDate");

-- CreateIndex
CREATE INDEX "LearningReport_knowledgePointId_idx" ON "LearningReport"("knowledgePointId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMemorySnapshot" ADD CONSTRAINT "StudentMemorySnapshot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMemoryHistory" ADD CONSTRAINT "StudentMemoryHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentBinding" ADD CONSTRAINT "ParentBinding_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentBinding" ADD CONSTRAINT "ParentBinding_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotFeedback" ADD CONSTRAINT "PilotFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionKnowledgePoint" ADD CONSTRAINT "QuestionKnowledgePoint_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionKnowledgePoint" ADD CONSTRAINT "QuestionKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseRecord" ADD CONSTRAINT "ExerciseRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseRecord" ADD CONSTRAINT "ExerciseRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseRecordDetail" ADD CONSTRAINT "ExerciseRecordDetail_exerciseRecordId_fkey" FOREIGN KEY ("exerciseRecordId") REFERENCES "ExerciseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseRecordDetail" ADD CONSTRAINT "ExerciseRecordDetail_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestion" ADD CONSTRAINT "WrongQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestion" ADD CONSTRAINT "WrongQuestion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestion" ADD CONSTRAINT "WrongQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestion" ADD CONSTRAINT "WrongQuestion_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQaRecord" ADD CONSTRAINT "AiQaRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiQaRecord" ADD CONSTRAINT "AiQaRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningReport" ADD CONSTRAINT "LearningReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningReport" ADD CONSTRAINT "LearningReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningReport" ADD CONSTRAINT "LearningReport_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
