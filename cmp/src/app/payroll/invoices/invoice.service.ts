import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import {
  InvoicePageResources,
  InvoiceSaveRequest,
  InvoiceSaveResult,
  PaystubSummary,
  Vendor,
} from "../../models";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Moment } from "moment";

@Injectable({
  providedIn: "root",
})
export class InvoiceService {
  constructor(private http: HttpClient) {}

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

  private compareVendorNames = (a: PaystubSummary, b: PaystubSummary) => {
    return a.vendorName < b.vendorName
      ? -1
      : a.vendorName > b.vendorName
      ? 1
      : 0;
  };
}
