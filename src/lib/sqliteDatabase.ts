import initSqlJs, { Database } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { INITIAL_EMPLOYEES, INITIAL_REQUESTS } from '../data/mockData';
import { Employee, VacationRequest } from '../types/vacation';

const STORAGE_KEY = 'vacation_portal_sqlite_binary_v1';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

function seedDatabase(db: Database) {
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('employee', 'manager', 'hr')),
      job_title TEXT NOT NULL,
      department TEXT NOT NULL,
      admission_date TEXT NOT NULL,
      base_salary REAL NOT NULL CHECK (base_salary > 0),
      manager_id TEXT,
      avatar_url TEXT
    );

    CREATE TABLE IF NOT EXISTS acquisition_periods (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      concessive_limit TEXT NOT NULL,
      total_entitlement_days INTEGER DEFAULT 30 NOT NULL,
      days_taken INTEGER DEFAULT 0 NOT NULL,
      days_scheduled INTEGER DEFAULT 0 NOT NULL,
      days_sold INTEGER DEFAULT 0 NOT NULL,
      remaining_days INTEGER NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'closed'))
    );

    CREATE TABLE IF NOT EXISTS vacation_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      employee_name TEXT NOT NULL,
      employee_avatar TEXT,
      job_title TEXT NOT NULL,
      department TEXT NOT NULL,
      acquisition_period_id TEXT NOT NULL REFERENCES acquisition_periods(id),
      created_at TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      return_date TEXT NOT NULL,
      days_count INTEGER NOT NULL,
      has_abono_pecuniario INTEGER DEFAULT 0 NOT NULL,
      abono_days_count INTEGER DEFAULT 0 NOT NULL,
      request_thirteenth_advance INTEGER DEFAULT 0 NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending_manager' NOT NULL,
      gross_vacation_pay REAL NOT NULL,
      constitutional_bonus REAL NOT NULL,
      abono_amount REAL DEFAULT 0 NOT NULL,
      abono_bonus REAL DEFAULT 0 NOT NULL,
      thirteenth_advance REAL DEFAULT 0 NOT NULL,
      estimated_inss REAL DEFAULT 0 NOT NULL,
      estimated_irrf REAL DEFAULT 0 NOT NULL,
      total_deductions REAL DEFAULT 0 NOT NULL,
      net_total REAL NOT NULL,
      payment_deadline_date TEXT NOT NULL,
      manager_id TEXT,
      manager_name TEXT,
      manager_approved_at TEXT,
      manager_feedback TEXT,
      hr_id TEXT,
      hr_name TEXT,
      hr_approved_at TEXT,
      hr_feedback TEXT,
      rejection_reason TEXT,
      rejected_by_id TEXT,
      rejected_by_name TEXT,
      rejected_at TEXT
    );

    CREATE TABLE IF NOT EXISTS storage_buckets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      public INTEGER DEFAULT 0 NOT NULL,
      file_size_limit INTEGER NOT NULL,
      allowed_mime_types TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS storage_objects (
      id TEXT PRIMARY KEY,
      bucket_id TEXT NOT NULL REFERENCES storage_buckets(id),
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT
    );
  `);

  // Seed storage buckets
  db.run(`
    INSERT OR REPLACE INTO storage_buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES 
      ('recibos-ferias', 'recibos-ferias', 0, 10485760, 'application/pdf'),
      ('comprovantes-ferias', 'comprovantes-ferias', 0, 10485760, 'application/pdf, image/jpeg, image/png'),
      ('avatars', 'avatars', 1, 5242880, 'image/jpeg, image/png, image/webp');
  `);

  // Seed storage objects
  db.run(`
    INSERT OR REPLACE INTO storage_objects (id, bucket_id, name, owner_id, metadata)
    VALUES 
      ('obj-101', 'recibos-ferias', 'emp-1/recibo_aquisicao_ferias_2026.pdf', 'emp-1', '{"mimetype": "application/pdf", "size": 142050, "clt_article": "145"}'),
      ('obj-102', 'comprovantes-ferias', 'emp-4/acordo_individual_abono.pdf', 'emp-4', '{"mimetype": "application/pdf", "size": 89400, "clt_article": "143"}'),
      ('obj-103', 'recibos-ferias', 'emp-5/recibo_adiantamento_13.pdf', 'emp-5', '{"mimetype": "application/pdf", "size": 115200, "law": "4749/65"}');
  `);

  // Seed employees
  INITIAL_EMPLOYEES.forEach((emp) => {
    db.run(
      `INSERT OR REPLACE INTO employees 
       (id, name, email, role, job_title, department, admission_date, base_salary, manager_id, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        emp.id,
        emp.name,
        emp.email,
        emp.role,
        emp.jobTitle,
        emp.department,
        emp.admissionDate,
        emp.baseSalary,
        emp.managerId,
        emp.avatarUrl,
      ]
    );

    emp.acquisitionPeriods.forEach((period) => {
      db.run(
        `INSERT OR REPLACE INTO acquisition_periods
         (id, employee_id, start_date, end_date, concessive_limit, total_entitlement_days, days_taken, days_scheduled, days_sold, remaining_days, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          period.id,
          emp.id,
          period.startDate,
          period.endDate,
          period.concessiveLimit,
          period.totalEntitlementDays,
          period.daysTaken,
          period.daysScheduled,
          period.daysSold,
          period.remainingDays,
          period.status,
        ]
      );
    });
  });

  // Seed requests
  INITIAL_REQUESTS.forEach((req) => {
    db.run(
      `INSERT OR REPLACE INTO vacation_requests
       (id, employee_id, employee_name, employee_avatar, job_title, department, acquisition_period_id, created_at, start_date, end_date, return_date, days_count, has_abono_pecuniario, abono_days_count, request_thirteenth_advance, notes, status, gross_vacation_pay, constitutional_bonus, abono_amount, abono_bonus, thirteenth_advance, estimated_inss, estimated_irrf, total_deductions, net_total, payment_deadline_date, manager_id, manager_name, manager_approved_at, manager_feedback, hr_id, hr_name, hr_approved_at, hr_feedback, rejection_reason, rejected_by_id, rejected_by_name, rejected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        req.id,
        req.employeeId,
        req.employeeName,
        req.employeeAvatar,
        req.jobTitle,
        req.department,
        req.acquisitionPeriodId,
        req.createdAt,
        req.startDate,
        req.endDate,
        req.returnDate,
        req.daysCount,
        req.hasAbonoPecuniario ? 1 : 0,
        req.abonoDaysCount,
        req.requestThirteenthAdvance ? 1 : 0,
        req.notes || null,
        req.status,
        req.financials.grossVacationPay,
        req.financials.constitutionalBonus,
        req.financials.abonoAmount,
        req.financials.abonoBonus,
        req.financials.thirteenthAdvance,
        req.financials.estimatedInss,
        req.financials.estimatedIrrf,
        req.financials.totalDeductions,
        req.financials.netTotal,
        req.financials.paymentDeadlineDate,
        req.managerApproval?.managerId || null,
        req.managerApproval?.managerName || null,
        req.managerApproval?.approvedAt || null,
        req.managerApproval?.feedback || null,
        req.hrApproval?.hrId || null,
        req.hrApproval?.hrName || null,
        req.hrApproval?.approvedAt || null,
        req.hrApproval?.feedback || null,
        req.rejectionReason || null,
        req.rejectedBy?.userId || null,
        req.rejectedBy?.userName || null,
        req.rejectedBy?.rejectedAt || null,
      ]
    );
  });
}

export function saveDatabaseToStorage(db: Database) {
  try {
    const data = db.export();
    const array = Array.from(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
  } catch (e) {
    console.error('Failed to persist SQLite database to localStorage:', e);
  }
}

export async function getSqliteDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: () => sqlWasmUrl,
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const u8 = new Uint8Array(JSON.parse(saved));
        dbInstance = new SQL.Database(u8);
      } catch (e) {
        dbInstance = new SQL.Database();
        seedDatabase(dbInstance);
        saveDatabaseToStorage(dbInstance);
      }
    } else {
      dbInstance = new SQL.Database();
      seedDatabase(dbInstance);
      saveDatabaseToStorage(dbInstance);
    }

    return dbInstance;
  })();

  return initPromise;
}

export interface SqlExecutionOutput {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  commandType: string;
}

export async function runQueryOnSqlite(sqlString: string): Promise<SqlExecutionOutput> {
  const startTime = performance.now();
  const trimmed = sqlString.trim();

  try {
    const db = await getSqliteDb();
    const upper = trimmed.toUpperCase();

    // Check if it's a DDL or DML that modifies data
    const isMutation =
      upper.startsWith('INSERT') ||
      upper.startsWith('UPDATE') ||
      upper.startsWith('DELETE') ||
      upper.startsWith('CREATE') ||
      upper.startsWith('ALTER') ||
      upper.startsWith('DROP');

    if (isMutation) {
      db.run(trimmed);
      saveDatabaseToStorage(db);
      const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
      return {
        columns: ['status', 'command', 'rows_affected'],
        rows: [['SUCCESS', trimmed.slice(0, 80) + '...', db.getRowsModified()]],
        rowCount: 1,
        executionTimeMs,
        commandType: upper.split(' ')[0],
      };
    }

    // It's a SELECT query
    const results = db.exec(trimmed);
    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

    if (!results || results.length === 0) {
      return {
        columns: ['result'],
        rows: [['Nenhum registro retornado ou tabela vazia.']],
        rowCount: 0,
        executionTimeMs,
        commandType: 'SELECT',
      };
    }

    const firstResult = results[0];
    return {
      columns: firstResult.columns,
      rows: firstResult.values as (string | number | boolean | null)[][],
      rowCount: firstResult.values.length,
      executionTimeMs,
      commandType: 'SELECT',
    };
  } catch (err: any) {
    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
    return {
      columns: ['error'],
      rows: [],
      rowCount: 0,
      executionTimeMs,
      error: err?.message || 'Erro ao executar instrução SQL no banco de dados.',
      commandType: 'ERROR',
    };
  }
}

export async function exportSqliteBinary(): Promise<Blob> {
  const db = await getSqliteDb();
  const binary = db.export();
  return new Blob([new Uint8Array(binary).buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
}

export async function loadSqlDataToEntities(): Promise<{
  employees: Employee[];
  requests: VacationRequest[];
}> {
  const db = await getSqliteDb();

  // Load employees
  const empRes = db.exec('SELECT * FROM employees;');
  const employees: Employee[] = [];
  if (empRes.length > 0) {
    const cols = empRes[0].columns;
    empRes[0].values.forEach((val) => {
      const obj: any = {};
      cols.forEach((c, idx) => {
        obj[c] = val[idx];
      });

      // Get periods for this employee
      const periodRes = db.exec(`SELECT * FROM acquisition_periods WHERE employee_id = '${obj.id}';`);
      const periods: any[] = [];
      if (periodRes.length > 0) {
        const pCols = periodRes[0].columns;
        periodRes[0].values.forEach((pVal) => {
          const pObj: any = {};
          pCols.forEach((pc, pIdx) => {
            pObj[pc] = pVal[pIdx];
          });
          periods.push({
            id: pObj.id,
            startDate: pObj.start_date,
            endDate: pObj.end_date,
            concessiveLimit: pObj.concessive_limit,
            totalEntitlementDays: pObj.total_entitlement_days,
            daysTaken: pObj.days_taken,
            daysScheduled: pObj.days_scheduled,
            daysSold: pObj.days_sold,
            remainingDays: pObj.remaining_days,
            status: pObj.status,
          });
        });
      }

      employees.push({
        id: obj.id,
        name: obj.name,
        email: obj.email,
        role: obj.role,
        jobTitle: obj.job_title,
        department: obj.department,
        admissionDate: obj.admission_date,
        baseSalary: obj.base_salary,
        managerId: obj.manager_id,
        avatarUrl: obj.avatar_url,
        acquisitionPeriods: periods,
      });
    });
  }

  // Load requests
  const reqRes = db.exec('SELECT * FROM vacation_requests ORDER BY created_at DESC;');
  const requests: VacationRequest[] = [];
  if (reqRes.length > 0) {
    const cols = reqRes[0].columns;
    reqRes[0].values.forEach((val) => {
      const obj: any = {};
      cols.forEach((c, idx) => {
        obj[c] = val[idx];
      });

      requests.push({
        id: obj.id,
        employeeId: obj.employee_id,
        employeeName: obj.employee_name,
        employeeAvatar: obj.employee_avatar,
        jobTitle: obj.job_title,
        department: obj.department,
        acquisitionPeriodId: obj.acquisition_period_id,
        createdAt: obj.created_at,
        startDate: obj.start_date,
        endDate: obj.end_date,
        returnDate: obj.return_date,
        daysCount: obj.days_count,
        hasAbonoPecuniario: Boolean(obj.has_abono_pecuniario),
        abonoDaysCount: obj.abono_days_count,
        requestThirteenthAdvance: Boolean(obj.request_thirteenth_advance),
        notes: obj.notes,
        status: obj.status,
        financials: {
          baseSalary: 0,
          daysRequested: obj.days_count,
          grossVacationPay: obj.gross_vacation_pay,
          constitutionalBonus: obj.constitutional_bonus,
          abonoDays: obj.abono_days_count,
          abonoAmount: obj.abono_amount,
          abonoBonus: obj.abono_bonus,
          thirteenthAdvance: obj.thirteenth_advance,
          grossTotal: obj.gross_vacation_pay + obj.constitutional_bonus + obj.abono_amount + obj.abono_bonus + obj.thirteenth_advance,
          estimatedInss: obj.estimated_inss,
          estimatedIrrf: obj.estimated_irrf,
          totalDeductions: obj.total_deductions,
          netTotal: obj.net_total,
          paymentDeadlineDate: obj.payment_deadline_date,
        },
        managerApproval: obj.manager_name
          ? {
              managerId: obj.manager_id,
              managerName: obj.manager_name,
              approvedAt: obj.manager_approved_at,
              feedback: obj.manager_feedback,
            }
          : undefined,
        hrApproval: obj.hr_name
          ? {
              hrId: obj.hr_id,
              hrName: obj.hr_name,
              approvedAt: obj.hr_approved_at,
              feedback: obj.hr_feedback,
            }
          : undefined,
        rejectionReason: obj.rejection_reason,
        rejectedBy: obj.rejected_by_name
          ? {
              userId: obj.rejected_by_id,
              userName: obj.rejected_by_name,
              role: 'manager',
              rejectedAt: obj.rejected_at,
            }
          : undefined,
      });
    });
  }

  return {
    employees: employees.length > 0 ? employees : INITIAL_EMPLOYEES,
    requests: requests.length > 0 ? requests : INITIAL_REQUESTS,
  };
}
