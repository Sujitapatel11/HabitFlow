export interface AppUser {
  _id: string;
  name: string;
  email: string;
  goalCategory: string;
  bio: string;
  streak: number;
  avatar?: string;
  createdAt: string;
}

export interface Connection {
  connectionId: string;
  user?: AppUser;  // populated by backend, optional for safety
}

export interface PendingRequest {
  _id: string;
  senderId?: AppUser;  // populated by backend, optional for safety
  receiverId: string;
  status: string;
}
