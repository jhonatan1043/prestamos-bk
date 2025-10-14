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

  @ApiProperty()
  estadoId: number;
  // Relación opcional para incluir el objeto Estado si se desea
  estado?: any;

  constructor(
    id: number | null,
    tipoIdentificacion: string,
    identificacion: string,
    nombres: string,
    apellidos: string,
    direccion: string,
    telefono: string,
    estadoId: number,
    edad?: number,
    estado?: any,
  ) {
    this.id = id;
    this.tipoIdentificacion = tipoIdentificacion;
    this.identificacion = identificacion;
    this.nombres = nombres;
    this.apellidos = apellidos;
    this.direccion = direccion;
    this.telefono = telefono;
    this.estadoId = estadoId;
    this.edad = edad;
    this.estado = estado;
  }

  get nombreCompleto(): string {
    return `${this.nombres} ${this.apellidos}`;
  }
}
