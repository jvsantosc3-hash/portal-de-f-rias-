import React, { useState } from 'react';
import { useVacation } from '../context/VacationContext';
import { BRAZILIAN_HOLIDAYS, formatDateBR, parseDate, formatDateIso, addDays } from '../utils/cltRules';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, Users } from 'lucide-react';

export const TeamCalendar: React.FC = () => {
  const { allEmployees, requests } = useVacation();

  // Mês e ano inicial: Outubro de 2026 (onde há férias no mock)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10); // 1-12 (10 = Outubro, 11 = Novembro)
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Obter departamentos únicos
  const departments = Array.from(new Set(allEmployees.map((e) => e.department)));

  // Dias no mês
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Domingo

  // Filtrar solicitações aprovadas ou pendentes
  const activeVacations = requests.filter((r) => {
    if (r.status === 'rejected' || r.status === 'cancelled') return false;
    if (selectedDept !== 'all' && r.department !== selectedDept) return false;

    // Verificar se cruza este mês
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    return r.startDate <= monthEnd && r.endDate >= monthStart;
  });

  // Mapa de colaboradores ausentes por dia
  const dayOccupancy: { [day: number]: typeof activeVacations } = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayOccupancy[d] = activeVacations.filter((req) => req.startDate <= dayStr && req.endDate >= dayStr);
  }

  // Detectar dias com múltiplos colaboradores ausentes no mesmo departamento
  const conflictDays = Object.entries(dayOccupancy).filter(([_, vacs]) => {
    const deptCount: { [dept: string]: number } = {};
    vacs.forEach((v) => {
      deptCount[v.department] = (deptCount[v.department] || 0) + 1;
    });
    return Object.values(deptCount).some((c) => c > 1);
  });

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-800 px-3 min-w-[140px] text-center">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(11);
            }}
            className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Ir para Nov/2026
          </button>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Departamento:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">Todos os Setores</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overlap / Conflict Alert */}
      {conflictDays.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sm block">Sobreposição de Férias na Equipe</span>
            <p>
              Existem {conflictDays.length} dias neste mês com 2 ou mais pessoas ausentes simultaneamente no mesmo setor.
              Verifique a escala para assegurar que não haja prejuízo nas operações da sprint.
            </p>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600 py-2.5">
          <span className="text-rose-600">Domingo</span>
          <span>Segunda</span>
          <span>Terça</span>
          <span>Quarta</span>
          <span>Quinta</span>
          <span>Sexta</span>
          <span className="text-rose-600">Sábado</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 text-xs">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[105px] bg-slate-50/50 p-2 text-slate-300">
              {/* Blank */}
            </div>
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const holiday = BRAZILIAN_HOLIDAYS[dateStr];
            const vacs = dayOccupancy[dayNum] || [];
            const isWeekend = (firstDayOfWeek + i) % 7 === 0 || (firstDayOfWeek + i) % 7 === 6;
            const hasMultipleInDept = vacs.length > 1;

            return (
              <div
                key={dayNum}
                className={`min-h-[105px] p-2 transition-colors relative flex flex-col justify-between ${
                  isWeekend ? 'bg-slate-50/40' : 'bg-white'
                } ${hasMultipleInDept ? 'ring-1 ring-amber-300 ring-inset bg-amber-50/20' : ''}`}
              >
                <div>
                  {/* Top row: day number + holiday label */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-mono-numbers font-semibold text-xs ${
                        isWeekend || holiday ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {holiday && (
                      <span className="text-[9px] text-rose-700 bg-rose-50 px-1 py-0.5 rounded font-medium truncate max-w-[85px]" title={holiday}>
                        {holiday}
                      </span>
                    )}
                  </div>

                  {/* Vacation tags on this day */}
                  <div className="space-y-1">
                    {vacs.slice(0, 3).map((v) => (
                      <div
                        key={v.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${
                          v.status === 'approved'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                        title={`${v.employeeName} (${v.department}) · ${formatDateBR(v.startDate)} a ${formatDateBR(v.endDate)}`}
                      >
                        <span className="font-semibold truncate">{v.employeeName.split(' ')[0]}</span>
                        <span className="text-[9px] opacity-75">({v.daysCount}d)</span>
                      </div>
                    ))}
                    {vacs.length > 3 && (
                      <span className="text-[9px] text-slate-500 font-mono-numbers block pl-1">
                        +{vacs.length - 3} colaboradores
                      </span>
                    )}
                  </div>
                </div>

                {hasMultipleInDept && (
                  <div className="text-[9px] text-amber-700 font-medium flex items-center gap-0.5 mt-1">
                    <Users className="w-2.5 h-2.5" />
                    <span>Sobreposição</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-6 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
          <span>Férias Aprovadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
          <span>Férias em Aprovação</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
          <span>Feriado Nacional CLT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-50 ring-1 ring-amber-400" />
          <span>Alerta de Sobreposição no Setor</span>
        </div>
      </div>
    </div>
  );
};
