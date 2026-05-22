import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class HealthController {
  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Verificar conexión con el servidor' })
  @ApiResponse({ status: 200, description: 'Servidor activo', schema: {
    example: { status: 'ok', message: 'Servidor activo', timestamp: '2026-05-22T14:30:00.000Z' }
  }})
  ping() {
    return {
      status: 'ok',
      message: 'Servidor activo',
      timestamp: new Date().toISOString(),
    };
  }
}
