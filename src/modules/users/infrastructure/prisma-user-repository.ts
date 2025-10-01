import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IUserRepository } from '../domain/repositories/user.repository';
import { User } from '../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Omit<User, 'id'>): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    return users.map(u => {
      const user = new User();
      user.id = u.id;
      user.email = u.email;
      user.password = u.password;
  user.role = u.role;
      user.nombre = u.nombre;
      return user;
    });
  }

  async findById(id: number): Promise<User | null> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) return null;
    const user = new User();
    user.id = u.id;
    user.email = u.email;
    user.password = u.password;
  user.role = u.role;
    user.nombre = u.nombre;
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
