import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../shared/material/material.module';
import { DocumentListComponent } from './document-list/document-list.component';
import { ConfirmDeletesDialogComponent } from './confirm-deletes/confirm-deletes-dialog.component';
import { AddDocumentDialogComponent } from './add-document/add-document-dialog.component';

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MaterialModule,

    ],
    declarations: [
        DocumentListComponent,
        ConfirmDeletesDialogComponent,
        AddDocumentDialogComponent,
    ],
    exports: [
        DocumentListComponent,
    ],
    entryComponents: [
        ConfirmDeletesDialogComponent,
        AddDocumentDialogComponent,
    ]
})
export class DocumentsModule {}
