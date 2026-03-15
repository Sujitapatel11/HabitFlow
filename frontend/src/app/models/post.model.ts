export interface Reaction {
  userId: string;
  type: 'like' | 'motivate';
}

export interface Post {
  _id: string;
  authorName: string;
  habitName: string;
  message: string;
  category: string;
  type: 'manual' | 'completion';
  reactions: Reaction[];
  createdAt: string;
}
