import { Module } from '@nestjs/common';
import { ClientesModule } from './modules/clientes/clientes.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/users.module';

@Module({
  imports: [ClientesModule, AuthModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
