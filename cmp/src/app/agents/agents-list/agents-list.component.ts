import { Component, OnInit } from '@angular/core';
import { AgentsService } from '../agents.service';
import { Agent, Paginator, PaginatorEvent, User } from '../../models';
import { Observable, BehaviorSubject, merge, zip, concat, combineLatest } from 'rxjs';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { switchMap, tap, map, withLatestFrom } from 'rxjs/operators';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { MatDialog } from '@angular/material/dialog';
import { AddAgentDialogComponent } from '../add-agent-dialog/add-agent-dialog.component';
import { AccountService } from '../../account.service';
import { EditAgentDialogComponent } from '../edit-agent-dialog/edit-agent-dialog.component';
import { ResetPasswordDialogComponent } from '../reset-password-dialog/reset-password-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'cp-agents-list',
    templateUrl: './agents-list.component.html',
    styleUrls: ['./agents-list.component.scss']
})
export class AgentsListComponent implements OnInit {

    user: User;
    paginator: Paginator<Agent>;
    agents$: Observable<Agent[]>;
    paging$ = new BehaviorSubject<PaginatorEvent>({ pageIndex: 0, pageSize: 10 } as PaginatorEvent);
    showAll$ = new BehaviorSubject<boolean>(false);
    pageSize$ = new BehaviorSubject<number>(10);
    pageIndex$ = new BehaviorSubject<number>(0);

    constructor(
        private service: AgentsService, 
        private dialog: MatDialog, 
        private account: AccountService,
        private snack: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.account.getUserInfo.subscribe(u => this.user = u);
        this.agents$ = combineLatest([this.showAll$, this.paging$])
            .pipe(
                switchMap(value => {
                    const showAll = coerceBooleanProperty(value[0]);
                    const size = value[1].pageSize;
                    const page = value[1].pageIndex;
                    return this.service.getAgents(showAll, page, size);
                }),
                map(result => {
                    this.paginator = result;

                    // don't think this works right...
                    if (!result.data || !result.data.length) {
                        const curr = this.paging$.getValue();
                        curr.pageIndex = 0;
                        this.paging$.next(curr);
                    }

                    return result.data;
                })
            );
    }

    slideToggleValueChange(event: MatSlideToggleChange) {
        console.dir(event);
        this.showAll$.next(event.checked);
    }

    paging(event: PaginatorEvent) {
        this.paging$.next(event);
    }

    showAddAgentDialog() {
        this.dialog.open(AddAgentDialogComponent, {
            autoFocus: false,
            minWidth: '50vw',
        })
            .afterClosed()
            .subscribe(result => {
                if (!result) return;

                this._showSuccess('Added agent successfully.');
            });
    }

    disableAgent(agentId: number) {
        this.service.disableAgent(agentId)
            .subscribe(result => {
                if (result) {
                    this.showAll$.next(false);
                    this._showSuccess('Agent has been disabled.');
                }
            });
    }

    restoreAgent(agentId: number) {
        this.service.restoreAgent(agentId)
            .subscribe(result => {
                if (result) {
                    this.showAll$.next(this.showAll$.getValue());
                    this._showSuccess('Agent has been restored.');
                }
            });
    }

    editAgent(agent: Agent) {
        this.dialog
            .open(EditAgentDialogComponent, {
                data: agent,
                minWidth: '50vw'
            })
            .afterClosed()
            .subscribe(result => {
                // means user canceled the dialog and didn't make changes
                if (!result) return;

                this._showSuccess('The agent was updated successfully.');
                this.showAll$.next(false);
            });
    }

    resetPassword(agent: Agent) {
        this.dialog
            .open(ResetPasswordDialogComponent, {
                data: agent.user,
                minWidth: '30vw'
            })
            .afterClosed()
            .subscribe(result => {
                if (!result) return;

                console.dir(result);
            });
    }

    private _showSuccess(msg: string) {
        this.snack.open(msg, 'dismiss', { duration: 3000 });
    }

}
