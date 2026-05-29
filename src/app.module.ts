import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from './common/tenant/tenant.module';
import { TenantInterceptor } from './common/tenant/tenant.interceptor';
import { SuscripcionActivaInterceptor } from './common/interceptors/suscripcion-activa.interceptor';
import { ClientesModule } from './modules/clientes/clientes.module';
import { GeolocalizacionModule } from './modules/geolocalizacion/geolocalizacion.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/users.module';
import { PrestamosModule } from './modules/prestamos/prestamos.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { RutaModule } from './modules/ruta/ruta.module';
import { GastosModule } from './modules/gastos/gastos.module';
import { EmpresaModule } from './modules/empresa/empresa.module';
import { ServiciosExternosModule } from './modules/servicios-externos/servicios-externos.module';
import { SuscripcionesModule } from './modules/suscripciones/suscripciones.module';
import { TenantsModule }      from './modules/tenants/tenants.module';
import { PaymentsModule }     from './modules/payments/payments.module';
import { HealthController }   from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TenantModule,       // ← global: provee TenantContextService y TenantPrismaService
    AuthModule,
    ClientesModule,
    UserModule,
    PrestamosModule,
    PagosModule,
    RutaModule,
    GeolocalizacionModule,
    GastosModule,
    EmpresaModule,
    ServiciosExternosModule,
    SuscripcionesModule,
    TenantsModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide:  APP_INTERCEPTOR,
      useClass: TenantInterceptor,             // 1º: activa el contexto de tenant (AsyncLocalStorage)
    },
    {
      provide:  APP_INTERCEPTOR,
      useClass: SuscripcionActivaInterceptor,  // 2º: bloquea escrituras si el plan venció
    },
  ],
})
export class AppModule {}
