import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '服务健康检查' })
  getHealth() {
    return {
      status: 'ok',
      service: 'ai-math-backend',
      timestamp: new Date().toISOString(),
    };
  }
}

