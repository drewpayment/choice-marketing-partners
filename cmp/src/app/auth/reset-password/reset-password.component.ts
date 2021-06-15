import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'cmp-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  host: {
    'style': 'height: 100%',
  },
})
export class ResetPasswordComponent {

  f: FormGroup = this.createForm();

  constructor(private fb: FormBuilder, private router: Router, private location: Location,) {}

  goBack() {
    this.location.back();
  }

  changePassword() {
    console.log('lol');
  }

  private createForm(): FormGroup {
    return this.fb.group({
      oldPassword: this.fb.control('', [Validators.required]),
      newPassword: this.fb.control('', [Validators.required]),
      confirmPassword: this.fb.control('', [Validators.required]),
    });
  }

}
