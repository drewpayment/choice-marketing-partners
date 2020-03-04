import { NgModule } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';

@NgModule({
    imports: [
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
    ],
    exports: [
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
    ]
})
export class MaterialModule { }
