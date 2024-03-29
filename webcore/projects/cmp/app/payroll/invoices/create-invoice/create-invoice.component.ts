import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnInit,
} from "@angular/core";
import { User } from "../../../models/user.model";
import { AccountService } from "../../../account.service";
import { InvoiceService } from "../invoice.service";
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { BehaviorSubject, Subject } from "rxjs";
import {
  Agent,
  DeleteInvoiceItems,
  EditInvoiceResources,
  Expense,
  Invoice,
  InvoiceSaveRequest,
  Override,
  Vendor,
} from "../../../models";
import { Moment } from "moment";
import * as moment from "moment";
import { DOCUMENT } from "@angular/common";
import { takeUntil } from "rxjs/operators";
import { coerceNumberProperty } from "@angular/cdk/coercion";
import { MatSnackBar } from "@angular/material/snack-bar";
import { HttpErrorResponse } from "@angular/common/http";

@Component({
  selector: "cp-create-invoice",
  templateUrl: "./create-invoice.component.html",
  styleUrls: ["./create-invoice.component.scss"],
})
export class CreateInvoiceComponent implements OnInit {
  user!: User;

  f = this.createForm();

  vendorOptions$ = new Subject<Vendor[]>();
  agentOptions$ = new Subject<Agent[]>();
  private issueDates!: Date[] | Moment[] | string[];
  issueDates$ = new Subject<Date[] | Moment[] | string[]>();

  salesCols = [
    "saleDate",
    "firstName",
    "lastName",
    "address",
    "city",
    "status",
    "amount",
    "delete",
  ];
  overridesCols = ["name", "numSales", "commission", "total", "delete"];
  expenseCols = ["type", "amount", "notes", "delete"];

  invoiceDataSource = new BehaviorSubject<AbstractControl[]>([]);
  overrideDataSource = new BehaviorSubject<AbstractControl[]>([]);
  expenseDataSource = new BehaviorSubject<AbstractControl[]>([]);

  get formInvoices(): FormArray {
    return this.f.get("invoices") as FormArray;
  }

  get formOverrides(): FormArray {
    return this.f.get("overrides") as FormArray;
  }

  get formExpenses(): FormArray {
    return this.f.get("expenses") as FormArray;
  }

  isNew = false;
  destroy$ = new Subject<void>();

  pendingDeletes: DeleteInvoiceItems = {
    sales: [],
    overrides: [],
    expenses: [],
  };

  isMultiSelectMode = false;
  multiSelectDeletes: number[] = [];

  pendingTotals: number = 0;

  get vendorCtrl(): FormControl {
    return this.f.get("vendor") as FormControl;
  }

  get agentCtrl(): FormControl {
    return this.f.get("agent") as FormControl;
  }

  get issueDateCtrl(): FormControl {
    return this.f.get("issueDate") as FormControl;
  }

  get weekendingCtrl(): FormControl {
    return this.f.get("weekending") as FormControl;
  }

  constructor(
    private account: AccountService,
    private invoiceService: InvoiceService,
    private fb: FormBuilder,
    private el: ElementRef<HTMLElement>,
    private cd: ChangeDetectorRef,
    private bar: MatSnackBar,
    @Inject(DOCUMENT) private document: any
  ) {
    this.formOverrides.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        let hasUpdates = false;
        this.formOverrides.controls.forEach(
          (ctrl: AbstractControl, i: number, arr: AbstractControl[]) => {
            if (ctrl.value.sales !== null && ctrl.value.commission !== null) {
              const currTotal = coerceNumberProperty(ctrl.value.total);
              const newTotal = coerceNumberProperty(
                ctrl.value.sales * ctrl.value.commission
              );

              if (currTotal !== newTotal) {
                ctrl.patchValue({ total: newTotal });
                hasUpdates = true;
              }
            }
          }
        );

        if (hasUpdates)
          this.overrideDataSource.next(this.formOverrides.controls);
      });
  }

  ngOnInit(): void {
    this.account.getUserInfo.subscribe((user) => {
      this.user = user;
      // console.dir(this.user);
    });

    this.invoiceService.getCreateInvoiceResources().subscribe((result) => {
      this.vendorOptions$.next(result.vendors);
      this.agentOptions$.next(result.agents);

      this.issueDates = result.issueDates;
      this.issueDates$.next(result.issueDates);

      const data = this.el.nativeElement.getAttribute("data");
      this.isNew = data == null;

      if (!this.isNew) {
        const parsed = JSON.parse(<string>data) as EditInvoiceResources;

        parsed.expenses = JSON.parse(parsed.expenses as any);
        parsed.invoices = JSON.parse(parsed.invoices as any);
        parsed.overrides = JSON.parse(parsed.overrides as any);
        parsed.weekending = moment(parsed.weekending, "MM-DD-YYYY");

        const issueDate = moment(parsed.issueDate, "MM-DD-YYYY");
        const hasIssueDate = this.issueDates.some((dt) =>
          issueDate.isSame(moment(dt, "MM-DD-YYYY"), "date")
        );
        if (!hasIssueDate) {
          this.issueDates.unshift(issueDate.format("MM-DD-YYYY") as any);
        }
        parsed.issueDate = issueDate;

        for (const p in parsed) {
          const parsedProperty: unknown = (<any>parsed)[p];
          if (Array.isArray(parsedProperty)) {
            (<any>parsed)[p] = parsedProperty.map((item) => {
              const fixed = this.convertToCamelCase(item);
              return fixed || item;
            });
          } else {
            const fixed = this.convertToCamelCase((<any>parsed)[p]);
            (<any>parsed)[p] = fixed || (<any>parsed)[p];
          }
        }

        this.updateForm(parsed);
      }

      this.invoiceDataSource.next(this.formInvoices.controls);
      this.overrideDataSource.next(this.formOverrides.controls);
      this.expenseDataSource.next(this.formExpenses.controls);
      this.cd.detectChanges();
    });
  }

  toggleMultiSelectMode(isEnabled: boolean) {
    this.isMultiSelectMode = isEnabled;
  }

  checkedMultiSelectDelete(item: any) {
    if (item && item.invoiceId > 0) {
      this.multiSelectDeletes.push(item.invoiceId);
    }
  }

  confirmDelete() {
    if (this.multiSelectDeletes && this.multiSelectDeletes.length) {
      this.invoiceService
        .deleteInvoices(this.multiSelectDeletes)
        .subscribe((res) => {
          const filteredRows = this.formInvoices.value.filter(
            (x: any) => !this.multiSelectDeletes.includes(x.invoiceId)
          );

          this.patchInvoicesForm(filteredRows);
          this.isMultiSelectMode = false;
        });
    }
  }

  save() {
    this.formInvoices.controls.forEach((c, i) => {
      const isEmpty = this.checkIsRowEmpty(c.value);
      if (isEmpty) {
        this.formInvoices.removeAt(i);
      }
    });

    this.formOverrides.controls.forEach((o, i) => {
      const isEmpty = this.checkIsRowEmpty(o.value);
      if (isEmpty) {
        this.formOverrides.removeAt(i);
      }
    });

    this.formExpenses.controls.forEach((e, i) => {
      const isEmpty = this.checkIsRowEmpty(e.value);
      if (isEmpty) {
        this.formExpenses.removeAt(i);
      }
    });

    if (this.f.invalid) return;

    const fv = this.f.getRawValue();

    const dto = {
      vendorId: fv.vendor || null,
      agentId: fv.agent,
      issueDate: moment(fv.issueDate, "MM-DD-YYYY").format("YYYY-MM-DD"),
      weekending: moment(fv.weekending).format("YYYY-MM-DD"),
      sales: fv.invoices,
      overrides: fv.overrides,
      expenses: fv.expenses,
      pendingDeletes: this.pendingDeletes,
    } as InvoiceSaveRequest;

    this.invoiceService.saveInvoice(dto).subscribe(
      (result) => {
        this.bar
          .open(`${result.payroll.agentName}'s Invoice saved!`, "dismiss", {
            duration: 5000,
          })
          .afterOpened()
          .subscribe(() => this.resetForm());
      },
      (err: HttpErrorResponse) => {
        this.bar.open(`${err.message}`, "dismiss");
      }
    );
  }

  cancel() {
    console.log("CANCEL");

    this.document.location.href = "/payroll";
  }

  addInvoiceRow() {
    this.formInvoices.push(this.addEmptyInvoiceRow());
    this.invoiceDataSource.next(this.formInvoices.controls);
  }

  addOverrideRow() {
    this.formOverrides.push(this.addEmptyOverrideRow());
    this.overrideDataSource.next(this.formOverrides.controls);
  }

  addExpenseRow() {
    this.formExpenses.push(this.addEmptyExpenseRow());
    this.expenseDataSource.next(this.formExpenses.controls);
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();

    const clipData = event.clipboardData || (window as any).clipboardData;
    const clipText = clipData.getData("text");

    const rows = clipText
      .split(/\n|\r/)
      .filter((row: any) => row.length)
      .map((row: any) => row.split(/\t/));

    console.dir(rows);

    if (rows && rows.length) {
      this.formInvoices.clear();
      rows.forEach((row: any) => {
        const isExcelNegative = this.isExcelNegative(row[6]);
        const rgx = /[^-\d]/gi;
        const amtParts = row[6].trim().split(".");
        let amount = "";

        if (amtParts.length > 1) {
          const beforeDec = amtParts[0].replace(rgx, "");
          const afterDec = amtParts[1].replace(rgx, "");
          amount = `${beforeDec}.${afterDec}`;
        } else {
          amount = amtParts[0].replace(rgx, "") + ".00";
        }

        if (isExcelNegative) amount = `-${amount}`;

        this.formInvoices.push(
          this.fb.group({
            saleDate: this.fb.control(moment(row[0], "MM-DD-YYYY"), [
              Validators.required,
            ]),
            firstName: this.fb.control(row[1].trim(), [Validators.required]),
            lastName: this.fb.control(row[2].trim(), [Validators.required]),
            address: this.fb.control(row[3].trim(), [Validators.required]),
            city: this.fb.control(row[4].trim(), [Validators.required]),
            status: this.fb.control(row[5].trim(), [Validators.required]),
            amount: this.fb.control(amount, [Validators.required]),
          })
        );
      });
      this.invoiceDataSource.next(this.formInvoices.controls);
    }
  }

  clearInvoiceTable() {
    const pendDels = this.formInvoices.value.filter(
      (inv: any) => inv.invoiceId > 0
    );

    if (pendDels.length) {
      this.pendingDeletes.sales = [...this.pendingDeletes.sales, ...pendDels];
    }

    this.formInvoices.clear();
    this.formInvoices.push(this.addEmptyInvoiceRow());
    this.invoiceDataSource.next(this.formInvoices.controls);
  }

  removeInvoice(index: number) {
    const pendDel = this.formInvoices.at(index).value;

    // If the row we are deleting has an invoice ID we are just going to post it to the server
    // and delete it immediately
    if (pendDel.invoiceId > 0) {
      this.invoiceService
        .deleteInvoice(pendDel.invoiceId)
        .subscribe((deletedSuccessfully) => {
          if (deletedSuccessfully) {
            this.formInvoices.removeAt(index);
            this.invoiceDataSource.next(this.formInvoices.controls);
          }
        });
    } else {
      this.formInvoices.removeAt(index);
      this.invoiceDataSource.next(this.formInvoices.controls);
    }
  }

  removeOverride(index: number) {
    const pendDel = this.formOverrides.at(index).value;

    if (pendDel.overrideId > 0)
      this.pendingDeletes.overrides = [
        ...this.pendingDeletes.overrides,
        pendDel,
      ];

    this.formOverrides.removeAt(index);
    this.overrideDataSource.next(this.formOverrides.controls);
  }

  removeExpense(index: number) {
    const pendDel = this.formExpenses.at(index).value;

    if (pendDel.expenseId > 0)
      this.pendingDeletes.expenses = [...this.pendingDeletes.expenses, pendDel];

    this.formExpenses.removeAt(index);
    this.expenseDataSource.next(this.formExpenses.controls);
  }

  private isExcelNegative(value: any): boolean {
    const hasStartingParen = value.indexOf("(") > -1;
    const hasEndingParen = value.indexOf(")") > -1;
    return hasStartingParen && hasEndingParen;
  }

  private resetForm() {
    if (this.isNew) {
      this.f.reset();
      this.formInvoices.clear();
      this.formOverrides.clear();
      this.formExpenses.clear();
      this.formInvoices.push(this.addEmptyInvoiceRow());
      this.formOverrides.push(this.addEmptyOverrideRow());
      this.formExpenses.push(this.addEmptyExpenseRow());
      this.invoiceDataSource.next(this.formInvoices.controls);
      this.overrideDataSource.next(this.formOverrides.controls);
      this.expenseDataSource.next(this.formExpenses.controls);
    }
  }

  private checkIsRowEmpty(row: any): boolean {
    let result = true;
    if (typeof row !== "object" || row === null) {
      throw new Error("Not an object");
    }
    for (const p in row) {
      const val = row[p];
      result = val === null || val === "";
      if (!result) return result;
    }
    return result;
  }

  private convertToCamelCase<T>(item: any): T {
    if (moment.isMoment(item)) return null as unknown as T;
    if (typeof item === "object" && item !== null) {
      const corrected = {} as T;
      for (const p in item) {
        (<any>corrected)[
          p.replace(/_([a-zA-Z0-9])/g, (g) => g[1].toUpperCase())
        ] = item[p];
      }
      return corrected;
    } else {
      return null as unknown as any;
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      vendor: this.fb.control("", [Validators.required]),
      agent: this.fb.control("", [Validators.required]),
      issueDate: this.fb.control("", [Validators.required]),
      weekending: this.fb.control("", [Validators.required]),
      invoices: this.fb.array([this.addEmptyInvoiceRow()]),
      overrides: this.fb.array([this.addEmptyOverrideRow()]),
      expenses: this.fb.array([this.addEmptyExpenseRow()]),
    });
  }

  private updateForm(d: EditInvoiceResources) {
    this.f.patchValue({
      vendor: d.campaign.id,
      agent: d.employee.id,
      issueDate: d.issueDate.format("MM-DD-YYYY"),
      weekending: d.weekending,
    });

    this.vendorCtrl.disable({ emitEvent: false });
    this.agentCtrl.disable({ emitEvent: false });
    this.issueDateCtrl.disable({ emitEvent: false });
    this.weekendingCtrl.disable({ emitEvent: false });

    this.patchInvoicesForm(d.invoices);
    this.patchOverridesForm(d.overrides);
    this.patchExpensesForm(d.expenses);
    this.setPendingTotals(d.invoices, d.overrides, d.expenses);
  }

  private setPendingTotals(
    invoices: Invoice[],
    overrides: Override[],
    expenses: Expense[]
  ) {
    let total = 0;

    if (invoices && invoices.length) {
      total += (<unknown>invoices.reduce((a, b) => {
        a.amount += b.amount;
        return a;
      }).amount) as number;
    }

    if (overrides && overrides.length) {
      total += (<unknown>overrides.reduce((a, b) => {
        a.total += b.total;
        return a;
      }).total) as number;
    }

    if (expenses && expenses.length) {
      total += (<unknown>expenses.reduce((a, b) => {
        a.amount += b.amount;
        return a;
      }).amount) as number;
    }

    this.pendingTotals = total;
  }

  private patchOverridesForm(overrides: Override[]) {
    this.formOverrides.clear();

    overrides.forEach((ovr) => {
      this.formOverrides.push(
        this.fb.group({
          overrideId: this.fb.control(ovr.ovrid),
          name: this.fb.control(ovr.name, [Validators.required]),
          sales: this.fb.control(ovr.sales, [Validators.required]),
          commission: this.fb.control(ovr.commission, [Validators.required]),
          total: this.fb.control(ovr.total, [Validators.required]),
        })
      );
    });

    if (this.isNew || !this.formOverrides.controls.length)
      this.formOverrides.push(this.addEmptyOverrideRow());
    this.overrideDataSource.next(this.formOverrides.controls);
  }

  private patchExpensesForm(expenses: Expense[]) {
    this.formExpenses.clear();

    expenses.forEach((exp) => {
      this.formExpenses.push(
        this.fb.group({
          expenseId: this.fb.control(exp.expid),
          type: this.fb.control(exp.type, [Validators.required]),
          amount: this.fb.control(exp.amount, [Validators.required]),
          notes: this.fb.control(exp.notes, [Validators.required]),
        })
      );
    });

    if (this.isNew || !this.formExpenses.controls.length)
      this.formExpenses.push(this.addEmptyExpenseRow());
    this.expenseDataSource.next(this.formExpenses.controls);
  }

  private patchInvoicesForm(invoices: Invoice[]) {
    this.formInvoices.clear();

    invoices.forEach((inv) => {
      this.formInvoices.push(
        this.fb.group({
          invoiceId: this.fb.control(inv.invoiceId),
          saleDate: this.fb.control(moment(inv.saleDate, "MM-DD-YYYY"), [
            Validators.required,
          ]),
          firstName: this.fb.control(inv.firstName, [Validators.required]),
          lastName: this.fb.control(inv.lastName, [Validators.required]),
          address: this.fb.control(inv.address, [Validators.required]),
          city: this.fb.control(inv.city, [Validators.required]),
          status: this.fb.control(inv.status, [Validators.required]),
          amount: this.fb.control(inv.amount, [Validators.required]),
        })
      );
    });

    if (this.isNew || !this.formInvoices.controls.length)
      this.formInvoices.push(this.addEmptyInvoiceRow());
    this.invoiceDataSource.next(this.formInvoices.controls);
  }

  private addEmptyInvoiceRow(): FormGroup {
    return this.fb.group({
      invoiceId: this.fb.control(""),
      saleDate: this.fb.control("", [Validators.required]),
      firstName: this.fb.control("", [Validators.required]),
      lastName: this.fb.control("", [Validators.required]),
      address: this.fb.control("", [Validators.required]),
      city: this.fb.control("", [Validators.required]),
      status: this.fb.control("", [Validators.required]),
      amount: this.fb.control("", [Validators.required]),
    });
  }

  private addEmptyOverrideRow(): FormGroup {
    return this.fb.group({
      name: this.fb.control("", [Validators.required]),
      sales: this.fb.control("", [Validators.required]),
      commission: this.fb.control("", [Validators.required]),
      total: this.fb.control("", [Validators.required]),
    });
  }

  private addEmptyExpenseRow(): FormGroup {
    return this.fb.group({
      type: this.fb.control("", [Validators.required]),
      amount: this.fb.control("", [Validators.required]),
      notes: this.fb.control("", [Validators.required]),
    });
  }
}
