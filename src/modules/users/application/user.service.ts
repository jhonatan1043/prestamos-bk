import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import * as userRepository from '../domain/repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { LimitesService } from '../../suscripciones/application/limites.service';
import { esAdmin } from '../../../common/auth/roles';
import { User } from '../domain/entities/user.entity';

/** Nunca devolver el hash de la contraseña en las respuestas. */
function sinPassword(user: User): Omit<User, 'password'> {
  const { password, ...resto } = user;
  return resto;
}

@Injectable()
export class UserService {
  constructor(
    @Inject('IUserRepository') private readonly repo: userRepository.IUserRepository,
    private readonly limitesService: LimitesService,
  ) {}

  async create(dto: CreateUserDto) {
    return sinPassword(await this.crear(dto));
  }

  private async crear(dto: CreateUserDto) {
    await this.limitesService.verificarUsuarios();

    const exists = await this.repo.findByEmail(dto.email);
    if (exists) {
      if (exists.active === false) {
        // Reactivar usuario inactivo
        return this.repo.update(exists.id, { ...dto, password: await bcrypt.hash(dto.password, 10), active: true });
      }
      throw new (await import('@nestjs/common')).ConflictException('El correo ya está registrado');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.repo.create({
      ...dto,
      password: hashedPassword,
      role: dto.role,
      active: true
    });
  }

  async findAll() {
    return (await this.repo.findAll()).map(sinPassword);
  }

  async findOne(id: number) {
    const user = await this.repo.findById(id);
    return user ? sinPassword(user) : null;
  }

  /**
   * Un admin puede editar a cualquier usuario de su empresa. Un usuario normal
   * solo puede editarse a sí mismo y no puede cambiar su rol.
   */
  async update(id: number, dto: UpdateUserDto, actor?: any) {
    if (!esAdmin(actor)) {
      if (Number(actor?.id) !== id) {
        throw new ForbiddenException('Solo puedes modificar tu propio usuario');
      }
      if (dto.role !== undefined) {
        throw new ForbiddenException('No puedes cambiar tu propio rol');
      }
    }
    if (dto.email) {
      const exists = await this.repo.findByEmail(dto.email);
      if (exists && exists.id !== id) {
        throw new (await import('@nestjs/common')).ConflictException('El correo ya está registrado por otro usuario');
      }
    }
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    return sinPassword(await this.repo.update(id, dto));
  }

  async remove(id: number) {
    return this.repo.delete(id);
  }
}
