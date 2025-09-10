import { forwardRef, NgModule } from "@angular/core";
import {
  MatFormFieldControl,
  MatFormFieldModule,
} from "@angular/material/form-field";
import { MatButtonModule } from "@angular/material/button";
import {
  MatInputModule,
  MAT_INPUT_VALUE_ACCESSOR,
} from "@angular/material/input";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatIconModule } from "@angular/material/icon";
import { MatCardModule } from "@angular/material/card";
import { MatListModule } from "@angular/material/list";
import { MatTableModule } from "@angular/material/table";
import { MatSortModule } from "@angular/material/sort";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatStepperModule } from "@angular/material/stepper";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatMomentDateModule } from "@angular/material-moment-adapter";
import { MatChipsModule } from "@angular/material/chips";
import { MatMenuModule } from "@angular/material/menu";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDialogModule } from "@angular/material/dialog";
import { MatDividerModule } from "@angular/material/divider";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatInputCurrencyDirective } from "./mat-input-currency.directive";
import { NG_VALIDATORS, NG_VALUE_ACCESSOR } from "@angular/forms";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule } from '@angular/cdk/drag-drop';


@NgModule({
  imports: [
    MatExpansionModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatTableModule,
    MatSortModule,
    MatToolbarModule,
    MatStepperModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatChipsModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatDialogModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    DragDropModule,
  ],
  declarations: [MatInputCurrencyDirective],
  exports: [
    MatExpansionModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatTableModule,
    MatSortModule,
    MatToolbarModule,
    MatStepperModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatChipsModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatDialogModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatInputCurrencyDirective,
    MatProgressSpinnerModule,
    DragDropModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MatInputCurrencyDirective),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: MatInputCurrencyDirective,
      multi: true,
    },
    {
      provide: MAT_INPUT_VALUE_ACCESSOR,
      useExisting: MatInputCurrencyDirective,
      multi: true,
    },
  ],
})
export class MaterialModule {}
