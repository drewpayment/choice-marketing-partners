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

    constructor(private service: AgentsService, private dialog: MatDialog, private account: AccountService) { }

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
            console.dir(result);
        });
    }

    disableAgent(agentId: number) {
        this.service.disableAgent(agentId)
            .subscribe(result => {
                if (result) this.showAll$.next(false);
            });
    }

    restoreAgent(agentId: number) {
        this.service.restoreAgent(agentId)
            .subscribe(result => {
                if (result) this.showAll$.next(this.showAll$.getValue());
            });
    }

}
