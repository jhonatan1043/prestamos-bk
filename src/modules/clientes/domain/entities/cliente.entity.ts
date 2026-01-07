import { ApiProperty } from '@nestjs/swagger';
export class Cliente {
  @ApiProperty()
  correo: string;
  @ApiProperty()
  active: boolean;

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
  sectorId: number;


  constructor(
    id: number | null,
    tipoIdentificacion: string,
    identificacion: string,
    nombres: string,
    apellidos: string,
    direccion: string,
    telefono: string,
    sectorId: number,
    correo: string,
    edad?: number,
    active: boolean = true,
  ) {
    this.id = id;
    this.tipoIdentificacion = tipoIdentificacion;
    this.identificacion = identificacion;
    this.nombres = nombres;
    this.apellidos = apellidos;
    this.direccion = direccion;
    this.telefono = telefono;
    this.sectorId = sectorId;
    this.correo = correo;
    this.edad = edad;
    this.active = active;
  }

  get nombreCompleto(): string {
    return `${this.nombres} ${this.apellidos}`;
  }

}
