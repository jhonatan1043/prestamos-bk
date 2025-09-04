export class User {
  constructor(
    public readonly id: number,
    public readonly password: string, // guardado con bcrypt
    public readonly email: string,
    public readonly roles: string,
  ) {}
}
