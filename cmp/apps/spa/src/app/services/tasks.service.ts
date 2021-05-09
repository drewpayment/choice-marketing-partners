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

  saveTask(task: Task): Observable<Task> {
    return this.http.post<Task>('/api/tasks', task);
  }

  updateTask(task: Task): Observable<Task> {
    return this.http.put<Task>('/api/tasks', task);
  }

  deleteTask(taskId: number): Observable<void> {
    return this.http.delete<void>(`/api/tasks/${taskId}`);
  }

}
