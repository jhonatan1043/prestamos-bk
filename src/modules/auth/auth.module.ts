import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './application/auth.service';
import { AuthController } from './presentation/auth.controller';
import { LocalStrategy } from './infrastructure/local.strategy';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AuthRepository } from './domain/Repositories/auth.repository';
import { PrismaAuthRepository } from './infrastructure/auth.prisma.repository';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'supersecret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    { provide: AuthRepository, useClass: PrismaAuthRepository }, // ✅ clave
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
