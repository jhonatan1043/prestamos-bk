import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IUserRepository } from '../domain/repositories/user.repository';
import { User } from '../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Omit<User, 'id'>): Promise<User> {
    const created = await this.prisma.user.create({
      data: data,
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const user = new User();
    user.id = created.id;
    user.nombre = created.nombre;
    user.email = created.email;
    user.password = created.password;
    user.role = created.role;
    return user;
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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
    const u = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!u) return null;
    const user = new User();
    user.id = u.id;
    user.email = u.email;
    user.password = u.password;
    user.role = u.role;
    user.nombre = u.nombre;
    return user;
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: data,
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const user = new User();
    user.id = updated.id;
    user.nombre = updated.nombre;
    user.email = updated.email;
    user.password = updated.password;
    user.role = updated.role;
    return user;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
