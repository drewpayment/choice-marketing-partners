import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentsListComponent } from './agents-list.component';

describe('AgentsListComponent', () => {
  let component: AgentsListComponent;
  let fixture: ComponentFixture<AgentsListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AgentsListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AgentsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
