export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export type UserRole = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN';

export interface LoginPayload {
  account: string;
  password: string;
  role?: UserRole;
}

export interface UserProfile {
  id: string;
  username?: string;
  account?: string;
  displayName: string;
  role: UserRole;
  isActive?: boolean;
  grade?: number | null;
  studentCode?: string | null;
  teacherCode?: string | null;
  student?: {
    id: string;
    userId: string;
    studentCode: string;
    grade: number;
    schoolName?: string | null;
    className?: string | null;
  } | null;
  teacher?: {
    id: string;
    userId: string;
    teacherCode?: string | null;
    schoolName?: string | null;
    subject?: string | null;
    reviewStatus?: string | null;
    reviewNote?: string | null;
    classAccessStatus?: string | null;
    classAccessNote?: string | null;
    requestedClasses?: Array<{
      grade: number;
      className: string;
      schoolName?: string | null;
    }>;
    approvedClasses?: Array<{
      grade: number;
      className: string;
      schoolName?: string | null;
    }>;
  } | null;
  parentBindings?: Array<{
    id: string;
    relationLabel: string;
    bindingStatus: string;
    student: {
      id: string;
      displayName: string;
      studentCode: string;
      grade: number;
      className?: string | null;
      schoolName?: string | null;
    };
  }>;
}

export interface AuthNextStep {
  status: 'AUTO_LOGIN' | 'PENDING_REVIEW' | 'WAITING_ACTIVATION';
  title: string;
  description: string;
}

export interface LoginResult {
  accessToken: string;
  user: UserProfile;
  nextStep?: AuthNextStep;
}

export interface RegisterPayload {
  username: string;
  displayName: string;
  studentCode?: string;
  teacherCode?: string;
  password: string;
  email?: string;
  phone?: string;
  role: Extract<UserRole, 'STUDENT' | 'TEACHER' | 'PARENT'>;
  grade?: number;
  className?: string;
  schoolName?: string;
  subject?: string;
  relationLabel?: string;
}

export interface RegisterResult {
  accessToken: string | null;
  user: UserProfile;
  nextStep: AuthNextStep;
}

export interface UpdateStudentProfilePayload {
  grade: number;
}

export interface KnowledgePointSummary {
  id: string;
  code: string;
  name: string;
  grade?: number;
}

export interface QuestionItem {
  id: string;
  title: string;
  stem: string;
  subject?: string;
  questionType: string;
  grade: number;
  difficulty: number;
  answer: string;
  options?: Array<{ label: string; value: string }> | null;
  analysis?: string | null;
  tags: string[];
  knowledgePoints?: KnowledgePointSummary[];
}

export interface QuestionListResult {
  list: QuestionItem[];
  total: number;
}

export interface SubmitExercisePayload {
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
  subject?: string;
  context?: Record<string, unknown>;
}

export interface ExerciseSubmitResult {
  id: string;
  totalCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  submittedAt?: string | null;
  details?: Array<{
    questionId: string;
    questionTitle: string;
    studentAnswer: string | null;
    correctAnswer: string | null;
    isCorrect: boolean | null;
    feedback: string | null;
  }>;
}

export interface AiQaResult {
  originalQuestion: string;
  steps: string[];
  finalAnswer: string;
  knowledgePoints: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  riskNotice: string;
  similarQuestions: string[];
  recordId?: string | null;
  ocrPlaceholder?: {
    enabled: boolean;
    status: string;
    note: string;
  };
}

export interface WrongQuestionItem {
  id: string;
  questionId: string;
  questionTitle: string;
  questionStem: string;
  questionType?: string;
  grade?: number;
  options?: Array<{ label: string; value: string }> | null;
  wrongCount: number;
  resolved: boolean;
  lastWrongAnswer?: string | null;
  reviewStatus?: string | null;
  archivedAt?: string | null;
  knowledgePoint?: {
    id: string;
    name: string;
    code: string;
  } | null;
  retryEntry?: {
    action: string;
    path: string;
    questionId: string;
  };
  updatedAt?: string;
}

export interface WrongbookListResult {
  list: WrongQuestionItem[];
  total: number;
}

export interface WrongbookStatsResult {
  totalWrongQuestions: number;
  unresolvedCount: number;
  resolvedCount: number;
  archivedCount?: number;
  groupedByKnowledgePoint: Array<{
    knowledgePointId: string;
    knowledgePointName: string;
    count: number;
  }>;
  groupedByQuestionType?: Array<{
    questionType: string;
    count: number;
  }>;
}

export interface ReportOverviewResult {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  aiQaCount?: number;
  masteryByKnowledgePoint: Array<{
    knowledgePointId: string;
    knowledgePointName: string;
    correctCount: number;
    wrongCount: number;
    correctRate: number;
    total: number;
  }>;
  learningTrend: Array<{
    date: string;
    practiceCount?: number;
    totalQuestions?: number;
    correctCount?: number;
    accuracyRate: number;
  }>;
  questionDrilldowns: {
    all: ReportQuestionDrilldownItem[];
    correct: ReportQuestionDrilldownItem[];
    wrong: ReportQuestionDrilldownItem[];
  };
}

export interface ReportQuestionDrilldownItem {
  questionId: string;
  title: string;
  stem: string;
  questionType: string;
  grade: number;
  difficulty: number;
  studentAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  feedback: string | null;
  latestSubmittedAt: string;
  knowledgePoints: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}
