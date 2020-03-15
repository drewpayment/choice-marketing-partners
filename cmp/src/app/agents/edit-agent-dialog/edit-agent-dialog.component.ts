import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Agent, Country, State } from '../../models';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AccountService } from '../../account.service';
import { map, tap, first, skipWhile } from 'rxjs/operators';
import { AgentsService } from '../agents.service';

@Component({
    selector: 'cp-edit-agent-dialog',
    templateUrl: './edit-agent-dialog.component.html',
    styleUrls: ['./edit-agent-dialog.component.scss']
})
export class EditAgentDialogComponent implements OnInit {

    f: FormGroup = this.createForm();
    private _countries: Country[];
    countries$: Observable<Country[]>;
    states$: Observable<State[]>;

    constructor(
        public dialogRef: MatDialogRef<EditAgentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: Agent,
        private fb: FormBuilder,
        private account: AccountService,
        private service: AgentsService
    ) { }

    ngOnInit(): void {
        this.countries$ = this.account.getCountries
            .pipe(
                skipWhile(val => !val),
                first(),
                tap(old => this._countries = old)
            );

        this.states$ = this.f.get('country').valueChanges
            .pipe(
                map((value: Country) => {
                    if (typeof value === 'object' && value !== null) {
                        return value.States;
                    } else if (value != null) {
                        const strCountry: unknown = value;
                        const normVal = (strCountry as string).trim().toLowerCase();
                        const selectedCountry = this._countries
                            .find(c => c.CountryName.trim().toLowerCase() == normVal);
                        if (selectedCountry)
                            return selectedCountry.States;
                        else 
                            return [];
                    } 

                    return [];
                })
            );

        this.injectExistingAgentData();
    }

    injectExistingAgentData(): void {
        this.f.patchValue({
            id: this.data.id,
            name: this.data.name,
            email: this.data.email,
            phoneNo: this.data.phoneNo,
            address: this.data.address,
            address2: this.data.address2,
            city: this.data.city,
            state: this.data.state,
            country: this.data.country,
            postalCode: this.data.postalCode,
            isManager: this.data.isMgr,
            id1: this.data.salesId1,
            id2: this.data.salesId2,
            id3: this.data.salesId3
        });
    }

    saveAgent() {
        if (this.f.invalid) return;

        const agent = this.prepareModel();
        
        // send model to save
        this.service.updateAgent(agent)
            .subscribe(result => {
                this.dialogRef.close(result);
            });
    }

    selectedCountry(option: Country, selection: string): boolean {
        return option.CountryName == selection;
    }

    selectedState(option: State, selection: string): boolean {
        return option.StateName == selection;
    }

    private prepareModel(): Agent {
        const val = this.f.value;
        const result = {
            id: val && val.id ? val.id : null
        } as Agent;
        
        if (this.data.name != val.name) 
            result.name = val.name;
        if (this.data.email != val.email)
            result.email = val.email;
        if (this.data.phoneNo != val.phoneNo) 
            result.phoneNo = val.phoneNo;
        if (this.data.address != val.address)
            result.address = val.address;
        if (this.data.address2 != val.address2)
            result.address2 = val.address2;
        if (this.data.city != val.city)
            result.city = val.city;
        if (this.data.state != val.state.StateName)
            result.state = val.state.StateName;
        if (this.data.country != val.country.CountryName)
            result.country = val.country.CountryName;
        if (this.data.postalCode != val.postalCode)
            result.postalCode = val.postalCode;
        if (this.data.isMgr != val.isManager)
            result.isMgr = val.isManager;
        if (this.data.salesId1 != val.id1)
            result.salesId1 = val.id1;
        if (this.data.salesId2 != val.id2)
            result.salesId2 = val.id2;
        if (this.data.salesId3 != val.id3)
            result.salesId3 = val.id3;

        return result;
    }

    private createForm(): FormGroup {
        return this.fb.group({
            id: this.fb.control(''),
            name: this.fb.control('', [Validators.required]),
            email: this.fb.control('', [Validators.required]),
            phoneNo: this.fb.control('', [Validators.required]),
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
