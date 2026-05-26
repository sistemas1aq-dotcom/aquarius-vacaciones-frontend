// ─── Employee ────────────────────────────────────────────────────
export interface Employee {
  Id: number;
  Num: number;
  Dni: string;
  FullName: string;
  Email: string | null;
  DepartmentId: number;
  DepartmentName?: string;
  Position: string | null;
  HireDate: string;
  CeaseDate: string | null;
  DaysPerYear: number;
  IsActive: boolean;
}

export interface EmployeeWithBalance extends Employee {
  YearsWorked: number;
  MonthsWorked: number;
  DaysWorked: number;
  EarnedDays: number;
  TruncatedDays: number;
  TakenDays: number;
  TakenDays2026: number;
  PendingByYear: number;
  PendingTruncated: number;
  TotalPending: number;
  Vacations?: Vacation[];
}

export interface EmployeeCreate {
  Dni: string;
  FullName: string;
  Email?: string;
  DepartmentId: number;
  Position?: string;
  HireDate: string;
  CeaseDate?: string;
  DaysPerYear?: number;
}

export interface EmployeeUpdate {
  FullName?: string;
  Email?: string;
  DepartmentId?: number;
  Position?: string;
  HireDate?: string;
  CeaseDate?: string;
  DaysPerYear?: number;
  IsActive?: boolean;
}

// ─── Vacation ────────────────────────────────────────────────────
export interface Vacation {
  Id: number;
  EmployeeId: number;
  StartDate: string;
  EndDate: string;
  Days: number;
  Status: 'approved' | 'in_progress' | 'completed' | 'cancelled';
  VacationType: 'regular' | 'advanced' | 'compensatory';
  Label: string | null;
  Notes: string | null;
  ApprovedBy: string | null;
  CreatedAt: string;
}

export interface VacationCreate {
  EmployeeId: number;
  StartDate: string;
  EndDate: string;
  Days: number;
  Status: string;
  VacationType?: string;
  Label?: string;
  Notes?: string;
  ApprovedBy?: string;
}

export interface VacationUpdate {
  StartDate?: string;
  EndDate?: string;
  Days?: number;
  Status?: string;
  VacationType?: string;
  Label?: string;
  Notes?: string;
}

export interface VacationExtend {
  ExtraDays: number;
  Notes?: string;
}

// ─── Dashboard ───────────────────────────────────────────────────
export interface DashboardStats {
  TotalEmployees: number;
  OnVacation: number;
  TotalPendingDays: number;
  CriticalAlerts: number;
  NoProgrammed: number;
}

export interface DashboardAlert {
  AlertType: string;
  EmployeeId: number;
  EmployeeName: string;
  Department: string;
  Email?: string;
  TotalPending?: number;
  PendingByYear?: number;
  PendingTruncated?: number;
  VacationId?: number;
  StartDate?: string;
  EndDate?: string;
  Days?: number;
}

export interface DashboardResponse {
  Stats: DashboardStats;
  Critical: DashboardAlert[];
  Pending30: DashboardAlert[];
  NextWeekOut: DashboardAlert[];
  NextWeekReturn: DashboardAlert[];
  InProgress: DashboardAlert[];
  Advanced: DashboardAlert[];
}

// ─── Reports ─────────────────────────────────────────────────────
export interface MonthlyReportRow {
  Month: number;
  MonthName: string;
  EmployeeCount: number;
  TotalDays: number;
}

export interface DepartmentReportRow {
  Department: string;
  EmployeeCount: number;
  TotalPending: number;
  AveragePending: number;
  TakenDays2026: number;
  CompliancePercent: number;
}

export interface VacationSegment {
  VacationId: number;
  StartMonth: number;
  EndMonth: number;
  StartDate: string;
  EndDate: string;
  Days: number;
  Label: string | null;
  Status: string;
}

export interface ProjectionRow {
  EmployeeId: number;
  EmployeeName: string;
  Department: string;
  Position: string | null;
  TotalPending: number;
  MonthlySchedule: Record<number, number>;
  Vacations?: VacationSegment[];
}

// ─── Reminder ────────────────────────────────────────────────────
export interface Reminder {
  Id: number;
  EmployeeId: number;
  EmployeeName?: string;
  ReminderDate: string;
  ReminderType: string;
  EmailTo: string | null;
  EmailSubject: string | null;
  SentAt: string | null;
  Status: string;
  CreatedAt: string;
  TotalPending?: number;
  PendingByYear?: number;
  PendingTruncated?: number;
}

// ─── Email ───────────────────────────────────────────────────────
export interface EmailDraft {
  To: string;
  Subject: string;
  Body: string;
  SendNow?: boolean;
}

// ─── Generic ─────────────────────────────────────────────────────
export interface Department {
  Id: number;
  Name: string;
  IsActive: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiMessage {
  message: string;
  success?: boolean;
  id?: number;
}
