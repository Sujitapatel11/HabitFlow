import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../core/auth.service';
import { Post } from '../../models/post.model';

@Component({
  selector: 'app-community',
  imports: [FormsModule],
  templateUrl: './community.html',
  styleUrl: './community.css',
})
export class Community implements OnInit {
  posts = signal<Post[]>([]);
  loading = signal(true);
  showForm = signal(false);
  submitting = signal(false);
  form = { habitName: '', message: '', category: 'Other', authorName: '' };
  categories = ['Coding', 'Fitness', 'Reading', 'Studying', 'Mindfulness', 'Nutrition', 'Other'];

  constructor(private postService: PostService, private auth: AuthService) {}

  ngOnInit() {
    // Pre-fill author name from logged-in user
    this.form.authorName = this.auth.currentUser()?.name || '';

    this.postService.getPosts().subscribe({
      next: (res) => { this.posts.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  submit() {
    if (!this.form.habitName || !this.form.message) return;
    this.submitting.set(true);
    this.postService.createPost(this.form).subscribe({
      next: (res) => {
        this.posts.update(list => [res.data, ...list]);
        this.form = { habitName: '', message: '', category: 'Other', authorName: this.auth.currentUser()?.name || '' };
        this.showForm.set(false);
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false),
    });
  }

  react(post: Post, type: 'like' | 'motivate') {
    const userId = this.auth.currentUser()?._id || 'anonymous';
    this.postService.reactToPost(post._id, type, userId).subscribe({
      next: (res) => this.posts.update(list => list.map(p => p._id === post._id ? { ...p, reactions: res.reactions } : p)),
    });
  }

  countReactions(post: Post, type: string) {
    return post.reactions.filter(r => r.type === type).length;
  }

  hasReacted(post: Post, type: string): boolean {
    const userId = this.auth.currentUser()?._id || 'anonymous';
    return post.reactions.some(r => r.userId === userId && r.type === type);
  }

  timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
}
