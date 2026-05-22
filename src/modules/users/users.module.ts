import { Module } from '@nestjs/common';
import { UserService } from './application/user.service';
import { PrismaUserRepository } from './infrastructure/prisma-user-repository';
import { UserController } from './presentation/users.controller';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module';

@Module({
  imports: [SuscripcionesModule],
  providers: [
    UserService,
    { provide: 'IUserRepository', useClass: PrismaUserRepository },
  ],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
