import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IUserRepository } from '../domain/repositories/user.repository';
import { User } from '../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Omit<User, 'id'>): Promise<User> {
    // Asegura que estado siempre esté presente
    const { estadoId, ...rest } = data;
    const created = await this.prisma.user.create({
      data: { ...rest, estado: { connect: { id: estadoId } } },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        role: true,
        estadoId: true,
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
    user.estadoId = created.estadoId;
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
        estadoId: true,
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
      user.estadoId = u.estadoId;
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
        estadoId: true,
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
    user.estadoId = u.estadoId;
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
        estadoId: true,
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
    user.estadoId = u.estadoId;
    return user;
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    // Asegura que estado siempre esté presente
    const { estadoId, id: _omitId, ...rest } = data;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...rest, estado: estadoId ? { connect: { id: estadoId } } : undefined },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        role: true,
        estadoId: true,
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
    user.estadoId = updated.estadoId;
    return user;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
