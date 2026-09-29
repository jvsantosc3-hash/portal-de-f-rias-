import React, { useState } from 'react';
import { useVacation } from '../context/VacationContext';
import { Role } from '../types/vacation';
import { Calendar, UserCheck, ShieldCheck, User, RefreshCw, ChevronDown, Check } from 'lucide-react';

interface HeaderProps {
  activeTab: 'my-vacations' | 'approvals' | 'calendar' | 'hr-panel' | 'simulator' | 'supabase-sql';
  setActiveTab: (tab: 'my-vacations' | 'approvals' | 'calendar' | 'hr-panel' | 'simulator' | 'supabase-sql') => void;
  onOpenNewRequest: () => void;
  onOpenSimulator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewRequest,
  onOpenSimulator,
}) => {
  const { currentUser, allEmployees, switchUser, resetAllData, requests } = useVacation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Count pending for badges
  const pendingForManager = requests.filter((r) => r.status === 'pending_manager').length;
  const pendingForHr = requests.filter((r) => r.status === 'pending_hr').length;

  const roleLabels: Record<Role, string> = {
    employee: 'Colaborador',
    manager: 'Gestor de Equipe',
    hr: 'Recursos Humanos',
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              PF
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                Portal de Férias
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                Nexus Soluções Digitais
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('my-vacations')}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'my-vacations'
                  ? 'bg-slate-100 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Minhas Férias
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'calendar'
                  ? 'bg-slate-100 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Escala da Equipe
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-2 rounded-md transition-colors relative whitespace-nowrap ${
                activeTab === 'approvals'
                  ? 'bg-slate-100 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Aprovações
              {(currentUser.role === 'manager' || currentUser.role === 'hr') && (
                <span className="ml-1.5 inline-flex items-center justify-center text-[10px] font-mono-numbers font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {currentUser.role === 'manager' ? pendingForManager : pendingForHr}
                </span>
              )}
            </button>

            {currentUser.role === 'hr' && (
              <button
                onClick={() => setActiveTab('hr-panel')}
                className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'hr-panel'
                    ? 'bg-slate-100 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Painel RH & CLT
              </button>
            )}

            <button
              onClick={onOpenSimulator}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'bg-slate-100 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Simulador
            </button>

            <button
              onClick={() => setActiveTab('supabase-sql')}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'supabase-sql'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Supabase & SQL</span>
            </button>
          </nav>

          {/* Zone 3: Actions & User Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewRequest}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs whitespace-nowrap cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Solicitar Férias</span>
            </button>

            {/* Profile Dropdown / Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-left transition-colors cursor-pointer"
                title="Trocar perfil de visualização"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden lg:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>{roleLabels[currentUser.role]}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-semibold text-slate-900">Alternar Perfil de Acesso</p>
                    <p className="text-[11px] text-slate-500">
                      Teste os fluxos de Colaborador, Gestor e RH
                    </p>
                  </div>

                  <div className="space-y-1">
                    {allEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          switchUser(emp.id);
                          setIsUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                          emp.id === currentUser.id
                            ? 'bg-blue-50 text-blue-900 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={emp.avatarUrl}
                            alt={emp.name}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-semibold text-slate-800">{emp.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {emp.jobTitle} · {roleLabels[emp.role]}
                            </div>
                          </div>
                        </div>
                        {emp.id === currentUser.id && (
                          <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        if (window.confirm('Restaurar dados de exemplo originais do sistema?')) {
                          resetAllData();
                          setIsUserMenuOpen(false);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Restaurar dados padrão
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-2 text-xs">
          <button
            onClick={() => setActiveTab('my-vacations')}
            className={`px-2 py-1 rounded ${
              activeTab === 'my-vacations' ? 'text-blue-600 font-semibold' : 'text-slate-600'
            }`}
          >
            Férias
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-2 py-1 rounded ${
              activeTab === 'calendar' ? 'text-blue-600 font-semibold' : 'text-slate-600'
            }`}
          >
            Escala
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-2 py-1 rounded ${
              activeTab === 'approvals' ? 'text-blue-600 font-semibold' : 'text-slate-600'
            }`}
          >
            Aprovações
          </button>
          {currentUser.role === 'hr' && (
            <button
              onClick={() => setActiveTab('hr-panel')}
              className={`px-2 py-1 rounded ${
                activeTab === 'hr-panel' ? 'text-blue-600 font-semibold' : 'text-slate-600'
              }`}
            >
              Painel RH
            </button>
          )}
          <button
            onClick={onOpenSimulator}
            className={`px-2 py-1 rounded ${
              activeTab === 'simulator' ? 'text-blue-600 font-semibold' : 'text-slate-600'
            }`}
          >
            Simulador
          </button>
          <button
            onClick={() => setActiveTab('supabase-sql')}
            className={`px-2 py-1 rounded ${
              activeTab === 'supabase-sql' ? 'text-emerald-700 font-semibold' : 'text-slate-600'
            }`}
          >
            SQL/RLS
          </button>
        </div>
      </div>
    </header>
  );
};
