import { Component, OnInit } from '@angular/core';
import { AgentsService } from '../agents.service';
import { Agent } from '../../models';
import { Observable } from 'rxjs';

@Component({
    selector: 'cp-agents-list',
    templateUrl: './agents-list.component.html',
    styleUrls: ['./agents-list.component.scss']
})
export class AgentsListComponent implements OnInit {

    agents$: Observable<Agent[]>;

    constructor(private service: AgentsService) { }

    ngOnInit(): void {
        this.agents$ = this.service.getAgents();
    }

}
