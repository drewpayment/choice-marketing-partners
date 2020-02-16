import { Component, OnInit, Input, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import * as moment from 'moment';
import { Vendor, Agent } from '../../models';
import { Observable } from 'rxjs';
import { startWith, map, tap } from 'rxjs/operators';

@Component({
    selector: 'cp-paystubs-list',
    templateUrl: './paystubs-list.component.html',
    styleUrls: ['./paystubs-list.component.scss']
})
export class PaystubsListComponent implements OnInit {

    f: FormGroup = this.createForm();

    isAdmin: boolean;
    isManager: boolean;
    employees: Agent[];
    issueDates: string[];
    vendors: Vendor[];
    overrides: any;
    expenses: any;

    filteredDates: Observable<string[]>;
    filteredCampaigns: Observable<Vendor[]>;
    filteredAgents: Observable<Agent[]>;

    constructor(private ref: ElementRef, private fb: FormBuilder) { 
        const elem = this.ref.nativeElement;
        this.isAdmin = elem.getAttribute('isAdmin') > 0;
        this.isManager = elem.getAttribute('isManager') > 0;
        this.employees = elem.attributes['[employees]'] && elem.attributes['[employees]'].value
            ? JSON.parse(elem.attributes['[employees]'].value) : null;
        this.issueDates = elem.attributes['[issueDates]'] && elem.attributes['[issueDates]'].value
            ? JSON.parse(elem.attributes['[issueDates]'].value) : null;
        this.vendors = elem.attributes['[vendors]'] && elem.attributes['[vendors]'].value
            ? JSON.parse(elem.attributes['[vendors]'].value) : null;

        console.dir(elem);
    }

    ngOnInit(): void {
        console.dir({
            isAdmin: this.isAdmin,
            isManager: this.isManager,
            employees: this.employees,
            issueDates: this.issueDates,
            vendors: this.vendors
        });

        if (this.issueDates && this.issueDates.length) {
            this.f.get('date').setValue(this.issueDates[0]);
        }

        this.filteredDates = this.f.get('date').valueChanges
            .pipe(
                startWith(''),
                map((value: string) => {
                    const search = value.trim().toLowerCase();
                    return this.issueDates.filter(d => d.toLowerCase().includes(search));
                })
            );

        this.filteredCampaigns = this.f.get('campaign').valueChanges
            .pipe(
                startWith(''),
                map((value: string) => {
                    const search = value.trim().toLowerCase();
                    return this.vendors.filter((v: Vendor) => v.name.toLowerCase().includes(search));
                })
            );

        this.filteredAgents = this.f.get('agent').valueChanges
            .pipe(
                tap(value => console.log(value)),
                startWith(''),
                map(value => this.filterAgents(value))
            );
    }

    private filterAgents(search: string): Agent[] {
        return this.employees.filter((e: Agent) => this._normalizeValue(e.name).includes(search));
    }

    private _normalizeValue(value: string): string {
        return value.toLowerCase().replace(/\s/g, '');
    }

    displayDate(dateStr: string): string {
        const date = moment(dateStr, 'YYYY-MM-DD');
        if (!date.isValid()) return '';
        return date.format('MMM DD, YYYY');
    }

    displayCampaign(campaign: Vendor): string {
        return campaign ? campaign.name : '';
    }

    displayAgent(agent: Agent): string {
        return agent ? agent.name : '';
    }

    private createForm(): FormGroup {
        return this.fb.group({
            date: this.fb.control(this.issueDates ? this.issueDates[0] : ''),
            campaign: this.fb.control(''),
            agent: this.fb.control('')
        });
    }

}
