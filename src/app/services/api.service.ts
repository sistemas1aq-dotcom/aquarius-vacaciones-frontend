import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EmployeeWithBalance, EmployeeCreate, EmployeeUpdate,
  Vacation, VacationCreate, VacationUpdate, VacationExtend,
  DashboardResponse, MonthlyReportRow, DepartmentReportRow, ProjectionRow,
  Reminder, EmailDraft, Department, PaginatedResponse, ApiMessage,
} from '../models/interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Dashboard ──────────────────────────────────────────────────
  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.baseUrl}/dashboard`);
  }

  // ─── Departments ────────────────────────────────────────────────
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/departments`);
  }

  // ─── Employees ──────────────────────────────────────────────────
  getEmployees(params?: {
    department?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PaginatedResponse<EmployeeWithBalance>> {
    let httpParams = new HttpParams();
    if (params?.department) httpParams = httpParams.set('department', params.department);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
    return this.http.get<PaginatedResponse<EmployeeWithBalance>>(
      `${this.baseUrl}/employees`, { params: httpParams }
    );
  }

  getEmployee(id: number): Observable<EmployeeWithBalance> {
    return this.http.get<EmployeeWithBalance>(`${this.baseUrl}/employees/${id}`);
  }

  createEmployee(data: EmployeeCreate): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.baseUrl}/employees`, data);
  }

  updateEmployee(id: number, data: EmployeeUpdate): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.baseUrl}/employees/${id}`, data);
  }

  // ─── Vacations ──────────────────────────────────────────────────
  getEmployeeVacations(employeeId: number): Observable<Vacation[]> {
    return this.http.get<Vacation[]>(`${this.baseUrl}/vacations/employee/${employeeId}`);
  }

  createVacation(data: VacationCreate): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.baseUrl}/vacations`, data);
  }

  updateVacation(id: number, data: VacationUpdate): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.baseUrl}/vacations/${id}`, data);
  }

  deleteVacation(id: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.baseUrl}/vacations/${id}`);
  }

  extendVacation(id: number, data: VacationExtend): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.baseUrl}/vacations/${id}/extend`, data);
  }

  // ─── Reports ────────────────────────────────────────────────────
  getMonthlyReport(year: number = 2026): Observable<MonthlyReportRow[]> {
    return this.http.get<MonthlyReportRow[]>(
      `${this.baseUrl}/reports/monthly`, { params: { year: year.toString() } }
    );
  }

  getDepartmentReport(): Observable<DepartmentReportRow[]> {
    return this.http.get<DepartmentReportRow[]>(`${this.baseUrl}/reports/departments`);
  }

  getProjection(year: number = 2026): Observable<ProjectionRow[]> {
    return this.http.get<ProjectionRow[]>(
      `${this.baseUrl}/reports/projection`, { params: { year: year.toString() } }
    );
  }

  getTopPending(limit: number = 20): Observable<EmployeeWithBalance[]> {
    return this.http.get<EmployeeWithBalance[]>(
      `${this.baseUrl}/reports/top-pending`, { params: { limit: limit.toString() } }
    );
  }

  // ─── Reminders ──────────────────────────────────────────────────
  getReminders(page: number = 1, pageSize: number = 100): Observable<PaginatedResponse<Reminder>> {
    return this.http.get<PaginatedResponse<Reminder>>(
      `${this.baseUrl}/reminders`, { params: { page: page.toString(), pageSize: pageSize.toString() } }
    );
  }

  sendDailyReminders(): Observable<{ message: string; total: number; sent: number }> {
    return this.http.post<any>(`${this.baseUrl}/reminders/send-daily`, {});
  }

  sendEmail(draft: EmailDraft): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.baseUrl}/reminders/send-email`, draft);
  }
}
