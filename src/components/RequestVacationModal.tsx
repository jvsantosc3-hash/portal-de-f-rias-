import React, { useState, useMemo } from 'react';
import { useVacation } from '../context/VacationContext';
import {
  calculateDaysBetween,
  addDays,
  validateVacationRequest,
  calculateFinancials,
  formatCurrencyBRL,
  formatDateBR,
  isNearWeekend,
  isNearHoliday,
  calculatePaymentDeadline,
} from '../utils/cltRules';
import {
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Info,
  Clock,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface RequestVacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestVacationModal: React.FC<RequestVacationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, createRequest, requests, checkDepartmentConflicts } = useVacation();

  const activePeriod = currentUser.acquisitionPeriods.find((p) => p.status === 'active') || currentUser.acquisitionPeriods[0];
  const remainingDays = activePeriod ? activePeriod.remainingDays : 0;

  // Datas padrão para sugerir: Próxima segunda-feira que esteja a pelo menos 35 dias
  const getDefaultStartDate = () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 35);
    // Encontrar próxima segunda-feira
    while (d.getUTCDay() !== 1) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState<string>(getDefaultStartDate);
  const [daysCount, setDaysCount] = useState<number>(Math.min(15, remainingDays > 0 ? remainingDays : 15));
  const [hasAbonoPecuniario, setHasAbonoPecuniario] = useState<boolean>(false);
  const [abonoDaysCount, setAbonoDaysCount] = useState<number>(10);
  const [requestThirteenthAdvance, setRequestThirteenthAdvance] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Calcular data de término automaticamente com base na quantidade de dias
  const endDate = useMemo(() => {
    if (!startDate || daysCount <= 0) return '';
    return addDays(startDate, daysCount - 1);
  }, [startDate, daysCount]);

  const returnDate = useMemo(() => {
    if (!endDate) return '';
    return addDays(endDate, 1);
  }, [endDate]);

  // Contar quantos períodos de férias já foram agendados ou gozados neste período
  const previousPeriodsCount = useMemo(() => {
    const userReqs = requests.filter(
      (r) =>
        r.employeeId === currentUser.id &&
        r.acquisitionPeriodId === activePeriod?.id &&
        r.status !== 'rejected' &&
        r.status !== 'cancelled'
    );
    return userReqs.length;
  }, [requests, currentUser.id, activePeriod?.id]);

  // CLT Validation
  const validation = useMemo(() => {
    return validateVacationRequest({
      startDate,
      endDate,
      daysCount,
      remainingDaysInPeriod: remainingDays,
      previousPeriodsCount,
      hasAbonoPecuniario,
      abonoDaysCount,
      concessiveLimit: activePeriod ? activePeriod.concessiveLimit : '',
    });
  }, [
    startDate,
    endDate,
    daysCount,
    remainingDays,
    previousPeriodsCount,
    hasAbonoPecuniario,
    abonoDaysCount,
    activePeriod,
  ]);

  // Checagem de conflitos de equipe
  const conflicts = useMemo(() => {
    if (!startDate || !endDate) return [];
    return checkDepartmentConflicts(currentUser.department, startDate, endDate);
  }, [startDate, endDate, currentUser.department, checkDepartmentConflicts]);

  // Financial preview
  const financials = useMemo(() => {
    return calculateFinancials({
      baseSalary: currentUser.baseSalary,
      daysRequested: daysCount,
      hasAbonoPecuniario,
      abonoDaysCount,
      requestThirteenthAdvance,
      startDate,
    });
  }, [currentUser.baseSalary, daysCount, hasAbonoPecuniario, abonoDaysCount, requestThirteenthAdvance, startDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!validation.isValid) {
      setSubmissionError('Corrija as inconsistências indicadas pela CLT antes de enviar.');
      return;
    }

    const res = createRequest({
      startDate,
      endDate,
      hasAbonoPecuniario,
      abonoDaysCount: hasAbonoPecuniario ? abonoDaysCount : 0,
      requestThirteenthAdvance,
      notes,
    });

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setSubmissionError(res.error || 'Erro ao registrar solicitação.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Nova Solicitação de Férias</h2>
            <p className="text-xs text-slate-500">
              {currentUser.name} · Saldo: <span className="font-semibold text-slate-800">{remainingDays} dias</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {submissionError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submissionError}</span>
            </div>
          )}

          {/* Grid: Período e Duração */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Início do Gozo (CLT Art. 134)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-mono-numbers px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                A CLT proíbe início em quinta, sexta ou véspera de feriado.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade de Dias de Gozo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max={remainingDays}
                  value={daysCount}
                  onChange={(e) => setDaysCount(Number(e.target.value))}
                  className="w-full text-xs font-mono-numbers px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <div className="flex gap-1">
                  {[10, 14, 15, 20, 30].map((quickDay) => (
                    quickDay <= remainingDays && (
                      <button
                        key={quickDay}
                        type="button"
                        onClick={() => setDaysCount(quickDay)}
                        className={`text-[11px] font-mono-numbers px-2 py-1.5 rounded border transition-colors cursor-pointer ${
                          daysCount === quickDay
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {quickDay}d
                      </button>
                    )
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Mínimo de 5 dias corridos (ou 14 dias para o período principal).
              </p>
            </div>
          </div>

          {/* Datas calculadas */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 block">Início das Férias:</span>
              <span className="font-semibold text-slate-800 font-mono-numbers">
                {startDate ? formatDateBR(startDate) : '-'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Término das Férias:</span>
              <span className="font-semibold text-slate-800 font-mono-numbers">
                {endDate ? formatDateBR(endDate) : '-'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Retorno ao Trabalho:</span>
              <span className="font-semibold text-blue-700 font-mono-numbers">
                {returnDate ? formatDateBR(returnDate) : '-'}
              </span>
            </div>
          </div>

          {/* Abono Pecuniário e Adiantamento 13º */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Opções Adicionais da Legislação
            </div>

            {/* Abono Pecuniário */}
            <div className="flex items-start justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAbonoPecuniario}
                    onChange={(e) => setHasAbonoPecuniario(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Abono Pecuniário (Venda de Férias · CLT Art. 143)</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Permite converter até 1/3 do período a que tiver direito em dinheiro (isento de INSS e IRRF).
                </p>
              </div>

              {hasAbonoPecuniario && (
                <div className="shrink-0 flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={abonoDaysCount}
                    onChange={(e) => setAbonoDaysCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                    className="w-16 text-xs font-mono-numbers px-2 py-1 border border-slate-300 rounded text-center"
                  />
                  <span className="text-xs text-slate-600">dias</span>
                </div>
              )}
            </div>

            {/* Adiantamento 13º */}
            <div className="flex items-start justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestThirteenthAdvance}
                    onChange={(e) => setRequestThirteenthAdvance(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Adiantamento da 1ª Parcela do 13º Salário (Lei 4.749/65)</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Receba 50% do valor do salário base antecipado junto com a remuneração das férias.
                </p>
              </div>
              <div className="text-xs font-mono-numbers font-semibold text-slate-700">
                {requestThirteenthAdvance ? formatCurrencyBRL(currentUser.baseSalary * 0.5) : '-'}
              </div>
            </div>
          </div>

          {/* Validações da CLT (Bloqueios e Avisos) */}
          <div className="space-y-2">
            {validation.blockingErrors.map((err, i) => (
              <div key={i} className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{err}</span>
              </div>
            ))}

            {validation.warnings.map((warn, i) => (
              <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{warn}</span>
              </div>
            ))}

            {validation.recommendations.map((rec, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                <span>{rec}</span>
              </div>
            ))}
          </div>

          {/* Conflito de Escala da Equipe */}
          {conflicts.length > 0 && (
            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-orange-800">
                <Users className="w-4 h-4" />
                <span>Atenção: Ausência Simultânea no Departamento</span>
              </div>
              <p className="text-[11px] text-orange-700">
                Outros colegas do setor <strong>{currentUser.department}</strong> já possuem férias programadas neste mesmo período:
              </p>
              <div className="space-y-1">
                {conflicts.map((c) => (
                  <div key={c.id} className="text-[11px] flex items-center justify-between bg-white/70 px-2 py-1 rounded">
                    <span className="font-medium text-slate-800">{c.employeeName} ({c.jobTitle})</span>
                    <span className="font-mono-numbers text-slate-600">
                      {formatDateBR(c.startDate)} a {formatDateBR(c.endDate)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-orange-600">
                O gestor avaliará a cobertura das atividades da equipe antes de aprovar.
              </p>
            </div>
          )}

          {/* Simulador Financeiro Resumido */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Previsão Financeira Líquida
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Pagamento até: <strong className="text-white font-mono-numbers">{formatDateBR(financials.paymentDeadlineDate)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Férias Gozo ({financials.daysRequested}d)</span>
                <span className="font-mono-numbers font-medium text-slate-200">
                  {formatCurrencyBRL(financials.grossVacationPay)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">1/3 Constitucional</span>
                <span className="font-mono-numbers font-medium text-slate-200">
                  {formatCurrencyBRL(financials.constitutionalBonus)}
                </span>
              </div>
              {hasAbonoPecuniario && (
                <div>
                  <span className="text-[11px] text-slate-400 block">Abono Pecuniário (+1/3)</span>
                  <span className="font-mono-numbers font-medium text-emerald-400">
                    {formatCurrencyBRL(financials.abonoAmount + financials.abonoBonus)}
                  </span>
                </div>
              )}
              {requestThirteenthAdvance && (
                <div>
                  <span className="text-[11px] text-slate-400 block">1ª Parc. 13º Salário</span>
                  <span className="font-mono-numbers font-medium text-amber-300">
                    {formatCurrencyBRL(financials.thirteenthAdvance)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[11px] text-slate-400 block">Descontos Est. (INSS/IRRF)</span>
                <span className="font-mono-numbers font-medium text-rose-300">
                  - {formatCurrencyBRL(financials.totalDeductions)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
              <span className="text-xs text-slate-300">Total Líquido Estimado a Receber:</span>
              <span className="text-lg font-bold font-mono-numbers text-emerald-400">
                {formatCurrencyBRL(financials.netTotal)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-500 shrink-0" />
              <span>Conforme Art. 145 da CLT, o pagamento deve ser efetuado até 2 dias antes do início do gozo.</span>
            </div>
          </div>

          {/* Observações / Alinhamento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações para o Gestor & RH (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Alinhado previamente com o líder técnico; demandas críticas adiantadas."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!validation.isValid}
              className={`px-5 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
                validation.isValid
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Enviar Solicitação de Férias
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
