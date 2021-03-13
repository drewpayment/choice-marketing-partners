import { Component } from '@angular/core';
import { NbSidebarService } from '@nebular/theme';

@Component({
  selector: 'cmp-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Choice Marketing Partners';

  constructor(private sidebar: NbSidebarService) {}

  logMeOut() {
    console.log('LOG ME OUT PLEASE!');
  }

  toggleMenu() {
    this.sidebar.toggle();
  }

}
