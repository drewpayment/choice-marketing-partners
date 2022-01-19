import { Component, OnInit, ElementRef, OnDestroy, ViewChild, ChangeDetectorRef } from "@angular/core";
import {
  FormGroup,
  FormBuilder,
  FormControl,
  Validators,
} from "@angular/forms";
import * as moment from "moment";
import {
  Vendor,
  Agent,
  SearchPaystubs,
  PaystubSummary,
  SearchPaystubsRequest,
} from "../../models";
import {
  Observable,
  BehaviorSubject,
  Subscription,
  of,
  Subject,
  forkJoin,
  merge,
  scheduled,
  concat,
  EMPTY,
} from "rxjs";
import {
  startWith,
  map,
  tap,
  shareReplay,
  catchError,
  takeUntil,
  filter,
  switchMap,
  take,
  exhaustMap,
  timestamp,
} from "rxjs/operators";
import { InvoiceService } from "../invoices/invoice.service";
import { Location } from "@angular/common";
import { MatDialog } from "@angular/material/dialog";
import { PaystubNotificationDialogComponent } from "./paystub-notification-dialog/paystub-notification-dialog.component";
import { SettingsService } from "src/app/settings/settings.service";
import { NotificationsService } from "src/app/services/notifications.service";
import { MatCalendarCellClassFunction, MatEndDate, MatStartDate } from "@angular/material/datepicker";
import { PaystubsService } from "../../services/paystubs.service";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { MatChipInputEvent, MatChipList } from "@angular/material/chips";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { coerceNumberProperty } from '@angular/cdk/coercion';

@Component({
  selector: "cp-paystubs-list",
  templateUrl: "./paystubs-list.component.html",
  styleUrls: ["./paystubs-list.component.scss"],
})
export class PaystubsListComponent implements OnInit, OnDestroy {
  f: FormGroup = this.createForm();

  isAdmin: boolean;
  isManager: boolean;
  employees: Agent[];
  issueDates: string[];
  vendors: Vendor[];
  overrides: any;
  expenses: any;

  paystubs$ = new BehaviorSubject<PaystubSummary[]>((<unknown>null) as PaystubSummary[]);
  paystubs!: Observable<PaystubSummary[]>;

  subscriptions: Subscription[] = [];
  controlName!: string;

  showTools = false;
  private _paystubs: PaystubSummary[] = [];
  private companyOptions$ = this.settings.getCompanyOptions().pipe(
    shareReplay(),
    catchError((err) => of(null))
  );
  private destroy$ = new Subject();
  isLoading$ = new BehaviorSubject(true);
  get range(): FormGroup {
    return this.f.get("range") as FormGroup;
  }

  dateClass: MatCalendarCellClassFunction<Date> = (cellDate, view) => {
    const dt = moment(cellDate);

    const found = this.issueDates.find((issueDate) =>
      dt.isSame(issueDate, "d")
    );

    return found ? "issue-date-focus" : "";
  };
  selectedVendors: Vendor[] = [({ id: -1, name: 'All Campaigns' } as Vendor)];
  filteredVendors: Vendor[] = [];
  separatorKeysCodes: number[] = [ENTER, COMMA];

  selectedAgents: Agent[] = [({ id: -1, name: 'All Agents' } as Agent)];
  filteredAgents: Agent[] = [];

  @ViewChild('vendorInput')
  vendorInput!: ElementRef<HTMLInputElement>;
  @ViewChild('agentInput')
  agentInput!: ElementRef<HTMLInputElement>;
  @ViewChild('campaignList')
  vendorList!: MatChipList;
  @ViewChild('agentList')
  agentList!: MatChipList;

  get searchVendors(): Vendor[] {
    return this.vendors.filter(v => !this.selectedVendors.find(sv => sv.id === v.id));
  }

  get searchEmployees(): Agent[] {
    return this.employees.filter(e => !this.selectedAgents.find(sa => sa.id === e.id));
  }

  get vendorControl(): FormControl {
    return this.f.get('vendorSearch') as FormControl;
  }

  get agentControl(): FormControl {
    return this.f.get('agentSearch') as FormControl;
  }

  get grossPayroll(): number {
    return this._paystubs != null
      ? this._paystubs.slice().map(p => coerceNumberProperty(p.amount)).reduce((acc, val) => acc + val)
      : 0;
  }

  //#region Constructors
  constructor(
    private ref: ElementRef,
    private fb: FormBuilder,
    private service: InvoiceService,
    private location: Location,
    private dialog: MatDialog,
    private settings: SettingsService,
    private notifications: NotificationsService,
    private paystubsService: PaystubsService,
  ) {
    const elem = this.ref.nativeElement;
    this.isAdmin = elem.getAttribute("isAdmin") > 0;
    this.isManager = elem.getAttribute("isManager") > 0;
    this.employees =
      elem.attributes["[employees]"] && elem.attributes["[employees]"].value
        ? JSON.parse(elem.attributes["[employees]"].value)
        : null;
    this.issueDates =
      elem.attributes["[issueDates]"] && elem.attributes["[issueDates]"].value
        ? JSON.parse(elem.attributes["[issueDates]"].value)
        : null;
    this.vendors =
      elem.attributes["[vendors]"] && elem.attributes["[vendors]"].value
        ? JSON.parse(elem.attributes["[vendors]"].value)
        : null;

    this.issueDates =
      typeof this.issueDates === "object" && this.issueDates !== null
        ? Object.values(this.issueDates)
        : this.issueDates;

    this.vendors =
      typeof this.vendors === "object" && this.vendors !== null
        ? Object.values(this.vendors)
        : this.vendors;

    this._setFilteredVendors();
    this._setFilteredAgents();

    this.vendorControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      startWith(''),
      map(search => search ? this._filterVendors(search) : this.vendors.slice()),
    ).subscribe(vendors => this.filteredVendors = vendors);

    this.agentControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      startWith(''),
      map(search => search ? this._filterAgents(search) : this.employees.slice()),
    ).subscribe(agents => this.filteredAgents = agents);
  }

  ngOnInit(): void {
    if (this.issueDates && this.issueDates.length) {
      const firstIssueDate = moment(this.issueDates[0]);
      const startDate = firstIssueDate.clone().startOf("week");
      const endDate = firstIssueDate.clone().endOf("week");
      this.range.setValue({
        start: startDate,
        end: endDate,
      });
    }

    if (this.vendors && this.vendors.length) {
      if (this.vendors.length > 1) {
        this.vendors.unshift({
          id: -1,
          name: "All Campaigns",
        } as Vendor);
      }
    }

    if (this.employees && this.employees.length) {
      if (this.employees.length > 1) {
        this.employees.unshift({
          id: -1,
          name: "All Agents",
        } as Agent);
      }
    }

    this.paystubs = this.paystubs$.asObservable();

    this.searchForPaystubs().subscribe();
  }

  ngOnDestroy() {
    if (this.subscriptions && this.subscriptions.length) {
      this.subscriptions.forEach((s) => s.unsubscribe());
    }

    this.destroy$.next();
  }
  //#endregion

  sendPaytubNotifications() {
    this.dialog
      .open(PaystubNotificationDialogComponent, {
        width: "40vw",
        data: {
          agents: this.selectedAgents,
        },
      })
      .afterClosed()
      .subscribe((agents: Agent[]) => {
        if (!agents) return;

        const paystubsToSend = this._paystubs.filter(
          (stub) => agents.find((a) => a.id == stub.agentId) != null
        );

        if (paystubsToSend && paystubsToSend.length) {
          const ids = paystubsToSend.map((p) => p.id);

          if (ids && ids.length) {
            console.log(ids);
            this.notifications.sendPaystubNotifications(ids).subscribe(() => {
              console.log("I think it sent...");
            });
          }
        }
      });
  }

  searchForPaystubs(): Observable<any> {
    if (this.f.invalid) return EMPTY;

    const request = this.buildSearchRequest();

    if (this._paystubs && this._paystubs.length) {
      this._paystubs = [];
      this.paystubs$.next(this._paystubs);
      this.isLoading$.next(true);
    }

    return forkJoin([
      this.paystubsService.searchPaystubs(request),
      this.companyOptions$,
    ])
      .pipe(
        map(([stubs, options]) => {
          this.showTools =
            options != null &&
            options.hasPaystubNotifications &&
            stubs != null &&
            stubs.length > 0;
          return stubs;
        }),
        tap(paystubs => {
          this._paystubs = paystubs;


          // if (this._paystubs && this._paystubs.length) {
          //   this._paystubs = this._paystubs.sort((a, b) =>
          //     a.agentName < b.agentName ? -1 : a.agentName > b.agentName ? 1 : 0
          //   );
          // }

          setTimeout(() => {
            this.paystubs$.next(paystubs);
            this.isLoading$.next(false);
          }, 500);
        }),
      );
  }

  dateRangeChange(start: MatStartDate<moment.Moment>, end: MatEndDate<moment.Moment>) {
    this.searchForPaystubs().subscribe();
  }

  //#region Vendor and Agent Search Filters

  private _filterVendors(search: string): Vendor[] {
    if (!isNaN((search as any))) return this.vendors;
    search = search.trim().toLowerCase();
    return this.searchVendors.filter(vendor => vendor.name.toLowerCase().indexOf(search) === 0);
  }

  private _filterAgents(search: string): Agent[] {
    if (!isNaN((search as any))) return this.employees;
    search = search.trim().toLowerCase();
    return this.searchEmployees.filter(emp => emp.name.toLowerCase().indexOf(search) === 0);
  }

  addVendor(event: MatChipInputEvent) {
    console.dir(event);
  }

  vendorSelected(event: MatAutocompleteSelectedEvent) {
    const id = event.option.value;
    const vendor = this.vendors.find(v => v.id == id);
    const selectedAllVendorsIndex = this.selectedVendors.findIndex(sv => sv.id === -1);

    if (vendor) {
      // handle interacting with "All Campaigns" being selected or it being in the list when user selected
      // a difference one
      if (vendor.id === -1) {
        this.selectedVendors = [];
      } else if (selectedAllVendorsIndex > -1) {
        this.selectedVendors.splice(selectedAllVendorsIndex, 1);
      }

      this.selectedVendors.push(vendor);
      this.vendorInput.nativeElement.value = '';
      this.vendorInput.nativeElement.blur();
      this.vendorControl.setValue(null, { emitEvent: false });
    }

    this._setFilteredVendors();
    this._setVendorsErrorState();
    this.searchForPaystubs().subscribe();
  }

  private _setFilteredVendors(): void {
    this.filteredVendors = this.vendors.filter(v => !this.selectedVendors.find(sv => sv.id === v.id));
  }

  removeVendor(vendor: Vendor) {
    const index = this.selectedVendors.indexOf(vendor);
    if (index > -1) {
      this.selectedVendors.splice(index, 1);
      this.vendorControl.updateValueAndValidity();
    }

    this._setFilteredVendors();
    this._setVendorsErrorState();
  }

  private _setVendorsErrorState() {
    this.vendorList.errorState = this.selectedVendors.length < 1;
    this.vendorControl.setErrors(this.vendorList.errorState ? {required: true} : null);
  }

  addAgent(event: MatChipInputEvent) {

  }

  agentSelected(event: MatAutocompleteSelectedEvent) {
    const id = event.option.value;
    const agent = this.employees.find(a => a.id == id);
    const selectedAllAgentsIndex = this.selectedAgents.findIndex(sa => sa.id === -1);

    if (agent) {
      // handle interacting with "All Agents" being selected or it being in the list when user selected
      // a different agent
      if (agent.id === -1) {
        this.selectedAgents = [];
      } else if (selectedAllAgentsIndex > -1) {
        this.selectedAgents.splice(selectedAllAgentsIndex, 1);
      }

      this.selectedAgents.push(agent);
      this.agentInput.nativeElement.value = '';
      this.agentInput.nativeElement.blur();
      this.agentControl.setValue(null, { emitEvent: false });
    }

    this._setFilteredAgents();
    this._setAgentsErrorState();
    this.searchForPaystubs().subscribe();
  }

  removeAgent(agent: Agent) {
    const index = this.selectedAgents.indexOf(agent);

    if (index > -1) {
      this.selectedAgents.splice(index, 1);
      this.agentControl.updateValueAndValidity();
    }

    this._setFilteredAgents();
    this._setAgentsErrorState();
  }

  private _setFilteredAgents() {
    this.filteredAgents = this.employees.filter(e => !this.selectedAgents.find(sa => sa.id === e.id));
  }

  private _setAgentsErrorState() {
    this.agentList.errorState = this.selectedAgents.length < 1;
    this.agentControl.setErrors(this.agentList.errorState ? {required: true} : null);
  }

  //#endregion

  sortPaystubs(event: { active: string; direction: "asc" | "desc" }) {
    let sorted;
    const isAsc = event.direction === "asc";
    switch (event.active) {
      case "name":
        sorted = this.sortBy("agentName", isAsc);
        break;
      case "vendor":
        sorted = this.sortBy("vendorName", isAsc);
        break;
      default:
        break;
    }

    if (sorted) this.paystubs$.next(sorted);
  }

  showPaystubDetail(paystub: PaystubSummary) {
    window.location.href = `/payroll/employees/${paystub.agentId}/paystubs/${paystub.id}`;
  }

  private sortBy(propertyName: string, isAsc: boolean): PaystubSummary[] {
    const paystubs = this.paystubs$.value;
    const first = isAsc ? 1 : -1;
    const second = isAsc ? -1 : 1;
    if (!paystubs || !paystubs.length) return [];

    return paystubs.sort((a: any, b: any) => {
      return this._normalizeValue(a[propertyName]) <
        this._normalizeValue(b[propertyName])
        ? first
        : this._normalizeValue(a[propertyName]) >
          this._normalizeValue(b[propertyName])
        ? second
        : 0;
    });
  }

  private filterCampaigns(search: string): Vendor[] {
    return this.vendors.filter((v) =>
      this._normalizeValue(v.name).includes(search)
    );
  }
  private filterAgents(search: string): Agent[] {
    return this.employees.filter((e: Agent) =>
      this._normalizeValue(e.name).includes(search)
    );
  }

  private _normalizeValue(value: string): string {
    return value.toLowerCase().replace(/\s/g, "");
  }

  displayDate(dateStr: string): string {
    const date = moment(dateStr, "YYYY-MM-DD");
    if (!date.isValid()) return "";
    return date.format("MMM DD, YYYY");
  }

  displayCampaign(campaign: Vendor): string {
    return campaign ? campaign.name : "";
  }

  displayAgent(agent: Agent): string {
    return agent ? agent.name : "";
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // NEW CONTROLS
      range: this.fb.group({
        start: this.fb.control("", [Validators.required]),
        end: this.fb.control("", [Validators.required]),
      }),
      vendorSearch: this.fb.control(''),
      agentSearch: this.fb.control(''),
    });
  }

  private buildSearchRequest(): SearchPaystubsRequest {
    const request = {} as SearchPaystubsRequest;
    const form = this.f.value;
    request.employees = this.selectedAgents.map(a => a.id) as number[];
    request.vendors = this.selectedVendors.map(v => v.id);
    request.startDate = form.range.start.toISOString();
    request.endDate = form.range.end.toISOString();
    return request;
  }
}
