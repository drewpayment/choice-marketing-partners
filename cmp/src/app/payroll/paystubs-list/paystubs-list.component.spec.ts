import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PaystubsListComponent } from './paystubs-list.component';

describe('PaystubsListComponent', () => {
  let component: PaystubsListComponent;
  let fixture: ComponentFixture<PaystubsListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PaystubsListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PaystubsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
