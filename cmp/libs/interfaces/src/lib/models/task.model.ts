

export interface Task {
  id: number;
  title: string;
  notes?: string;
  dueDate: Date;
  isComplete: boolean;
  createdByUserId: number;
  assignedToUserId: number;
  createdAt: Date;
  updatedAt: Date;
}
