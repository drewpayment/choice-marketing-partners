import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SearchPaystubsRequest, PaystubSummary } from '../models';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaystubsService {

  api = environment.apiV2;

  constructor(private http: HttpClient) {}

  searchPaystubs(request: SearchPaystubsRequest): Observable<PaystubSummary[]> {
    return this.http.post<PaystubSummary[]>(`${this.api}/payrolls/search`, request);
    // return this.http.post<PaystubSummary[]>(`api/paystubs`, request);
  }

}
