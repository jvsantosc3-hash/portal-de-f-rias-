import React, { useState } from 'react';
import { VacationRequest, RequestStatus } from '../types/vacation';
import { useVacation } from '../context/VacationContext';
import { formatDateBR, formatCurrencyBRL } from '../utils/cltRules';
import {
  Search,
  Printer,
  Ban,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';

interface RequestsTableProps {
  title?: string;
  filterByCurrentUser?: boolean;
}

export const RequestsTable: React.FC<RequestsTableProps> = ({
  title = 'Histórico e Solicitações de Férias',
  filterByCurrentUser = false,
}) => {
  const { currentUser, requests, cancelRequest, approveByManager, rejectByManager, approveByHR, rejectByHR } = useVacation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<VacationRequest | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [viewingDetailsRequest, setViewingDetailsRequest] = useState<VacationRequest | null>(null);

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (filterByCurrentUser && req.employeeId !== currentUser.id) {
      return false;
    }

    if (statusFilter !== 'all' && req.status !== statusFilter) {
      return false;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesName = req.employeeName.toLowerCase().includes(term);
      const matchesDept = req.department.toLowerCase().includes(term);
      const matchesJob = req.jobTitle.toLowerCase().includes(term);
      if (!matchesName && !matchesDept && !matchesJob) return false;
    }

    return true;
  });

  const getStatusText = (status: RequestStatus) => {
    switch (status) {
      case 'pending_manager':
        return (
          <span className="text-amber-700 font-medium inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pendente Gestor
          </span>
        );
      case 'pending_hr':
        return (
          <span className="text-blue-700 font-medium inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Pendente RH
          </span>
        );
      case 'approved':
        return (
          <span className="text-emerald-700 font-medium inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aprovada
          </span>
        );
      case 'rejected':
        return (
          <span className="text-rose-700 font-medium inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Recusada
          </span>
        );
      case 'cancelled':
        return (
          <span className="text-slate-500 font-medium inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Cancelada
          </span>
        );
    }
  };

  const handleConfirmReject = (requestId: string) => {
    if (!rejectionReason.trim()) {
      alert('Por favor, informe a justificativa da recusa.');
      return;
    }
    if (currentUser.role === 'manager') {
      rejectByManager(requestId, rejectionReason);
    } else {
      rejectByHR(requestId, rejectionReason);
    }
    setRejectingId(null);
    setRejectionReason('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">
            {filteredRequests.length} {filteredRequests.length === 1 ? 'registro encontrado' : 'registros encontrados'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Filter Control (Allowed per constitution) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('pending_manager')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'pending_manager'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pend. Gestor
            </button>
            <button
              onClick={() => setStatusFilter('pending_hr')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'pending_hr'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pend. RH
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aprovadas
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador, cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Colaborador & Função</th>
              <th className="py-3 px-4">Período de Gozo</th>
              <th className="py-3 px-4 text-center">Dias</th>
              <th className="py-3 px-4">Abono & 13º</th>
              <th className="py-3 px-4 text-right">Líquido Est.</th>
              <th className="py-3 px-4">Status CLT</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-medium text-slate-700">Nenhuma solicitação encontrada</p>
                    <p className="text-[11px] text-slate-400">
                      Não há registros correspondentes aos filtros selecionados.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Colaborador */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={req.employeeAvatar}
                        alt={req.employeeName}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{req.employeeName}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {req.jobTitle} · {req.department}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Período */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono-numbers font-medium text-slate-800">
                      {formatDateBR(req.startDate)} a {formatDateBR(req.endDate)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Retorno: {formatDateBR(req.returnDate)}
                    </div>
                  </td>

                  {/* Dias */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="font-mono-numbers font-semibold text-slate-900">
                      {req.daysCount}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1">dias</span>
                  </td>

                  {/* Abono & 13º */}
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap text-[11px]">
                    <div>
                      {req.hasAbonoPecuniario ? (
                        <span className="text-emerald-700 font-medium font-mono-numbers">
                          Abono {req.abonoDaysCount}d
                        </span>
                      ) : (
                        <span className="text-slate-400">Sem abono</span>
                      )}
                    </div>
                    <div>
                      {req.requestThirteenthAdvance ? (
                        <span className="text-amber-700 font-medium">1ª Parc. 13º</span>
                      ) : (
                        <span className="text-slate-400">Sem 13º</span>
                      )}
                    </div>
                  </td>

                  {/* Líquido */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono-numbers font-semibold text-slate-800">
                    {formatCurrencyBRL(req.financials.netTotal)}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                    {getStatusText(req.status)}
                    {req.rejectionReason && (
                      <div className="text-[10px] text-rose-600 truncate max-w-[140px]" title={req.rejectionReason}>
                        Motivo: {req.rejectionReason}
                      </div>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingDetailsRequest(req)}
                        title="Ver detalhes da solicitação"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Botão de Documento Oficial / Recibo */}
                      {req.status === 'approved' && (
                        <button
                          onClick={() => setSelectedReceipt(req)}
                          title="Gerar / Imprimir Recibo CLT"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}

                      {/* Cancelar pelo próprio colaborador caso pendente */}
                      {req.employeeId === currentUser.id &&
                        (req.status === 'pending_manager' || req.status === 'pending_hr') && (
                          <button
                            onClick={() => {
                              if (window.confirm('Deseja realmente cancelar esta solicitação de férias?')) {
                                cancelRequest(req.id);
                              }
                            }}
                            title="Cancelar solicitação"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                      {/* Aprovação pelo Gestor */}
                      {currentUser.role === 'manager' && req.status === 'pending_manager' && (
                        <>
                          <button
                            onClick={() => approveByManager(req.id, 'Aprovado pelo gestor.')}
                            title="Aprovar solicitação"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRejectingId(req.id)}
                            title="Recusar solicitação"
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Aprovação pelo RH */}
                      {currentUser.role === 'hr' && req.status === 'pending_hr' && (
                        <>
                          <button
                            onClick={() => approveByHR(req.id, 'Homologado pelo RH.')}
                            title="Homologar férias"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRejectingId(req.id)}
                            title="Recusar homologação"
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Justificativa de Recusa */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Justificativa de Recusa de Férias
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              A CLT exige transparência e alinhamento operacional para o indeferimento de período solicitado.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Conflito com lançamento de versão de software ou ausência de cobertura operacional."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setRejectingId(null);
                  setRejectionReason('');
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmReject(rejectingId)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Solicitação */}
      {viewingDetailsRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Detalhes da Solicitação</h4>
                <p className="text-xs text-slate-500 font-mono-numbers">ID: {viewingDetailsRequest.id}</p>
              </div>
              <button
                onClick={() => setViewingDetailsRequest(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <img
                  src={viewingDetailsRequest.employeeAvatar}
                  alt={viewingDetailsRequest.employeeName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-slate-900">{viewingDetailsRequest.employeeName}</div>
                  <div className="text-slate-500">{viewingDetailsRequest.jobTitle} · {viewingDetailsRequest.department}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Início:</span>
                  <span className="font-semibold font-mono-numbers">{formatDateBR(viewingDetailsRequest.startDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Término:</span>
                  <span className="font-semibold font-mono-numbers">{formatDateBR(viewingDetailsRequest.endDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Retorno às Atividades:</span>
                  <span className="font-semibold font-mono-numbers text-blue-600">{formatDateBR(viewingDetailsRequest.returnDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Dias de Gozo:</span>
                  <span className="font-semibold font-mono-numbers">{viewingDetailsRequest.daysCount} dias</span>
                </div>
              </div>

              {viewingDetailsRequest.notes && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Observação do Colaborador:</span>
                  <p className="text-slate-700 italic mt-0.5">{viewingDetailsRequest.notes}</p>
                </div>
              )}

              {/* Histórico de aprovação */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="font-semibold text-slate-800">Trilha de Auditoria & Aprovação:</div>
                <div className="text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>1. Solicitação Criada:</span>
                    <span className="font-mono-numbers">{formatDateBR(viewingDetailsRequest.createdAt.split('T')[0])}</span>
                  </div>
                  {viewingDetailsRequest.managerApproval && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>2. Aprovado pelo Gestor ({viewingDetailsRequest.managerApproval.managerName}):</span>
                      <span className="font-mono-numbers">{formatDateBR(viewingDetailsRequest.managerApproval.approvedAt.split('T')[0])}</span>
                    </div>
                  )}
                  {viewingDetailsRequest.hrApproval && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>3. Homologado pelo RH ({viewingDetailsRequest.hrApproval.hrName}):</span>
                      <span className="font-mono-numbers">{formatDateBR(viewingDetailsRequest.hrApproval.approvedAt.split('T')[0])}</span>
                    </div>
                  )}
                  {viewingDetailsRequest.rejectedBy && (
                    <div className="text-rose-700">
                      <span>Recusado por {viewingDetailsRequest.rejectedBy.userName} em {formatDateBR(viewingDetailsRequest.rejectedBy.rejectedAt.split('T')[0])}:</span>
                      <p className="italic text-[10px] mt-0.5">{viewingDetailsRequest.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setViewingDetailsRequest(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recibo Oficial CLT */}
      {selectedReceipt && (
        <ReceiptModal
          request={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
