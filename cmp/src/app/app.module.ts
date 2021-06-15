import { BrowserModule } from "@angular/platform-browser";
import {
  NgModule,
  ComponentFactoryResolver,
  DoBootstrap,
  ApplicationRef,
  CUSTOM_ELEMENTS_SCHEMA,
  ErrorHandler,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { AppComponent } from "./app.component";
import { PayrollModule } from "./payroll/payroll.module";
import { CreateInvoiceComponent } from "./payroll/invoices/create-invoice/create-invoice.component";
import { HttpClientModule } from "@angular/common/http";
import { PaystubsListComponent } from "./payroll/paystubs-list/paystubs-list.component";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MaterialModule } from "./shared/material/material.module";
import { NavBarComponent } from "./shared/nav-bar/nav-bar.component";
import { AgentsModule } from "./agents/agents.module";
import { AgentsListComponent } from "./agents/agents-list/agents-list.component";
import { DocumentsModule } from "./documents/documents.module";
import { DocumentListComponent } from "./documents/document-list/document-list.component";
import { BugsnagErrorHandler } from "@bugsnag/plugin-angular";
import { RouterModule } from "@angular/router";
import { SettingsModule } from "./settings/settings.module";
import { SettingsOutletComponent } from "./settings/settings-outlet.component";
import { HomeComponent } from './home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { UnauthGuard } from './guards/unauth.guard';

const entryPoints = [
  AppComponent,
  CreateInvoiceComponent,
  PaystubsListComponent,
  NavBarComponent,
  AgentsListComponent,
  DocumentListComponent,
  SettingsOutletComponent,
];

// create a factory which will return the Bugsnag error handler
export function errorHandlerFactory() {
  return new BugsnagErrorHandler();
}

@NgModule({
  declarations: [
    AppComponent,
    NavBarComponent,
    HomeComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    MaterialModule,
    DocumentsModule,

    PayrollModule,
    AgentsModule,
    // SettingsModule,

    BrowserAnimationsModule,

    RouterModule.forRoot([
      {
        path: 'company-settings',
        loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule),
      },
      {
        path: 'auth',
        loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
        canActivate: [UnauthGuard],
      },
      {
        path: 'a',
        loadChildren: () => import('./authorized/authorized.module').then(m => m.AuthorizedModule),
        canActivate: [AuthGuard],
      },
      {
        path: '',
        component: HomeComponent,
        pathMatch: 'full',
      }
    ], { useHash: false }),
  ],
  providers: [
    { provide: ErrorHandler, useFactory: errorHandlerFactory },
    UnauthGuard,
    AuthGuard,
  ],
  bootstrap: [AppComponent],
  // entryComponents: entryPoints,
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
