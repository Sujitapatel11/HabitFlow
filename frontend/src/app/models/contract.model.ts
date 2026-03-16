export interface CheckIn {
  _id: string;
  date: string;
  note: string;
  verified: boolean;
  doubtCount: number;
  legitCount: number;
}

export interface Witness {
  userId: string;
  userName: string;
  vote: 'legit' | 'doubt';
  votedAt: string;
}

export interface Contract {
  _id: string;
  userId: string;
  userName: string;
  habitId: string;
  habitName: string;
  category: string;
  durationDays: number;
  stakePoints: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'broken';
  completedDays: number;
  witnesses: Witness[];
  checkIns: CheckIn[];
  createdAt: string;
}
