import { Component } from '@angular/core';

@Component({
  selector: 'cmp-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'spa';

  logMeOut() {
    console.log('LOG ME OUT PLEASE!');
  }

}
