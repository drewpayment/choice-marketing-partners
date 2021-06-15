import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginRequest } from 'src/app/models';


@Component({
  selector: 'cmp-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  host: {
    'style': 'height: 100%',
  },
})
export class LoginComponent {

  f: FormGroup = this.createForm();
  get username(): FormControl {
    return this.f.controls.username as FormControl;
  }
  get password(): FormControl {
    return this.f.controls.password as FormControl;
  }

  constructor(private fb: FormBuilder, private router: Router) {}

  goBack() {
    this.router.navigate(['..']);
  }

  signIn() {
    if (this.f.invalid) return;

    const model = this.prepareModel();
    console.log(model);
  }

  private createForm(): FormGroup {
    return this.fb.group({
      username: this.fb.control('', [Validators.required]),
      password: this.fb.control('', [Validators.required]),
      rememberMe: this.fb.control(false),
    });
  }

  private prepareModel(): LoginRequest {
    const val = this.f.value;
    return {
      username: val.username,
      password: val.password,
      rememberMe: val.rememberMe,
    } as LoginRequest;
  }

}
