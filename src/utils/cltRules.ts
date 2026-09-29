import { CltValidationResult, FinancialSimulation } from '../types/vacation';

// National Brazilian Holidays (Formato YYYY-MM-DD para 2026 e 2027)
export const BRAZILIAN_HOLIDAYS: { [date: string]: string } = {
  // 2026
  '2026-01-01': 'Confraternização Universal',
  '2026-02-16': 'Carnaval (Segunda-feira)',
  '2026-02-17': 'Carnaval (Terça-feira)',
  '2026-04-03': 'Sexta-feira Santa',
  '2026-04-21': 'Tiradentes',
  '2026-05-01': 'Dia Mundial do Trabalho',
  '2026-06-04': 'Corpus Christi',
  '2026-09-07': 'Independência do Brasil',
  '2026-10-12': 'Nossa Senhora Aparecida',
  '2026-11-02': 'Finados',
  '2026-11-15': 'Proclamação da República',
  '2026-11-20': 'Dia da Consciência Negra',
  '2026-12-25': 'Natal',

  // 2027
  '2027-01-01': 'Confraternização Universal',
  '2027-02-08': 'Carnaval (Segunda-feira)',
  '2027-02-09': 'Carnaval (Terça-feira)',
  '2027-03-26': 'Sexta-feira Santa',
  '2027-04-21': 'Tiradentes',
  '2027-05-01': 'Dia Mundial do Trabalho',
  '2027-05-27': 'Corpus Christi',
  '2027-09-07': 'Independência do Brasil',
  '2027-10-12': 'Nossa Senhora Aparecida',
  '2027-11-02': 'Finados',
  '2027-11-15': 'Proclamação da República',
  '2027-11-20': 'Dia da Consciência Negra',
  '2027-12-25': 'Natal',
};

/**
 * Normaliza uma data em formato YYYY-MM-DD para um objeto Date à meia-noite UTC
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateIso(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateIso(date);
}

/**
 * Calcula a quantidade de dias corridos entre duas datas inclusive
 */
export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Verifica se a data é um dia antes ou dois dias antes de repouso semanal (sábado/domingo)
 * CLT Art. 134 § 3º: "É vedado o início das férias no período de dois dias que antecede feriado ou dia de repouso semanal remunerado."
 * Para quem trabalha de seg a sex (descanso sab/dom), quinta (2 dias antes de sab) e sexta (1 dia antes de sab) são vedadas.
 */
export function isNearWeekend(dateStr: string): { isNear: boolean; reason?: string } {
  const date = parseDate(dateStr);
  const dayOfWeek = date.getUTCDay(); // 0 = Domingo, 4 = Quinta, 5 = Sexta, 6 = Sábado

  if (dayOfWeek === 4) {
    return {
      isNear: true,
      reason: 'Quinta-feira antecede em dois dias o repouso remunerado (Sábado). CLT Art. 134 § 3º veda início neste dia.',
    };
  }
  if (dayOfWeek === 5) {
    return {
      isNear: true,
      reason: 'Sexta-feira antecede o repouso remunerado (Sábado). CLT Art. 134 § 3º veda início neste dia.',
    };
  }
  if (dayOfWeek === 6 || dayOfWeek === 0) {
    return {
      isNear: true,
      reason: 'O início não pode ocorrer em Sábado ou Domingo (dias de descanso semanal).',
    };
  }

  return { isNear: false };
}

/**
 * Verifica se a data antecede em até 2 dias um feriado nacional
 */
export function isNearHoliday(dateStr: string): { isNear: boolean; holidayName?: string; holidayDate?: string } {
  const nextDay1 = addDays(dateStr, 1);
  const nextDay2 = addDays(dateStr, 2);

  if (BRAZILIAN_HOLIDAYS[dateStr]) {
    return { isNear: true, holidayName: BRAZILIAN_HOLIDAYS[dateStr], holidayDate: dateStr };
  }
  if (BRAZILIAN_HOLIDAYS[nextDay1]) {
    return { isNear: true, holidayName: BRAZILIAN_HOLIDAYS[nextDay1], holidayDate: nextDay1 };
  }
  if (BRAZILIAN_HOLIDAYS[nextDay2]) {
    return { isNear: true, holidayName: BRAZILIAN_HOLIDAYS[nextDay2], holidayDate: nextDay2 };
  }

  return { isNear: false };
}

/**
 * Data limite de pagamento das férias (2 dias antes do início conforme Art. 145 CLT)
 */
export function calculatePaymentDeadline(startDateStr: string): string {
  let payDateStr = addDays(startDateStr, -2);
  let payDate = parseDate(payDateStr);
  
  // Se cair no final de semana, antecipa para o último dia útil
  while (payDate.getUTCDay() === 0 || payDate.getUTCDay() === 6 || BRAZILIAN_HOLIDAYS[payDateStr]) {
    payDateStr = addDays(payDateStr, -1);
    payDate = parseDate(payDateStr);
  }
  
  return payDateStr;
}

/**
 * Validação abrangente de acordo com as Leis Trabalhistas Brasileiras (CLT)
 */
export function validateVacationRequest(params: {
  startDate: string;
  endDate: string;
  daysCount: number;
  remainingDaysInPeriod: number;
  previousPeriodsCount: number; // quantos períodos de férias já foram tirados neste período aquisitivo
  hasAbonoPecuniario: boolean;
  abonoDaysCount: number;
  concessiveLimit: string;
}): CltValidationResult {
  const {
    startDate,
    endDate,
    daysCount,
    remainingDaysInPeriod,
    previousPeriodsCount,
    hasAbonoPecuniario,
    abonoDaysCount,
    concessiveLimit,
  } = params;

  const blockingErrors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (!startDate || !endDate) {
    return {
      isValid: false,
      blockingErrors: ['Preencha as datas de início e término das férias.'],
      warnings: [],
      recommendations: [],
    };
  }

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (end < start) {
    blockingErrors.push('A data de término não pode ser anterior à data de início.');
  }

  const totalDaysNeeded = daysCount + (hasAbonoPecuniario ? abonoDaysCount : 0);
  if (totalDaysNeeded > remainingDaysInPeriod) {
    blockingErrors.push(
      `Saldo insuficiente. Você solicitou ${totalDaysNeeded} dias (${daysCount} de gozo + ${
        hasAbonoPecuniario ? abonoDaysCount : 0
      } de abono), mas seu saldo atual é de ${remainingDaysInPeriod} dias.`
    );
  }

  // 1. Regra de Fracionamento (CLT Art. 134 § 1º)
  // Pode ser em até 3 períodos: um não menor que 14, nenhum menor que 5
  const currentPeriodIndex = previousPeriodsCount + 1; // 1º, 2º ou 3º período
  if (currentPeriodIndex > 3) {
    blockingErrors.push('A CLT veda o fracionamento das férias em mais de 3 (três) períodos.');
  }

  if (daysCount < 5) {
    blockingErrors.push('Nenhum período de férias pode ser inferior a 5 (cinco) dias corridos (Art. 134 § 1º CLT).');
  }

  // Se este for o último saldo ou se o total restante não permitir um período de 14 dias
  const remainingAfterThis = remainingDaysInPeriod - totalDaysNeeded;
  if (previousPeriodsCount === 0 && daysCount < 14 && remainingAfterThis < 14 && !hasAbonoPecuniario) {
    blockingErrors.push(
      'Pelo menos um dos períodos de férias deve ter no mínimo 14 (quatorze) dias corridos (Art. 134 § 1º CLT).'
    );
  }

  // 2. Regra de início vedado (CLT Art. 134 § 3º)
  const weekendCheck = isNearWeekend(startDate);
  if (weekendCheck.isNear) {
    blockingErrors.push(weekendCheck.reason!);
  }

  const holidayCheck = isNearHoliday(startDate);
  if (holidayCheck.isNear) {
    blockingErrors.push(
      `Início vedado pela CLT: a data coincide ou antecede em até dois dias o feriado de "${holidayCheck.holidayName}" (${formatDateBR(
        holidayCheck.holidayDate!
      )}).`
    );
  }

  // 3. Regra de Abono Pecuniário (CLT Art. 143)
  if (hasAbonoPecuniario) {
    if (abonoDaysCount <= 0 || abonoDaysCount > 10) {
      blockingErrors.push('O abono pecuniário é limitado a no máximo 10 dias (1/3 do período de direito de 30 dias).');
    }
  }

  // 4. Antecedência de aviso (CLT Art. 135)
  // Avisar com antecedência de 30 dias
  const today = new Date();
  const todayIso = formatDateIso(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0)));
  const daysInAdvance = calculateDaysBetween(todayIso, startDate) - 1;

  if (daysInAdvance < 30) {
    warnings.push(
      `Aviso com ${Math.max(0, daysInAdvance)} dias de antecedência. A CLT (Art. 135) estipula comunicação prévia de 30 dias para planejamento formal da empresa.`
    );
  } else {
    recommendations.push(`Solicitação com antecedência de ${daysInAdvance} dias, em total conformidade com o Art. 135 da CLT.`);
  }

  // 5. Período Concessivo e risco de Férias em Dobro (CLT Art. 137)
  if (concessiveLimit) {
    const concessive = parseDate(concessiveLimit);
    if (end > concessive) {
      warnings.push(
        `Atenção: O término desta solicitação ultrapassa a data limite do período concessivo (${formatDateBR(
          concessiveLimit
        )}). Risco de pagamento em dobro conforme Art. 137 da CLT.`
      );
    }
  }

  return {
    isValid: blockingErrors.length === 0,
    blockingErrors,
    warnings,
    recommendations,
  };
}

/**
 * Cálculo financeiro detalhado de Férias conforme legislação trabalhista e tributária
 */
export function calculateFinancials(params: {
  baseSalary: number;
  daysRequested: number;
  hasAbonoPecuniario: boolean;
  abonoDaysCount: number;
  requestThirteenthAdvance: boolean;
  startDate: string;
}): FinancialSimulation {
  const {
    baseSalary,
    daysRequested,
    hasAbonoPecuniario,
    abonoDaysCount,
    requestThirteenthAdvance,
    startDate,
  } = params;

  // Valor diário
  const dailyRate = baseSalary / 30;

  // Férias normais gozadas
  const grossVacationPay = Number((dailyRate * daysRequested).toFixed(2));
  const constitutionalBonus = Number((grossVacationPay / 3).toFixed(2));

  // Abono pecuniário (venda de dias) - isento de INSS e IRRF conforme legislação
  const abonoDays = hasAbonoPecuniario ? Math.min(abonoDaysCount, 10) : 0;
  const abonoAmount = Number((dailyRate * abonoDays).toFixed(2));
  const abonoBonus = Number((abonoAmount / 3).toFixed(2));

  // Adiantamento do 13º salário (50% do salário nominal)
  const thirteenthAdvance = requestThirteenthAdvance ? Number((baseSalary * 0.5).toFixed(2)) : 0;

  const grossTotal = Number(
    (grossVacationPay + constitutionalBonus + abonoAmount + abonoBonus + thirteenthAdvance).toFixed(2)
  );

  // Base de cálculo tributável: Férias gozadas + 1/3 Constitucional
  // (Abono e 13º 1ª parcela não sofrem desconto de INSS/IRRF no recibo de férias)
  const taxableBase = grossVacationPay + constitutionalBonus;

  // Estimativa de desconto INSS Progressivo 2025/2026
  let estimatedInss = 0;
  if (taxableBase <= 1518.0) {
    estimatedInss = taxableBase * 0.075;
  } else if (taxableBase <= 2793.88) {
    estimatedInss = 1518.0 * 0.075 + (taxableBase - 1518.0) * 0.09;
  } else if (taxableBase <= 4190.83) {
    estimatedInss = 1518.0 * 0.075 + (2793.88 - 1518.0) * 0.09 + (taxableBase - 2793.88) * 0.12;
  } else if (taxableBase <= 8157.41) {
    estimatedInss =
      1518.0 * 0.075 +
      (2793.88 - 1518.0) * 0.09 +
      (4190.83 - 2793.88) * 0.12 +
      (taxableBase - 4190.83) * 0.14;
  } else {
    estimatedInss = 951.63; // Teto aproximado
  }
  estimatedInss = Number(estimatedInss.toFixed(2));

  // Base para IRRF
  const irrfBase = Math.max(0, taxableBase - estimatedInss);
  let estimatedIrrf = 0;
  if (irrfBase <= 2259.2) {
    estimatedIrrf = 0;
  } else if (irrfBase <= 2826.65) {
    estimatedIrrf = irrfBase * 0.075 - 169.44;
  } else if (irrfBase <= 3751.05) {
    estimatedIrrf = irrfBase * 0.15 - 381.44;
  } else if (irrfBase <= 4664.68) {
    estimatedIrrf = irrfBase * 0.225 - 662.77;
  } else {
    estimatedIrrf = irrfBase * 0.275 - 896.0;
  }
  estimatedIrrf = Math.max(0, Number(estimatedIrrf.toFixed(2)));

  const totalDeductions = Number((estimatedInss + estimatedIrrf).toFixed(2));
  const netTotal = Number((grossTotal - totalDeductions).toFixed(2));

  const paymentDeadlineDate = startDate ? calculatePaymentDeadline(startDate) : '';

  return {
    baseSalary,
    daysRequested,
    grossVacationPay,
    constitutionalBonus,
    abonoDays,
    abonoAmount,
    abonoBonus,
    thirteenthAdvance,
    grossTotal,
    estimatedInss,
    estimatedIrrf,
    totalDeductions,
    netTotal,
    paymentDeadlineDate,
  };
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
