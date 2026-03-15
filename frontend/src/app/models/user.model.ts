export type GoalCategory = 'Coding' | 'Fitness' | 'Reading' | 'Studying' | 'Mindfulness' | 'Nutrition' | 'Other';

export interface User {
  _id: string;
  name: string;
  email: string;
  bio: string;
  goals: GoalCategory[];
  avatar: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}
