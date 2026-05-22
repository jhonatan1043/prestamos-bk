import { Plan } from '../entities/plan.entity';

export interface IPlanRepository {
  create(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan>;
  findAll(): Promise<Plan[]>;
  findActivos(): Promise<Plan[]>;
  findById(id: number): Promise<Plan | null>;
  update(id: number, data: Partial<Plan>): Promise<Plan>;
  remove(id: number): Promise<void>;
}
