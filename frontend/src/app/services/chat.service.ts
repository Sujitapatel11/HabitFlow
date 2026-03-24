import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';

export interface Reaction { emoji: string; userId: string; }

export interface ChatMessage {
  _id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: string;
  reactions?: Reaction[];
  pending?: boolean;
  failed?: boolean;
  // animation state
  isNew?: boolean;
}

export interface Thread {
  user: { _id: string; name: string; avatar?: string };
  lastMessage: ChatMessage;
  unread: number;
  chatStreak?: number; // days in a row both users have messaged
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private socket: Socket | null = null;
  messages    = signal<ChatMessage[]>([]);
  threads     = signal<Thread[]>([]);
  typingFrom  = signal<string | null>(null);
  unreadTotal = signal(0);
  // tracks which message id just got a new reaction (for burst animation)
  reactionBurst = signal<string | null>(null);

  connect() {
    if (this.socket?.connected) return;
    if (!this.auth.currentUser()?._id) return;

    this.socket = io(environment.socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    this.socket.on('connect', () => {
      if (this._activeConversationWith) this.joinConversation(this._activeConversationWith);
    });

    this.socket.on('message', (msg: ChatMessage) => {
      this.messages.update(msgs => {
        const pendingIdx = msgs.findIndex(m => m.pending && m.text === msg.text && m.receiverId === msg.receiverId);
        if (pendingIdx > -1) {
          const updated = [...msgs];
          updated[pendingIdx] = { ...msg, pending: false, isNew: true };
          return updated;
        }
        return [...msgs, { ...msg, isNew: true }];
      });
      // clear isNew flag after animation
      setTimeout(() => {
        this.messages.update(msgs => msgs.map(m => m._id === msg._id ? { ...m, isNew: false } : m));
      }, 800);
    });

    this.socket.on('reaction_update', (updated: ChatMessage) => {
      this.messages.update(msgs => msgs.map(m => m._id === updated._id ? { ...m, reactions: updated.reactions } : m));
      this.reactionBurst.set(updated._id ?? null);
      setTimeout(() => this.reactionBurst.set(null), 600);
    });

    this.socket.on('typing', ({ fromUserId, isTyping }: { fromUserId: string; isTyping: boolean }) => {
      this.typingFrom.set(isTyping ? fromUserId : null);
    });

    this.socket.on('new_message_notify', () => {
      this.unreadTotal.update(n => n + 1);
      this.loadThreads();
    });

    this.socket.on('error', (err: { message: string }) => console.error('[Socket]', err.message));
  }

  disconnect() { this.socket?.disconnect(); this.socket = null; }

  private _activeConversationWith: string | null = null;

  joinConversation(withUserId: string) {
    this._activeConversationWith = withUserId;
    this.socket?.emit('join', { withUserId });
  }

  sendMessage(toUserId: string, text: string): void {
    const me = this.auth.currentUser()?._id;
    if (!me || !this.socket) return;

    const optimistic: ChatMessage = {
      senderId: me, receiverId: toUserId, text,
      read: false, createdAt: new Date().toISOString(),
      reactions: [], pending: true, isNew: true,
    };
    this.messages.update(msgs => [...msgs, optimistic]);

    this.socket.emit('send', { toUserId, text }, (ack: { ok?: boolean; _id?: string; createdAt?: string; error?: string }) => {
      if (ack?.ok) {
        this.messages.update(msgs => msgs.map(m =>
          m.pending && m.text === text && m.receiverId === toUserId
            ? { ...m, _id: ack._id, createdAt: ack.createdAt!, pending: false }
            : m
        ));
      } else {
        this.messages.update(msgs => msgs.map(m =>
          m.pending && m.text === text && m.receiverId === toUserId
            ? { ...m, pending: false, failed: true }
            : m
        ));
      }
    });
  }

  react(messageId: string, emoji: string) {
    this.http.patch<{ success: boolean; data: ChatMessage }>(
      `${environment.apiUrl}/messages/${messageId}/react`,
      { emoji }, { withCredentials: true }
    ).subscribe(res => {
      if (res.success) {
        this.messages.update(msgs => msgs.map(m => m._id === messageId ? { ...m, reactions: res.data.reactions } : m));
        this.reactionBurst.set(messageId);
        setTimeout(() => this.reactionBurst.set(null), 600);
        // broadcast to other user via socket
        this.socket?.emit('reaction', { messageId, reactions: res.data.reactions });
      }
    });
  }

  sendTyping(toUserId: string, isTyping: boolean) {
    this.socket?.emit('typing', { toUserId, isTyping });
  }

  loadConversation(withUserId: string) {
    this.http.get<{ success: boolean; data: ChatMessage[] }>(
      `${environment.apiUrl}/messages/conversation?with=${withUserId}`,
      { withCredentials: true }
    ).subscribe(res => { if (res.success) this.messages.set(res.data); });
  }

  loadThreads() {
    this.http.get<{ success: boolean; data: Thread[] }>(
      `${environment.apiUrl}/messages/threads`,
      { withCredentials: true }
    ).subscribe(res => {
      if (res.success) {
        this.threads.set(res.data);
        this.unreadTotal.set(res.data.reduce((s, t) => s + t.unread, 0));
      }
    });
  }

  /** Group consecutive messages by sender for visual grouping */
  groupedMessages(): Array<ChatMessage & { isGroupStart: boolean; isGroupEnd: boolean }> {
    const msgs = this.messages();
    return msgs.map((m, i) => ({
      ...m,
      isGroupStart: i === 0 || msgs[i - 1].senderId !== m.senderId,
      isGroupEnd:   i === msgs.length - 1 || msgs[i + 1].senderId !== m.senderId,
    }));
  }
}
