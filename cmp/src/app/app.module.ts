import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ComponentFactoryResolver, DoBootstrap, ApplicationRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { PayrollModule } from './payroll/payroll.module';
import { CreateInvoiceComponent } from './payroll/invoices/create-invoice/create-invoice.component';
import { HttpClientModule } from '@angular/common/http';
import { PaystubsListComponent } from './payroll/paystubs-list/paystubs-list.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './shared/material/material.module';

const entryPoints = [
    CreateInvoiceComponent,
    PaystubsListComponent
];

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        ReactiveFormsModule,
        MaterialModule,

        PayrollModule,

        BrowserAnimationsModule
    ],
    providers: [],
    //   bootstrap: []
    entryComponents: entryPoints
})
export class AppModule implements DoBootstrap {

    constructor(private resolver: ComponentFactoryResolver) {}

    ngDoBootstrap(appRef: ApplicationRef) {
        entryPoints.forEach((p: any) => {
            const factory = this.resolver.resolveComponentFactory(p);
            const elem = document.getElementsByTagName(factory.selector);
            if (elem && elem.length) appRef.bootstrap(p);
        });
    }
}
