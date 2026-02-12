import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Empresa } from '../domain/entities/empresa.entity';
import type { IEmpresaRepository } from '../domain/repositories/empresa.repository';

@Injectable()
export class EmpresaService {
  constructor(@Inject('IEmpresaRepository') private readonly empresaRepository: IEmpresaRepository) {}

  async create(dto: Partial<Empresa>): Promise<Empresa> {
    const empresa = new Empresa();
    Object.assign(empresa, dto);
    return this.empresaRepository.create(empresa);
  }

  async findAll(): Promise<Empresa[]> {
    return this.empresaRepository.findAll();
  }

  async findById(id: number): Promise<Empresa> {
    const empresa = await this.empresaRepository.findById(id);
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    return empresa;
  }

  async update(id: number, dto: Partial<Empresa>): Promise<Empresa> {
    const empresa = await this.findById(id);
    Object.assign(empresa, dto);
    return this.empresaRepository.update(empresa);
  }

  async remove(id: number): Promise<void> {
    await this.empresaRepository.remove(id);
  }
}
