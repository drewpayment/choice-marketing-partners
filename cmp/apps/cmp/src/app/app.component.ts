import { Component, ElementRef, OnDestroy } from '@angular/core';
import { interval, Observable, Subject } from 'rxjs';
import { scan, switchMap, takeUntil, takeWhile, tap } from 'rxjs/operators';

@Component({
  selector: 'cp-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  title = 'cmp';
  destroy$ = new Subject();
  scrollTo = new Subject<number>();

  constructor() {
    this.scrollTo.pipe(
      takeUntil(this.destroy$),
      switchMap(targetYPos => {
        return interval(5)
          .pipe(
            scan((acc, curr) => acc + 8, window.pageYOffset),
            tap(position => window.scrollTo(0, position)),
            takeWhile(val => val <= targetYPos),
          );
      }),
    ).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  goTo(el: HTMLElement) {
    console.dir(el);
    this.scrollTo.next(el.offsetTop);
  }

}
