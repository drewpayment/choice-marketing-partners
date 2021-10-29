import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ZipcodeService {

  private zipcodeApiUrl = 'https://app.zipcodebase.com/api/v1';

  constructor(private http: HttpClient) {}

  getStatus(): Observable<ZipcodeStatus> {
    const apiKey = environment.zipcode;
    const url = `${this.zipcodeApiUrl}/status`;
    return this.http.get<ZipcodeStatus>(url, {
      headers: {
        apiKey,
      }
    });
  }

  search(...codes: number[]): Observable<ZipcodeSearchResponse> {
    const apiKey = environment.zipcode;
    let url = `${this.zipcodeApiUrl}/search`;

    const codesQueryParams = codes.map((code, i, a) => {
      if (i === 0) return `${code}`;
      return `,${code}`;
    });

    return this.http.get<ZipcodeSearchResponse>(`${url}`, {
      headers: {
        apiKey,
      },
      params: {
        codes: codesQueryParams,
      },
    });
  }

}

export interface ZipcodeStatus {
  remaining_requests: number;
}

export interface ZipcodeQueryResponse {
  codes: number[];
  country: any;
}

export interface ZipcodeSearchResult {
  postal_code: string;
  country_code: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  state_code: number;
  province: string;
  province_code: string;
}

export interface ZipcodeSearchMapResult {
  [postalCode: string]: ZipcodeSearchResult[];
}

export interface ZipcodeSearchResponse {
  query: ZipcodeQueryResponse;
  results: ZipcodeSearchMapResult;
}
