import { Component, OnInit } from '@angular/core';
import { AccountService } from '../../account.service';
import { User } from '../../models';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
    selector: 'cp-nav-bar',
    templateUrl: './nav-bar.component.html',
    styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent implements OnInit {
    private user: User;
    user$: Observable<User>;

    constructor(private accountService: AccountService) { }

    ngOnInit(): void {
        this.user$ = this.accountService.getUserInfo
            .pipe(tap(u => this.user = u));
    }

}
