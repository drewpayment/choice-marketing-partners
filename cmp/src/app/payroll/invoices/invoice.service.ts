import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import {
  Invoice,
  InvoicePageResources,
  InvoiceSaveRequest,
  InvoiceSaveResult,
  PaystubSummary,
  Vendor,
} from "../../models";
import { Observable, of } from "rxjs";
import { catchError, map, mapTo } from "rxjs/operators";
import { Moment } from "moment";
import { MatSnackBar } from '@angular/material/snack-bar';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

@Injectable({
  providedIn: "root",
})
export class InvoiceService {
  constructor(private http: HttpClient, private snack: MatSnackBar,) {}

  getPaystubs(
    employeeId: number,
    vendorId: number,
    date: string
  ): Observable<PaystubSummary[]> {
    const url = `payroll/employees/${employeeId}/vendors/${vendorId}/issue-dates/${date}`;
    return this.http
      .get<{ rows: PaystubSummary[] }>(url)
      .pipe(map((result) => result.rows.sort(this.compareVendorNames)));
  }

  getCreateInvoiceResources(): Observable<InvoicePageResources> {
    const url = `api/invoices`;
    return this.http.get<InvoicePageResources>(url);
  }

  getExistingInvoice(
    agentId: number,
    vendorId: number,
    issueDate: Moment
  ): Observable<any> {
    const url = `api/agents/${agentId}/vendors/${vendorId}/dates/${issueDate.format(
      "YYYY-MM-DD"
    )}`;
    return this.http.get<any>(url);
  }

  saveInvoice(dto: InvoiceSaveRequest): Observable<InvoiceSaveResult> {
    const url = `api/invoices`;
    return this.http.post<InvoiceSaveResult>(url, dto);
  }

  deleteInvoice(invoiceId: number): Observable<boolean> {
    return this.http.delete(`api/invoices/${invoiceId}`)
      .pipe(
        catchError(err => {
          this.snack.open(err, 'dismiss', { duration: 10000 });
          return of(false);
        }),
        map((res) => {
          if (res === undefined) return true;
          return coerceBooleanProperty(res);
        }),
      );
  }

  deleteInvoices(invoiceIds: number[]): Observable<boolean> {
    return this.http.delete(`api/invoices`, { params: { i: invoiceIds.join(',') } })
      .pipe(
        catchError(err => {
          this.snack.open(err, 'dismiss', { duration: 10000 });
          return of(false);
        }),
        map((res) => {
          if (res === undefined) return true;
          return coerceBooleanProperty(res);
        }),
      );
  }

  private compareVendorNames = (a: PaystubSummary, b: PaystubSummary) => {
    return a.vendorName < b.vendorName
      ? -1
      : a.vendorName > b.vendorName
      ? 1
      : 0;
  };
}
