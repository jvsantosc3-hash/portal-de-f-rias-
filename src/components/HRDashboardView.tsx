import React, { useState } from 'react';
import { useVacation } from '../context/VacationContext';
import {
  formatDateBR,
  formatCurrencyBRL,
  calculateDaysBetween,
  formatDateIso,
} from '../utils/cltRules';
import {
  ShieldAlert,
  Users,
  DollarSign,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Briefcase,
} from 'lucide-react';
import { RequestsTable } from './RequestsTable';

export const HRDashboardView: React.FC = () => {
  const { allEmployees, requests } = useVacation();

  const today = new Date();
  const todayIso = formatDateIso(
    new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0))
  );

  // Colaboradores com risco de férias em dobro (concessivo vencendo em menos de 90 dias e saldo > 0)
  const expiringEmployees = allEmployees
    .map((emp) => {
      const activePeriod = emp.acquisitionPeriods.find((p) => p.status === 'active');
      if (!activePeriod || activePeriod.remainingDays <= 0) return null;
      const daysLeft = calculateDaysBetween(todayIso, activePeriod.concessiveLimit) - 1;
      return {
        emp,
        activePeriod,
        daysLeft,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Contagem de solicitações pendentes de homologação RH
  const pendingHr = requests.filter((r) => r.status === 'pending_hr');

  // Custo total líquido programado
  const totalPayrollImpact = requests
    .filter((r) => r.status === 'approved' || r.status === 'pending_hr')
    .reduce((acc, r) => acc + r.financials.netTotal, 0);

  // Exportar CSV para a Contabilidade / Folha
  const handleExportCSV = () => {
    const headers = [
      'ID Solicitação',
      'Colaborador',
      'Cargo',
      'Departamento',
      'Início Férias',
      'Fim Férias',
      'Dias Gozo',
      'Abono Pecuniário (Dias)',
      '1ª Parc. 13º',
      'Bruto (R$)',
      'INSS (R$)',
      'IRRF (R$)',
      'Líquido a Pagar (R$)',
      'Data Limite Pagamento',
      'Status CLT',
    ];

    const rows = requests.map((r) => [
      r.id,
      `"${r.employeeName}"`,
      `"${r.jobTitle}"`,
      `"${r.department}"`,
      formatDateBR(r.startDate),
      formatDateBR(r.endDate),
      r.daysCount,
      r.hasAbonoPecuniario ? r.abonoDaysCount : 0,
      r.requestThirteenthAdvance ? 'SIM' : 'NÃO',
      r.financials.grossTotal.toFixed(2),
      r.financials.estimatedInss.toFixed(2),
      r.financials.estimatedIrrf.toFixed(2),
      r.financials.netTotal.toFixed(2),
      formatDateBR(r.financials.paymentDeadlineDate),
      r.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `programacao_ferias_${todayIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header HR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Painel Corporativo de Gente & Gestão
          </h2>
          <p className="text-xs text-slate-500">
            Monitoramento de conformidade legal CLT, passivo de férias e integração de folha
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Exportar Relatório CSV (Folha)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Quadro Ativo</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-numbers text-slate-900">
              {allEmployees.length}
            </span>
            <span className="text-xs text-slate-500">colaboradores CLT</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            100% elegíveis a período aquisitivo
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Risco Férias em Dobro</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-numbers text-rose-700">
              {expiringEmployees.length}
            </span>
            <span className="text-xs text-slate-500">vencendo em &lt; 90 dias</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium">
            Art. 137 CLT (Passivo Trabalhista)
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Pendências do RH</span>
            <Briefcase className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-numbers text-amber-700">
              {pendingHr.length}
            </span>
            <span className="text-xs text-slate-500">aguardando homologação</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Aprovadas pelo gestor imediato
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Impacto Líquido Folha</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-emerald-700">
              {formatCurrencyBRL(totalPayrollImpact)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Férias homologadas e programadas
          </div>
        </div>
      </div>

      {/* Tabela de Passivo / Risco Trabalhista */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Controle Preventivo de Período Concessivo (CLT Art. 137)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Colaboradores que precisam usufruir férias antes da data limite para evitar a dobra salarial
            </p>
          </div>
        </div>

        {expiringEmployees.length === 0 ? (
          <div className="p-4 bg-emerald-50 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Excelente! Não há colaboradores com período concessivo em risco nos próximos 90 dias.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                  <th className="py-2.5 px-3">Colaborador</th>
                  <th className="py-2.5 px-3">Departamento</th>
                  <th className="py-2.5 px-3">Saldo Restante</th>
                  <th className="py-2.5 px-3">Limite Concessivo</th>
                  <th className="py-2.5 px-3">Dias Restantes</th>
                  <th className="py-2.5 px-3">Ação Recomendada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringEmployees.map(({ emp, activePeriod, daysLeft }) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {emp.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {emp.department}
                    </td>
                    <td className="py-2.5 px-3 font-mono-numbers font-bold text-slate-800">
                      {activePeriod.remainingDays} dias
                    </td>
                    <td className="py-2.5 px-3 font-mono-numbers text-slate-800">
                      {formatDateBR(activePeriod.concessiveLimit)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`font-mono-numbers font-semibold ${
                        daysLeft <= 30 ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {daysLeft} dias
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                        Notificar Gestor Imediato
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabela Geral de Solicitações para Homologação */}
      <RequestsTable
        title="Consolidado de Todas as Solicitações Corporativas"
        filterByCurrentUser={false}
      />
    </div>
  );
};
