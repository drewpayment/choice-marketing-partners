import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EditAgentDialogComponent } from './edit-agent-dialog.component';

describe('EditAgentDialogComponent', () => {
  let component: EditAgentDialogComponent;
  let fixture: ComponentFixture<EditAgentDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EditAgentDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditAgentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
