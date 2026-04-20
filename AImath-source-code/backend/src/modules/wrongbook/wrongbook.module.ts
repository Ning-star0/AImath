import { Module } from '@nestjs/common';
import { WrongbookController } from './wrongbook.controller';
import { WrongbookService } from './wrongbook.service';

@Module({
  controllers: [WrongbookController],
  providers: [WrongbookService],
  exports: [WrongbookService],
})
export class WrongbookModule {}

