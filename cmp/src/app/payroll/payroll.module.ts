import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateInvoiceComponent } from './invoices/create-invoice/create-invoice.component';
import { HttpClientModule } from '@angular/common/http';



@NgModule({
    declarations: [CreateInvoiceComponent],
    imports: [
        CommonModule,
        HttpClientModule
    ],
    exports: [
        CreateInvoiceComponent
    ]
})
export class PayrollModule { }
