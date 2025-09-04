import { Module } from '@nestjs/common';
import { ClientesModule } from './modules/clientes/clientes.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/users.module';
import { PrestamosModule } from './modules/prestamos/prestamos.module';
import { PagosModule } from './modules/pagos/pagos.module';

@Module({
  imports: [ClientesModule, 
            AuthModule, 
            UserModule, 
            PrestamosModule,
            PagosModule
          ],
  controllers: [],
  providers: [],
})
export class AppModule {}
