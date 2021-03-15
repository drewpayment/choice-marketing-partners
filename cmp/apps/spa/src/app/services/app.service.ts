import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '@cmp/interfaces';

@Injectable({
  providedIn: 'root',
})
export class AppService {

  constructor(private http: HttpClient) {}

}
