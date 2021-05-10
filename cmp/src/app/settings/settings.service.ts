import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {

  constructor(private http: HttpClient) {}

  getPayrollDates(): Observable<Date[]> {
    return this.http.get<Date[]>(`api/company/settings/payroll-dates`);
  }

  calculatePayroll(date: Date): Observable<any> {
    return this.http.put(`api/company/settings/payroll-dates`, {
      date: moment(date).format('YYYY-MM-DD'),
    });
  }

}
