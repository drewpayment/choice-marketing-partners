import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { User } from "./models/user.model";
import { BehaviorSubject, Observable, of, Subject } from "rxjs";
import { environment } from "../environments/environment";
import { shareReplay, map, tap } from "rxjs/operators";
import { Aud, Country, NationStateResult } from "./models";
import { SessionStorageService } from 'ngx-webstorage';
import { TOKEN_STORAGE_KEY } from './shared/constants';

@Injectable({
  providedIn: "root",
})
export class AccountService {
  // api = environment.api + '/account';
  private _token: string = '';
  get token$(): Observable<string> {
    return this.store.observe(TOKEN_STORAGE_KEY)
      .pipe(tap(token => this._token = token));
  }
  get token(): string {
    return this._token;
  }

  getCountries = this._getCountries().pipe(
    map((result) => {
      const countries = result.Countries;
      const usaIndex = countries.findIndex(
        (c) =>
          c.CountryName.replace(/\s/g, "").trim().toLowerCase() ===
          "unitedstates"
      );
      const usa = countries.splice(usaIndex, 1)[0];
      usa.CountryName = "US";
      countries.unshift(usa);
      return countries;
    })
  );

  constructor(private http: HttpClient, private store: SessionStorageService,) {}

  getAud(): Observable<Aud> {
    return new Observable(ob => {
      let storedToken: string = this.store.retrieve(TOKEN_STORAGE_KEY);
      if (!!storedToken) {
        this.setToken(storedToken);
        ob.next({ aud: storedToken });
        ob.complete();
      }
      return this.http.get<Aud>('api/authorization/aud')
        .pipe(tap(token => this.setToken(token.aud)))
        .subscribe(token => {
          ob.next(token);
          ob.complete();
        });
    });
  }

  getUserInfo: Observable<User> = this.http
    .get<User>("account/user-info")
    .pipe(shareReplay());

  private _getCountries(): Observable<NationStateResult> {
    const url = `https://raw.githubusercontent.com/drewpayment/Country-State-City-Database/master/Contries.json`;
    return this.http.get<NationStateResult>(url).pipe(shareReplay());
  }

  private setToken(token: string) {
    const storedToken = this.store.retrieve(TOKEN_STORAGE_KEY);
    if (!!token && storedToken === token) return;

    this.store.store(TOKEN_STORAGE_KEY, token);
  }
}
