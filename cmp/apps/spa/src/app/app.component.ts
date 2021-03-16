import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '@cmp/interfaces';
import { SessionsFacade } from '@cmp/sessions';
import { NbSidebarService } from '@nebular/theme';
import { Subject } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { AppService } from './services/app.service';

@Component({
  selector: 'cmp-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'Choice Marketing';
  sidebarActionIcon = 'grid-outline';
  destroy$ = new Subject();
  userId: number;
  user$ = this.facade.selectedSessions$
    .pipe(map(session => ({...session} as User)));


  constructor(
    private sidebar: NbSidebarService,
    private route: ActivatedRoute,
    private service: AppService,
    private router: Router,
    private facade: SessionsFacade,
  ) {}

  ngOnInit() {

  }

  logMeOut() {
    console.log('LOG ME OUT PLEASE!');
  }

  toggleMenu() {
    this.sidebar.toggle();
  }

  sidebarStateChanged(state: 'compact' | 'collapsed' | 'expanded') {
    switch (state) {
      case 'expanded':
        this.sidebarActionIcon = 'arrow-left-outline';
        break;
      case 'compact':
      case 'collapsed':
      default:
        this.sidebarActionIcon = 'grid-outline';
        break;
    }
  }

  goHome() {
    this.router.navigateByUrl('/')
      .then(() => this.sidebar.toggle());
  }

}
