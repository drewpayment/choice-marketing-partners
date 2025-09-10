import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SessionStorageService } from 'ngx-webstorage';
import { Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { AccountService } from '../account.service';
import { TOKEN_STORAGE_KEY } from './constants';


@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(private account: AccountService, private store: SessionStorageService,) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.includes('api/v2')) {
      const token = this.store.retrieve(TOKEN_STORAGE_KEY);

      return next.handle(req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      }));
    }

    return next.handle(req);
  }

}
