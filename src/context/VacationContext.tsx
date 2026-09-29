import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, VacationRequest, Role, FinancialSimulation } from '../types/vacation';
import { INITIAL_EMPLOYEES, INITIAL_REQUESTS } from '../data/mockData';
import { calculateFinancials, calculateDaysBetween, addDays } from '../utils/cltRules';
import { getSqliteDb, saveDatabaseToStorage, loadSqlDataToEntities } from '../lib/sqliteDatabase';
import confetti from 'canvas-confetti';

interface VacationContextType {
  currentUser: Employee;
  allEmployees: Employee[];
  requests: VacationRequest[];
  switchUser: (employeeId: string) => void;
  createRequest: (data: {
    startDate: string;
    endDate: string;
    hasAbonoPecuniario: boolean;
    abonoDaysCount: number;
    requestThirteenthAdvance: boolean;
    notes?: string;
  }) => { success: boolean; error?: string };
  approveByManager: (requestId: string, feedback?: string) => void;
  rejectByManager: (requestId: string, reason: string) => void;
  approveByHR: (requestId: string, feedback?: string) => void;
  rejectByHR: (requestId: string, reason: string) => void;
  cancelRequest: (requestId: string) => void;
  resetAllData: () => void;
  getDepartmentRequests: (department: string) => VacationRequest[];
  checkDepartmentConflicts: (department: string, startDate: string, endDate: string, excludeRequestId?: string) => VacationRequest[];
  setRequests: React.Dispatch<React.SetStateAction<VacationRequest[]>>;
  setAllEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  syncFromSqlDatabase: () => Promise<void>;
}

const STORAGE_KEY_EMPLOYEES = 'portal_ferias_employees_v1';
const STORAGE_KEY_REQUESTS = 'portal_ferias_requests_v1';
const STORAGE_KEY_CURRENT_USER_ID = 'portal_ferias_current_user_id_v1';

const VacationContext = createContext<VacationContextType | undefined>(undefined);

export const VacationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allEmployees, setAllEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
      return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  const [requests, setRequests] = useState<VacationRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REQUESTS);
      return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
    } catch {
      return INITIAL_REQUESTS;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER_ID);
      return saved || 'emp-1'; // Default: Mariana Silva (Colaborador)
    } catch {
      return 'emp-1';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(allEmployees));
    } catch (e) {
      console.error(e);
    }
  }, [allEmployees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
    } catch (e) {
      console.error(e);
    }
  }, [requests]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER_ID, currentUserId);
    } catch (e) {
      console.error(e);
    }
  }, [currentUserId]);

  const syncFromSqlDatabase = async () => {
    try {
      const data = await loadSqlDataToEntities();
      setAllEmployees(data.employees);
      setRequests(data.requests);
    } catch (e) {
      console.error('Failed to sync from SQLite database:', e);
    }
  };

  useEffect(() => {
    syncFromSqlDatabase();
  }, []);

  const currentUser = allEmployees.find((e) => e.id === currentUserId) || allEmployees[0];

  const switchUser = (employeeId: string) => {
    setCurrentUserId(employeeId);
  };

  const createRequest = (data: {
    startDate: string;
    endDate: string;
    hasAbonoPecuniario: boolean;
    abonoDaysCount: number;
    requestThirteenthAdvance: boolean;
    notes?: string;
  }): { success: boolean; error?: string } => {
    const daysCount = calculateDaysBetween(data.startDate, data.endDate);
    const totalDaysDeducted = daysCount + (data.hasAbonoPecuniario ? data.abonoDaysCount : 0);

    // Encontrar o período aquisitivo ativo do colaborador
    const activePeriod = currentUser.acquisitionPeriods.find((p) => p.status === 'active');
    if (!activePeriod) {
      return { success: false, error: 'Não foi encontrado período aquisitivo ativo para o colaborador.' };
    }

    if (totalDaysDeducted > activePeriod.remainingDays) {
      return {
        success: false,
        error: `Saldo insuficiente. Disponível: ${activePeriod.remainingDays} dias. Solicitado: ${totalDaysDeducted} dias.`,
      };
    }

    const returnDate = addDays(data.endDate, 1);

    const financials: FinancialSimulation = calculateFinancials({
      baseSalary: currentUser.baseSalary,
      daysRequested: daysCount,
      hasAbonoPecuniario: data.hasAbonoPecuniario,
      abonoDaysCount: data.abonoDaysCount,
      requestThirteenthAdvance: data.requestThirteenthAdvance,
      startDate: data.startDate,
    });

    const newRequest: VacationRequest = {
      id: `req-${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeAvatar: currentUser.avatarUrl,
      jobTitle: currentUser.jobTitle,
      department: currentUser.department,
      acquisitionPeriodId: activePeriod.id,
      createdAt: new Date().toISOString(),
      startDate: data.startDate,
      endDate: data.endDate,
      returnDate,
      daysCount,
      hasAbonoPecuniario: data.hasAbonoPecuniario,
      abonoDaysCount: data.hasAbonoPecuniario ? data.abonoDaysCount : 0,
      requestThirteenthAdvance: data.requestThirteenthAdvance,
      notes: data.notes,
      status: currentUser.role === 'manager' ? 'pending_hr' : 'pending_manager',
      financials,
    };

    // Atualizar saldo do colaborador
    setAllEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== currentUser.id) return emp;
        return {
          ...emp,
          acquisitionPeriods: emp.acquisitionPeriods.map((p) => {
            if (p.id !== activePeriod.id) return p;
            return {
              ...p,
              daysScheduled: p.daysScheduled + daysCount,
              daysSold: p.daysSold + (data.hasAbonoPecuniario ? data.abonoDaysCount : 0),
              remainingDays: p.remainingDays - totalDaysDeducted,
            };
          }),
        };
      })
    );

    setRequests((prev) => [newRequest, ...prev]);

    // Celebrate creation
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}

    return { success: true };
  };

  const approveByManager = (requestId: string, feedback?: string) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: 'pending_hr',
          managerApproval: {
            managerId: currentUser.id,
            managerName: currentUser.name,
            approvedAt: new Date().toISOString(),
            feedback,
          },
        };
      })
    );
  };

  const rejectByManager = (requestId: string, reason: string) => {
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return;

    // Restaurar dias ao colaborador
    const totalDaysToRestore = targetReq.daysCount + (targetReq.hasAbonoPecuniario ? targetReq.abonoDaysCount : 0);

    setAllEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== targetReq.employeeId) return emp;
        return {
          ...emp,
          acquisitionPeriods: emp.acquisitionPeriods.map((p) => {
            if (p.id !== targetReq.acquisitionPeriodId) return p;
            return {
              ...p,
              daysScheduled: Math.max(0, p.daysScheduled - targetReq.daysCount),
              daysSold: Math.max(0, p.daysSold - (targetReq.hasAbonoPecuniario ? targetReq.abonoDaysCount : 0)),
              remainingDays: p.remainingDays + totalDaysToRestore,
            };
          }),
        };
      })
    );

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: 'rejected',
          rejectionReason: reason,
          rejectedBy: {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            rejectedAt: new Date().toISOString(),
          },
        };
      })
    );
  };

  const approveByHR = (requestId: string, feedback?: string) => {
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return;

    // Confirmar gozo nos períodos do colaborador
    setAllEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== targetReq.employeeId) return emp;
        return {
          ...emp,
          acquisitionPeriods: emp.acquisitionPeriods.map((p) => {
            if (p.id !== targetReq.acquisitionPeriodId) return p;
            return {
              ...p,
              daysTaken: p.daysTaken + targetReq.daysCount,
              daysScheduled: Math.max(0, p.daysScheduled - targetReq.daysCount),
            };
          }),
        };
      })
    );

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: 'approved',
          hrApproval: {
            hrId: currentUser.id,
            hrName: currentUser.name,
            approvedAt: new Date().toISOString(),
            feedback,
          },
        };
      })
    );

    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {}
  };

  const rejectByHR = (requestId: string, reason: string) => {
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return;

    // Restaurar saldo
    const totalDaysToRestore = targetReq.daysCount + (targetReq.hasAbonoPecuniario ? targetReq.abonoDaysCount : 0);

    setAllEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== targetReq.employeeId) return emp;
        return {
          ...emp,
          acquisitionPeriods: emp.acquisitionPeriods.map((p) => {
            if (p.id !== targetReq.acquisitionPeriodId) return p;
            return {
              ...p,
              daysScheduled: Math.max(0, p.daysScheduled - targetReq.daysCount),
              daysSold: Math.max(0, p.daysSold - (targetReq.hasAbonoPecuniario ? targetReq.abonoDaysCount : 0)),
              remainingDays: p.remainingDays + totalDaysToRestore,
            };
          }),
        };
      })
    );

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: 'rejected',
          rejectionReason: reason,
          rejectedBy: {
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            rejectedAt: new Date().toISOString(),
          },
        };
      })
    );
  };

  const cancelRequest = (requestId: string) => {
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return;

    // Restaurar dias caso ainda não tenha sido rejeitada
    if (targetReq.status !== 'rejected' && targetReq.status !== 'cancelled') {
      const totalDaysToRestore = targetReq.daysCount + (targetReq.hasAbonoPecuniario ? targetReq.abonoDaysCount : 0);

      setAllEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id !== targetReq.employeeId) return emp;
          return {
            ...emp,
            acquisitionPeriods: emp.acquisitionPeriods.map((p) => {
              if (p.id !== targetReq.acquisitionPeriodId) return p;
              return {
                ...p,
                daysScheduled: Math.max(0, p.daysScheduled - targetReq.daysCount),
                daysSold: Math.max(0, p.daysSold - (targetReq.hasAbonoPecuniario ? targetReq.abonoDaysCount : 0)),
                remainingDays: p.remainingDays + totalDaysToRestore,
              };
            }),
          };
        })
      );
    }

    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        return {
          ...req,
          status: 'cancelled',
        };
      })
    );
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY_EMPLOYEES);
    localStorage.removeItem(STORAGE_KEY_REQUESTS);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER_ID);
    localStorage.removeItem('vacation_portal_sqlite_binary_v1');
    setAllEmployees(INITIAL_EMPLOYEES);
    setRequests(INITIAL_REQUESTS);
    setCurrentUserId('emp-1');
    // Re-sync SQLite
    syncFromSqlDatabase();
  };

  const getDepartmentRequests = (department: string) => {
    return requests.filter((r) => r.department === department && r.status !== 'rejected' && r.status !== 'cancelled');
  };

  const checkDepartmentConflicts = (
    department: string,
    startDate: string,
    endDate: string,
    excludeRequestId?: string
  ): VacationRequest[] => {
    return requests.filter((req) => {
      if (excludeRequestId && req.id === excludeRequestId) return false;
      if (req.department !== department) return false;
      if (req.status === 'rejected' || req.status === 'cancelled') return false;

      // Overlap logic: startA <= endB and endA >= startB
      const overlaps = req.startDate <= endDate && req.endDate >= startDate;
      return overlaps;
    });
  };

  return (
    <VacationContext.Provider
      value={{
        currentUser,
        allEmployees,
        requests,
        switchUser,
        createRequest,
        approveByManager,
        rejectByManager,
        approveByHR,
        rejectByHR,
        cancelRequest,
        resetAllData,
        getDepartmentRequests,
        checkDepartmentConflicts,
        setRequests,
        setAllEmployees,
        syncFromSqlDatabase,
      }}
    >
      {children}
    </VacationContext.Provider>
  );
};

export const useVacation = () => {
  const context = useContext(VacationContext);
  if (!context) {
    throw new Error('useVacation must be used within a VacationProvider');
  }
  return context;
};
