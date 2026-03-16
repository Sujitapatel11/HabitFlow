import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Contract } from '../models/contract.model';

interface ApiRes<T> { success: boolean; data: T; }

@Injectable({ providedIn: 'root' })
export class ContractService {
  private api = `${environment.apiUrl}/contracts`;
  constructor(private http: HttpClient) {}

  getMyContracts(userId: string) {
    return this.http.get<ApiRes<Contract[]>>(`${this.api}?userId=${userId}`);
  }

  getCommunityFeed(userId: string) {
    return this.http.get<ApiRes<Contract[]>>(`${this.api}/feed?userId=${userId}`);
  }

  createContract(data: {
    userId: string; userName: string; habitId: string;
    habitName: string; category: string; durationDays: number; stakePoints: number;
  }) {
    return this.http.post<ApiRes<Contract>>(this.api, data);
  }

  checkIn(contractId: string, note: string) {
    return this.http.post<ApiRes<Contract>>(`${this.api}/${contractId}/checkin`, { note });
  }

  witnessVote(contractId: string, userId: string, userName: string, vote: 'legit' | 'doubt') {
    return this.http.post<ApiRes<Contract>>(`${this.api}/${contractId}/witness`, { userId, userName, vote });
  }

  breakContract(contractId: string) {
    return this.http.post<ApiRes<Contract>>(`${this.api}/${contractId}/break`, {});
  }
}
