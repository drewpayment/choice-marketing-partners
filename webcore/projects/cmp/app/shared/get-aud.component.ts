import { Component, Directive, ElementRef, HostBinding } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { AccountService } from '../account.service';
import { UserService } from '../services/user.service';


@Component({
  selector: 'aud',
  template: ''
})
export class GetAudComponent {

  @HostBinding('class.d-none') hiddenClass: boolean = true;

  constructor(private el: ElementRef, private account: AccountService, private userService: UserService,) {
    this.account.getAud().subscribe();
  }

}
