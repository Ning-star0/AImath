import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ExerciseStatus,
  Prisma,
  Question,
  QuestionType,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';

interface AuthUser {
  id: string;
  role: Role;
  student?: { id: string; grade: number } | null;
}

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(user: AuthUser, payload: SubmitExerciseDto) {
    const questionIds = payload.answers.map((item) => item.questionId);
    const dbQuestions = await this.prisma.question.findMany({
      where: {
        id: {
          in: questionIds,
        },
      },
      include: {
        questionKnowledgeMaps: {
          include: {
            knowledgePoint: true,
          },
        },
      },
    });

    const fallbackQuestions = this.buildFallbackQuestions();
    const mergedQuestions = questionIds.map((id) => {
      const found = dbQuestions.find((question) => question.id === id);
      return found ?? fallbackQuestions.find((question) => question.id === id);
    });

    if (mergedQuestions.some((item) => !item)) {
      throw new NotFoundException('部分题目不存在，无法提交答案');
    }

    const judgedItems = payload.answers.map((item) => {
      const question = mergedQuestions.find(
        (currentQuestion) => currentQuestion?.id === item.questionId,
      ) as
        | Prisma.QuestionGetPayload<{
            include: {
              questionKnowledgeMaps: {
                include: {
                  knowledgePoint: true;
                };
              };
            };
          }>
        | (Question & {
            questionKnowledgeMaps?: Array<{
              knowledgePoint: {
                id: string;
                code: string;
                name: string;
                grade: number;
              };
            }>;
          });

      const judgement = this.judgeAnswer(question, item.answer);

      return {
        question,
        studentAnswer: item.answer,
        ...judgement,
      };
    });

    const totalCount = judgedItems.length;
    const correctCount = judgedItems.filter((item) => item.isCorrect).length;
    const wrongItems = judgedItems.filter((item) => !item.isCorrect);
    const accuracyRate =
      totalCount === 0 ? 0 : Number(((correctCount / totalCount) * 100).toFixed(2));

    const createdRecord = await this.prisma.$transaction(async (tx) => {
      const existingQuestionIds = new Set(dbQuestions.map((item) => item.id));
      const fallbackItemsToPersist = judgedItems.filter(
        (item) => !existingQuestionIds.has(item.question.id),
      );

      for (const item of fallbackItemsToPersist) {
        await tx.question.upsert({
          where: { id: item.question.id },
          update: {
            title: item.question.title,
            stem: item.question.stem,
            questionType: item.question.questionType,
            grade: item.question.grade,
            difficulty: item.question.difficulty,
            answer: item.question.answer,
            options: item.question.options
              ? (item.question.options as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            analysis: item.question.analysis,
            tags: item.question.tags,
            source: item.question.source ?? 'fallback',
          },
          create: {
            id: item.question.id,
            title: item.question.title,
            stem: item.question.stem,
            questionType: item.question.questionType,
            grade: item.question.grade,
            difficulty: item.question.difficulty,
            answer: item.question.answer,
            options: item.question.options
              ? (item.question.options as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            analysis: item.question.analysis,
            tags: item.question.tags,
            source: item.question.source ?? 'fallback',
          },
        });
      }

      const exerciseRecord = await tx.exerciseRecord.create({
        data: {
          userId: user.id,
          studentId: user.student?.id,
          grade: user.student?.grade,
          status: ExerciseStatus.COMPLETED,
          totalCount,
          correctCount,
          accuracyRate,
          submittedAt: new Date(),
          summary: {
            wrongCount: wrongItems.length,
            sourceContext: payload.context ?? {},
          } as Prisma.InputJsonValue,
          details: {
            create: judgedItems.map((item) => ({
              questionId: item.question.id,
              studentAnswer: item.studentAnswer,
              correctAnswer: item.correctAnswer,
              isCorrect: item.isCorrect,
              score: item.isCorrect ? 100 : 0,
              feedback: item.feedback,
              knowledgeSnapshot: {
                knowledgePoints:
                  item.question.questionKnowledgeMaps?.map((relation) => ({
                    id: relation.knowledgePoint.id,
                    code: relation.knowledgePoint.code,
                    name: relation.knowledgePoint.name,
                  })) ?? [],
              },
            })),
          },
        },
        include: {
          details: true,
        },
      });

      for (const item of wrongItems) {
        const primaryKnowledgePoint =
          item.question.questionKnowledgeMaps?.[0]?.knowledgePoint;

        const existingWrongQuestion = await tx.wrongQuestion.findFirst({
          where: {
            userId: user.id,
            questionId: item.question.id,
            resolved: false,
          },
        });

        if (existingWrongQuestion) {
          await tx.wrongQuestion.update({
            where: { id: existingWrongQuestion.id },
            data: {
              wrongCount: {
                increment: 1,
              },
              lastWrongAnswer: item.studentAnswer,
              knowledgePointId:
                existingWrongQuestion.knowledgePointId ??
                primaryKnowledgePoint?.id,
              exerciseRecordId: exerciseRecord.id,
            },
          });
        } else {
          await tx.wrongQuestion.create({
            data: {
              userId: user.id,
              studentId: user.student?.id,
              questionId: item.question.id,
              knowledgePointId: primaryKnowledgePoint?.id,
              exerciseRecordId: exerciseRecord.id,
              lastWrongAnswer: item.studentAnswer,
              wrongCount: 1,
              resolved: false,
              reviewStatus: 'PENDING',
            },
          });
        }
      }

      return tx.exerciseRecord.findUnique({
        where: { id: exerciseRecord.id },
        include: {
          details: {
            include: {
              question: true,
            },
          },
        },
      });
    });

    if (!createdRecord) {
      throw new NotFoundException('练习记录创建失败');
    }

    return {
      id: createdRecord.id,
      status: createdRecord.status,
      totalCount: createdRecord.totalCount,
      correctCount: createdRecord.correctCount,
      wrongCount: totalCount - correctCount,
      accuracyRate: createdRecord.accuracyRate,
      submittedAt: createdRecord.submittedAt,
      details: createdRecord.details.map((detail) => ({
        questionId: detail.questionId,
        questionTitle: detail.question.title,
        studentAnswer: detail.studentAnswer,
        correctAnswer: detail.correctAnswer,
        isCorrect: detail.isCorrect,
        feedback: detail.feedback,
      })),
    };
  }

  async findOne(recordId: string, user: AuthUser) {
    const record = await this.prisma.exerciseRecord.findFirst({
      where: {
        id: recordId,
        userId: user.id,
      },
      include: {
        details: {
          include: {
            question: {
              include: {
                questionKnowledgeMaps: {
                  include: {
                    knowledgePoint: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('练习记录不存在');
    }

    return {
      id: record.id,
      status: record.status,
      totalCount: record.totalCount,
      correctCount: record.correctCount,
      wrongCount: record.totalCount - record.correctCount,
      accuracyRate: record.accuracyRate,
      submittedAt: record.submittedAt,
      details: record.details.map((detail) => ({
        id: detail.id,
        questionId: detail.questionId,
        title: detail.question.title,
        stem: detail.question.stem,
        questionType: detail.question.questionType,
        studentAnswer: detail.studentAnswer,
        correctAnswer: detail.correctAnswer,
        isCorrect: detail.isCorrect,
        feedback: detail.feedback,
        analysis: detail.question.analysis,
        knowledgePoints: detail.question.questionKnowledgeMaps.map((relation) => ({
          id: relation.knowledgePoint.id,
          name: relation.knowledgePoint.name,
          code: relation.knowledgePoint.code,
        })),
      })),
    };
  }

  private judgeAnswer(
    question:
      | Prisma.QuestionGetPayload<{
          include: {
            questionKnowledgeMaps: {
              include: {
                knowledgePoint: true;
              };
            };
          };
        }>
      | (Question & { questionKnowledgeMaps?: unknown[] }),
    rawAnswer: string,
  ) {
    const normalizedStudentAnswer = this.normalizeAnswer(rawAnswer);
    const normalizedCorrectAnswer = this.normalizeAnswer(question.answer);

    if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
      const studentSet = normalizedStudentAnswer.split(',').filter(Boolean).sort();
      const correctSet = normalizedCorrectAnswer.split(',').filter(Boolean).sort();
      const isCorrect =
        JSON.stringify(studentSet) === JSON.stringify(correctSet);

      return {
        isCorrect,
        correctAnswer: normalizedCorrectAnswer,
        feedback: isCorrect
          ? '回答正确，继续保持。'
          : `正确答案是 ${normalizedCorrectAnswer}，请注意多选题要选全。`,
      };
    }

    const isCorrect = normalizedStudentAnswer === normalizedCorrectAnswer;

    return {
      isCorrect,
      correctAnswer: normalizedCorrectAnswer,
      feedback: isCorrect
        ? '回答正确，做得很好。'
        : `回答不正确。正确答案是 ${normalizedCorrectAnswer}。`,
    };
  }

  private normalizeAnswer(answer: string) {
    return answer.replace(/\s+/g, '').trim().toUpperCase();
  }

  private buildFallbackQuestions(): Array<
    Question & {
      questionKnowledgeMaps: Array<{
        knowledgePoint: {
          id: string;
          code: string;
          name: string;
          grade: number;
        };
      }>;
    }
  > {
    return [
      {
        id: 'demo-question-1',
        title: '三年级加法应用题',
        stem: '小明有 12 支铅笔，又买了 8 支，现在一共有多少支？',
        questionType: QuestionType.SHORT_ANSWER,
        grade: 3,
        difficulty: 1,
        answer: '20',
        options: null,
        analysis: '12 + 8 = 20，所以一共有 20 支。',
        tags: ['加法', '应用题'],
        metadata: null,
        source: 'fallback',
        knowledgeGraphHint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        questionKnowledgeMaps: [
          {
            knowledgePoint: {
              id: 'demo-kp-1',
              code: 'GRADE3-ADD-001',
              name: '万以内加法',
              grade: 3,
            },
          },
        ],
      },
      {
        id: 'demo-question-2',
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
        analysis: '36 + 14 = 50，所以选择 B。',
        tags: ['加法', '选择题'],
        metadata: null,
        source: 'fallback',
        knowledgeGraphHint: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        questionKnowledgeMaps: [
          {
            knowledgePoint: {
              id: 'demo-kp-1',
              code: 'GRADE3-ADD-001',
              name: '万以内加法',
              grade: 3,
            },
          },
        ],
      },
    ];
  }
}
