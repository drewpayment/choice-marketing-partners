import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../shared/material/material.module';
import { DocumentListComponent } from './document-list/document-list.component';
import { ConfirmDeletesDialogComponent } from './confirm-deletes/confirm-deletes-dialog.component';

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MaterialModule,

    ],
    declarations: [
        DocumentListComponent,
        ConfirmDeletesDialogComponent,
    ],
    exports: [
        DocumentListComponent,
    ],
    entryComponents: [
        ConfirmDeletesDialogComponent,
    ]
})
export class DocumentsModule {}
