import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePilotFeedbackDto } from './dto/create-pilot-feedback.dto';

@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  async createPilotFeedback(userId: string | null, payload: CreatePilotFeedbackDto) {
    const feedback = await this.prisma.pilotFeedback.create({
      data: {
        userId,
        role: payload.role,
        contactName: payload.contactName,
        contactPhone: payload.contactPhone,
        schoolName: payload.schoolName,
        studentGrade: payload.studentGrade,
        rating: payload.rating,
        content: payload.content,
        feedbackType: payload.feedbackType ?? 'GENERAL',
        tags: payload.tags ?? [],
      },
    });

    await this.prisma.systemLog.create({
      data: {
        actorUserId: userId,
        module: 'GOVERNANCE',
        action: 'CREATE_PILOT_FEEDBACK',
        targetType: 'PilotFeedback',
        targetId: feedback.id,
        message: '已提交一条试点反馈。',
        payload: {
          feedbackType: feedback.feedbackType,
          rating: feedback.rating,
          schoolName: feedback.schoolName,
        },
      },
    });

    return {
      id: feedback.id,
      message: '试点反馈已提交，可用于后续答辩、试点复盘和产品优化。',
    };
  }

  async getPilotFeedbackList() {
    const list = await this.prisma.pilotFeedback.findMany({
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return {
      total: list.length,
      list,
    };
  }

  async getSystemLogs() {
    const list = await this.prisma.systemLog.findMany({
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    return {
      total: list.length,
      list,
    };
  }
}
