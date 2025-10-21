import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeolocalizacionService {

  private readonly baseUrl: string;
  private readonly BASE_URL_OPTIONAL = 'https://nominatim.openstreetmap.org';


  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('NOMINATIM_BASE_URL', this.BASE_URL_OPTIONAL);
  }

  async searchAddress(query: string) {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }
}
