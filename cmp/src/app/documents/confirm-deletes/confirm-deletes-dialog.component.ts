import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IDocument } from '../../models';

@Component({
    selector: 'cp-confirm-deletes-dialog',
    template: `
        <h2 mat-dialog-title>Delete Documents?</h2>
        <mat-dialog-content>
            <mat-list dense>
                <mat-list-item *ngFor="let doc of data?.documents">
                    {{ doc.name }}
                </mat-list-item>
            </mat-list>
        </mat-dialog-content>
        <mat-dialog-actions>
            <button mat-button mat-dialog-close>Cancel</button>
            <button mat-button [mat-dialog-close]="true">Delete</button>
        </mat-dialog-actions>
    `
})
export class ConfirmDeletesDialogComponent {

    constructor(@Inject(MAT_DIALOG_DATA) public data: { documents: IDocument[] }) {}

}
