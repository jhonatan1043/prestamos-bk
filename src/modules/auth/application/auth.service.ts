import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantPrismaService } from '../../../common/tenant/tenant-prisma.service';
import { mainSchema } from '../../../common/auth/roles';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mainPrisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  async login(dto: LoginDto) {
    // Solo se permite el esquema principal (superadmin) o el de una empresa
    // registrada. Así no se abren conexiones a esquemas arbitrarios.
    let tenantId = 0;
    if (dto.schemaName !== mainSchema()) {
      const tenant = await this.mainPrisma.tenant.findUnique({
        where:  { schemaName: dto.schemaName },
        select: { id: true },
      });
      if (!tenant) throw new UnauthorizedException('Credenciales inválidas');
      tenantId = tenant.id;
    }

    // Cliente Prisma cacheado por esquema (no se crea uno nuevo por login)
    const prisma = this.tenantPrisma.forSchema(dto.schemaName);
    const u = await prisma.user.findUnique({ where: { email: dto.email } });

    if (!u) throw new UnauthorizedException('Credenciales inválidas');
    if (!u.active) throw new UnauthorizedException('Usuario inactivo');

    const valid = await bcrypt.compare(dto.password, u.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

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
  }
}
