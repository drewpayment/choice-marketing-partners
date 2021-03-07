import { Component, OnInit, ViewChild, OnDestroy } from "@angular/core";
import { AgentsService } from "../agents.service";
import { Agent, Paginator, PaginatorEvent, User, AgentSearchRequest } from "../../models";
import {
  Observable,
  BehaviorSubject,
  merge,
  zip,
  concat,
  combineLatest,
  Subject,
  fromEvent,
} from "rxjs";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import {
  switchMap,
  tap,
  map,
  withLatestFrom,
  startWith,
  debounceTime,
  takeUntil,
} from "rxjs/operators";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { MatDialog } from "@angular/material/dialog";
import { AddAgentDialogComponent } from "../add-agent-dialog/add-agent-dialog.component";
import { AccountService } from "../../account.service";
import { EditAgentDialogComponent } from "../edit-agent-dialog/edit-agent-dialog.component";
import { ResetPasswordDialogComponent } from "../reset-password-dialog/reset-password-dialog.component";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatPaginator } from "@angular/material/paginator";
import { FormControl } from "@angular/forms";

@Component({
  selector: "cp-agents-list",
  templateUrl: "./agents-list.component.html",
  styleUrls: ["./agents-list.component.scss"],
})
export class AgentsListComponent implements OnInit, OnDestroy {
  user: User;
  @ViewChild("matPaginator") matPaginator: MatPaginator;
  paginator: Paginator<Agent>;
  private agents: Agent[];
  agents$: Observable<Agent[]>;
  paging$ = new BehaviorSubject<PaginatorEvent>({
    pageIndex: 0,
    pageSize: 10,
  } as PaginatorEvent);
  showAll$ = new BehaviorSubject<boolean>(false);
  pageSize$ = new BehaviorSubject<number>(10);
  pageIndex$ = new BehaviorSubject<number>(0);
  searchControl = new FormControl();
  filteredAgents: Observable<Agent[]>;
  destroy$ = new Subject();
  search$ = new BehaviorSubject(null);
  showSearchIcon = true;

  constructor(
    private service: AgentsService,
    private dialog: MatDialog,
    private account: AccountService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.account.getUserInfo.subscribe((u) => (this.user = u));

    this.agents$ = combineLatest([
      this.showAll$,
      this.paging$,
      this.search$.pipe(map(() => this.searchControl.value)),
      // this.searchControl.valueChanges.pipe(startWith(''), debounceTime(500))
    ]).pipe(
      takeUntil(this.destroy$),
      switchMap((value) => {
        const showAll = coerceBooleanProperty(value[0]);
        const size = value[1].pageSize;
        const page = value[1].pageIndex;
        const search = value[2] || '';

        const req: AgentSearchRequest = {
          showAll,
          page,
          size,
          qry: search,
        };

        return this.service.getAgents(req);
      }),
      tap((pag) => (this.agents = pag.data)),
      map((result) => {
        this.paginator = result;

        // don't think this works right...
        if (!result.data || !result.data.length) {
          this.matPaginator.firstPage();
        }

        return result.data;
      })
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  searchButtonClick(fromClick: boolean) {
    if (fromClick) {
      this.showSearchIcon = false;
    }

    this.search$.next('');
  }

  clearSearch() {
    this.showSearchIcon = true;
    this.searchControl.setValue('');
    this.search$.next('');
  }

  displayFn(agent: Agent) {
    return agent && agent.name ? agent.name : "";
  }

  slideToggleValueChange(event: MatSlideToggleChange) {
    console.dir(event);
    this.showAll$.next(event.checked);
  }

  paging(event: PaginatorEvent) {
    this.paging$.next(event);
  }

  showAddAgentDialog() {
    this.dialog
      .open(AddAgentDialogComponent, {
        autoFocus: false,
        minWidth: "50vw",
        restoreFocus: false,
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;

        this._showSuccess("Added agent successfully.");
      });
  }

  disableAgent(agentId: number) {
    this.service.disableAgent(agentId).subscribe((result) => {
      if (result) {
        this.showAll$.next(false);
        this._showSuccess("Agent has been disabled.");
      }
    });
  }

  restoreAgent(agentId: number) {
    this.service.restoreAgent(agentId).subscribe((result) => {
      if (result) {
        this.showAll$.next(this.showAll$.getValue());
        this._showSuccess("Agent has been restored.");
      }
    });
  }

  editAgent(agent: Agent) {
    this.dialog
      .open(EditAgentDialogComponent, {
        data: agent,
        minWidth: "50vw",
        autoFocus: false,
        restoreFocus: false,
      })
      .afterClosed()
      .subscribe((result) => {
        // means user canceled the dialog and didn't make changes
        if (!result) return;

        this._showSuccess("The agent was updated successfully.");
        this.showAll$.next(false);
      });
  }

  resetPassword(agent: Agent) {
    this.dialog
      .open(ResetPasswordDialogComponent, {
        data: agent,
        minWidth: "30vw",
        autoFocus: false,
        restoreFocus: false,
      })
      .afterClosed()
      .subscribe();
  }

  private _showSuccess(msg: string) {
    this.snack.open(msg, "dismiss", { duration: 3000 });
  }

  private _filter(search: string): Agent[] {
    if (!this.agents || !this.agents.length) return [];
    return this.agents.filter(
      (agent) =>
        agent.name.trim().toLowerCase().replace(/\s/g, "") ===
        search.trim().toLowerCase()
    );
  }
}
