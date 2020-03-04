import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentsListComponent } from './agents-list/agents-list.component';
import { MaterialModule } from '../shared/material/material.module';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';



@NgModule({
    declarations: [
        AgentsListComponent
    ],
    imports: [
        CommonModule,
        MaterialModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
    ],
    exports: [
        AgentsListComponent
    ]
})
export class AgentsModule { }
