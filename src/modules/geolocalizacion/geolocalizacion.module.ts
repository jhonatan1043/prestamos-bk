import { Module } from '@nestjs/common';
import { GeolocalizacionService } from './application/geolocalizacion.service';
import { GeolocalizacionController } from './presentation/geolocalizacion.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { NominatimProvider } from './infrastructure/nominatim.provider';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [GeolocalizacionController],
  providers: [
    GeolocalizacionService,
    NominatimProvider,
    { provide: 'IGeocodingProvider', useClass: NominatimProvider }
  ],
})
export class GeolocalizacionModule {}
