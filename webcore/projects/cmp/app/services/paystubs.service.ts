import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SearchPaystubsRequest, PaystubSummary } from '../models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaystubsService {

  constructor(private http: HttpClient) {}

  searchPaystubs(request: SearchPaystubsRequest): Observable<PaystubSummary[]> {
    return this.http.post<PaystubSummary[]>(`api/paystubs`, request);
  }

}
