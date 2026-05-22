import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../application/dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión — requiere schemaName, email y password' })
  @ApiResponse({ status: 200, description: 'JWT generado exitosamente' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
