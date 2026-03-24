import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  auth = inject(AuthService);

  name = signal(this.auth.currentUser()?.name ?? '');
  bio = signal(this.auth.currentUser()?.bio ?? '');
  goalCategory = signal(this.auth.currentUser()?.goalCategory ?? 'Other');
  preview = signal(this.auth.currentUser()?.avatar ?? '');
  selectedFile = signal<File | null>(null);

  saving = signal(false);
  uploading = signal(false);
  msg = signal('');
  error = signal('');

  categories = ['Coding', 'Fitness', 'Reading', 'Studying', 'Mindfulness', 'Nutrition', 'Other'];

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { this.error.set('Image must be under 2MB'); return; }
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.preview.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.error.set('');
  }

  uploadAvatar() {
    const file = this.selectedFile();
    const userId = this.auth.currentUser()?._id;
    if (!file || !userId) return;
    this.uploading.set(true);
    this.auth.uploadAvatar(userId, file).subscribe({
      next: () => { this.uploading.set(false); this.msg.set('Avatar updated!'); this.selectedFile.set(null); setTimeout(() => this.msg.set(''), 3000); },
      error: () => { this.uploading.set(false); this.error.set('Upload failed. Try again.'); },
    });
  }

  saveProfile() {
    const userId = this.auth.currentUser()?._id;
    if (!userId) return;
    this.saving.set(true);
    this.auth.updateProfile(userId, {
      name: this.name(),
      bio: this.bio(),
      goalCategory: this.goalCategory(),
    }).subscribe({
      next: () => { this.saving.set(false); this.msg.set('Profile saved!'); setTimeout(() => this.msg.set(''), 3000); },
      error: () => { this.saving.set(false); this.error.set('Save failed. Try again.'); },
    });
  }
}
