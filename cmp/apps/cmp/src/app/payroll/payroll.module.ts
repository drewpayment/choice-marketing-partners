import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateInvoiceComponent } from './invoices/create-invoice/create-invoice.component';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from '../shared/material/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { PaystubsListComponent } from './paystubs-list/paystubs-list.component';



@NgModule({
    imports: [
        CommonModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        MaterialModule,
    ],
    declarations: [
        CreateInvoiceComponent,
        PaystubsListComponent,
    ],

    exports: [
        CreateInvoiceComponent,
        PaystubsListComponent,
    ]
})
export class PayrollModule { }
