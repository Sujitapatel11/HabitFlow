import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';

export interface ChatMessage {
  _id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: string;
  pending?: boolean;  // optimistic UI flag
  failed?: boolean;   // delivery failure flag
}

export interface Thread {
  user: { _id: string; name: string; avatar?: string };
  lastMessage: ChatMessage;
  unread: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private socket: Socket | null = null;
  messages = signal<ChatMessage[]>([]);
  threads = signal<Thread[]>([]);
  typingFrom = signal<string | null>(null);
  unreadTotal = signal(0);

  connect() {
    if (this.socket?.connected) return;
    const userId = this.auth.currentUser()?._id;
    if (!userId) return;

    this.socket = io(environment.apiUrl.replace('/api', ''), {
      withCredentials: true,  // send HTTP-only cookies for auth
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    this.socket.on('connect', () => {
      // Re-join any active conversation on reconnect
      const activeWith = this._activeConversationWith;
      if (activeWith) this.joinConversation(activeWith);
    });

    this.socket.on('message', (msg: ChatMessage) => {
      // Replace optimistic message if it matches (by text + receiver), else append
      this.messages.update(msgs => {
        const pendingIdx = msgs.findIndex(m => m.pending && m.text === msg.text && m.receiverId === msg.receiverId);
        if (pendingIdx > -1) {
          const updated = [...msgs];
          updated[pendingIdx] = { ...msg, pending: false };
          return updated;
        }
        return [...msgs, msg];
      });
    });

    this.socket.on('typing', ({ fromUserId, isTyping }: { fromUserId: string; isTyping: boolean }) => {
      this.typingFrom.set(isTyping ? fromUserId : null);
    });

    this.socket.on('new_message_notify', () => {
      this.unreadTotal.update(n => n + 1);
      this.loadThreads();
    });

    this.socket.on('error', (err: { message: string }) => {
      console.error('[Socket] error:', err.message);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  private _activeConversationWith: string | null = null;

  joinConversation(withUserId: string) {
    this._activeConversationWith = withUserId;
    this.socket?.emit('join', { withUserId });
  }

  /**
   * sendMessage — optimistic UI + ACK confirmation.
   * Message appears immediately as "pending", then confirmed/failed via ACK.
   */
  sendMessage(toUserId: string, text: string): void {
    const me = this.auth.currentUser()?._id;
    if (!me || !this.socket) return;

    // Optimistic message (shown immediately)
    const optimistic: ChatMessage = {
      senderId: me,
      receiverId: toUserId,
      text,
      read: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    this.messages.update(msgs => [...msgs, optimistic]);

    // Emit with ACK callback
    this.socket.emit('send', { toUserId, text }, (ack: { ok?: boolean; _id?: string; createdAt?: string; error?: string }) => {
      if (ack?.ok) {
        // Confirm delivery — update the pending message with server _id
        this.messages.update(msgs =>
          msgs.map(m =>
            m.pending && m.text === text && m.receiverId === toUserId
              ? { ...m, _id: ack._id, createdAt: ack.createdAt!, pending: false }
              : m
          )
        );
      } else {
        // Mark as failed
        this.messages.update(msgs =>
          msgs.map(m =>
            m.pending && m.text === text && m.receiverId === toUserId
              ? { ...m, pending: false, failed: true }
              : m
          )
        );
        console.error('[Chat] Send failed:', ack?.error);
      }
    });
  }

  sendTyping(toUserId: string, isTyping: boolean) {
    this.socket?.emit('typing', { toUserId, isTyping });
  }

  loadConversation(withUserId: string) {
    this.http.get<{ success: boolean; data: ChatMessage[]; nextCursor: string | null }>(
      `${environment.apiUrl}/messages/conversation?with=${withUserId}`,
      { withCredentials: true }
    ).subscribe(res => {
      if (res.success) this.messages.set(res.data);
    });
  }

  loadMoreMessages(withUserId: string, cursor: string, onLoaded: (msgs: ChatMessage[]) => void) {
    this.http.get<{ success: boolean; data: ChatMessage[]; nextCursor: string | null }>(
      `${environment.apiUrl}/messages/conversation?with=${withUserId}&cursor=${cursor}`,
      { withCredentials: true }
    ).subscribe(res => {
      if (res.success) onLoaded(res.data);
    });
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
}
