import React from 'react';
import { useVacation } from '../context/VacationContext';
import { formatDateBR, calculateDaysBetween, formatDateIso } from '../utils/cltRules';
import { Calendar, AlertCircle, Clock, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react';

interface BalanceOverviewProps {
  onOpenNewRequest: () => void;
}

export const BalanceOverview: React.FC<BalanceOverviewProps> = ({ onOpenNewRequest }) => {
  const { currentUser } = useVacation();

  const activePeriod = currentUser.acquisitionPeriods.find((p) => p.status === 'active') || currentUser.acquisitionPeriods[0];
  const previousPeriods = currentUser.acquisitionPeriods.filter((p) => p.id !== activePeriod?.id);

  // Calcular dias até vencer o período concessivo
  const today = new Date();
  const todayIso = formatDateIso(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0)));
  const daysUntilConcessiveExpiry = activePeriod
    ? calculateDaysBetween(todayIso, activePeriod.concessiveLimit) - 1
    : 0;

  const isUrgent = daysUntilConcessiveExpiry <= 90 && activePeriod?.remainingDays > 0;
  const isCritical = daysUntilConcessiveExpiry <= 30 && activePeriod?.remainingDays > 0;

  return (
    <div className="space-y-6">
      {/* Top Banner if concessive is expiring soon */}
      {isUrgent && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          isCritical
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${isCritical ? 'text-rose-600' : 'text-amber-600'}`} />
          <div className="text-xs space-y-1">
            <div className="font-semibold text-sm">
              Alerta de Vencimento de Período Concessivo (CLT Art. 137)
            </div>
            <p>
              Você possui <strong>{activePeriod.remainingDays} dias</strong> de saldo que devem ser usufruídos até{' '}
              <strong>{formatDateBR(activePeriod.concessiveLimit)}</strong> ({daysUntilConcessiveExpiry} dias restantes).
              Após essa data, a legislação trabalhista prevê o pagamento em dobro das férias.
            </p>
          </div>
        </div>
      )}

      {/* Main Balance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Saldo Disponível */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Saldo Disponível
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-numbers text-slate-900">
              {activePeriod ? activePeriod.remainingDays : 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">dias a solicitar</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>Direito: {activePeriod ? activePeriod.totalEntitlementDays : 30} dias</span>
            <span>·</span>
            <span>CLT Art. 130</span>
          </div>
        </div>

        {/* Card 2: Dias Programados */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dias Programados
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-numbers text-amber-700">
              {activePeriod ? activePeriod.daysScheduled : 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">em análise / aprovados</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            Aguardando ou com gozo futuro definido
          </div>
        </div>

        {/* Card 3: Dias Usufruídos & Abono */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gozados / Abono
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-numbers text-slate-800">
              {activePeriod ? activePeriod.daysTaken : 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              gozados {activePeriod?.daysSold > 0 ? `+ ${activePeriod.daysSold} vendidos` : ''}
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            {activePeriod?.daysSold > 0 ? 'Com opção de abono pecuniário' : 'Sem conversão em dinheiro'}
          </div>
        </div>

        {/* Card 4: Período Aquisitivo & Limite */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Período Aquisitivo
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-800 font-mono-numbers">
              {activePeriod ? `${formatDateBR(activePeriod.startDate)} a ${formatDateBR(activePeriod.endDate)}` : 'N/D'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Limite concessivo: <span className="font-semibold text-slate-700">{activePeriod ? formatDateBR(activePeriod.concessiveLimit) : 'N/D'}</span>
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={onOpenNewRequest}
              disabled={!activePeriod || activePeriod.remainingDays <= 0}
              className={`w-full py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activePeriod && activePeriod.remainingDays > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {activePeriod && activePeriod.remainingDays > 0 ? 'Agendar Férias' : 'Saldo Esgotado'}
            </button>
          </div>
        </div>
      </div>

      {/* Historical Periods Accordion / Preview */}
      {previousPeriods.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span>Histórico de Períodos Anteriores</span>
            <span className="text-slate-400 font-normal">Quitações e registros legais</span>
          </div>
          <div className="divide-y divide-slate-100">
            {previousPeriods.map((period) => (
              <div key={period.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <div>
                    <span className="font-mono-numbers font-medium text-slate-800">
                      {formatDateBR(period.startDate)} a {formatDateBR(period.endDate)}
                    </span>
                    <span className="text-slate-500 text-[11px] ml-2">
                      ({period.daysTaken} dias gozados {period.daysSold > 0 ? `· ${period.daysSold} dias abono` : ''})
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                  Período Concluído
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
