export type Role = 'employee' | 'manager' | 'hr';

export type RequestStatus = 
  | 'pending_manager' 
  | 'pending_hr' 
  | 'approved' 
  | 'rejected' 
  | 'cancelled';

export interface AcquisitionPeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  concessiveLimit: string; // YYYY-MM-DD (must take before this to avoid double pay)
  totalEntitlementDays: number; // 30
  daysTaken: number;
  daysScheduled: number;
  daysSold: number; // Abono pecuniário
  remainingDays: number;
  status: 'active' | 'expired' | 'closed';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  department: string;
  admissionDate: string; // YYYY-MM-DD
  baseSalary: number;
  managerId: string | null;
  avatarUrl: string;
  acquisitionPeriods: AcquisitionPeriod[];
}

export interface FinancialSimulation {
  baseSalary: number;
  daysRequested: number;
  grossVacationPay: number; // (baseSalary / 30) * daysRequested
  constitutionalBonus: number; // 1/3 of grossVacationPay
  abonoDays: number;
  abonoAmount: number; // (baseSalary / 30) * abonoDays
  abonoBonus: number; // 1/3 of abonoAmount
  thirteenthAdvance: number; // 50% of baseSalary if requested
  grossTotal: number;
  estimatedInss: number;
  estimatedIrrf: number;
  totalDeductions: number;
  netTotal: number;
  paymentDeadlineDate: string; // 2 days before start
}

export interface VacationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  jobTitle: string;
  department: string;
  acquisitionPeriodId: string;
  createdAt: string; // ISO
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  daysCount: number;
  hasAbonoPecuniario: boolean;
  abonoDaysCount: number;
  requestThirteenthAdvance: boolean;
  notes?: string;
  status: RequestStatus;
  
  // Financial snapshot
  financials: FinancialSimulation;
  
  // Approval tracking
  managerApproval?: {
    managerId: string;
    managerName: string;
    approvedAt: string;
    feedback?: string;
  };
  hrApproval?: {
    hrId: string;
    hrName: string;
    approvedAt: string;
    feedback?: string;
  };
  rejectionReason?: string;
  rejectedBy?: {
    userId: string;
    userName: string;
    role: Role;
    rejectedAt: string;
  };
}

export interface CltValidationResult {
  isValid: boolean;
  blockingErrors: string[];
  warnings: string[];
  recommendations: string[];
}
