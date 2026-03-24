import {
  Component, signal, inject, OnInit, OnDestroy,
  AfterViewChecked, ViewChild, ElementRef, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChatService, ChatMessage, Thread } from '../../services/chat.service';
import { AuthService } from '../../core/auth.service';

const REACTION_EMOJIS = ['🔥', '⚡', '💫', '🚀', '👾', '💎'];

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgEnd') msgEnd!: ElementRef;
  @ViewChild('inputRef') inputRef!: ElementRef;

  chatSvc = inject(ChatService);
  auth    = inject(AuthService);
  route   = inject(ActivatedRoute);

  activeThread   = signal<Thread | null>(null);
  newText        = signal('');
  showPicker     = signal<string | null>(null); // message _id with open picker
  typingTimer: any;
  private shouldScroll = false;

  readonly EMOJIS = REACTION_EMOJIS;

  get myId() { return this.auth.currentUser()?._id ?? ''; }

  grouped = computed(() => this.chatSvc.groupedMessages());

  ngOnInit() {
    this.chatSvc.connect();
    this.chatSvc.loadThreads();
    this.route.queryParams.subscribe(p => {
      if (p['with']) this.openByUserId(p['with']);
    });
  }

  ngOnDestroy() { this.chatSvc.disconnect(); }

  ngAfterViewChecked() {
    if (this.shouldScroll) { this.scrollBottom(); this.shouldScroll = false; }
  }

  openThread(thread: Thread) {
    this.activeThread.set(thread);
    this.chatSvc.messages.set([]);
    this.chatSvc.joinConversation(thread.user._id);
    this.chatSvc.loadConversation(thread.user._id);
    this.shouldScroll = true;
    this.showPicker.set(null);
  }

  openByUserId(userId: string) {
    const existing = this.chatSvc.threads().find(t => t.user._id === userId);
    if (existing) { this.openThread(existing); return; }
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
    const to   = this.activeThread()?.user._id;
    if (!text || !to) return;
    this.chatSvc.sendMessage(to, text);
    this.newText.set('');
    this.shouldScroll = true;
    this.inputRef?.nativeElement?.focus();
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

  togglePicker(msgId: string | undefined) {
    if (!msgId) return;
    this.showPicker.update(v => v === msgId ? null : msgId);
  }

  react(msgId: string | undefined, emoji: string) {
    if (!msgId) return;
    this.chatSvc.react(msgId, emoji);
    this.showPicker.set(null);
  }

  reactionCount(msg: ChatMessage, emoji: string): number {
    return msg.reactions?.filter(r => r.emoji === emoji).length ?? 0;
  }

  myReaction(msg: ChatMessage): string | null {
    return msg.reactions?.find(r => r.userId === this.myId)?.emoji ?? null;
  }

  uniqueReactions(msg: ChatMessage): Array<{ emoji: string; count: number }> {
    const map = new Map<string, number>();
    for (const r of msg.reactions ?? []) map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
    return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
  }

  isBursting(msg: ChatMessage): boolean {
    return this.chatSvc.reactionBurst() === msg._id;
  }

  getAvatar(t: Thread) { return t.user.avatar || null; }
  getInitial(name: string) { return name?.charAt(0)?.toUpperCase() ?? '?'; }

  private scrollBottom() {
    try { this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch (_) {}
  }
}
