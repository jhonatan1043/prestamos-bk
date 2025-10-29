import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CobradorService } from '../application/cobrador.service';
import { CreateCobradorDto } from '../application/dto/create-cobrador.dto';

@ApiTags('cobradores')
@ApiBearerAuth()
@Controller('cobradores')
export class CobradorController {
  constructor(private readonly cobradorService: CobradorService) {}

  @Post()
  create(@Body() dto: CreateCobradorDto) {
    return this.cobradorService.create(dto);
  }

  @Get()
  findAll() {
    return this.cobradorService.findAll();
  }
}
