import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserNotification } from '../models';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {

  constructor(private http: HttpClient) {}

  getUserNotificationPreferences(userId: number): Observable<UserNotification> {
    return this.http.get<UserNotification>(`api/user-notifications/${userId}`);
  }

  saveUserNotificationPreferences(notification: UserNotification): Observable<UserNotification> {
    return this.http.put<UserNotification>(`api/user-notifications/${notification.userId}`, notification);
  }

  sendPaystubNotifications(paystubIds: number[]): Observable<any> {
    return this.http.post<any>(`api/agents/paystubs/send`, {ids: paystubIds});
  }

}
