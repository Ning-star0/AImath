import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [userCount, studentCount, teacherCount, questionCount, aiQaCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.student.count(),
        this.prisma.teacher.count(),
        this.prisma.question.count(),
        this.prisma.aiQaRecord.count(),
      ]);

    return {
      systemStats: {
        userCount,
        studentCount,
        teacherCount,
        questionCount,
        aiQaCount,
      },
      placeholders: {
        aiConfig: '后续将扩展模型切换、Prompt 版本和调用限额配置。',
        governance: '后续将扩展用户治理、题库审核和系统日志管理。',
      },
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        student: true,
        teacher: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return {
      list: users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        studentCode: user.student?.studentCode ?? null,
        teacherCode: user.teacher?.teacherCode ?? null,
        createdAt: user.createdAt,
      })),
      total: users.length,
    };
  }

  async getQuestions() {
    const questions = await this.prisma.question.findMany({
      include: {
        _count: {
          select: {
            exerciseDetails: true,
            wrongQuestions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return {
      list: questions.map((question) => ({
        id: question.id,
        title: question.title,
        grade: question.grade,
        difficulty: question.difficulty,
        questionType: question.questionType,
        source: question.source,
        canDelete: true,
        exerciseReferenceCount: question._count.exerciseDetails,
        wrongbookReferenceCount: question._count.wrongQuestions,
        createdAt: question.createdAt,
      })),
      total: questions.length,
    };
  }

  getAiConfig() {
    return {
      provider: 'OpenAI-compatible',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      baseUrl: process.env.OPENAI_BASE_URL ?? null,
      promptVersion: 'stage-4-v2',
      placeholders: {
        moderation: '后续增加回答审查、年级边界校验和风险等级配置。',
        rateLimit: '后续增加用户级和接口级限流配置。',
      },
    };
  }
}
