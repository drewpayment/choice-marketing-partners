import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './models/user.model';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AccountService {

    // api = environment.api + '/account';

    constructor(private http: HttpClient) { }

    getUserInfo(): Observable<User> {
        return this.http.get<User>('account/user-info');
    }
}
