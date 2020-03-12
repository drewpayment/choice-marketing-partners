import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './models/user.model';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { shareReplay, map } from 'rxjs/operators';
import { Country, NationStateResult } from './models';

@Injectable({
    providedIn: 'root'
})
export class AccountService {

    // api = environment.api + '/account';

    getCountries = this._getCountries()
        .pipe(map(result => {
            const countries = result.Countries;
            const usaIndex = countries.findIndex(c => c.CountryName.replace(/\s/g, '').trim().toLowerCase() === 'unitedstates');
            const usa = countries.splice(usaIndex, 1)[0];
            countries.unshift(usa);
            return countries;
        }));

    constructor(private http: HttpClient) { }

    getUserInfo: Observable<User> = this.http.get<User>('account/user-info')
        .pipe(shareReplay());

    private _getCountries(): Observable<NationStateResult> {
        const url = `https://raw.githubusercontent.com/sagarshirbhate/Country-State-City-Database/master/Contries.json`;
        return this.http.get<NationStateResult>(url).pipe(shareReplay());
    }
}
