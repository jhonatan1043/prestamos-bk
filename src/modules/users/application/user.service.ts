import { Injectable, Inject } from '@nestjs/common';
import * as userRepository from '../domain/repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository') private readonly repo: userRepository.IUserRepository,
  ) {}

  async create(dto: CreateUserDto) {
    // Validar que no se repita el correo
    const exists = await this.repo.findByEmail(dto.email);
    if (exists) {
      throw new (await import('@nestjs/common')).ConflictException('El correo ya está registrado');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.repo.create({
        ...dto, password: hashedPassword,
        role: dto.role
    });
  }

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: number) {
    return this.repo.findById(id);
  }

  async update(id: number, dto: UpdateUserDto) {
    if (dto.email) {
      const exists = await this.repo.findByEmail(dto.email);
      if (exists && exists.id !== id) {
        throw new (await import('@nestjs/common')).ConflictException('El correo ya está registrado por otro usuario');
      }
    }
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    return this.repo.update(id, dto);
  }

  async remove(id: number) {
    return this.repo.delete(id);
  }
}
