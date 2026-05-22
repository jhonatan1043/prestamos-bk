import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no está definido en las variables de entorno');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return {
      id:         payload.sub,
      email:      payload.email,
      role:       payload.role,
      roles:      payload.roles,
      nombre:     payload.nombre,
      schemaName: payload.schemaName,
      tenantId:   payload.tenantId,
    };
  }
}
