import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditAgentDialogComponent } from './edit-agent-dialog.component';

describe('EditAgentDialogComponent', () => {
  let component: EditAgentDialogComponent;
  let fixture: ComponentFixture<EditAgentDialogComponent>;

  beforeEach(async(() => {
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
