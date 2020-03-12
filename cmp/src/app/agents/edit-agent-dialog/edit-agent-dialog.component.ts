import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Agent, Country, State } from '../../models';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AccountService } from '../../account.service';
import { map } from 'rxjs/operators';

@Component({
    selector: 'cp-edit-agent-dialog',
    templateUrl: './edit-agent-dialog.component.html',
    styleUrls: ['./edit-agent-dialog.component.scss']
})
export class EditAgentDialogComponent implements OnInit {

    f: FormGroup = this.createForm();
    countries$: Observable<Country[]>;
    states$: Observable<State[]>;

    constructor(
        public dialogRef: MatDialogRef<EditAgentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: Agent,
        private fb: FormBuilder,
        private account: AccountService
    ) { }

    ngOnInit(): void {
        this.countries$ = this.account.getCountries;

        this.states$ = this.f.get('country').valueChanges
            .pipe(
                map((value: Country) => {
                    if (value) {
                        return value.States;
                    } else {
                        return [];
                    }
                })
            );

        this.injectExistingAgentData();
    }

    injectExistingAgentData(): void {
        this.f.patchValue(this.data);
    }

    saveAgent() {
        if (this.f.invalid) return;

        const result = this.prepareModel();
        
        // send model to save
    }

    private prepareModel(): Agent {
        const val = this.f.value;
        const result = {} as Agent;

        for (const p in val) {
            const v = val[p];
            if (v != this.data[p] && v != null && v.length) {
                result[p] = v;
            } else if (p == 'country' && v != this.data[p] && typeof v === 'object' && v !== null) {
                result[p] = v.CountryName;
            } else if (p == 'state' && v != this.data[p] && typeof v === 'object' && v !== null) {
                result[p] = v.StateName;
            }
        }

        return result;
    }

    private createForm(): FormGroup {
        return this.fb.group({
            name: this.fb.control('', [Validators.required]),
            email: this.fb.control('', [Validators.required]),
            phone: this.fb.control('', [Validators.required]),
            address: this.fb.control('', [Validators.required]),
            address2: this.fb.control(''),
            city: this.fb.control('', [Validators.required]),
            state: this.fb.control('', [Validators.required]),
            country: this.fb.control('', [Validators.required]),
            postalCode: this.fb.control('', [Validators.required]),
            isManager: this.fb.control(''),
            id1: this.fb.control(''),
            id2: this.fb.control(''),
            id3: this.fb.control('')
        });
    }

}
