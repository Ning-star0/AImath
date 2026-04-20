import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { AdminModule } from './modules/admin/admin.module';
import { AiQaModule } from './modules/ai-qa/ai-qa.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { FamilyModule } from './modules/family/family.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { HealthModule } from './modules/health/health.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { WrongbookModule } from './modules/wrongbook/wrongbook.module';
import { PrismaModule } from './prisma/prisma.module';
import { StudentMemoryModule } from './shared/student-memory/student-memory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    StudentMemoryModule,
    HealthModule,
    GovernanceModule,
    AuthModule,
    QuestionsModule,
    ExercisesModule,
    FamilyModule,
    AiQaModule,
    WrongbookModule,
    ReportsModule,
    TeacherModule,
    AdminModule,
  ],
})
export class AppModule {}
