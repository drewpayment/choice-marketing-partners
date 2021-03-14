import { Component, OnInit } from '@angular/core';
import { NbSidebarService } from '@nebular/theme';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'cmp-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Choice Marketing';
  sidebarActionIcon = 'grid-outline';
  destroy$ = new Subject();


  constructor(private sidebar: NbSidebarService) {}

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

}
