import { ChangeDetectorRef, Component, ElementRef, OnInit } from '@angular/core';
import { User } from '../../../models/user.model';
import { AccountService } from '../../../account.service';
import { InvoiceService } from '../invoice.service';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { Agent, EditInvoiceResources, Expense, Invoice, Override, Vendor } from '../../../models';
import { Moment } from 'moment';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { MatTable, MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'cp-create-invoice',
    templateUrl: './create-invoice.component.html',
    styleUrls: ['./create-invoice.component.scss']
})
export class CreateInvoiceComponent implements OnInit {

    user: User;

    f = this.createForm();


    vendorOptions$ = new Subject<Vendor[]>();
    agentOptions$ = new Subject<Agent[]>();
    private issueDates: Date[] | Moment[] | string[];
    issueDates$ = new Subject<Date[] | Moment[] | string[]>();

    salesCols = ['saleDate', 'firstName', 'lastName', 'address', 'city', 'status', 'amount'];
    overridesCols = ['name', 'numSales', 'commission', 'total'];
    expenseCols = ['type', 'amount', 'notes'];

    invoiceDataSource: MatTableDataSource<AbstractControl>;
    overrideDataSource: MatTableDataSource<AbstractControl>;
    expenseDataSource: MatTableDataSource<AbstractControl>;

    get formInvoices(): FormArray {
        return this.f.get('invoices') as FormArray;
    }

    get formOverrides(): FormArray {
        return this.f.get('overrides') as FormArray;
    }

    get formExpenses(): FormArray {
        return this.f.get('expenses') as FormArray;
    }

    constructor(
        private account: AccountService,
        private invoiceService: InvoiceService,
        private fb: FormBuilder,
        private el: ElementRef<HTMLElement>,
        private cd: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.account.getUserInfo.subscribe(user => {
            this.user = user;
            // console.dir(this.user);
        });

        this.invoiceService.getCreateInvoiceResources()
            .subscribe(result => {
                this.vendorOptions$.next(result.vendors);
                this.agentOptions$.next(result.agents);

                this.issueDates = result.issueDates;
                this.issueDates$.next(result.issueDates);

                const data = this.el.nativeElement.getAttribute('data');

                if (data) {
                    const parsed = JSON.parse(data) as EditInvoiceResources;
                    parsed.expenses = JSON.parse(parsed.expenses as any);
                    parsed.invoices = JSON.parse(parsed.invoices as any);
                    parsed.overrides = JSON.parse(parsed.overrides as any);
                    parsed.weekending = moment(parsed.weekending, 'MM-DD-YYYY');

                    const issueDate = moment(parsed.invoices[0].issueDate);
                    const hasIssueDate = this.issueDates.some(dt => issueDate.isSame(moment(dt, 'MM-DD-YYYY'), 'date'));
                    if (!hasIssueDate) {
                        this.issueDates.unshift(issueDate.format('MM-DD-YYYY') as any);
                    }
                    parsed.issueDate = issueDate;

                    for (const p in parsed) {
                        if (Array.isArray(parsed[p])) {
                            parsed[p] = parsed[p].map(item => {
                                const fixed = this.convertToCamelCase(item);
                                return fixed || item;
                            });
                        } else {
                            const fixed = this.convertToCamelCase(parsed[p]);
                            parsed[p] = fixed || parsed[p];
                        }
                    }

                    this.updateForm(parsed);
                }

                this.invoiceDataSource = new MatTableDataSource(this.formInvoices.controls);
                this.overrideDataSource = new MatTableDataSource(this.formOverrides.controls);
                this.expenseDataSource = new MatTableDataSource(this.formExpenses.controls);
                this.cd.detectChanges();
            });
    }

    private convertToCamelCase<T>(item: any): T {
        if (moment.isMoment(item)) return null;
        if (typeof item === 'object' && item !== null) {
            const corrected = {} as T;
            for (const p in item) {
                corrected[p.replace(/_([a-zA-Z0-9])/g, (g) => g[1].toUpperCase())] = item[p];
            }
            return corrected;
        } else {
            return null;
        }
    }

    private createForm(): FormGroup {
        return this.fb.group({
            vendor: this.fb.control('', [Validators.required]),
            agent: this.fb.control('', [Validators.required]),
            issueDate: this.fb.control('', [Validators.required]),
            weekending: this.fb.control('', [Validators.required]),
            invoices: this.fb.array([this.addEmptyInvoiceRow()]),
            overrides: this.fb.array([this.addEmptyOverrideRow()]),
            expenses: this.fb.array([this.addEmptyExpenseRow()]),
        });
    }

    private updateForm(d: EditInvoiceResources) {
        this.f.patchValue({
            vendor: d.campaign.id,
            agent: d.employee.id,
            issueDate: d.issueDate.format('MM-DD-YYYY'),
            weekending: d.weekending,
        });

        this.patchInvoicesForm(d.invoices);
        this.patchOverridesForm(d.overrides);
        this.patchExpensesForm(d.expenses);
    }

    private patchOverridesForm(overrides: Override[]) {
        this.formOverrides.clear();

        overrides.forEach(ovr => {
            this.formOverrides.push(this.fb.group({
                name: this.fb.control(ovr.name, [Validators.required]),
                sales: this.fb.control(ovr.sales, [Validators.required]),
                commission: this.fb.control(ovr.commission, [Validators.required]),
                total: this.fb.control(ovr.total, [Validators.required]),
            }));
        });

        this.formOverrides.push(this.addEmptyOverrideRow());
    }

    private patchExpensesForm(expenses: Expense[]) {
        this.formExpenses.clear();

        expenses.forEach(exp => {
            this.formExpenses.push(this.fb.group({
                type: this.fb.control(exp.type, [Validators.required]),
                amount: this.fb.control(exp.amount, [Validators.required]),
                notes: this.fb.control(exp.notes, [Validators.required]),
            }));
        });

        this.formExpenses.push(this.addEmptyExpenseRow());
    }

    private patchInvoicesForm(invoices: Invoice[]) {
        this.formInvoices.clear();

        invoices.forEach(inv => {
            this.formInvoices.push(this.fb.group({
                saleDate: this.fb.control(moment(inv.saleDate, 'MM-DD-YYYY'), [Validators.required]),
                firstName: this.fb.control(inv.firstName, [Validators.required]),
                lastName: this.fb.control(inv.lastName, [Validators.required]),
                address: this.fb.control(inv.address, [Validators.required]),
                city: this.fb.control(inv.city, [Validators.required]),
                status: this.fb.control(inv.status, [Validators.required]),
                amount: this.fb.control(inv.amount, [Validators.required]),
            }));
        });

        this.formInvoices.push(this.addEmptyInvoiceRow());
    }

    private addEmptyInvoiceRow(): FormGroup {
        return this.fb.group({
            saleDate: this.fb.control('', [Validators.required]),
            firstName: this.fb.control('', [Validators.required]),
            lastName: this.fb.control('', [Validators.required]),
            address: this.fb.control('', [Validators.required]),
            city: this.fb.control('', [Validators.required]),
            status: this.fb.control('', [Validators.required]),
            amount: this.fb.control('', [Validators.required]),
        });
    }

    private addEmptyOverrideRow(): FormGroup {
        return this.fb.group({
            name: this.fb.control('', [Validators.required]),
            sales: this.fb.control('', [Validators.required]),
            commission: this.fb.control('', [Validators.required]),
            total: this.fb.control('', [Validators.required]),
        });
    }

    private addEmptyExpenseRow(): FormGroup {
        return this.fb.group({
            type: this.fb.control('', [Validators.required]),
            amount: this.fb.control('', [Validators.required]),
            notes: this.fb.control('', [Validators.required]),
        });
    }

}
