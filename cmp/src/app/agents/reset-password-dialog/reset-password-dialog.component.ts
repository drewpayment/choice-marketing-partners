import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Agent, User } from '../../models';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgentsService } from '../agents.service';

interface DialogData {
    agent: Agent;
}

@Component({
    selector: 'cp-reset-password-dialog',
    templateUrl: './reset-password-dialog.component.html',
    styleUrls: ['./reset-password-dialog.component.scss']
})
export class ResetPasswordDialogComponent implements OnInit {

    f: FormGroup = this.createForm();

    constructor(
        private dialogRef: MatDialogRef<ResetPasswordDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: Agent,
        private fb: FormBuilder,
        private snack: MatSnackBar,
        private service: AgentsService
    ) { }

    ngOnInit(): void {
        if (!this.data) {
            this.dialogRef.close();
            this.snack.open('Failed to get your agent. Please refresh the page and try again.', 'dismiss', { duration: 3000 });
        }
    }

    closeDialog() {
        this.dialogRef.close();
    }

    savePasswordReset() {
        this.f.markAllAsTouched();
        if (this.f.invalid) return;
        
        if (!this.validatePasswordsMatch()) {
            this.f.get('verifyPassword').setErrors({ mismatch: true });
            return;
        }

        const model = this.prepareModel();

        this.service.adminResetAgentPassword(model)
            .subscribe(agent => {
                if (agent) {
                    this.dialogRef.close(agent);
                    this.snack.open('Password has been reset!', 'dismiss', { duration: 3000 });
                }
            });
    }

    validatePasswordsMatch(): boolean {
        const form = this.f.value;
        return form.password === form.verifyPassword;
    }

    private prepareModel(): User {
        const agent = this.data;
        agent.user.password = this.f.value.password;
        return agent.user;
    }

    private createForm(): FormGroup {
        return this.fb.group({
            password: this.fb.control('', [Validators.required]),
            verifyPassword: this.fb.control('', [Validators.required])
        });
    }

}
