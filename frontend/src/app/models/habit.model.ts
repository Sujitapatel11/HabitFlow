import { GoalCategory } from './user.model';

export interface Habit {
  _id: string;
  userId: string;
  name: string;
  description: string;
  category: GoalCategory;
  completed: boolean;
  streak: number;
  lastCompletedDate: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  total?: number;
  page?: number;
  message?: string;
}
