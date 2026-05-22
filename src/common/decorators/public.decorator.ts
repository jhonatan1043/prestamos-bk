import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como público: el JwtAuthGuard no exigirá token.
 * Úsalo en rutas que el frontend necesita antes del login
 * (ej: verificar empresa, listar planes).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
