import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AccountService } from '../../account.service';
import { User } from '../../models';
import { DocumentService } from '../documents.service';

@Component({
    selector: 'cp-add-document-dialog',
    templateUrl: './add-document-dialog.component.html',
    styleUrls: ['./add-document-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddDocumentDialogComponent implements OnInit {

    user: User;
    f: FormGroup = this.createForm();
    @ViewChild('fileInput') file: ElementRef<HTMLInputElement>;

    constructor(
        private acct: AccountService,
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<AddDocumentDialogComponent>,
        private cd: ChangeDetectorRef,
        private service: DocumentService,
    ) {}

    ngOnInit() {
        this.acct.getUserInfo.subscribe(user => this.user = user);
    }

    uploadFile() {
        const newFile = this.file.nativeElement.files[0];

        this.f.patchValue({
            file: newFile,
            filePath: newFile.name,
            mimeType: newFile.type,
            uploadedBy: this.user.name,
        });

        if (this.f.invalid) return;

        this.service.saveDocument(this.f.value)
            .subscribe(document => {
                this.dialogRef.close(document);
            });
    }

    fileSelected(event) {
        this.cd.detectChanges();
    }

    private createForm(): FormGroup {
        return this.fb.group({
            name: this.fb.control('', [Validators.required]),
            description: this.fb.control('', [Validators.required]),
            file: this.fb.control(null, [Validators.required]),
            filePath: this.fb.control('', [Validators.required]),
            mimeType: this.fb.control('', [Validators.required]),
            uploadedBy: this.fb.control('', [Validators.required]),
        });
    }

}
