import { IsString } from 'class-validator';

export class SearchGeolocalizacionDto {
  @IsString()
  q: string;
}
