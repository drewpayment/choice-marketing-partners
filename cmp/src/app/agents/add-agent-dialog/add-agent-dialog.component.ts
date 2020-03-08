import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../account.service';
import { Country, State, Agent } from '../../models';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Component({
    selector: 'cp-add-agent-dialog',
    templateUrl: './add-agent-dialog.component.html',
    styleUrls: ['./add-agent-dialog.component.scss']
})
export class AddAgentDialogComponent implements OnInit {

    f: FormGroup = this.createForm();
    countries$: Observable<Country[]>;
    states$: Observable<State[]>;

    constructor(
        public dialogRef: MatDialogRef<AddAgentDialogComponent>, 
        private fb: FormBuilder,
        private account: AccountService,
        private cd: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.countries$ = this.account.getCountries
            .pipe(map(result => {
                const countries = result.Countries;
                const usaIndex = countries.findIndex(c => c.CountryName.replace(/\s/g, '').trim().toLowerCase() === 'unitedstates');
                const usa = countries.splice(usaIndex, 1)[0];
                countries.unshift(usa);
                return countries;
            }));

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
    }

    saveAgent() {
        // do some work... 
        console.log('save agent!');
        // if success 
        this.dialogRef.close('created agent with id: #');
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

    private prepareModel(): Agent {
        const f = this.f.value;
        return {
            name: f.name,
            email: f.email,
            phoneNo: f.phone,
            address: f.address,
            address2: f.address2,
            city: f.city,
            state: f.state,
            country: f.country,
            postalCode: f.postalCode,
            isActive: true,
            isMgr: false,
            salesId1: f.id1,
            salesId2: f.id2,
            salesId3: f.id3
        };
    }

}
