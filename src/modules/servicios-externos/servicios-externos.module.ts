import { Module } from '@nestjs/common';
import { TwilioService } from './application/twilio.service';
import { TwilioController } from './presentation/twilio.controller';

@Module({
  controllers: [TwilioController],
  providers: [TwilioService],
  exports: [TwilioService],
})
export class ServiciosExternosModule {}
