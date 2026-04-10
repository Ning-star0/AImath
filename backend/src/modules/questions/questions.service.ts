import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DeleteQuestionsDto } from './dto/delete-questions.dto';
import { ImportQuestionsDto } from './dto/import-questions.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryQuestionsDto) {
    const where: Prisma.QuestionWhereInput = {
      subject: query.subject?.trim() || 'MATH',
      ...(query.grade ? { grade: query.grade } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.questionType ? { questionType: query.questionType } : {}),
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword, mode: 'insensitive' } },
              { stem: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.knowledgePointId
        ? {
            questionKnowledgeMaps: {
              some: {
                knowledgePointId: query.knowledgePointId,
              },
            },
          }
        : {}),
    };

    const take = query.take ?? 20;
    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          questionKnowledgeMaps: {
            include: {
              knowledgePoint: true,
            },
          },
        },
        orderBy: [{ grade: 'asc' }, { difficulty: 'asc' }, { createdAt: 'desc' }],
        take,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      list: questions.map((question) => this.mapQuestion(question)),
      total,
    };
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        questionKnowledgeMaps: {
          include: {
            knowledgePoint: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('题目不存在');
    }

    return this.mapQuestion(question);
  }

  async importFromJson(payload: ImportQuestionsDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const knowledgePointCodeMap = new Map<string, string>();
      let importedKnowledgePoints = 0;
      let importedQuestions = 0;
      let updatedQuestions = 0;
      let deduplicatedQuestions = 0;

      for (const item of payload.knowledgePoints ?? []) {
        const knowledgePoint = await tx.knowledgePoint.upsert({
          where: { code: item.code },
          update: {
            name: item.name,
            grade: item.grade,
            chapter: item.chapter,
            description: item.description,
          },
          create: {
            code: item.code,
            name: item.name,
            grade: item.grade,
            chapter: item.chapter,
            description: item.description,
          },
        });

        knowledgePointCodeMap.set(item.code, knowledgePoint.id);
        importedKnowledgePoints += 1;
      }

      const importedQuestionIds: string[] = [];

      for (const item of payload.questions) {
        if (
          (item.questionType === QuestionType.SINGLE_CHOICE ||
            item.questionType === QuestionType.MULTIPLE_CHOICE) &&
          (!item.options || item.options.length < 2)
        ) {
          throw new BadRequestException(
            `题目《${item.title}》是选择题，导入时必须提供至少 2 个选项。`,
          );
        }

        const subject = item.subject?.trim() || 'MATH';
        const deduplicatedQuestion = await tx.question.findFirst({
          where: {
            subject,
            grade: item.grade,
            questionType: item.questionType,
            stem: item.stem,
          },
        });

        const questionId = item.id ?? deduplicatedQuestion?.id ?? undefined;
        const optionsValue = item.options
          ? (item.options as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull;

        const shouldTreatAsDeduplicated = !item.id && !!deduplicatedQuestion?.id;

        const question = questionId
          ? await tx.question.upsert({
              where: { id: questionId },
              update: {
                title: item.title,
                stem: item.stem,
                subject,
                questionType: item.questionType,
                grade: item.grade,
                difficulty: item.difficulty,
                answer: item.answer,
                options: optionsValue,
                analysis: item.analysis,
                tags: item.tags,
                source: item.source ?? 'json-import',
                metadata: {
                  ...(item.metadata ?? {}),
                  batchName: payload.batchName ?? null,
                },
              },
              create: {
                id: questionId,
                title: item.title,
                stem: item.stem,
                subject,
                questionType: item.questionType,
                grade: item.grade,
                difficulty: item.difficulty,
                answer: item.answer,
                options: optionsValue,
                analysis: item.analysis,
                tags: item.tags,
                source: item.source ?? 'json-import',
                metadata: {
                  ...(item.metadata ?? {}),
                  batchName: payload.batchName ?? null,
                },
              },
            })
          : await tx.question.create({
              data: {
                title: item.title,
                stem: item.stem,
                subject,
                questionType: item.questionType,
                grade: item.grade,
                difficulty: item.difficulty,
                answer: item.answer,
                options: optionsValue,
                analysis: item.analysis,
                tags: item.tags,
                source: item.source ?? 'json-import',
                metadata: {
                  ...(item.metadata ?? {}),
                  batchName: payload.batchName ?? null,
                },
              },
            });

        importedQuestionIds.push(question.id);
        if (shouldTreatAsDeduplicated) {
          deduplicatedQuestions += 1;
        } else if (item.id) {
          updatedQuestions += 1;
        } else {
          importedQuestions += 1;
        }

        await tx.questionKnowledgePoint.deleteMany({
          where: {
            questionId: question.id,
          },
        });

        for (const code of item.knowledgePointCodes ?? []) {
          let knowledgePointId = knowledgePointCodeMap.get(code);

          if (!knowledgePointId) {
            const existingKnowledgePoint = await tx.knowledgePoint.findUnique({
              where: { code },
            });

            if (!existingKnowledgePoint) {
              continue;
            }

            knowledgePointId = existingKnowledgePoint.id;
            knowledgePointCodeMap.set(code, knowledgePointId);
          }

          await tx.questionKnowledgePoint.create({
            data: {
              questionId: question.id,
              knowledgePointId,
            },
          });
        }
      }

      return {
        batchName: payload.batchName ?? null,
        importedKnowledgePoints,
        importedQuestions,
        updatedQuestions,
        deduplicatedQuestions,
        totalProcessed: importedQuestionIds.length,
        questionIds: importedQuestionIds,
      };
    });

    return result;
  }

  async deleteBatch(payload: DeleteQuestionsDto) {
    const questions = await this.prisma.question.findMany({
      where: {
        id: {
          in: payload.ids,
        },
      },
      include: {
        _count: {
          select: {
            exerciseDetails: true,
            wrongQuestions: true,
            questionKnowledgeMaps: true,
          },
        },
      },
    });

    const questionIds = questions.map((question) => question.id);
    const cleanupSummary = {
      removedExerciseDetails: 0,
      removedWrongQuestions: 0,
      removedEmptyExerciseRecords: 0,
    };

    if (questionIds.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        const relatedExerciseDetails = await tx.exerciseRecordDetail.findMany({
          where: {
            questionId: {
              in: questionIds,
            },
          },
          select: {
            id: true,
            exerciseRecordId: true,
          },
        });

        const affectedExerciseRecordIds = Array.from(
          new Set(relatedExerciseDetails.map((detail) => detail.exerciseRecordId)),
        );

        cleanupSummary.removedWrongQuestions = await tx.wrongQuestion.count({
          where: {
            questionId: {
              in: questionIds,
            },
          },
        });

        await tx.wrongQuestion.deleteMany({
          where: {
            questionId: {
              in: questionIds,
            },
          },
        });

        cleanupSummary.removedExerciseDetails = relatedExerciseDetails.length;

        await tx.exerciseRecordDetail.deleteMany({
          where: {
            questionId: {
              in: questionIds,
            },
          },
        });

        for (const exerciseRecordId of affectedExerciseRecordIds) {
          const remainingDetails = await tx.exerciseRecordDetail.findMany({
            where: {
              exerciseRecordId,
            },
            select: {
              isCorrect: true,
            },
          });

          if (remainingDetails.length === 0) {
            await tx.exerciseRecord.delete({
              where: {
                id: exerciseRecordId,
              },
            });
            cleanupSummary.removedEmptyExerciseRecords += 1;
            continue;
          }

          const correctCount = remainingDetails.filter(
            (detail) => detail.isCorrect === true,
          ).length;
          const totalCount = remainingDetails.length;

          await tx.exerciseRecord.update({
            where: {
              id: exerciseRecordId,
            },
            data: {
              totalCount,
              correctCount,
              accuracyRate:
                totalCount === 0
                  ? 0
                  : Number(((correctCount / totalCount) * 100).toFixed(2)),
            },
          });
        }

        await tx.questionKnowledgePoint.deleteMany({
          where: {
            questionId: {
              in: questionIds,
            },
          },
        });

        await tx.question.deleteMany({
          where: {
            id: {
              in: questionIds,
            },
          },
        });
      });
    }

    return {
      requestedCount: payload.ids.length,
      deletedCount: questionIds.length,
      blockedCount: 0,
      deletedIds: questionIds,
      blocked: [],
      cleanupSummary,
    };
  }

  private mapQuestion(
    question: Prisma.QuestionGetPayload<{
      include: {
        questionKnowledgeMaps: {
          include: {
            knowledgePoint: true;
          };
        };
      };
    }>,
  ) {
    return {
      id: question.id,
      title: question.title,
      stem: question.stem,
      subject: question.subject,
      questionType: question.questionType,
      grade: question.grade,
      difficulty: question.difficulty,
      answer: question.answer,
      options: question.options,
      analysis: question.analysis,
      tags: question.tags,
      knowledgePoints: question.questionKnowledgeMaps.map((relation) => ({
        id: relation.knowledgePoint.id,
        code: relation.knowledgePoint.code,
        name: relation.knowledgePoint.name,
        grade: relation.knowledgePoint.grade,
      })),
    };
  }
}
