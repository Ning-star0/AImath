import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [studentCount, exerciseAgg, unresolvedWrongCount] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.exerciseRecord.aggregate({
        _sum: {
          totalCount: true,
          correctCount: true,
        },
      }),
      this.prisma.wrongQuestion.count({
        where: {
          resolved: false,
          archivedAt: null,
        },
      }),
    ]);

    const totalQuestions = exerciseAgg._sum.totalCount ?? 0;
    const correctCount = exerciseAgg._sum.correctCount ?? 0;
    const classAccuracyRate =
      totalQuestions === 0
        ? 0
        : Number(((correctCount / totalQuestions) * 100).toFixed(2));

    return {
      classOverview: {
        studentCount,
        totalQuestions,
        classAccuracyRate,
        unresolvedWrongCount,
      },
      placeholders: {
        classLearningOverview: '后续将扩展为按班级、按知识点的学习总览。',
        studentReportEntry: '已预留查看学生报告接口，可继续接入班级与教师绑定逻辑。',
      },
    };
  }

  async getStudents() {
    const students = await this.prisma.student.findMany({
      include: {
        user: true,
        exerciseRecords: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        wrongQuestions: {
          where: {
            archivedAt: null,
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { createdAt: 'asc' }],
      take: 50,
    });

    if (students.length === 0) {
      return {
        list: [
          {
            id: 'demo-student',
            studentCode: 'S20260001',
            displayName: '演示学生',
            grade: 3,
            className: '三年级一班',
            totalQuestions: 0,
            accuracyRate: 0,
            unresolvedWrongCount: 0,
            reportEntry: {
              path: '/teacher/students/demo-student',
              apiPath: '/api/v1/teacher/students/demo-student/report',
            },
          },
        ],
        total: 1,
      };
    }

    return {
      list: students.map((student) => {
        const totalQuestions = student.exerciseRecords.reduce(
          (sum, record) => sum + record.totalCount,
          0,
        );
        const correctCount = student.exerciseRecords.reduce(
          (sum, record) => sum + record.correctCount,
          0,
        );
        const accuracyRate =
          totalQuestions === 0
            ? 0
            : Number(((correctCount / totalQuestions) * 100).toFixed(2));

        return {
          id: student.id,
          studentCode: student.studentCode,
          displayName: student.user.displayName,
          grade: student.grade,
          className: student.className,
          schoolName: student.schoolName,
          totalQuestions,
          accuracyRate,
          unresolvedWrongCount: student.wrongQuestions.filter(
            (item) => !item.resolved,
          ).length,
          reportEntry: {
            path: `/teacher/students/${student.id}`,
            apiPath: `/api/v1/teacher/students/${student.id}/report`,
          },
        };
      }),
      total: students.length,
    };
  }

  async getStudentReport(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        exerciseRecords: true,
        wrongQuestions: {
          where: {
            archivedAt: null,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    const totalQuestions = student.exerciseRecords.reduce(
      (sum, record) => sum + record.totalCount,
      0,
    );
    const correctCount = student.exerciseRecords.reduce(
      (sum, record) => sum + record.correctCount,
      0,
    );

    return {
      student: {
        id: student.id,
        displayName: student.user.displayName,
        studentCode: student.studentCode,
        grade: student.grade,
        className: student.className,
      },
      reportSummary: {
        totalQuestions,
        accuracyRate:
          totalQuestions === 0
            ? 0
            : Number(((correctCount / totalQuestions) * 100).toFixed(2)),
        unresolvedWrongCount: student.wrongQuestions.filter(
          (item) => !item.resolved,
        ).length,
      },
      placeholder: '后续将扩展为教师视角的完整学生报告详情。',
    };
  }
}
