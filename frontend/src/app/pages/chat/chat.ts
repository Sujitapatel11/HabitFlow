import { Component, signal, inject, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChatService, ChatMessage, Thread } from '../../services/chat.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgEnd') msgEnd!: ElementRef;

  chatSvc = inject(ChatService);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);

  activeThread = signal<Thread | null>(null);
  newText = signal('');
  typingTimer: any;
  private shouldScroll = false;

  get myId() { return this.auth.currentUser()?._id ?? ''; }

  ngOnInit() {
    this.chatSvc.connect();
    this.chatSvc.loadThreads();

    // If opened with ?with=userId, open that conversation
    this.route.queryParams.subscribe(p => {
      if (p['with']) this.openByUserId(p['with']);
    });
  }

  ngOnDestroy() {
    this.chatSvc.disconnect();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollBottom();
      this.shouldScroll = false;
    }
  }

  openThread(thread: Thread) {
    this.activeThread.set(thread);
    this.chatSvc.messages.set([]);
    this.chatSvc.joinConversation(thread.user._id);
    this.chatSvc.loadConversation(thread.user._id);
    this.shouldScroll = true;
  }

  openByUserId(userId: string) {
    // Try to find in existing threads, else create a stub
    const existing = this.chatSvc.threads().find(t => t.user._id === userId);
    if (existing) { this.openThread(existing); return; }
    // Stub thread — name will show as userId until threads reload
    const stub: Thread = {
      user: { _id: userId, name: userId },
      lastMessage: { senderId: '', receiverId: '', text: '', read: true, createdAt: '' },
      unread: 0,
    };
    this.activeThread.set(stub);
    this.chatSvc.messages.set([]);
    this.chatSvc.joinConversation(userId);
    this.chatSvc.loadConversation(userId);
  }

  send() {
    const text = this.newText().trim();
    const to = this.activeThread()?.user._id;
    if (!text || !to) return;
    this.chatSvc.sendMessage(to, text);
    this.newText.set('');
    this.shouldScroll = true;
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  onInput() {
    const to = this.activeThread()?.user._id;
    if (!to) return;
    this.chatSvc.sendTyping(to, true);
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.chatSvc.sendTyping(to, false), 1500);
  }

  isMine(msg: ChatMessage) { return msg.senderId === this.myId; }

  getAvatar(thread: Thread) { return thread.user.avatar || null; }
  getInitial(name: string) { return name?.charAt(0)?.toUpperCase() ?? '?'; }

  private scrollBottom() {
    try { this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch (_) {}
  }
}
