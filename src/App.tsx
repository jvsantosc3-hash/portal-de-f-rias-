import React, { useState } from 'react';
import { VacationProvider, useVacation } from './context/VacationContext';
import { Header } from './components/Header';
import { BalanceOverview } from './components/BalanceOverview';
import { RequestsTable } from './components/RequestsTable';
import { RequestVacationModal } from './components/RequestVacationModal';
import { FinancialSimulatorModal } from './components/FinancialSimulatorModal';
import { TeamCalendar } from './components/TeamCalendar';
import { ManagerApprovalsView } from './components/ManagerApprovalsView';
import { HRDashboardView } from './components/HRDashboardView';
import { SupabaseSqlConsole } from './components/SupabaseSqlConsole';
import {
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  HelpCircle,
  Database,
} from 'lucide-react';

function VacationAppContent() {
  const { currentUser, switchUser } = useVacation();

  const [activeTab, setActiveTab] = useState<'my-vacations' | 'approvals' | 'calendar' | 'hr-panel' | 'simulator' | 'supabase-sql'>('my-vacations');
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header conforming to Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewRequest={() => setIsNewRequestOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Role Quick Bar (Subtle & Functional for Demo/Evaluation) */}
      <div className="bg-slate-900 text-white text-xs px-4 py-2 border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Perfil Ativo:</span>
            <span className="font-semibold text-white">{currentUser.name}</span>
            <span className="text-slate-400">({currentUser.jobTitle})</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 mr-1 hidden sm:inline">Simular Papel:</span>
            <button
              onClick={() => {
                switchUser('emp-1');
                setActiveTab('my-vacations');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                currentUser.id === 'emp-1'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Colaboradora (Mariana)
            </button>
            <button
              onClick={() => {
                switchUser('emp-2');
                setActiveTab('approvals');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                currentUser.id === 'emp-2'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Gestor (Rodrigo)
            </button>
            <button
              onClick={() => {
                switchUser('emp-3');
                setActiveTab('hr-panel');
              }}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                currentUser.id === 'emp-3' && activeTab === 'hr-panel'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              RH (Beatriz)
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setActiveTab('supabase-sql')}
              className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'supabase-sql'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-800'
              }`}
            >
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Supabase / SQL RLS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{successToast}</span>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'my-vacations' && (
          <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Meu Painel de Férias
                </h1>
                <p className="text-xs text-slate-500">
                  Acompanhe seus períodos aquisitivos, saldo acumulado e solicitações em andamento
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSimulatorOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Simular Valores</span>
                </button>

                <button
                  onClick={() => setIsNewRequestOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Solicitar Férias</span>
                </button>
              </div>
            </div>

            {/* Balanço de Férias e Prazos CLT */}
            <BalanceOverview onOpenNewRequest={() => setIsNewRequestOpen(true)} />

            {/* Minhas Solicitações e Histórico */}
            <RequestsTable
              title="Minhas Solicitações e Histórico de Recibos"
              filterByCurrentUser={true}
            />
          </div>
        )}

        {activeTab === 'approvals' && (
          <ManagerApprovalsView />
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Escala e Calendário Coletivo de Férias
              </h1>
              <p className="text-xs text-slate-500">
                Visualize os períodos de ausência de toda a equipe e os feriados nacionais CLT
              </p>
            </div>
            <TeamCalendar />
          </div>
        )}

        {activeTab === 'hr-panel' && (
          <HRDashboardView />
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Simulador Financeiro de Férias
              </h1>
              <p className="text-xs text-slate-500">
                Calcule instantaneamente o valor líquido com terço constitucional, abono e antecipação de 13º salário
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <button
                onClick={() => setIsSimulatorOpen(true)}
                className="w-full py-4 px-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-center hover:bg-blue-100/50 transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-900 text-sm">Abrir Calculadora Financeira Completa</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Teste combinações de dias gozados, venda de férias (abono CLT Art. 143) e adiantamento de 13º salário.
                </div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'supabase-sql' && (
          <SupabaseSqlConsole />
        )}
      </main>

      {/* Modais */}
      <RequestVacationModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        onSuccess={() => showToast('Solicitação de férias registrada e enviada para aprovação com sucesso!')}
      />

      <FinancialSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onApplyToRequest={({ days, abono, abonoDays, advance13 }) => {
          setIsNewRequestOpen(true);
        }}
      />

      {/* Floating SQL Database Access */}
      {activeTab !== 'supabase-sql' && (
        <div className="fixed bottom-6 left-6 z-40 no-print">
          <button
            onClick={() => setActiveTab('supabase-sql')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Banco de Dados SQL</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Sistema em conformidade com o Decreto-Lei nº 5.452/1943 (CLT) e Reforma Trabalhista (Lei 13.467/2017)</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Portal de Férias Corporativo · Nexus Soluções Digitais Ltda.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <VacationProvider>
      <VacationAppContent />
    </VacationProvider>
  );
}
