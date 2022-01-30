import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from "@angular/cdk/drag-drop";
import { Component, OnInit } from "@angular/core";
import { map } from "rxjs/operators";
import { Agent, Manager } from "../models";
import { ManagersService } from "./managers.service";

@Component({
  selector: "cp-managers",
  templateUrl: "./managers.component.html",
  styleUrls: ["./managers.component.scss"],
})
export class ManagersComponent implements OnInit {
  managers: Manager[] = [];
  private _employees!: Agent[];
  employees: Agent[] = [];
  manager!: Manager;

  constructor(private service: ManagersService) {}

  ngOnInit(): void {
    this.service.getActiveEmployees().subscribe((emps) => {
      this._employees = emps;
      this.employees = this._employees;
    });

    this.service.getManagers()
      .subscribe((res) => this.managers = res);
  }

  selectManager(manager: Manager) {
    this.manager = manager;

    if (!!this.manager) {
      const ids = this.manager.managedEmployees.map((e) => e.id);
      const filteredEmps = this._employees.filter((e) => !ids.includes(e.id));
      this.employees = filteredEmps;
    } else {
      this.employees = this._employees;
    }
  }

  dropped(event: CdkDragDrop<Agent>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data as any,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data as any,
        event.container.data as any,
        event.previousIndex,
        event.currentIndex
      );

      this.employees = this.employees.sort((a, b) => a.name < b.name ? -1 : 1);
    }
  }
}
