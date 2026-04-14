// src/types/index.ts

export interface School {
  id: string;
  name?: string;
  schoolName?: string;
  city?: string;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  status?: "active" | "suspended" | "inactive";
  features?: FeatureFlags;
  createdAt?: unknown;
}

export interface Teacher {
  id: string;
  role_id?: string;
  full_name?: string;
  name?: string;
  email?: string;
  subject?: string;
  assignedClasses?: string[];
  classTeacherOf?: string;
  role?: string;
  schoolId?: string;
  school_id?: string;
  status?: "active" | "inactive";
  salary?: number;
  timetable?: unknown[];
}

export interface Student {
  id: string;
  studentId?: string;
  name?: string;
  classId?: string;
  class?: string;
  rollNumber?: string;
  parentPhone?: string;
  schoolId?: string;
  school_id?: string;
  createdAt?: unknown;
}

export interface SchoolClass {
  id: string;
  name?: string;
  schoolId?: string;
  school_id?: string;
  createdAt?: unknown;
}

export interface MarkEdit {
  id: string;
  studentId?: string;
  studentName?: string;
  subject?: string;
  classId?: string;
  schoolId?: string;
  school_id?: string;
  oldMarks?: number;
  old?: number;
  newMarks?: number;
  new?: number;
  editedBy?: string;
  editReason?: string;
  reason?: string;
  timestamp?: unknown;
  ts?: string;
}

export interface Alert {
  // From Replit apps
  userId?: string;
  userRole?: "teacher" | "parent" | "driver" | "cleaner" | "admin" | string;
  appName?: string;
  id: string;
  type?: string;
  severity?: "low" | "medium" | "high" | "critical";
  message?: string;
  title?: string;
  driverId?: string;
  studentId?: string;
  teacherId?: string;
  teacherName?: string;
  schoolId?: string;
  screen?: string;
  details?: string;
  userAgent?: string;
  source?: "auto" | "manual";
  timestamp?: unknown;
  ts?: string;
  read?: boolean;
}

export interface LeaveRequest {
  id: string;
  name?: string;
  roleId?: string;
  role?: string;
  reason?: string;
  from?: string;
  to?: string;
  days?: number;
  status?: "Pending" | "Approved" | "Rejected";
}

export interface Trip {
  id: string;
  driverId?: string;
  tripType?: "morning" | "evening";
  status?: "active" | "completed";
  startTime?: string;
  endTime?: string;
  schoolId?: string;
}

export interface Salary {
  id: string;
  roleId?: string;
  name?: string;
  role?: string;
  baseSalary?: number;
  paidMonths?: string[];
  deductions?: number;
}

export interface Fee {
  id: string;
  studentId?: string;
  amount?: number;
  dueDate?: string;
  status?: "paid" | "unpaid";
  paidDate?: string;
  schoolId?: string;
}

export interface FeatureFlags {
  marksEntry?:   boolean;
  attendance?:   boolean;
  parentLogin?:  boolean;
  qrLogin?:      boolean;
  smsAlerts?:    boolean;
  reportCards?:  boolean;
}

export interface DashboardMetrics {
  schools:         number;
  teachers:        number;
  students:        number;
  marksToday:      number;
  attendanceToday: number;
  activeTeachers:  number;
}

export interface WhatsAppConfig {
  phoneNumber?:        string;
  phoneNumberId?:      string;
  accessToken?:        string;
  businessAccountId?:  string;
  verified?:           boolean;
  enabledTriggers?: {
    attendance?:     boolean;
    fees?:           boolean;
    exams?:          boolean;
    announcements?:  boolean;
    emergency?:      boolean;
  };
}

export interface WhatsAppLog {
  id:           string;
  schoolId?:    string;
  schoolName?:  string;
  type?:        "attendance" | "fees" | "exams" | "announcement" | "emergency";
  recipient?:   string;
  studentName?: string;
  status?:      "sent" | "delivered" | "failed" | "pending";
  errorReason?: string;
  sentAt?:      unknown;
  ts?:          string;
}
