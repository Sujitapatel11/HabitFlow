import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Contract } from '../models/contract.model';

interface ApiRes<T> { success: boolean; data: T; }

@Injectable({ providedIn: 'root' })
export class ContractService {
  private api = `${environment.apiUrl}/contracts`;
  constructor(private http: HttpClient) {}

  // userId/userName now come from JWT on the server
  getMyContracts(_userId?: string) {
    return this.http.get<ApiRes<Contract[]>>(this.api);
  }

  getCommunityFeed(_userId?: string) {
    return this.http.get<ApiRes<Contract[]>>(`${this.api}/feed`);
  }

  createContract(data: {
    habitId: string; habitName: string; category: string;
    durationDays: number; stakePoints: number;
  }) {
    return this.http.post<ApiRes<Contract>>(this.api, data);
  }

  checkIn(contractId: string, note: string) {
    return this.http.post<ApiRes<Contract>>(`${this.api}/${contractId}/checkin`, { note });
  }

  // vote only — userId/userName resolved server-side from JWT
  witnessVote(contractId: string, _userId: string, _userName: string, vote: 'legit' | 'doubt') {
    return this.http.post<ApiRes<Contract>>(`${this.api}/${contractId}/witness`, { vote });
  }

  breakContract(contractId: string) {
    return this.http.post<ApiRes<Contract>>(`${this.api}/${contractId}/break`, {});
  }
}
