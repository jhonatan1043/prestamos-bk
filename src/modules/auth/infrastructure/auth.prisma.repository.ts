import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { AuthRepository } from '../domain/Repositories/auth.repository';
import { User } from '../domain/Entities/user.entity';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(email: string): Promise<User | null> {
  const u = await this.prisma.user.findUnique({ where: { email } });
  if (!u) return null;
  const user = new User();
  user.id = u.id;
  user.email = u.email;
  user.password = u.password;
  user.roles = u.role;
  user.nombre = u.nombre;
  return user;
  }
}
