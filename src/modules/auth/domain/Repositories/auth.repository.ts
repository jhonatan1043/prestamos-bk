import { User } from '../Entities/user.entity';

// Usamos abstract class como TOKEN de inyección
export abstract class AuthRepository {
  abstract findByUsername(username: string): Promise<User | null>;
}
