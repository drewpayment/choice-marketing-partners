import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable()
export class UnauthGuard implements CanActivate {

  constructor() {}

  canActivate(): Observable<boolean>|boolean {
    return true;
  }

}
