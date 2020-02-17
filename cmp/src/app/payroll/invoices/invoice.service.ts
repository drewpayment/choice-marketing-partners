import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PaystubSummary, Vendor } from '../../models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class InvoiceService {

    constructor(private http: HttpClient) { }

    getPaystubs(employeeId: number, vendorId: number, date: string): Observable<PaystubSummary[]> {
        const url = `payroll/employees/${employeeId}/vendors/${vendorId}/issue-dates/${date}`;
        return this.http.get<{ rows: PaystubSummary[] }>(url)
            .pipe(map(result => result.rows.sort(this.compareVendorNames)));
    }

    private compareVendorNames = (a: PaystubSummary, b: PaystubSummary) => {
        return a.vendorName < b.vendorName
            ? -1 : a.vendorName > b.vendorName
                ? 1 : 0;
    }

}
