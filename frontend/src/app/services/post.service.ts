import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../models/habit.model';
import { Post } from '../models/post.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly api = `${environment.apiUrl}/posts`;
  constructor(private http: HttpClient) {}

  getPosts(page = 1) { return this.http.get<ApiResponse<Post[]>>(`${this.api}?page=${page}`); }
  createPost(data: { habitName: string; message: string; category: string; authorName: string }) {
    return this.http.post<ApiResponse<Post>>(this.api, data);
  }
  reactToPost(id: string, type: 'like' | 'motivate', userId: string) {
    return this.http.post<any>(`${this.api}/${id}/react`, { type, userId });
  }
}
