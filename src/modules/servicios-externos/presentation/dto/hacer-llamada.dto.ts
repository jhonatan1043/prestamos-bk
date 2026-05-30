import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class HacerLlamadaDto {
  @ApiProperty({
    description: 'Número destino en formato E.164 (ej: +573001234567)',
    example: '+573001234567',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'El número debe estar en formato E.164 (ej: +573001234567)',
  })
  to: string;

  @ApiProperty({
    description: 'URL TwiML con las instrucciones de la llamada',
    example: 'https://mi-backend.com/twiml/conectar?tecnico=%2B573001234567',
    required: false,
  })
  @IsOptional()
  @IsString()   // ← era @IsUrl() que rechazaba URLs con %2B
  twimlUrl?: string;
}
