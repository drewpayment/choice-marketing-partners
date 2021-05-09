import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Task, User } from '@cmp/interfaces';
import { SessionsFacade } from '@cmp/sessions';
import { NbDialogRef } from '@nebular/theme';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import addDays from 'date-fns/addDays';
import { TasksService } from '../../services/tasks.service';

@Component({
  selector: 'cmp-add-task-dialog',
  templateUrl: './add-task-dialog.component.html',
  styleUrls: ['./add-task-dialog.component.scss']
})
export class AddTaskDialogComponent implements OnInit, OnDestroy {
  isSubmitted = false;
  destroy$ = new Subject();
  f = this.createForm();
  user: User;

  minDueDate = addDays(new Date(), 1);

  constructor(
    private ref: NbDialogRef<AddTaskDialogComponent>,
    private fb: FormBuilder,
    private facade: SessionsFacade,
    private service: TasksService,
  ) {}

  ngOnInit(): void {
    this.facade.selectedSessions$
      .pipe(
        takeUntil(this.destroy$),
        tap(session => this.user = session),
        tap(() => this.f.patchValue({
          createdByUserId: this.user.id,
          assignedToUserId: this.user.id,
        }, { emitEvent: false })),
      ).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  save() {
    this.isSubmitted = true;
    const task = this.prepareModel();

    console.dir(task);

    if (this.f.invalid) return;

    this.service.saveTask(task)
      .subscribe(res => this.ref.close(res));
  }

  cancel() {
    this.ref.close();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      id: this.fb.control(''),
      title: this.fb.control('', [Validators.required]),
      notes: this.fb.control(''),
      dueDate: this.fb.control(''),
      isComplete: this.fb.control(false),
      createdByUserId: this.fb.control('', [Validators.required]),
      assignedToUserId: this.fb.control('', [Validators.required]),
    });
  }

  private prepareModel(): Task {
    const fv = this.f.value;
    return {
      id: fv.id,
      title: fv.title,
      notes: fv.notes,
      dueDate: fv.dueDate,
      isComplete: fv.isComplete,
      createdByUserId: fv.createdByUserId,
      assignedToUserId: fv.assignedToUserId,
    } as Task;
  }

}
