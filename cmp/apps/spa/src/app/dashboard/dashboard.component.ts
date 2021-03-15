import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { TasksService } from '../services/tasks.service';

@Component({
  selector: 'cmp-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  constructor(private service: DashboardService, private taskService: TasksService) { }

  ngOnInit() {
    this.taskService.getAssignedTasks()
      .subscribe(tasks => console.dir(tasks));
  }

}
