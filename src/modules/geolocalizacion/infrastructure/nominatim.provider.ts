import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IGeocodingProvider } from '../domain/providers/geocoding-provider.interface';

@Injectable()
export class NominatimProvider implements IGeocodingProvider {
  private static readonly DEFAULT_BASE_URL = 'https://nominatim.openstreetmap.org';
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'NOMINATIM_BASE_URL',
      NominatimProvider.DEFAULT_BASE_URL
    );
  }

  async searchAddress(query: string): Promise<any> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }

  async reverseGeocode(lat: string, lon: string): Promise<any> {
    const url = `${this.baseUrl}/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }
}
