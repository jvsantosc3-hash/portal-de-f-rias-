import React, { useState, useMemo } from 'react';
import { useVacation } from '../context/VacationContext';
import { calculateFinancials, formatCurrencyBRL, formatDateBR, addDays } from '../utils/cltRules';
import { X, DollarSign, Calculator, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface FinancialSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToRequest?: (params: { days: number; abono: boolean; abonoDays: number; advance13: boolean }) => void;
}

export const FinancialSimulatorModal: React.FC<FinancialSimulatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToRequest,
}) => {
  const { currentUser } = useVacation();

  const [salary, setSalary] = useState<number>(currentUser.baseSalary);
  const [days, setDays] = useState<number>(20);
  const [abono, setAbono] = useState<boolean>(true);
  const [abonoDays, setAbonoDays] = useState<number>(10);
  const [advance13, setAdvance13] = useState<boolean>(true);

  // Mock start date to calculate deadline
  const today = new Date();
  const nextMonthDate = addDays(today.toISOString().split('T')[0], 40);

  const simulation = useMemo(() => {
    return calculateFinancials({
      baseSalary: salary,
      daysRequested: days,
      hasAbonoPecuniario: abono,
      abonoDaysCount: abonoDays,
      requestThirteenthAdvance: advance13,
      startDate: nextMonthDate,
    });
  }, [salary, days, abono, abonoDays, advance13, nextMonthDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Simulador Financeiro de Férias CLT
              </h3>
              <p className="text-xs text-slate-500">
                Cálculo transparente de proventos, 1/3 constitucional, abono e retenções
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Parâmetros de Entrada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Salário Base Nominal (R$)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  value={salary}
                  onChange={(e) => setSalary(Math.max(0, Number(e.target.value)))}
                  className="w-full text-xs font-mono-numbers px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dias de Férias a Gozar ({days} dias)
              </label>
              <input
                type="range"
                min="5"
                max={30 - (abono ? abonoDays : 0)}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers mt-1">
                <span>Mín. 5d</span>
                <span>15d</span>
                <span>Máx. {30 - (abono ? abonoDays : 0)}d</span>
              </div>
            </div>
          </div>

          {/* Opções de Abono e 13º */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={abono}
                  onChange={(e) => setAbono(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Vender Férias (Abono Pecuniário)
                </span>
              </label>
              <p className="text-[11px] text-slate-500">
                Isento de imposto de renda e INSS (CLT Art. 143).
              </p>
              {abono && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-600">Dias de abono:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={abonoDays}
                    onChange={(e) => setAbonoDays(Math.min(10, Math.max(1, Number(e.target.value))))}
                    className="w-16 px-2 py-1 text-xs border border-slate-300 rounded font-mono-numbers text-center"
                  />
                  <span className="text-[10px] text-slate-400">(máx. 10 dias)</span>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={advance13}
                  onChange={(e) => setAdvance13(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Adiantar 1ª Parcela do 13º
                </span>
              </label>
              <p className="text-[11px] text-slate-500">
                50% do salário sem descontos no adiantamento (Lei 4.749/65).
              </p>
              <div className="text-xs font-semibold text-slate-700 font-mono-numbers pt-1">
                {advance13 ? formatCurrencyBRL(salary * 0.5) : 'Não solicitado'}
              </div>
            </div>
          </div>

          {/* Resultado Detalhado */}
          <div className="bg-slate-900 rounded-xl p-5 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Extrato Detalhado da Simulação
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                Líquido Total
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-800">
              <div className="flex justify-between pt-1">
                <span className="text-slate-300">Férias Gozadas ({simulation.daysRequested} dias):</span>
                <span className="font-mono-numbers font-medium text-slate-100">
                  {formatCurrencyBRL(simulation.grossVacationPay)}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-300">1/3 Constitucional de Férias:</span>
                <span className="font-mono-numbers font-medium text-slate-100">
                  {formatCurrencyBRL(simulation.constitutionalBonus)}
                </span>
              </div>
              {abono && (
                <>
                  <div className="flex justify-between pt-2">
                    <span className="text-emerald-300">Abono Pecuniário ({simulation.abonoDays} dias):</span>
                    <span className="font-mono-numbers font-medium text-emerald-300">
                      {formatCurrencyBRL(simulation.abonoAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-emerald-300">1/3 Constitucional sobre Abono:</span>
                    <span className="font-mono-numbers font-medium text-emerald-300">
                      {formatCurrencyBRL(simulation.abonoBonus)}
                    </span>
                  </div>
                </>
              )}
              {advance13 && (
                <div className="flex justify-between pt-2">
                  <span className="text-amber-300">Adiantamento 50% 13º Salário:</span>
                  <span className="font-mono-numbers font-medium text-amber-300">
                    {formatCurrencyBRL(simulation.thirteenthAdvance)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 font-semibold">
                <span className="text-slate-200">Total Proventos Brutos:</span>
                <span className="font-mono-numbers text-slate-100">
                  {formatCurrencyBRL(simulation.grossTotal)}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-rose-300">
                <span>Retenção INSS Estimada:</span>
                <span className="font-mono-numbers">- {formatCurrencyBRL(simulation.estimatedInss)}</span>
              </div>
              {simulation.estimatedIrrf > 0 && (
                <div className="flex justify-between pt-2 text-rose-300">
                  <span>Retenção IRRF Estimada:</span>
                  <span className="font-mono-numbers">- {formatCurrencyBRL(simulation.estimatedIrrf)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-300 block">Valor Líquido a Receber</span>
                <span className="text-[10px] text-slate-400">Direto na sua conta bancária</span>
              </div>
              <span className="text-2xl font-bold font-mono-numbers text-emerald-400">
                {formatCurrencyBRL(simulation.netTotal)}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-start gap-2 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Importante (CLT Art. 145):</strong> O pagamento da remuneração das férias e, se for o caso, o do abono pecuniário serão efetuados até 2 (dois) dias antes do início do respectivo período.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex justify-between items-center bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Fechar
          </button>
          {onApplyToRequest && (
            <button
              onClick={() => {
                onApplyToRequest({
                  days,
                  abono,
                  abonoDays,
                  advance13,
                });
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Aplicar à Solicitação</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
