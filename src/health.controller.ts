import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('ping')
  ping() {
    return {
      status: 'ok',
      message: 'Servidor activo',
      timestamp: new Date().toISOString(),
    };
  }
}
