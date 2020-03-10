import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../account.service';
import { Country, State, Agent, UserType, AgentRequest } from '../../models';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { AgentsService } from '../agents.service';

@Component({
    selector: 'cp-add-agent-dialog',
    templateUrl: './add-agent-dialog.component.html',
    styleUrls: ['./add-agent-dialog.component.scss']
})
export class AddAgentDialogComponent implements OnInit {

    f: FormGroup = this.createForm();
    fUser: FormGroup = this.createUserForm();
    isCreatingUser = false;
    countries$: Observable<Country[]>;
    states$: Observable<State[]>;
    @ViewChild('overridePassword', { static: false }) overridePassword: MatSlideToggle;
    isPasswordReadonly = true;
    userTypes = {};

    constructor(
        public dialogRef: MatDialogRef<AddAgentDialogComponent>, 
        private fb: FormBuilder,
        private account: AccountService,
        private cd: ChangeDetectorRef,
        private service: AgentsService
    ) { }

    ngOnInit(): void {
        this.userTypes = Object.keys(UserType).filter(k => isNaN(Number(k)) && k.trim().toLowerCase() != 'superadmin');
        
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
        const dto = this.prepareModel();
        console.dir(dto);

        const isFormAgentValid = this.f.valid;
        const isFormUserValid = this.f.valid;
        const isFormsValid = isFormAgentValid && (this.isCreatingUser ? isFormUserValid : true);

        if (!isFormsValid) {
            this.dialogRef.close();
        }

        this.service.saveAgent(dto)
            .subscribe(agent => {
                this.dialogRef.close(agent);
            });
    }

    getUserTypes(): any[] {
        return Object.keys(UserType).filter(t => !isNaN(Number(t)) && Number(t) !== 1);
    }

    getUserTypeValue(key: string): UserType {
        return UserType[key];
    }

    getUserTypeDesc(key: number): string {
        const keys = Object.keys(UserType).filter(k => isNaN(Number(k)));
        return keys[key];
    }

    toggleIsCreatingUser() {
        this.isCreatingUser = !this.isCreatingUser;
    }

    overridePasswordChange(event: MatSlideToggleChange) {
        this.isPasswordReadonly = !event.checked;
        const passwordCtrl = this.fUser.get('password');

        if (event.checked) {
            passwordCtrl.enable();
        } else {
            passwordCtrl.disable();
        }
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

    private prepareModel(): AgentRequest {
        const f = this.f.value;
        const fu = this.isCreatingUser ? this.fUser.value : null;
        const result: AgentRequest = {
            name: f.name,
            email: f.email,
            phoneNo: f.phone,
            address: f.address,
            address2: f.address2,
            city: f.city,
            state: f.state ? f.state.StateName : null,
            country: f.country ? f.country.CountryName : null,
            postalCode: f.postalCode,
            isActive: true,
            isMgr: false,
            salesId1: f.id1,
            salesId2: f.id2,
            salesId3: f.id3,
            isCreatingUser: this.isCreatingUser
        } as AgentRequest;

        if (this.isCreatingUser) {
            result.userType = fu.userType;
            result.password = fu.password;
        }

        return result;
    }

    private createUserForm(): FormGroup {
        return this.fb.group({
            userType: this.fb.control(UserType.Employee, [Validators.required]),
            password: this.fb.control({ value: '', disabled: true }, [Validators.required])
        });
    }

}
