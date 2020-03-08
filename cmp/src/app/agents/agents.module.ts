import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentsListComponent } from './agents-list/agents-list.component';
import { MaterialModule } from '../shared/material/material.module';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AddAgentDialogComponent } from './add-agent-dialog/add-agent-dialog.component';



@NgModule({
    declarations: [
        AgentsListComponent,
        AddAgentDialogComponent
    ],
    imports: [
        CommonModule,
        MaterialModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
    ],
    exports: [
        AgentsListComponent
    ],
    entryComponents: [
        AddAgentDialogComponent
    ]
})
export class AgentsModule { }
