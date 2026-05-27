import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthService } from '../application/auth.service';
import { LoginDto } from '../application/dto/login.dto';
import { RecoverPasswordDto } from '../application/dto/recover-password.dto';

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

  @Public()
  @Post('recover-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restablecer contraseña — requiere schemaName, email y newPassword' })
  @ApiResponse({ status: 204, description: 'Contraseña actualizada correctamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async recoverPassword(@Body() dto: RecoverPasswordDto): Promise<void> {
    return this.authService.recoverPassword(dto);
  }
}
