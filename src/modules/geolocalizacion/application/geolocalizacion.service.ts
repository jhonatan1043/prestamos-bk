import { Injectable, Inject } from '@nestjs/common';
import type { IGeocodingProvider } from '../domain/providers/geocoding-provider.interface';

@Injectable()
export class GeolocalizacionService {
  constructor(
    @Inject('IGeocodingProvider')
    private readonly provider: IGeocodingProvider,
  ) {}

  async searchAddress(query: string) {
    return this.provider.searchAddress(query);
  }

  async reverseGeocode(lat: string, lon: string) {
    return this.provider.reverseGeocode(lat, lon);
  }
}

