import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group.service';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../core/auth.service';
import { Group } from '../../models/group.model';
import { Post } from '../../models/post.model';

@Component({
  selector: 'app-groups',
  imports: [FormsModule],
  templateUrl: './groups.html',
  styleUrl: './groups.css',
})
export class Groups implements OnInit {
  groups = signal<Group[]>([]);
  allPosts = signal<Post[]>([]);
  loading = signal(true);
  showForm = signal(false);
  form = { name: '', description: '', category: 'Other' };
  categories = ['Coding', 'Fitness', 'Reading', 'Studying', 'Mindfulness', 'Nutrition', 'Other'];
  joinedGroups = signal<Set<string>>(new Set());
  expandedGroup = signal<string | null>(null);

  constructor(
    private groupService: GroupService,
    private postService: PostService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    this.groupService.getGroups().subscribe({
      next: (res) => { this.groups.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    // Load all posts once — we'll filter by category per group
    this.postService.getPosts().subscribe({
      next: (res) => this.allPosts.set(res.data),
    });
  }

  create() {
    if (!this.form.name) return;
    this.groupService.createGroup(this.form).subscribe({
      next: (res) => {
        this.groups.update(list => [res.data, ...list]);
        this.showForm.set(false);
        this.form = { name: '', description: '', category: 'Other' };
      },
    });
  }

  join(group: Group) {
    this.groupService.joinGroup(group._id).subscribe({
      next: (res) => {
        this.joinedGroups.update(s => new Set([...s, group._id]));
        this.groups.update(list => list.map(g => g._id === group._id ? res.data : g));
      },
    });
  }

  leave(group: Group) {
    this.groupService.leaveGroup(group._id).subscribe({
      next: (res) => {
        this.joinedGroups.update(s => { s.delete(group._id); return new Set(s); });
        this.groups.update(list => list.map(g => g._id === group._id ? res.data : g));
        if (this.expandedGroup() === group._id) this.expandedGroup.set(null);
      },
    });
  }

  isMember(group: Group): boolean {
    return this.joinedGroups().has(group._id);
  }

  toggleActivity(group: Group) {
    this.expandedGroup.set(this.expandedGroup() === group._id ? null : group._id);
  }

  /** Recent completion posts matching this group's category */
  groupActivity(group: Group): Post[] {
    return this.allPosts()
      .filter(p => p.type === 'completion' && p.category === group.category)
      .slice(0, 5);
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
