import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { GeolocalizacionService } from '../application/geolocalizacion.service';

@Controller('geolocalizacion')
export class GeolocalizacionController {
  constructor(private readonly geolocalizacionService: GeolocalizacionService) {}

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async search(@Query('q') query: string) {
    return this.geolocalizacionService.searchAddress(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reverse')
  async reverse(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.geolocalizacionService.reverseGeocode(lat, lon);
  }
}
