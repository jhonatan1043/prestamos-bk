export interface IGeocodingProvider {
  searchAddress(query: string): Promise<any>;
  reverseGeocode(lat: string, lon: string): Promise<any>;
}
