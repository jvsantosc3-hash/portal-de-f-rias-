import React, { useState } from 'react';
import { useVacation } from '../context/VacationContext';
import { formatDateBR, formatCurrencyBRL } from '../utils/cltRules';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Calendar,
  MessageSquare,
  Users,
  Eye,
} from 'lucide-react';
import { RequestsTable } from './RequestsTable';
import { ReceiptModal } from './ReceiptModal';
import { VacationRequest } from '../types/vacation';

export const ManagerApprovalsView: React.FC = () => {
  const {
    currentUser,
    switchUser,
    requests,
    approveByManager,
    rejectByManager,
    approveByHR,
    rejectByHR,
    checkDepartmentConflicts,
  } = useVacation();

  const [selectedReceipt, setSelectedReceipt] = useState<VacationRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<VacationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [feedbackNote, setFeedbackNote] = useState<{ [id: string]: string }>({});

  const pendingRequests = requests.filter((r) => {
    if (currentUser.role === 'manager') {
      return r.status === 'pending_manager';
    }
    if (currentUser.role === 'hr') {
      return r.status === 'pending_hr';
    }
    return r.status === 'pending_manager' || r.status === 'pending_hr';
  });

  const handleApprove = (req: VacationRequest) => {
    const note = feedbackNote[req.id] || (currentUser.role === 'manager' ? 'Aprovado pelo gestor.' : 'Homologado pelo RH.');
    if (currentUser.role === 'manager') {
      approveByManager(req.id, note);
    } else {
      approveByHR(req.id, note);
    }
  };

  const handleConfirmReject = () => {
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) {
      alert('Informe a justificativa para a recusa.');
      return;
    }
    if (currentUser.role === 'manager') {
      rejectByManager(rejectingRequest.id, rejectReason);
    } else {
      rejectByHR(rejectingRequest.id, rejectReason);
    }
    setRejectingRequest(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* Switch role alert if viewing as normal employee */}
      {currentUser.role === 'employee' && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-semibold block">Você está navegando como Colaborador</span>
              <span>
                Para aprovar ou recusar pedidos como líder de equipe, alterne para o perfil de{' '}
                <strong>Rodrigo Albuquerque (Gerente)</strong>.
              </span>
            </div>
          </div>
          <button
            onClick={() => switchUser('emp-2')}
            className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shrink-0 cursor-pointer"
          >
            Mudar para Gerente
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Fila de Análise e Aprovação de Férias
          </h2>
          <p className="text-xs text-slate-500">
            {currentUser.role === 'manager'
              ? 'Etapa 1: Validação de escala e cobertura operacional da equipe'
              : currentUser.role === 'hr'
              ? 'Etapa 2: Homologação legal, cálculo de folha e emissão de recibo CLT'
              : 'Fluxo de aprovação em duas etapas'}
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono-numbers">
          <strong>{pendingRequests.length}</strong> pendência(s)
        </div>
      </div>

      {/* Pending Approval Cards */}
      {pendingRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="font-semibold text-sm text-slate-800">Tudo em dia!</p>
          <p className="text-xs text-slate-400 mt-1">
            Não há solicitações pendentes de sua avaliação no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingRequests.map((req) => {
            const conflicts = checkDepartmentConflicts(req.department, req.startDate, req.endDate, req.id);

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 transition-shadow hover:shadow-md space-y-4"
              >
                {/* Top Row: User & Timing */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.employeeAvatar}
                      alt={req.employeeName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{req.employeeName}</div>
                      <div className="text-xs text-slate-500">
                        {req.jobTitle} · <span className="font-medium text-slate-700">{req.department}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500">Solicitado em: </span>
                    <span className="text-xs font-mono-numbers font-medium text-slate-800">
                      {formatDateBR(req.createdAt.split('T')[0])}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Período de Gozo</span>
                    <span className="font-semibold text-slate-800 font-mono-numbers text-xs">
                      {formatDateBR(req.startDate)} a {formatDateBR(req.endDate)}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono-numbers mt-0.5">
                      Retorno: {formatDateBR(req.returnDate)}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Duração Solicitada</span>
                    <span className="font-bold text-blue-700 font-mono-numbers text-base">
                      {req.daysCount} dias
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {req.hasAbonoPecuniario ? `+ ${req.abonoDaysCount}d de abono` : 'Sem abono'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Opções Financeiras</span>
                    <div className="space-y-0.5 text-[11px] font-medium text-slate-700 mt-1">
                      <div>Abono: {req.hasAbonoPecuniario ? `SIM (${req.abonoDaysCount} dias)` : 'NÃO'}</div>
                      <div>Adiant. 13º: {req.requestThirteenthAdvance ? 'SIM (50%)' : 'NÃO'}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Valor Estimado Líquido</span>
                    <span className="font-bold text-emerald-700 font-mono-numbers text-base">
                      {formatCurrencyBRL(req.financials.netTotal)}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono-numbers mt-0.5">
                      Pagar até: {formatDateBR(req.financials.paymentDeadlineDate)}
                    </div>
                  </div>
                </div>

                {/* Observação do colaborador */}
                {req.notes && (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-200">
                    <span className="font-semibold text-slate-900 block text-[11px] mb-0.5">Observação do Solicitante:</span>
                    <p className="italic">"{req.notes}"</p>
                  </div>
                )}

                {/* Alerta de Conflito de Cobertura */}
                {conflicts.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold">Conflito de Escala no Departamento:</span>
                      <p className="text-[11px]">
                        Existe sobreposição de período com {conflicts.map((c) => `${c.employeeName} (${formatDateBR(c.startDate)} a ${formatDateBR(c.endDate)})`).join(', ')}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Feedback Input & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Parecer ou recomendação (opcional para aprovação)..."
                      value={feedbackNote[req.id] || ''}
                      onChange={(e) =>
                        setFeedbackNote({ ...feedbackNote, [req.id]: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setRejectingRequest(req)}
                      className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Recusar</span>
                    </button>

                    <button
                      onClick={() => handleApprove(req)}
                      className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {currentUser.role === 'manager' ? 'Aprovar Solicitação' : 'Homologar no RH'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recusa Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">
              Recusar Solicitação de {rejectingRequest.employeeName}
            </h4>
            <p className="text-xs text-slate-500">
              Informe a justificativa formal para a recusa. Esta informação ficará registrada no histórico do colaborador.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Conflito com período crítico de entregas ou falta de cobertura operacional na equipe."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectReason('');
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico Geral */}
      <div className="pt-6">
        <RequestsTable
          title="Histórico de Análises Anteriores"
          filterByCurrentUser={false}
        />
      </div>
    </div>
  );
};
