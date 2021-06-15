import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor() {}

  canActivate(): Observable<boolean>|boolean {
    return true;
  }

}
