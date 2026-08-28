import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EmployeeWithBalance, EmployeeCreate, EmployeeUpdate,
  Vacation, VacationCreate, VacationUpdate, VacationExtend,
  DashboardResponse, MonthlyReportRow, DepartmentReportRow, ProjectionRow,
  Reminder, EmailDraft, Department, PaginatedResponse, ApiMessage,
  SyncEstado, SyncCorrida,
  EstadoEnvio, ResultadoEnvioIndividual, ResultadoCorrida,
  TextosCorreo, GuardarTextosResp, BorradorConvocatoria, VistaPreviaResp,
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
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<PaginatedResponse<EmployeeWithBalance>> {
    let httpParams = new HttpParams();
    if (params?.department) httpParams = httpParams.set('department', params.department);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.includeInactive) httpParams = httpParams.set('includeInactive', 'true');
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

  // ─── Reporte de Vacaciones (modelo corporativo) ─────────────────
  getVacationReportPreview(year: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/reports/vacation-report/preview`, { params: { year: year.toString() } }
    );
  }

  downloadVacationReportXlsx(year: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/reports/vacation-report/xlsx`,
      { params: { year: year.toString() }, responseType: 'blob' }
    );
  }

  downloadVacationReportPdf(year: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/reports/vacation-report/pdf`,
      { params: { year: year.toString() }, responseType: 'blob' }
    );
  }

  // ─── Reminders ──────────────────────────────────────────────────
  getReminders(page: number = 1, pageSize: number = 100): Observable<PaginatedResponse<Reminder>> {
    return this.http.get<PaginatedResponse<Reminder>>(
      `${this.baseUrl}/reminders`, { params: { page: page.toString(), pageSize: pageSize.toString() } }
    );
  }

  sendDailyReminders(): Observable<ResultadoCorrida> {
    return this.http.post<ResultadoCorrida>(`${this.baseUrl}/reminders/send-daily`, {});
  }

  /** Estado del interruptor global de envío de correo. */
  getEstadoEnvio(): Observable<EstadoEnvio> {
    return this.http.get<EstadoEnvio>(`${this.baseUrl}/reminders/envio`);
  }

  /** Activa o cancela TODO el envío de correo. Solo administradores. */
  cambiarEnvio(activo: boolean): Observable<EstadoEnvio> {
    return this.http.put<EstadoEnvio>(`${this.baseUrl}/reminders/envio`, {},
      { params: { activo: activo ? 'true' : 'false' } });
  }

  /** Permite o cancela los envíos EN LOTE: corrida programada y botón masivo. */
  cambiarEnvioMasivo(activo: boolean): Observable<EstadoEnvio> {
    return this.http.put<EstadoEnvio>(`${this.baseUrl}/reminders/envio-masivo`, {},
      { params: { activo: activo ? 'true' : 'false' } });
  }

  /** Bloques editables de los correos, su estructura y la vista previa. */
  getTextosCorreo(): Observable<TextosCorreo> {
    return this.http.get<TextosCorreo>(`${this.baseUrl}/reminders/textos`);
  }

  /** Monta los correos con el borrador SIN guardar, para la vista previa. */
  vistaPreviaTextos(borrador: Record<string, string>): Observable<VistaPreviaResp> {
    return this.http.post<VistaPreviaResp>(
      `${this.baseUrl}/reminders/textos/vista-previa`, borrador);
  }

  /** Guarda los bloques que cambiaron. Solo administradores. */
  guardarTextosCorreo(cambios: Record<string, string>): Observable<GuardarTextosResp> {
    return this.http.put<GuardarTextosResp>(`${this.baseUrl}/reminders/textos`, cambios);
  }

  /** Convocatoria ya redactada por el backend desde la plantilla. */
  getBorradorConvocatoria(employeeId: number): Observable<BorradorConvocatoria> {
    return this.http.get<BorradorConvocatoria>(
      `${this.baseUrl}/reminders/borrador-convocatoria/${employeeId}`);
  }

  /** Envía el recordatorio a UN trabajador. No aplica la ventana de frecuencia. */
  enviarRecordatorioIndividual(employeeId: number): Observable<ResultadoEnvioIndividual> {
    return this.http.post<ResultadoEnvioIndividual>(
      `${this.baseUrl}/reminders/enviar/${employeeId}`, {});
  }

  sendEmail(draft: EmailDraft): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.baseUrl}/reminders/send-email`, draft);
  }

  // ─── Sincronización con Planillas ───────────────────────────────
  getSyncEstado(): Observable<SyncEstado> {
    return this.http.get<SyncEstado>(`${this.baseUrl}/integraciones/planillas/estado`);
  }

  getSyncCorridas(limite: number = 20): Observable<SyncCorrida[]> {
    return this.http.get<SyncCorrida[]>(
      `${this.baseUrl}/integraciones/planillas/corridas`,
      { params: { limite: limite.toString() } }
    );
  }
}
