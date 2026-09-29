import { Employee, VacationRequest } from '../types/vacation';

export interface SqlQueryResult {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  commandType: string;
  mutated?: boolean;
}

export function executeClientSql(
  query: string,
  employees: Employee[],
  requests: VacationRequest[],
  mutators?: {
    setRequests?: React.Dispatch<React.SetStateAction<VacationRequest[]>>;
    setEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
  }
): SqlQueryResult {
  const startTime = performance.now();
  const trimmed = query.trim().replace(/;+$/, '');

  try {
    const upper = trimmed.toUpperCase();

    // 1. SHOW TABLES / \dt
    if (
      upper === 'SHOW TABLES' ||
      upper === '\\DT' ||
      upper.startsWith('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES')
    ) {
      const rows = [
        ['public', 'employees', 'BASE TABLE', 'Tabela de colaboradores da empresa', employees.length],
        ['public', 'acquisition_periods', 'BASE TABLE', 'Períodos aquisitivos de férias (CLT Art. 130)', employees.reduce((acc, e) => acc + e.acquisitionPeriods.length, 0)],
        ['public', 'vacation_requests', 'BASE TABLE', 'Solicitações e concessões de férias (CLT Art. 134)', requests.length],
        ['public', 'pg_policies', 'SYSTEM VIEW', 'Políticas de Row Level Security (RLS)', 7],
      ];
      return {
        columns: ['schemaname', 'tablename', 'table_type', 'description', 'row_count'],
        rows,
        rowCount: rows.length,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        commandType: 'SHOW',
      };
    }

    // 2. SHOW POLICIES / RLS
    if (upper.includes('ROW LEVEL SECURITY') || upper.includes('PG_POLICIES') || upper.includes('SHOW POLICIES')) {
      const rows = [
        ['public', 'employees', 'Permitir leitura de colaboradores', 'SELECT', 'authenticated', 'true'],
        ['public', 'employees', 'RH gerencia colaboradores', 'ALL', 'authenticated', 'role = \'hr\''],
        ['public', 'acquisition_periods', 'Colaborador vê próprios períodos', 'SELECT', 'authenticated', 'employee_id = auth.uid() OR role IN (\'manager\', \'hr\')'],
        ['public', 'vacation_requests', 'Controle Leitura Férias por Cargo', 'SELECT', 'authenticated', 'employee_id = auth.uid() OR (role = \'manager\' AND dept) OR role = \'hr\''],
        ['public', 'vacation_requests', 'Colaborador cria próprias férias', 'INSERT', 'authenticated', 'employee_id = auth.uid()'],
        ['public', 'vacation_requests', 'Gestor aprova time pendente', 'UPDATE', 'authenticated', 'role = \'manager\' AND status = \'pending_manager\''],
        ['public', 'vacation_requests', 'RH homologa pedidos finais', 'UPDATE', 'authenticated', 'role = \'hr\''],
      ];
      return {
        columns: ['schemaname', 'tablename', 'policyname', 'cmd', 'roles', 'qual'],
        rows,
        rowCount: rows.length,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        commandType: 'SELECT',
      };
    }

    // 3. UPDATE vacation_requests
    if (upper.startsWith('UPDATE') && upper.includes('VACATION_REQUESTS')) {
      let targetStatus: any = null;
      if (upper.includes("STATUS = 'APPROVED'") || upper.includes("STATUS='APPROVED'")) {
        targetStatus = 'approved';
      } else if (upper.includes("STATUS = 'REJECTED'") || upper.includes("STATUS='REJECTED'")) {
        targetStatus = 'rejected';
      } else if (upper.includes("STATUS = 'PENDING_HR'") || upper.includes("STATUS='PENDING_HR'")) {
        targetStatus = 'pending_hr';
      } else if (upper.includes("STATUS = 'CANCELLED'") || upper.includes("STATUS='CANCELLED'")) {
        targetStatus = 'cancelled';
      }

      // Check id condition
      const idMatch = trimmed.match(/id\s*=\s*['"]?([a-zA-Z0-9_-]+)['"]?/i);
      const targetId = idMatch ? idMatch[1] : null;

      let affectedCount = 0;
      if (targetStatus && mutators?.setRequests) {
        mutators.setRequests((prev) =>
          prev.map((r) => {
            if (targetId && r.id.toLowerCase() !== targetId.toLowerCase()) {
              return r;
            }
            affectedCount++;
            return {
              ...r,
              status: targetStatus,
            };
          })
        );
      }

      return {
        columns: ['command', 'rows_affected', 'new_status', 'target_id'],
        rows: [['UPDATE', affectedCount || 1, targetStatus || 'updated', targetId || 'ALL_MATCHED']],
        rowCount: 1,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        commandType: 'UPDATE',
        mutated: true,
      };
    }

    // 4. DELETE FROM vacation_requests
    if (upper.startsWith('DELETE') && upper.includes('VACATION_REQUESTS')) {
      const idMatch = trimmed.match(/id\s*=\s*['"]?([a-zA-Z0-9_-]+)['"]?/i);
      const targetId = idMatch ? idMatch[1] : null;

      let deletedCount = 0;
      if (targetId && mutators?.setRequests) {
        mutators.setRequests((prev) => {
          const next = prev.filter((r) => r.id.toLowerCase() !== targetId.toLowerCase());
          deletedCount = prev.length - next.length;
          return next;
        });
      }

      return {
        columns: ['command', 'rows_deleted', 'target_id'],
        rows: [['DELETE', deletedCount || 1, targetId || 'N/A']],
        rowCount: 1,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        commandType: 'DELETE',
        mutated: true,
      };
    }

    // 5. Aggregations (COUNT, SUM, AVG)
    if (upper.includes('COUNT(') || upper.includes('SUM(') || upper.includes('GROUP BY')) {
      if (upper.includes('VACATION_REQUESTS') && upper.includes('STATUS')) {
        const counts: { [status: string]: { count: number; sumNet: number } } = {};
        requests.forEach((r) => {
          if (!counts[r.status]) counts[r.status] = { count: 0, sumNet: 0 };
          counts[r.status].count++;
          counts[r.status].sumNet += r.financials.netTotal;
        });

        const rows = Object.entries(counts).map(([status, val]) => [
          status,
          val.count,
          Number(val.sumNet.toFixed(2)),
        ]);

        return {
          columns: ['status', 'total_solicitacoes', 'total_liquido_brl'],
          rows,
          rowCount: rows.length,
          executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
          commandType: 'SELECT',
        };
      }

      if (upper.includes('EMPLOYEES') && upper.includes('DEPARTMENT')) {
        const deptMap: { [dept: string]: { count: number; sumSal: number } } = {};
        employees.forEach((e) => {
          if (!deptMap[e.department]) deptMap[e.department] = { count: 0, sumSal: 0 };
          deptMap[e.department].count++;
          deptMap[e.department].sumSal += e.baseSalary;
        });

        const rows = Object.entries(deptMap).map(([dept, val]) => [
          dept,
          val.count,
          Number((val.sumSal / val.count).toFixed(2)),
          Number(val.sumSal.toFixed(2)),
        ]);

        return {
          columns: ['department', 'total_colaboradores', 'salario_medio_brl', 'folha_total_brl'],
          rows,
          rowCount: rows.length,
          executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
          commandType: 'SELECT',
        };
      }
    }

    // 6. JOIN employees and vacation_requests
    if (upper.startsWith('SELECT') && upper.includes('JOIN')) {
      const rows = requests.map((r) => {
        const emp = employees.find((e) => e.id === r.employeeId);
        return [
          r.id,
          r.employeeName,
          emp ? emp.email : 'N/A',
          r.department,
          emp ? emp.baseSalary : 0,
          r.startDate,
          r.endDate,
          r.daysCount,
          r.hasAbonoPecuniario ? 'SIM' : 'NÃO',
          r.financials.netTotal,
          r.status,
        ];
      });

      return {
        columns: [
          'req_id',
          'employee_name',
          'email',
          'department',
          'base_salary',
          'start_date',
          'end_date',
          'days_count',
          'abono',
          'net_total',
          'status',
        ],
        rows,
        rowCount: rows.length,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        commandType: 'SELECT',
      };
    }

    // 7. Simple SELECT on employees
    if (upper.startsWith('SELECT') && upper.includes('EMPLOYEES')) {
      const columns = ['id', 'name', 'email', 'role', 'job_title', 'department', 'base_salary', 'admission_date'];
      let data = employees.map((e) => [
        e.id,
        e.name,
        e.email,
        e.role,
        e.jobTitle,
        e.department,
        e.baseSalary,
        e.admissionDate,
      ]);

      if (upper.includes("ROLE = 'MANAGER'") || upper.includes('ROLE="MANAGER"')) {
        data = data.filter((row) => row[3] === 'manager');
      } else if (upper.includes("ROLE = 'HR'") || upper.includes('ROLE="HR"')) {
        data = data.filter((row) => row[3] === 'hr');
      } else if (upper.includes("ROLE = 'EMPLOYEE'") || upper.includes('ROLE="EMPLOYEE"')) {
        data = data.filter((row) => row[3] === 'employee');
      }

      return {
        columns,
        rows: data,
        rowCount: data.length,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        commandType: 'SELECT',
      };
    }

    // 8. Simple SELECT on vacation_requests
    if (upper.startsWith('SELECT') && (upper.includes('VACATION_REQUESTS') || upper.includes('REQUESTS'))) {
      const columns = [
        'id',
        'employee_name',
        'department',
        'start_date',
        'end_date',
        'days_count',
        'has_abono',
        'abono_days',
        'thirteenth_advance',
        'net_total',
        'status',
      ];

      let data = requests.map((r) => [
        r.id,
        r.employeeName,
        r.department,
        r.startDate,
        r.endDate,
        r.daysCount,
        r.hasAbonoPecuniario,
        r.abonoDaysCount,
        r.requestThirteenthAdvance,
        r.financials.netTotal,
        r.status,
      ]);

      if (upper.includes("STATUS = 'APPROVED'") || upper.includes("STATUS='APPROVED'")) {
        data = data.filter((r) => r[10] === 'approved');
      } else if (upper.includes("STATUS = 'PENDING_MANAGER'")) {
        data = data.filter((r) => r[10] === 'pending_manager');
      } else if (upper.includes("STATUS = 'PENDING_HR'")) {
        data = data.filter((r) => r[10] === 'pending_hr');
      } else if (upper.includes("HAS_ABONO = TRUE") || upper.includes("HAS_ABONO_PECUNIARIO = TRUE")) {
        data = data.filter((r) => r[6] === true);
      }

      return {
        columns,
        rows: data,
        rowCount: data.length,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        commandType: 'SELECT',
      };
    }

    // 9. SELECT on acquisition_periods
    if (upper.startsWith('SELECT') && upper.includes('ACQUISITION_PERIODS')) {
      const columns = [
        'id',
        'employee_name',
        'start_date',
        'end_date',
        'concessive_limit',
        'total_days',
        'days_taken',
        'days_scheduled',
        'remaining_days',
        'status',
      ];

      const rows: any[] = [];
      employees.forEach((emp) => {
        emp.acquisitionPeriods.forEach((p) => {
          rows.push([
            p.id,
            emp.name,
            p.startDate,
            p.endDate,
            p.concessiveLimit,
            p.totalEntitlementDays,
            p.daysTaken,
            p.daysScheduled,
            p.remainingDays,
            p.status,
          ]);
        });
      });

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        commandType: 'SELECT',
      };
    }

    // 10. DDL (CREATE, ALTER, DROP, TRUNCATE)
    if (
      upper.startsWith('CREATE') ||
      upper.startsWith('ALTER') ||
      upper.startsWith('DROP') ||
      upper.startsWith('GRANT') ||
      upper.startsWith('SET')
    ) {
      return {
        columns: ['status', 'message', 'command'],
        rows: [
          [
            'SUCCESS',
            'Comando DDL / Configuração executada com sucesso no motor PostgreSQL.',
            trimmed.slice(0, 90) + (trimmed.length > 90 ? '...' : ''),
          ],
        ],
        rowCount: 1,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        commandType: 'DDL',
      };
    }

    // Fallback
    return {
      columns: ['status', 'query_executed', 'info'],
      rows: [
        [
          'OK',
          trimmed,
          'Comando SQL aceito pelo interpretador. Execute uma das consultas pré-definidas ou experimente SELECT, UPDATE, SHOW TABLES.',
        ],
      ],
      rowCount: 1,
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
      commandType: 'QUERY',
    };
  } catch (err: any) {
    return {
      columns: ['error'],
      rows: [],
      rowCount: 0,
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
      error: err?.message || 'Erro de sintaxe SQL no analisador PostgreSQL.',
      commandType: 'ERROR',
    };
  }
}
