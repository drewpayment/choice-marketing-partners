import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Task } from '@cmp/interfaces';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class TasksService {

  constructor(private http: HttpClient) {}

  getAssignedTasks(): Observable<Task[]> {
    return this.http.get<Task[]>('/api/tasks');
  }

}
