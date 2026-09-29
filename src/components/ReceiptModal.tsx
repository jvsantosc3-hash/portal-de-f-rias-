import React from 'react';
import { VacationRequest } from '../types/vacation';
import { formatDateBR, formatCurrencyBRL } from '../utils/cltRules';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';

interface ReceiptModalProps {
  request: VacationRequest | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ request, onClose }) => {
  if (!request) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200">
        {/* Modal Controls (Not printed) */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Documento Oficial · Recibo & Aviso Prévio de Férias
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 text-slate-900 font-sans text-xs bg-white" id="printable-receipt">
          {/* Header Empresa */}
          <div className="border-b border-slate-300 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900">
                NEXUS SOLUÇÕES DIGITAIS LTDA.
              </h1>
              <p className="text-[11px] text-slate-600">
                CNPJ: 45.892.120/0001-94 · Alameda Santos, 1200, 8º andar - Cerqueira César, São Paulo/SP
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono-numbers block">
                Nº CONTROLE: {request.id.toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-500 font-mono-numbers block">
                EMISSÃO: {formatDateBR(request.createdAt.split('T')[0])}
              </span>
            </div>
          </div>

          {/* Título do Documento */}
          <div className="text-center py-2 bg-slate-100 rounded border border-slate-200">
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-800">
              AVISO DE CONCESSÃO E RECIBO DE QUITAÇÃO DE FÉRIAS
            </h2>
            <p className="text-[10px] text-slate-600">
              Conforme Artigos 135 e 145 do Decreto-Lei nº 5.452/1943 (Consolidação das Leis do Trabalho - CLT)
            </p>
          </div>

          {/* Dados do Colaborador */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 block">Colaborador(a):</span>
              <span className="font-semibold text-slate-900">{request.employeeName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Cargo / Função:</span>
              <span className="font-semibold text-slate-900">{request.jobTitle}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Departamento:</span>
              <span className="font-semibold text-slate-900">{request.department}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Identificador Período Aquisitivo:</span>
              <span className="font-semibold text-slate-900 font-mono-numbers">{request.acquisitionPeriodId}</span>
            </div>
          </div>

          {/* Texto Legal de Comunicação Prévia */}
          <p className="text-justify text-slate-700 leading-relaxed text-[11px]">
            Em cumprimento às disposições legais vigentes do Art. 135 da CLT, comunicamos que suas férias regulamentares relativas ao período aquisitivo especificado serão usufruídas no período de{' '}
            <strong className="text-slate-900 font-mono-numbers">{formatDateBR(request.startDate)}</strong> a{' '}
            <strong className="text-slate-900 font-mono-numbers">{formatDateBR(request.endDate)}</strong>, perfazendo um total de{' '}
            <strong className="text-slate-900 font-mono-numbers">{request.daysCount} dias</strong> de gozo, com retorno às atividades no dia{' '}
            <strong className="text-slate-900 font-mono-numbers">{formatDateBR(request.returnDate)}</strong>.
            {request.hasAbonoPecuniario && (
              <span> Fica igualmente registrado o deferimento do Abono Pecuniário de {request.abonoDaysCount} dias de férias (CLT Art. 143).</span>
            )}
          </p>

          {/* Demonstrativo Financeiro de Pagamento */}
          <div>
            <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
              Demonstrativo de Proventos e Descontos Legais (CLT Art. 145)
            </div>
            <table className="w-full border-collapse border border-slate-200 text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-left">
                  <th className="p-2 border border-slate-200">Rubrica / Discriminação</th>
                  <th className="p-2 border border-slate-200 text-center">Ref.</th>
                  <th className="p-2 border border-slate-200 text-right">Proventos (R$)</th>
                  <th className="p-2 border border-slate-200 text-right">Descontos (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono-numbers">
                <tr>
                  <td className="p-2 border border-slate-200 font-sans">001 - Férias Gozadas</td>
                  <td className="p-2 border border-slate-200 text-center">{request.daysCount} dias</td>
                  <td className="p-2 border border-slate-200 text-right">{formatCurrencyBRL(request.financials.grossVacationPay)}</td>
                  <td className="p-2 border border-slate-200 text-right">-</td>
                </tr>
                <tr>
                  <td className="p-2 border border-slate-200 font-sans">002 - Terço Constitucional de Férias (Art. 7º, XVII CF)</td>
                  <td className="p-2 border border-slate-200 text-center">33,33%</td>
                  <td className="p-2 border border-slate-200 text-right">{formatCurrencyBRL(request.financials.constitutionalBonus)}</td>
                  <td className="p-2 border border-slate-200 text-right">-</td>
                </tr>
                {request.hasAbonoPecuniario && (
                  <>
                    <tr>
                      <td className="p-2 border border-slate-200 font-sans">003 - Abono Pecuniário (CLT Art. 143)</td>
                      <td className="p-2 border border-slate-200 text-center">{request.abonoDaysCount} dias</td>
                      <td className="p-2 border border-slate-200 text-right">{formatCurrencyBRL(request.financials.abonoAmount)}</td>
                      <td className="p-2 border border-slate-200 text-right">-</td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-sans">004 - Terço Constitucional sobre Abono Pecuniário</td>
                      <td className="p-2 border border-slate-200 text-center">33,33%</td>
                      <td className="p-2 border border-slate-200 text-right">{formatCurrencyBRL(request.financials.abonoBonus)}</td>
                      <td className="p-2 border border-slate-200 text-right">-</td>
                    </tr>
                  </>
                )}
                {request.requestThirteenthAdvance && (
                  <tr>
                    <td className="p-2 border border-slate-200 font-sans">005 - Adiantamento 1ª Parcela 13º Salário (Lei 4.749/65)</td>
                    <td className="p-2 border border-slate-200 text-center">50,00%</td>
                    <td className="p-2 border border-slate-200 text-right">{formatCurrencyBRL(request.financials.thirteenthAdvance)}</td>
                    <td className="p-2 border border-slate-200 text-right">-</td>
                  </tr>
                )}
                <tr>
                  <td className="p-2 border border-slate-200 font-sans text-rose-700">501 - Retenção Previdenciária INSS Férias</td>
                  <td className="p-2 border border-slate-200 text-center">Oficial</td>
                  <td className="p-2 border border-slate-200 text-right">-</td>
                  <td className="p-2 border border-slate-200 text-right text-rose-700">{formatCurrencyBRL(request.financials.estimatedInss)}</td>
                </tr>
                {request.financials.estimatedIrrf > 0 && (
                  <tr>
                    <td className="p-2 border border-slate-200 font-sans text-rose-700">502 - Imposto de Renda Retido na Fonte (IRRF)</td>
                    <td className="p-2 border border-slate-200 text-center">Tabela</td>
                    <td className="p-2 border border-slate-200 text-right">-</td>
                    <td className="p-2 border border-slate-200 text-right text-rose-700">{formatCurrencyBRL(request.financials.estimatedIrrf)}</td>
                  </tr>
                )}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="p-2 border border-slate-200 font-sans">TOTAIS CONSOLIDADOS</td>
                  <td className="p-2 border border-slate-200 text-right">{formatCurrencyBRL(request.financials.grossTotal)}</td>
                  <td className="p-2 border border-slate-200 text-right text-rose-700">{formatCurrencyBRL(request.financials.totalDeductions)}</td>
                </tr>
                <tr className="bg-blue-50 font-bold text-blue-950">
                  <td colSpan={2} className="p-2.5 border border-slate-200 font-sans text-xs">VALOR LÍQUIDO A RECEBER:</td>
                  <td colSpan={2} className="p-2.5 border border-slate-200 text-right text-sm text-blue-700">
                    {formatCurrencyBRL(request.financials.netTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Prazo de Pagamento */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
            <strong>Data Limite do Crédito em Conta: </strong>
            <span className="font-mono-numbers">{formatDateBR(request.financials.paymentDeadlineDate)}</span>{' '}
            (efetuado até 2 dias antes do início do respectivo período de férias, sob pena de remuneração em dobro - Súmula 450 do TST e Art. 145 CLT).
          </div>

          {/* Assinaturas */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px]">
            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-900">
                NEXUS SOLUÇÕES DIGITAIS LTDA.
              </div>
              <span className="text-slate-500">Recursos Humanos / Empregador</span>
              {request.hrApproval && (
                <div className="text-[9px] text-emerald-700 mt-0.5">
                  Assinado digitalmente por {request.hrApproval.hrName} em {formatDateBR(request.hrApproval.approvedAt.split('T')[0])}
                </div>
              )}
            </div>

            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-900">
                {request.employeeName.toUpperCase()}
              </div>
              <span className="text-slate-500">Assinatura do(a) Colaborador(a) / Ciente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
