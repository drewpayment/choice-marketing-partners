import { Component, OnInit } from '@angular/core';
import { NbDialogService } from '@nebular/theme';
import { DashboardService } from '../services/dashboard.service';
import { TasksService } from '../services/tasks.service';
import { AddTaskDialogComponent } from './add-task-dialog/add-task-dialog.component';

@Component({
  selector: 'cmp-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  tasks$ = this.taskService.getAssignedTasks();

  constructor(
    private service: DashboardService,
    private taskService: TasksService,
    private dialog: NbDialogService,
  ) { }

  ngOnInit() {
    // this.taskService.getAssignedTasks()
    //   .subscribe(tasks => console.dir(tasks));
  }

  addTask() {
    this.dialog.open(AddTaskDialogComponent, {
      autoFocus: true,
      dialogClass: 'add-task-dialog',
    })
    .onClose
    .subscribe(result => {
      console.dir(result);
    });
  }

}
