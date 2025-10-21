import { Module } from '@nestjs/common';
import { GeolocalizacionService } from './application/geolocalizacion.service';
import { GeolocalizacionController } from './presentation/geolocalizacion.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [GeolocalizacionController],
  providers: [GeolocalizacionService],
})
export class GeolocalizacionModule {}
