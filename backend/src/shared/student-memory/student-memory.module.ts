import { Global, Module } from '@nestjs/common';
import { StudentMemoryService } from './student-memory.service';

@Global()
@Module({
  providers: [StudentMemoryService],
  exports: [StudentMemoryService],
})
export class StudentMemoryModule {}
