import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RecoverPasswordDto } from './dto/recover-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // Crear cliente Prisma dinámico apuntando al esquema del tenant
    const baseUrl = process.env.DATABASE_URL ?? '';
    const tenantUrl = baseUrl.replace(/([?&])schema=[^&]*/, `$1schema=${dto.schemaName}`);
    const prisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });

    try {
      const u = await prisma.user.findUnique({ where: { email: dto.email } });

      if (!u) throw new UnauthorizedException('Credenciales inválidas');
      if (!u.active) throw new UnauthorizedException('Usuario inactivo');

      const valid = await bcrypt.compare(dto.password, u.password);
      if (!valid) throw new UnauthorizedException('Credenciales inválidas');

      // Obtener el tenantId desde el esquema principal
      const mainPrisma = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } },
      });
      let tenantId = 0;
      try {
        const tenant = await mainPrisma.tenant.findUnique({
          where: { schemaName: dto.schemaName },
          select: { id: true },
        });
        tenantId = tenant?.id ?? 0;
      } finally {
        await mainPrisma.$disconnect();
      }

      const payload = {
        sub:        u.id,
        email:      u.email,
        role:       u.role,
        nombre:     u.nombre,
        schemaName: dto.schemaName,
        tenantId,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id:         u.id,
          email:      u.email,
          role:       u.role,
          nombre:     u.nombre,
          schemaName: dto.schemaName,
          tenantId,
        },
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  async recoverPassword(dto: RecoverPasswordDto): Promise<void> {
    const baseUrl   = process.env.DATABASE_URL ?? '';
    const tenantUrl = baseUrl.replace(/([?&])schema=[^&]*/, `$1schema=${dto.schemaName}`);
    const prisma    = new PrismaClient({ datasources: { db: { url: tenantUrl } } });

    try {
      const user = await prisma.user.findUnique({ where: { email: dto.email } });
      if (!user) throw new NotFoundException('No se encontró ninguna cuenta con ese correo.');

      const hashed = await bcrypt.hash(dto.newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data:  { password: hashed },
      });
    } finally {
      await prisma.$disconnect();
    }
  }
}
