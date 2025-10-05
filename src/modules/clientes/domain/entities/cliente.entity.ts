import { ApiProperty } from '@nestjs/swagger';
export class Cliente {
  @ApiProperty()
  id: number | null;

  @ApiProperty()
  tipoIdentificacion: string;

  @ApiProperty()
  identificacion: string;

  @ApiProperty()
  nombres: string;

  @ApiProperty()
  apellidos: string;

  @ApiProperty()
  direccion: string;

  @ApiProperty()
  telefono: string;

  @ApiProperty({ required: false })
  edad?: number;

  @ApiProperty({ enum: ['ACTIVO', 'ELIMINADO'] })
  estado: string;

  constructor(
    id: number | null,
    tipoIdentificacion: string,
    identificacion: string,
    nombres: string,
    apellidos: string,
    direccion: string,
    telefono: string,
    estado: string = 'ACTIVO',
    edad?: number,
  ) {
    this.id = id;
    this.tipoIdentificacion = tipoIdentificacion;
    this.identificacion = identificacion;
    this.nombres = nombres;
    this.apellidos = apellidos;
    this.direccion = direccion;
    this.telefono = telefono;
    this.estado = estado;
    this.edad = edad;
  }

  get nombreCompleto(): string {
    return `${this.nombres} ${this.apellidos}`;
  }
}
