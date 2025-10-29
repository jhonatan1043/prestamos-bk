import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientesModule } from './modules/clientes/clientes.module';
import { GeolocalizacionModule } from './modules/geolocalizacion/geolocalizacion.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/users.module';
import { PrestamosModule } from './modules/prestamos/prestamos.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { CobradorModule } from './modules/cobrador/cobrador.module';
import { RutaModule } from './modules/ruta/ruta.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientesModule, 
    AuthModule, 
    UserModule, 
    PrestamosModule,
    PagosModule,
    CobradorModule,
    RutaModule,
    GeolocalizacionModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
