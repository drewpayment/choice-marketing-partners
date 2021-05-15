import { Component, OnInit, ElementRef, OnDestroy } from "@angular/core";
import {
  FormGroup,
  FormBuilder,
  FormControl,
} from "@angular/forms";
import * as moment from "moment";
import { Vendor, Agent, SearchPaystubs, PaystubSummary } from "../../models";
import {
  Observable,
  BehaviorSubject,
  Subscription,
} from "rxjs";
import { startWith, map, tap, shareReplay } from "rxjs/operators";
import { InvoiceService } from "../invoices/invoice.service";
import { Location } from "@angular/common";
import { MatDialog } from "@angular/material/dialog";
import { PaystubNotificationDialogComponent } from "./paystub-notification-dialog/paystub-notification-dialog.component";
import { SettingsService } from 'src/app/settings/settings.service';
import { forkJoin } from 'rxjs/internal/observable/forkJoin';

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

  filteredDates: Observable<string[]>;
  filteredCampaigns: Observable<Vendor[]>;
  filteredAgents: Observable<Agent[]>;
  paystubs$ = new BehaviorSubject<PaystubSummary[]>(null);
  paystubs: Observable<PaystubSummary[]>;

  subscriptions: Subscription[] = [];
  controlName: string;

  showTools = false;
  private _allAgents: Agent[] = [];
  private _displayedAgents: Agent[] = [];
  private _paystubs: PaystubSummary[] = [];
  private companyOptions$ = this.settings.getCompanyOptions()
    .pipe(shareReplay());

  constructor(
    private ref: ElementRef,
    private fb: FormBuilder,
    private service: InvoiceService,
    private location: Location,
    private dialog: MatDialog,
    private settings: SettingsService,
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
  }

  ngOnInit(): void {
    if (this.issueDates && this.issueDates.length) {
      this.f.get("date").setValue(this.issueDates[0]);
    }

    if (this.vendors && this.vendors.length) {
      if (this.vendors.length > 1) {
        this.vendors.unshift({
          id: -1,
          name: "All Campaigns",
        } as Vendor);
      }
      this.f.get("campaign").setValue(this.vendors[0]);
    }

    if (this.employees && this.employees.length) {
      if (this.employees.length > 1) {
        this.employees.unshift({
          id: -1,
          name: "All Agents",
        } as Agent);
      }
      this.f.get("agent").setValue(this.employees[0]);
    }

    this.filteredDates = this.f.get("date").valueChanges.pipe(
      startWith(""),
      map((value) => this.issueDates)
    );

    this.filteredCampaigns = this.f.get("campaign").valueChanges.pipe(
      startWith(""),
      map((value) => this.filterCampaigns(value))
    );

    this.filteredAgents = this.f.get("agent").valueChanges.pipe(
      startWith(""),
      map((value) => this.filterAgents(value)),
      tap((agents) => {
        this._allAgents = agents;
      }),
    );

    this.paystubs = this.paystubs$.asObservable();

    // search with default values on page load
    this.search();
  }

  ngOnDestroy() {
    if (this.subscriptions && this.subscriptions.length) {
      this.subscriptions.forEach((s) => s.unsubscribe());
    }
  }

  sendPaytubNotifications() {
    this.dialog.open(PaystubNotificationDialogComponent, {
      width: '40vw',
      data: {
        agents: this._displayedAgents,
      },
    }).afterClosed().subscribe((agents: Agent[]) => {
      if (!agents) return;

      const paystubsToSend = this._paystubs.filter(stub => agents.find(a => a.id == stub.agentId) != null);

      console.dir(paystubsToSend);
    });
  }

  search() {
    const model = this.prepareModel();

    if (this.f.invalid) return;

    forkJoin([
      this.service.getPaystubs(model.agentId, model.campaignId, model.date as string),
      this.companyOptions$,
    ]).pipe(
        map(([stubs, options]) => {
          this.showTools = options != null && options.hasPaystubNotifications &&
            stubs != null && stubs.length > 0;
          return stubs;
        }),
      )
      .subscribe((paystubs) => {
        this._displayedAgents = this._allAgents.filter(a => paystubs.find(p => p.agentId == a.id) != null);
        this._paystubs = paystubs;
        this.paystubs$.next(paystubs);
      });
  }

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

    return paystubs.sort((a, b) => {
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
      date: this.fb.control(this.issueDates ? this.issueDates[0] : "", [
        (control: FormControl) => {
          const selectedDate = moment(control.value);
          let isValidDate = false;
          if (!this.issueDates) return null;

          this.issueDates.forEach((id) => {
            if (isValidDate) return;
            const testDate = moment(id, "YYYY-MM-DD");

            isValidDate = selectedDate.isSame(testDate, "d");
          });

          if (!isValidDate) return { invalidDate: true };

          return null;
        },
      ]),
      campaign: this.fb.control(""),
      agent: this.fb.control(""),
    });
  }

  private prepareModel(): SearchPaystubs {
    const result = {} as SearchPaystubs;
    result.date = this.f.value.date;
    result.campaignId = this.f.value.campaign.id;
    result.agentId = this.f.value.agent.id;
    return result;
  }
}
