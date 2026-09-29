import React, { useState } from 'react';
import { useVacation } from '../context/VacationContext';
import { SUPABASE_SQL_SCHEMA, SUPABASE_STORAGE_SQL } from '../data/supabaseSchema';
import { runQueryOnSqlite, exportSqliteBinary, SqlExecutionOutput } from '../lib/sqliteDatabase';
import { getSupabaseConnectionStatus } from '../lib/supabase';
import {
  Database,
  Shield,
  Play,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode,
  Layers,
  Sparkles,
  Info,
  Server,
  KeyRound,
  FileSpreadsheet,
  Table,
  CheckCircle2,
  HardDriveDownload,
  FolderArchive,
  FileCheck,
} from 'lucide-react';

export const SupabaseSqlConsole: React.FC = () => {
  const { allEmployees, requests, syncFromSqlDatabase } = useVacation();

  const [activeTab, setActiveTab] = useState<'console' | 'storage_policies' | 'policies' | 'schema_tables' | 'migration'>('storage_policies');
  const [sqlQuery, setSqlQuery] = useState<string>(
    "SELECT * FROM storage_objects;"
  );
  const [queryResult, setQueryResult] = useState<SqlExecutionOutput | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedStorage, setCopiedStorage] = useState(false);
  const [mutationAlert, setMutationAlert] = useState<string | null>(null);

  // Executar query inicial no SQLite real
  React.useEffect(() => {
    handleRunQuery("SELECT * FROM storage_objects;");
  }, []);

  const handleRunQuery = async (queryToRun?: string) => {
    const q = queryToRun || sqlQuery;
    setIsExecuting(true);
    try {
      const res = await runQueryOnSqlite(q);
      setQueryResult(res);

      const upper = q.trim().toUpperCase();
      if (
        upper.startsWith('INSERT') ||
        upper.startsWith('UPDATE') ||
        upper.startsWith('DELETE') ||
        upper.startsWith('DROP') ||
        upper.startsWith('ALTER')
      ) {
        await syncFromSqlDatabase();
        setMutationAlert(
          'Comando SQL executado com sucesso no Banco! As alterações foram persistidas no armazenamento.'
        );
        setTimeout(() => setMutationAlert(null), 4500);
      }
    } catch (err: any) {
      setQueryResult({
        columns: ['error'],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: err?.message || 'Erro ao processar SQL no banco de dados.',
        commandType: 'ERROR',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadSqliteFile = async () => {
    const blob = await exportSqliteBinary();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ferias_banco_dados_${Date.now()}.db`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const handleCopyStorage = () => {
    navigator.clipboard.writeText(SUPABASE_STORAGE_SQL);
    setCopiedStorage(true);
    setTimeout(() => setCopiedStorage(false), 2500);
  };

  const handleDownloadStorage = () => {
    const blob = new Blob([SUPABASE_STORAGE_SQL], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'politicas_armazenamento_storage.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSchema = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supabase_ferias_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCsvResult = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        queryResult.columns.join(','),
        ...queryResult.rows.map((row) =>
          row.map((cell) => (typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')
        ),
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `sql_query_result_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const quickQueries = [
    {
      label: 'Objetos no Armazenamento',
      sql: 'SELECT * FROM storage_objects;',
    },
    {
      label: 'Buckets de Armazenamento',
      sql: 'SELECT * FROM storage_buckets;',
    },
    {
      label: 'JOIN: Documentos e Buckets',
      sql: `SELECT 
  o.id AS cod_arquivo,
  b.name AS bucket,
  o.name AS caminho_arquivo,
  o.owner_id AS proprietario,
  o.created_at AS enviado_em
FROM storage_objects o
INNER JOIN storage_buckets b ON o.bucket_id = b.id;`,
    },
    {
      label: 'Férias Pendentes de Gestor',
      sql: "SELECT * FROM vacation_requests WHERE status = 'pending_manager';",
    },
    {
      label: 'Férias Aprovadas',
      sql: "SELECT * FROM vacation_requests WHERE status = 'approved';",
    },
    {
      label: 'JOIN: Férias e Colaborador',
      sql: `SELECT 
  v.id AS cod_solicitacao,
  e.name AS colaborador,
  e.department AS departamento,
  v.start_date AS inicio,
  v.end_date AS termino,
  v.days_count AS dias_gozo,
  v.net_total AS valor_liquido_brl,
  v.status AS situacao_clt
FROM vacation_requests v
INNER JOIN employees e ON v.employee_id = e.id;`,
    },
    {
      label: 'Total e Valor por Status',
      sql: `SELECT 
  status AS status_clt,
  COUNT(*) AS total_pedidos,
  ROUND(SUM(net_total), 2) AS total_liquido_folha
FROM vacation_requests
GROUP BY status;`,
    },
    {
      label: 'Média Salarial por Setor',
      sql: `SELECT 
  department AS departamento,
  COUNT(*) AS colaboradores,
  ROUND(AVG(base_salary), 2) AS salario_medio,
  ROUND(SUM(base_salary), 2) AS folha_mensal
FROM employees
GROUP BY department;`,
    },
    {
      label: 'Aprovar Férias via SQL (UPDATE)',
      sql: "UPDATE vacation_requests SET status = 'approved' WHERE id = 'req-102';",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>SQL com Políticas de Armazenamento Ativadas (RLS)</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Storage RLS & PostgreSQL
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Buckets de armazenamento para Recibos Oficiais CLT, Comprovantes e Políticas de Row Level Security em SQL
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-lg text-xs font-medium self-start md:self-auto gap-0.5">
          <button
            onClick={() => setActiveTab('storage_policies')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'storage_policies'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
            <span>Políticas de Armazenamento</span>
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'console'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Console SQL ao Vivo
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'policies'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            RLS das Tabelas
          </button>
          <button
            onClick={() => setActiveTab('schema_tables')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'schema_tables'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Esquema das Tabelas
          </button>
          <button
            onClick={() => setActiveTab('migration')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'migration'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exportar SQL Completo
          </button>
        </div>
      </div>

      {mutationAlert && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{mutationAlert}</span>
          </div>
          <button
            onClick={() => syncFromSqlDatabase()}
            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded cursor-pointer"
          >
            Atualizar Visualização
          </button>
        </div>
      )}

      {/* TAB: POLÍTICAS DE ARMAZENAMENTO (STORAGE RLS) */}
      {activeTab === 'storage_policies' && (
        <div className="space-y-6">
          {/* Header & Quick Action Buttons */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Políticas de Armazenamento Ativadas (`storage.objects` & `storage.buckets`)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Regras de segurança RLS para upload, download, retenção e bloqueio de exclusão de documentos de férias
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyStorage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                {copiedStorage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStorage ? 'Copiado!' : 'Copiar SQL Armazenamento'}</span>
              </button>

              <button
                onClick={handleDownloadStorage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar storage_policies.sql</span>
              </button>
            </div>
          </div>

          {/* Buckets de Armazenamento Criados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Bucket: recibos-ferias
                </span>
                <span className="text-[10px] text-slate-500 font-mono-numbers">Privado · 10 MB</span>
              </div>
              <p className="text-xs text-slate-600">
                Armazena PDFs gerados dos <strong>Recibos Oficiais e Avisos de Concessão de Férias</strong> (CLT Art. 135 e Art. 145).
              </p>
              <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                <div>· <strong>Acesso:</strong> Colaborador baixa apenas os seus recibos.</div>
                <div>· <strong>Gravação:</strong> Apenas RH tem permissão de emissão.</div>
                <div>· <strong>Retenção legal:</strong> 5 anos (CLT Art. 11). Bloqueio de DELETE para colaboradores.</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FolderArchive className="w-4 h-4 text-blue-600" />
                  Bucket: comprovantes-ferias
                </span>
                <span className="text-[10px] text-slate-500 font-mono-numbers">Privado · 10 MB</span>
              </div>
              <p className="text-xs text-slate-600">
                Armazena anexos enviados pelos colaboradores (acordos de abono pecuniário, atestados médicos, passagens).
              </p>
              <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                <div>· <strong>Upload:</strong> Colaborador envia na sua pasta <code className="bg-slate-100 px-1 rounded">auth.uid()</code>.</div>
                <div>· <strong>Visualização:</strong> Colaborador, Gestor do Setor e RH.</div>
                <div>· <strong>Formatos:</strong> PDF, JPG e PNG.</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Bucket: avatars
                </span>
                <span className="text-[10px] text-slate-500 font-mono-numbers">Público · 5 MB</span>
              </div>
              <p className="text-xs text-slate-600">
                Armazena fotos de perfil dos colaboradores exibidas nos calendários de escala e aprovações.
              </p>
              <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                <div>· <strong>Leitura:</strong> Pública para todos os autenticados.</div>
                <div>· <strong>Upload:</strong> Cada colaborador atualiza sua própria foto.</div>
                <div>· <strong>Formatos:</strong> JPG, PNG e WebP.</div>
              </div>
            </div>
          </div>

          {/* Código SQL das Políticas de Armazenamento */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Código SQL: Criação de Buckets e Políticas RLS de Armazenamento
              </span>
              <button
                onClick={() => {
                  setActiveTab('console');
                  setSqlQuery('SELECT * FROM storage_objects;');
                  handleRunQuery('SELECT * FROM storage_objects;');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Testar no Console SQL →
              </button>
            </div>

            <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono-numbers text-xs max-h-[480px] overflow-y-auto leading-relaxed border border-slate-800">
              <pre>{SUPABASE_STORAGE_SQL}</pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CONSOLE SQL AO VIVO */}
      {activeTab === 'console' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Execução SQL no Banco de Dados
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                  Online
                </span>
              </div>

              {/* Botões de Ação do Banco */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSqliteFile}
                  title="Baixar arquivo de banco de dados SQLite (.db)"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <HardDriveDownload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Baixar Banco (.db)</span>
                </button>

                {queryResult && queryResult.rows.length > 0 && (
                  <button
                    onClick={handleExportCsvResult}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Exportar CSV</span>
                  </button>
                )}
              </div>
            </div>

            {/* Presets Rápidos de SQL */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Consultas e Operações Rápidas no Banco:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickQueries.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSqlQuery(q.sql);
                      handleRunQuery(q.sql);
                    }}
                    className="text-[11px] font-medium px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input SQL */}
            <div className="relative">
              <textarea
                rows={5}
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRunQuery();
                  }
                }}
                className="w-full bg-slate-950 text-emerald-400 font-mono-numbers text-xs p-3.5 rounded-xl outline-none border border-slate-800 focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                placeholder="Escreva sua consulta SQL aqui (ex: SELECT * FROM storage_objects;)"
              />
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-400">
                  Dica: Pressione <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono">Ctrl + Enter</kbd> para rodar diretamente no banco.
                </span>
                <button
                  disabled={isExecuting}
                  onClick={() => handleRunQuery()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isExecuting ? 'Executando...' : 'Executar no Banco de Dados'}</span>
                </button>
              </div>
            </div>

            {/* Grid de Resultados */}
            {queryResult && (
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono-numbers">
                  <span className="font-semibold text-slate-800">
                    {queryResult.rowCount} {queryResult.rowCount === 1 ? 'registro retornado' : 'registros retornados'}
                  </span>
                  <span>Tempo de execução: {queryResult.executionTimeMs} ms</span>
                </div>

                {queryResult.error ? (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono-numbers">
                    {queryResult.error}
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs font-mono-numbers">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-700">
                          {queryResult.columns.map((col, idx) => (
                            <th key={idx} className="p-2.5 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {queryResult.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2.5 whitespace-nowrap text-slate-800">
                                {typeof cell === 'boolean'
                                  ? cell
                                    ? 'true'
                                    : 'false'
                                  : cell !== null && cell !== undefined
                                  ? String(cell)
                                  : 'NULL'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ESQUEMA DAS TABELAS */}
      {activeTab === 'schema_tables' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-blue-600" />
                  employees
                </span>
                <span className="text-[10px] text-slate-500 font-mono-numbers">{allEmployees.length} registros</span>
              </div>
              <ul className="text-xs space-y-1.5 font-mono-numbers text-slate-600">
                <li><strong className="text-blue-700">id</strong> TEXT PRIMARY KEY</li>
                <li><strong className="text-slate-800">name</strong> TEXT NOT NULL</li>
                <li><strong className="text-slate-800">email</strong> TEXT UNIQUE NOT NULL</li>
                <li><strong className="text-slate-800">role</strong> TEXT CHECK (employee, manager, hr)</li>
                <li><strong className="text-slate-800">job_title</strong> TEXT NOT NULL</li>
                <li><strong className="text-slate-800">department</strong> TEXT NOT NULL</li>
                <li><strong className="text-slate-800">admission_date</strong> TEXT NOT NULL</li>
                <li><strong className="text-slate-800">base_salary</strong> REAL NOT NULL</li>
              </ul>
              <button
                onClick={() => {
                  setActiveTab('console');
                  setSqlQuery('SELECT * FROM employees;');
                  handleRunQuery('SELECT * FROM employees;');
                }}
                className="w-full mt-2 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded font-semibold transition-colors cursor-pointer"
              >
                Consultar via SQL
              </button>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-emerald-600" />
                  acquisition_periods
                </span>
                <span className="text-[10px] text-slate-500 font-mono-numbers">CLT Art. 130</span>
              </div>
              <ul className="text-xs space-y-1.5 font-mono-numbers text-slate-600">
                <li><strong className="text-emerald-700">id</strong> TEXT PRIMARY KEY</li>
                <li><strong className="text-slate-800">employee_id</strong> TEXT (FK employees)</li>
                <li><strong className="text-slate-800">start_date</strong> TEXT NOT NULL</li>
                <li><strong className="text-slate-800">end_date</strong> TEXT NOT NULL</li>
                <li><strong className="text-rose-700">concessive_limit</strong> TEXT NOT NULL</li>
                <li><strong className="text-slate-800">total_entitlement_days</strong> INTEGER</li>
                <li><strong className="text-slate-800">days_taken</strong> INTEGER</li>
                <li><strong className="text-slate-800">remaining_days</strong> INTEGER</li>
              </ul>
              <button
                onClick={() => {
                  setActiveTab('console');
                  setSqlQuery('SELECT * FROM acquisition_periods;');
                  handleRunQuery('SELECT * FROM acquisition_periods;');
                }}
                className="w-full mt-2 py-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded font-semibold transition-colors cursor-pointer"
              >
                Consultar via SQL
              </button>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-purple-600" />
                  vacation_requests
                </span>
                <span className="text-[10px] text-slate-500 font-mono-numbers">{requests.length} registros</span>
              </div>
              <ul className="text-xs space-y-1.5 font-mono-numbers text-slate-600">
                <li><strong className="text-purple-700">id</strong> TEXT PRIMARY KEY</li>
                <li><strong className="text-slate-800">employee_id</strong> TEXT (FK employees)</li>
                <li><strong className="text-slate-800">start_date</strong> TEXT NOT NULL</li>
                <li><strong className="text-slate-800">end_date</strong> TEXT NOT NULL</li>
                <li><strong className="text-slate-800">days_count</strong> INTEGER</li>
                <li><strong className="text-slate-800">has_abono_pecuniario</strong> INTEGER</li>
                <li><strong className="text-slate-800">net_total</strong> REAL</li>
                <li><strong className="text-slate-800">status</strong> TEXT</li>
              </ul>
              <button
                onClick={() => {
                  setActiveTab('console');
                  setSqlQuery('SELECT * FROM vacation_requests;');
                  handleRunQuery('SELECT * FROM vacation_requests;');
                }}
                className="w-full mt-2 py-1.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded font-semibold transition-colors cursor-pointer"
              >
                Consultar via SQL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: RLS DAS TABELAS */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block">Políticas de Segurança em Nível de Linha (RLS - Row Level Security)</span>
              <p className="leading-relaxed">
                As políticas RLS protegem os registros diretamente no motor do banco de dados relacional. Cada usuário acessa estritamente os dados autorizados de acordo com seu cargo na empresa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  Política 1: Isolamento do Colaborador (CLT)
                </span>
                <span className="text-[10px] text-slate-500 font-mono-numbers">SELECT & INSERT</span>
              </div>
              <p className="text-xs text-slate-600">
                Colaboradores comuns só podem visualizar e criar solicitações para si mesmos.
              </p>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono-numbers text-[11px] overflow-x-auto">
                <pre>{`CREATE POLICY "Colaborador vê apenas suas férias"
ON vacation_requests FOR SELECT
USING (employee_id = auth.uid());`}</pre>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Política 2: Visão Departamental do Gestor
                </span>
                <span className="text-[10px] text-slate-500 font-mono-numbers">SELECT & UPDATE</span>
              </div>
              <p className="text-xs text-slate-600">
                Líderes de equipe só podem aprovar ou recusar pedidos dos membros do seu respectivo departamento.
              </p>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono-numbers text-[11px] overflow-x-auto">
                <pre>{`CREATE POLICY "Gestor vê departamento"
ON vacation_requests FOR SELECT
USING (department = current_user_dept() AND role = 'manager');`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MIGRATION SCRIPT */}
      {activeTab === 'migration' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Script DDL, RLS & Armazenamento Completo (schema.sql)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Copie e cole diretamente no <strong>SQL Editor</strong> do seu banco PostgreSQL/Supabase
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySchema}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSchema ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>

              <button
                onClick={handleDownloadSchema}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar .sql</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono-numbers text-xs max-h-[500px] overflow-y-auto leading-relaxed border border-slate-800">
            <pre>{SUPABASE_SQL_SCHEMA}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
