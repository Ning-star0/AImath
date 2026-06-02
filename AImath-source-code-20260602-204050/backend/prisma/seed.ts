import { ExerciseStatus, MasteryLevel, PrismaClient, QuestionType, Role } from '@prisma/client';

const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const STUDENT_PASSWORD = 'Study@123';
const TEACHER_PASSWORD = 'Teach@123';
const ADMIN_PASSWORD = 'Admin@123';

async function upsertStudentUser() {
  const passwordHash = await bcrypt.hash(STUDENT_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { username: 'student_grade3_01' },
    update: {
      displayName: '三年级学生',
      passwordHash,
      role: Role.STUDENT,
      isActive: true,
    },
    create: {
      username: 'student_grade3_01',
      email: 'student_grade3_01@einmath.cn',
      passwordHash,
      role: Role.STUDENT,
      displayName: '三年级学生',
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: user.id },
    update: {
      studentCode: 'S20260001',
      grade: 3,
      className: '三年级一班',
      schoolName: '未来小学',
      guardianName: '家长A',
      guardianPhone: '13800138000',
    },
    create: {
      userId: user.id,
      studentCode: 'S20260001',
      grade: 3,
      className: '三年级一班',
      schoolName: '未来小学',
      guardianName: '家长A',
      guardianPhone: '13800138000',
    },
  });

  return { user, student };
}

async function upsertTeacherUser() {
  const passwordHash = await bcrypt.hash(TEACHER_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { username: 'teacher_math_01' },
    update: {
      displayName: '数学教师',
      passwordHash,
      role: Role.TEACHER,
      isActive: true,
    },
    create: {
      username: 'teacher_math_01',
      email: 'teacher_math_01@einmath.cn',
      passwordHash,
      role: Role.TEACHER,
      displayName: '数学教师',
    },
  });

  await prisma.teacher.upsert({
    where: { userId: user.id },
    update: {
      teacherCode: 'T20260001',
      schoolName: '未来小学',
      subject: 'MATH',
    },
    create: {
      userId: user.id,
      teacherCode: 'T20260001',
      schoolName: '未来小学',
      subject: 'MATH',
    },
  });
}

async function upsertAdminUser() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { username: 'admin_platform' },
    update: {
      displayName: '平台管理员',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      username: 'admin_platform',
      email: 'admin@einmath.cn',
      passwordHash,
      role: Role.ADMIN,
      displayName: '平台管理员',
    },
  });
}

async function upsertKnowledgePoints() {
  const addition = await prisma.knowledgePoint.upsert({
    where: { code: 'GRADE3-ADD-001' },
    update: {
      name: '万以内加法',
      grade: 3,
      chapter: '整数加法',
      description: '理解万以内整数加法的运算规则。',
    },
    create: {
      code: 'GRADE3-ADD-001',
      name: '万以内加法',
      grade: 3,
      chapter: '整数加法',
      description: '理解万以内整数加法的运算规则。',
    },
  });

  const application = await prisma.knowledgePoint.upsert({
    where: { code: 'GRADE3-APP-001' },
    update: {
      name: '加法应用题',
      grade: 3,
      chapter: '应用题',
      description: '把生活场景转化为加法算式。',
    },
    create: {
      code: 'GRADE3-APP-001',
      name: '加法应用题',
      grade: 3,
      chapter: '应用题',
      description: '把生活场景转化为加法算式。',
    },
  });

  return { addition, application };
}

async function upsertQuestions(knowledgePointIds: { additionId: string; applicationId: string }) {
  const question1 = await prisma.question.upsert({
    where: { id: 'seed-question-1' },
    update: {
      title: '三年级加法应用题',
      stem: '小明原来有 12 支铅笔，又买了 8 支，现在一共有多少支？',
      questionType: QuestionType.SHORT_ANSWER,
      grade: 3,
      difficulty: 1,
      answer: '20',
      analysis: '先看原来有 12 支，再加上新买的 8 支，所以 12 + 8 = 20。',
      tags: ['加法', '应用题'],
      source: 'seed',
    },
    create: {
      id: 'seed-question-1',
      title: '三年级加法应用题',
      stem: '小明原来有 12 支铅笔，又买了 8 支，现在一共有多少支？',
      questionType: QuestionType.SHORT_ANSWER,
      grade: 3,
      difficulty: 1,
      answer: '20',
      analysis: '先看原来有 12 支，再加上新买的 8 支，所以 12 + 8 = 20。',
      tags: ['加法', '应用题'],
      source: 'seed',
    },
  });

  const question2 = await prisma.question.upsert({
    where: { id: 'seed-question-2' },
    update: {
      title: '三年级选择题：哪个答案正确？',
      stem: '计算 36 + 14，正确答案是哪一个？',
      questionType: QuestionType.SINGLE_CHOICE,
      grade: 3,
      difficulty: 1,
      answer: 'B',
      options: [
        { label: 'A', value: '40' },
        { label: 'B', value: '50' },
        { label: 'C', value: '52' },
        { label: 'D', value: '60' },
      ],
      analysis: '个位 6 + 4 = 10，写 0 进 1；十位 3 + 1 + 1 = 5，所以结果是 50。',
      tags: ['加法', '选择题'],
      source: 'seed',
    },
    create: {
      id: 'seed-question-2',
      title: '三年级选择题：哪个答案正确？',
      stem: '计算 36 + 14，正确答案是哪一个？',
      questionType: QuestionType.SINGLE_CHOICE,
      grade: 3,
      difficulty: 1,
      answer: 'B',
      options: [
        { label: 'A', value: '40' },
        { label: 'B', value: '50' },
        { label: 'C', value: '52' },
        { label: 'D', value: '60' },
      ],
      analysis: '个位 6 + 4 = 10，写 0 进 1；十位 3 + 1 + 1 = 5，所以结果是 50。',
      tags: ['加法', '选择题'],
      source: 'seed',
    },
  });

  await prisma.questionKnowledgePoint.upsert({
    where: {
      questionId_knowledgePointId: {
        questionId: question1.id,
        knowledgePointId: knowledgePointIds.applicationId,
      },
    },
    update: {},
    create: {
      questionId: question1.id,
      knowledgePointId: knowledgePointIds.applicationId,
      sortOrder: 1,
    },
  });

  await prisma.questionKnowledgePoint.upsert({
    where: {
      questionId_knowledgePointId: {
        questionId: question1.id,
        knowledgePointId: knowledgePointIds.additionId,
      },
    },
    update: {},
    create: {
      questionId: question1.id,
      knowledgePointId: knowledgePointIds.additionId,
      sortOrder: 2,
    },
  });

  await prisma.questionKnowledgePoint.upsert({
    where: {
      questionId_knowledgePointId: {
        questionId: question2.id,
        knowledgePointId: knowledgePointIds.additionId,
      },
    },
    update: {},
    create: {
      questionId: question2.id,
      knowledgePointId: knowledgePointIds.additionId,
      sortOrder: 1,
    },
  });

  return { question1, question2 };
}

async function upsertLearningData(
  studentUserId: string,
  studentId: string,
  questionIds: { question1Id: string; question2Id: string },
  knowledgePointId: string,
) {
  let exerciseRecord = await prisma.exerciseRecord.findFirst({
    where: {
      userId: studentUserId,
      summary: {
        path: ['seedTag'],
        equals: 'platform-seed-exercise',
      },
    },
  });

  if (!exerciseRecord) {
    exerciseRecord = await prisma.exerciseRecord.create({
      data: {
        userId: studentUserId,
        studentId,
        grade: 3,
        status: ExerciseStatus.COMPLETED,
        totalCount: 2,
        correctCount: 1,
        accuracyRate: 50,
        submittedAt: new Date(),
        summary: {
          seedTag: 'platform-seed-exercise',
          wrongCount: 1,
        },
      },
    });
  }

  const existingDetails = await prisma.exerciseRecordDetail.findMany({
    where: { exerciseRecordId: exerciseRecord.id },
  });

  if (existingDetails.length === 0) {
    await prisma.exerciseRecordDetail.createMany({
      data: [
        {
          exerciseRecordId: exerciseRecord.id,
          questionId: questionIds.question1Id,
          studentAnswer: '18',
          correctAnswer: '20',
          isCorrect: false,
          score: 0,
          feedback: '题意理解正确，但计算结果错了。',
        },
        {
          exerciseRecordId: exerciseRecord.id,
          questionId: questionIds.question2Id,
          studentAnswer: 'B',
          correctAnswer: 'B',
          isCorrect: true,
          score: 100,
          feedback: '回答正确。',
        },
      ],
    });
  }

  const wrongQuestion = await prisma.wrongQuestion.findFirst({
    where: {
      userId: studentUserId,
      questionId: questionIds.question1Id,
    },
  });

  if (!wrongQuestion) {
    await prisma.wrongQuestion.create({
      data: {
        userId: studentUserId,
        studentId,
        questionId: questionIds.question1Id,
        knowledgePointId,
        exerciseRecordId: exerciseRecord.id,
        wrongCount: 2,
        lastWrongAnswer: '18',
        resolved: false,
        reviewStatus: 'PENDING',
      },
    });
  }

  const report = await prisma.learningReport.findFirst({
    where: {
      userId: studentUserId,
      knowledgePointId,
    },
  });

  if (!report) {
    await prisma.learningReport.create({
      data: {
        userId: studentUserId,
        studentId,
        knowledgePointId,
        reportDate: new Date(),
        periodType: 'WEEKLY',
        totalQuestions: 2,
        correctCount: 1,
        wrongCount: 1,
        accuracyRate: 50,
        masteryLevel: MasteryLevel.BASIC,
        trendSummary: '加法基础较好，但应用题计算仍需巩固。',
        reportPayload: {
          source: 'seed',
        },
      },
    });
  }

  const aiRecord = await prisma.aiQaRecord.findFirst({
    where: {
      userId: studentUserId,
      originalQuestion: '35 + 27 等于多少？请一步一步讲解。',
    },
  });

  if (!aiRecord) {
    await prisma.aiQaRecord.create({
      data: {
        userId: studentUserId,
        studentId,
        originalQuestion: '35 + 27 等于多少？请一步一步讲解。',
        finalAnswer: '35 + 27 = 62。',
        grade: 3,
        modelName: 'seed-demo',
        parsedResult: {
          originalQuestion: '35 + 27 等于多少？请一步一步讲解。',
          steps: ['先算个位 5 + 7 = 12。', '写 2，向十位进 1。', '再算十位 3 + 2 + 1 = 6。'],
          finalAnswer: '62',
          knowledgePoints: ['万以内加法'],
          difficulty: 'EASY',
          riskNotice: '这是平台初始化生成的学习记录。',
          similarQuestions: ['试着计算 46 + 18。'],
        },
      },
    });
  }
}

async function main() {
  const { user: studentUser, student } = await upsertStudentUser();
  await upsertTeacherUser();
  await upsertAdminUser();

  const knowledgePoints = await upsertKnowledgePoints();
  const questions = await upsertQuestions({
    additionId: knowledgePoints.addition.id,
    applicationId: knowledgePoints.application.id,
  });

  await upsertLearningData(
    studentUser.id,
    student.id,
    {
      question1Id: questions.question1.id,
      question2Id: questions.question2.id,
    },
    knowledgePoints.application.id,
  );

  console.log('Seed completed.');
  console.log(`Student: S20260001 / ${STUDENT_PASSWORD}`);
  console.log(`Teacher: T20260001 / ${TEACHER_PASSWORD}`);
  console.log(`Admin: admin_platform / ${ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
