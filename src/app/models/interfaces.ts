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
  /** Suma de truncos: derecho en formación, se paga al cesar. */
  TruncatedDays?: number;
  NoEmail?: number;
  FailedEmails?: number;
  /** Máximo de gente fuera a la vez el mes que viene, y qué día. */
  PeakNextMonth?: number;
  PeakDate?: string | null;
}

export interface DashboardAlert {
  AlertType: string;
  EmployeeId: number;
  EmployeeName: string;
  Department: string;
  Position?: string;
  Email?: string;
  TotalPending?: number;
  PendingByYear?: number;
  PendingTruncated?: number;
  /** Solo en la lista de correos fallidos: por qué no salió. */
  ErrorMessage?: string | null;
  VacationId?: number;
  StartDate?: string;
  EndDate?: string;
  Days?: number;
}

/** El pico de ausencias del mes siguiente, con quiénes lo forman. */
export interface PicoAusencias {
  Fecha: string | null;
  Total: number;
  Desde: string;
  Hasta: string;
  Items: DashboardAlert[];
}

export interface DashboardResponse {
  Stats: DashboardStats;
  Critical: DashboardAlert[];
  Pending30: DashboardAlert[];
  NextWeekOut: DashboardAlert[];
  NextWeekReturn: DashboardAlert[];
  InProgress: DashboardAlert[];
  Advanced: DashboardAlert[];
  /** Saldo > 15 días y ninguna vacación futura aprobada. */
  NoProgrammed: DashboardAlert[];
  Truncated: DashboardAlert[];
  AllPending: DashboardAlert[];
  /** Padrón completo de activos, por nombre, con su saldo. */
  Employees: DashboardAlert[];
  NoEmail: DashboardAlert[];
  FailedEmails: DashboardAlert[];
  Peak: PicoAusencias;
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
  ErrorMessage?: string | null;
}

// ─── Email ───────────────────────────────────────────────────────
export interface EmailDraft {
  To: string;
  Subject: string;
  Body: string;
  SendNow?: boolean;
  /**
   * Sin estos dos el correo sale pero NO queda registrado en el
   * historial: el backend los espera y el frontend no los mandaba, así
   * que ninguna convocatoria enviada desde el dashboard dejaba rastro.
   */
  EmployeeId?: number;
  ReminderType?: string;
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

// ─── Sincronización con Planillas ───────────────────────────────
export interface SyncCorrida {
  id: number;
  inicio: string;
  fin: string | null;
  cod_empresa: string | null;
  dry_run: boolean;
  estado: 'ok' | 'abortado' | 'error';
  mensaje: string | null;
  total_origen: number;
  en_alcance: number;
  altas: number;
  actualizaciones: number;
  ceses: number;
  reactivaciones: number;
  ignorados: number;
  fuera_de_alcance: number;
  errores: number;
}

export interface SyncEstado {
  semaforo: 'verde' | 'ambar' | 'rojo';
  mensaje?: string;
  minutos_desde_ultima?: number;
  umbral_minutos?: number;
  ultima: {
    id: number;
    inicio: string;
    estado: string;
    mensaje: string | null;
    dry_run: boolean;
    altas: number;
    actualizaciones: number;
    ceses: number;
    ignorados: number;
    fuera_de_alcance: number;
    errores: number;
  } | null;
}

// ─── Envío de correo ─────────────────────────────────────────────
/** Estado del interruptor global. Manda sobre CUALQUIER vía de envío. */
export interface EstadoEnvio {
  activo: boolean;
  actualizado_por?: string | null;
  actualizado_en?: string | null;
  /** El interruptor puede estar en Activo y aun así no haber relay configurado. */
  smtp_configurado: boolean;
  servidor?: string | null;

  /**
   * Interruptor de los envíos EN LOTE: la corrida programada diaria y el
   * botón «Enviar a todos los pendientes», que por dentro son la misma
   * corrida. NO afecta al envío por trabajador.
   */
  masivo_activo: boolean;
  masivo_actualizado_por?: string | null;
  masivo_actualizado_en?: string | null;

  /** Si el programador arrancó. Sin él no hay corrida diaria, esté como esté el switch. */
  scheduler_activo: boolean;
  hora_corrida?: string | null;
}

export interface ResultadoEnvioIndividual {
  ok: boolean;
  empleado?: string;
  correo?: string;
  error?: string | null;
  mensaje?: string;
}

export interface ResultadoCorrida {
  candidatos: number;
  enviados: number;
  fallidos: number;
  omitidos_por_frecuencia: number;
  sin_correo: number;
  mensaje: string;
  detalle?: {
    fallidos?: { empleado: string; motivo: string }[];
    sin_correo?: string[];
    omitidos_por_frecuencia?: string[];
    dias_entre_avisos?: number;
    umbral_dias?: number;
    error_conexion?: string | null;
    /** Motivo por el que la corrida no llegó a intentarse (interruptor de lote). */
    bloqueado_por?: string | null;
  };
}

// ─── Textos editables de los correos ─────────────────────────────
/** Un párrafo del correo, en su posición. `fijo` = no se puede editar. */
export interface BloqueCorreo {
  tipo: 'fijo' | 'editable';
  etiqueta: string;
  texto: string;
  /** Solo en los editables: la clave con la que se guarda. */
  clave?: string;
  /** Solo en los editables: qué es este párrafo. */
  ayuda?: string;
  /** Solo en los fijos: por qué no se puede tocar. */
  motivo?: string;
}

export interface EstructuraCorreo {
  titulo: string;
  descripcion: string;
  asunto: BloqueCorreo;
  bloques: BloqueCorreo[];
}

export interface TextosCorreo {
  textos: Record<string, string>;
  marcadores: string[];
  por_defecto: Record<string, string>;
  /** El correo descompuesto en bloques, en orden de lectura. */
  estructura: Record<'recordatorio' | 'convocatoria', EstructuraCorreo>;
  vista_previa: Record<'recordatorio' | 'convocatoria', { subject: string; body: string }>;
}

/** Respuesta de la vista previa en vivo: no guarda nada. */
export interface VistaPreviaResp {
  vista_previa: Record<'recordatorio' | 'convocatoria', { subject: string; body: string }>;
  avisos: string[];
}

export interface GuardarTextosResp {
  textos: Record<string, string>;
  avisos: string[];
  estructura: Record<'recordatorio' | 'convocatoria', EstructuraCorreo>;
  vista_previa: Record<'recordatorio' | 'convocatoria', { subject: string; body: string }>;
}

/** Borrador de convocatoria que arma el backend desde la plantilla. */
export interface BorradorConvocatoria {
  To: string;
  Subject: string;
  Body: string;
  EmployeeId: number;
  ReminderType: string;
  SendNow: boolean;
}
