import { Component, ElementRef, OnDestroy } from '@angular/core';
import { interval, Observable, Subject } from 'rxjs';
import { scan, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';

@Component({
  selector: 'cp-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  host: {
    'style': 'height: 100%',
    'class': 'd-flex flex-column',
  }
})
export class AppComponent {
  title = 'cmp';

  constructor() {
  }

}
