import { Component, OnInit } from '@angular/core';
import { AgentsService } from '../agents.service';
import { Agent, Paginator, PaginatorEvent } from '../../models';
import { Observable, BehaviorSubject, merge, zip, concat, combineLatest } from 'rxjs';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { switchMap, tap, map, withLatestFrom } from 'rxjs/operators';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

@Component({
    selector: 'cp-agents-list',
    templateUrl: './agents-list.component.html',
    styleUrls: ['./agents-list.component.scss']
})
export class AgentsListComponent implements OnInit {

    paginator: Paginator<Agent>;
    agents$: Observable<Agent[]>;
    paging$ = new BehaviorSubject<PaginatorEvent>({ pageIndex: 0, pageSize: 10 } as PaginatorEvent);
    showAll$ = new BehaviorSubject<boolean>(false);
    pageSize$ = new BehaviorSubject<number>(10);
    pageIndex$ = new BehaviorSubject<number>(0);

    constructor(private service: AgentsService) { }

    ngOnInit(): void {
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

}
