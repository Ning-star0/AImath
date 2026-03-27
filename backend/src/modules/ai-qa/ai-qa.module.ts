import { Module } from '@nestjs/common';
import { AiQaController } from './ai-qa.controller';
import { AiQaService } from './ai-qa.service';
import { OpenAiClient } from '../../shared/ai/openai.client';

@Module({
  controllers: [AiQaController],
  providers: [AiQaService, OpenAiClient],
  exports: [AiQaService],
})
export class AiQaModule {}

