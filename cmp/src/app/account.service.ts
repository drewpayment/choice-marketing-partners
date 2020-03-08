import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './models/user.model';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { shareReplay } from 'rxjs/operators';
import { Country, NationStateResult } from './models';

@Injectable({
    providedIn: 'root'
})
export class AccountService {

    // api = environment.api + '/account';

    getCountries = this._getCountries();

    constructor(private http: HttpClient) { }

    getUserInfo(): Observable<User> {
        return this.http.get<User>('account/user-info');
    }

    private _getCountries(): Observable<NationStateResult> {
        const url = `https://raw.githubusercontent.com/sagarshirbhate/Country-State-City-Database/master/Contries.json`;
        return this.http.get<NationStateResult>(url).pipe(shareReplay());
    }
}
