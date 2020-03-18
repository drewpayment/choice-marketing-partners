import { Component, OnInit } from '@angular/core';
import { User } from '../../../models/user.model';
import { AccountService } from '../../../account.service';

@Component({
    selector: 'cp-create-invoice',
    templateUrl: './create-invoice.component.html',
    styleUrls: ['./create-invoice.component.scss']
})
export class CreateInvoiceComponent implements OnInit {

    user: User;

    constructor(private account: AccountService) { }

    ngOnInit(): void {
        this.account.getUserInfo.subscribe(user => {
            this.user = user;
            console.dir(this.user);
        });
    }

}
