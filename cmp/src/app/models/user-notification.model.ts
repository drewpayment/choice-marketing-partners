

export interface UserNotification {
  id: number;
  userId: number;
  employeeId: number;
  hasPaystubNotifier: boolean;
  paystubNotifierType: PaystubNotifierType,
  notifierDestination: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaystubNotifierType {
  email,
  sms
}
