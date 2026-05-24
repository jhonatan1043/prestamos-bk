import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService }      from '../../common/prisma/prisma.service';
import { WompiService }       from './application/wompi.service';
import { PaymentsService }    from './application/payments.service';
import { PaymentsController } from './presentation/payments.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController],
  providers: [
    PrismaService,
    WompiService,
    PaymentsService,
  ],
  exports: [PaymentsService, WompiService],
})
export class PaymentsModule {}
