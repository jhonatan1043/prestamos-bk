import { Controller, Get, Query } from '@nestjs/common';
import { GeolocalizacionService } from '../application/geolocalizacion.service';

@Controller('geolocalizacion')
export class GeolocalizacionController {
  constructor(private readonly geolocalizacionService: GeolocalizacionService) {}

  @Get('search')
  async search(@Query('q') query: string) {
    return this.geolocalizacionService.searchAddress(query);
  }

    @Get('reverse')
    async reverse(@Query('lat') lat: string, @Query('lon') lon: string) {
      return this.geolocalizacionService.reverseGeocode(lat, lon);
    }
}
