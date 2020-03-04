import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentsListComponent } from './agents-list/agents-list.component';



@NgModule({
    declarations: [
        AgentsListComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        AgentsListComponent
    ]
})
export class AgentsModule { }
