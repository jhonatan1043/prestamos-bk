import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, Matches } from 'class-validator';

export class HacerLlamadaDto {
  @ApiProperty({
    description: 'Número destino en formato E.164 (ej: +593987654321)',
    example: '+593987654321',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'El número debe estar en formato E.164 (ej: +593987654321)',
  })
  to: string;

  @ApiProperty({
    description: 'URL TwiML con las instrucciones de la llamada (opcional, usa el valor por defecto del .env)',
    example: 'https://demo.twilio.com/docs/voice.xml',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  twimlUrl?: string;
}
