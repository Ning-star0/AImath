import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExerciseIdParamDto } from './dto/exercise-id-param.dto';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';
import { ExercisesService } from './exercises.service';

@ApiTags('Exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post('submit')
  @ApiOperation({ summary: '提交答案并自动判题，保存练习记录和错题' })
  submit(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      student?: { id: string; grade: number } | null;
    },
    @Body() payload: SubmitExerciseDto,
  ) {
    return this.exercisesService.submit(user, payload);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取练习记录详情' })
  findOne(
    @Param() params: ExerciseIdParamDto,
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      student?: { id: string; grade: number } | null;
    },
  ) {
    return this.exercisesService.findOne(params.id, user);
  }
}
