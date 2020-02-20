import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateInvoiceComponent } from './invoices/create-invoice/create-invoice.component';
import { HttpClientModule } from '@angular/common/http';
import { PaystubsListComponent } from './paystubs-list/paystubs-list.component';
import { MaterialModule } from '../shared/material/material.module';
import { ReactiveFormsModule } from '@angular/forms';



@NgModule({
    declarations: [
        CreateInvoiceComponent, 
        PaystubsListComponent
    ],
    imports: [
        CommonModule,
        HttpClientModule,
        ReactiveFormsModule,
        MaterialModule
    ],
    exports: [
        CreateInvoiceComponent,
        PaystubsListComponent
    ]
})
export class PayrollModule { }