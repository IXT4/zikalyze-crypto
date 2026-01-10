// ═══════════════════════════════════════════════════════════════════════════════
// 📅 MACRO CATALYST ENGINE — Real Calendar-Based Event Tracking
// ═══════════════════════════════════════════════════════════════════════════════

import { MacroCatalyst } from './types';

// Helper: calculate accurate days until a date
const getDaysUntil = (now: Date, targetDate: Date): number => {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
};

// Helper: format days for display
const formatDays = (days: number): string => {
  if (days === 0) return 'TODAY';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
};

// Get 3rd Friday of a month (options expiry)
const getThirdFriday = (y: number, m: number): Date => {
  const firstDay = new Date(y, m, 1);
  const firstFriday = new Date(y, m, 1 + ((5 - firstDay.getDay() + 7) % 7));
  return new Date(y, m, firstFriday.getDate() + 14);
};

export function getUpcomingMacroCatalysts(): MacroCatalyst[] {
  const now = new Date();
  const catalysts: MacroCatalyst[] = [];
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayOfWeek = now.getDay();

  // FOMC MEETINGS 2025-2026
  const fomcDates = [
    new Date(2025, 0, 29), new Date(2025, 2, 19), new Date(2025, 4, 7),
    new Date(2025, 5, 18), new Date(2025, 6, 30), new Date(2025, 8, 17),
    new Date(2025, 10, 5), new Date(2025, 11, 17),
    new Date(2026, 0, 28), new Date(2026, 2, 18), new Date(2026, 4, 6),
    new Date(2026, 5, 17), new Date(2026, 6, 29), new Date(2026, 8, 16),
    new Date(2026, 10, 4), new Date(2026, 11, 16),
  ];

  const nextFOMC = fomcDates.find(d => getDaysUntil(now, d) >= 0);
  if (nextFOMC) {
    const daysToFOMC = getDaysUntil(now, nextFOMC);
    if (daysToFOMC <= 14) {
      // Add CME FedWatch context
      const fedWatchNote = 'CME FedWatch: ~90% hold expected. Surprise cut = ultra bullish, hike = crash risk';
      catalysts.push({
        event: 'FOMC Interest Rate Decision',
        date: nextFOMC.toISOString().split('T')[0],
        impact: 'HIGH',
        expectedEffect: 'VOLATILE',
        description: `${formatDays(daysToFOMC)}. ${fedWatchNote}`
      });
    }
  }

  // CPI RELEASE DATES 2025-2026
  const cpiDates = [
    new Date(2025, 0, 15), new Date(2025, 1, 12), new Date(2025, 2, 12),
    new Date(2025, 3, 10), new Date(2025, 4, 13), new Date(2025, 5, 11),
    new Date(2025, 6, 11), new Date(2025, 7, 12), new Date(2025, 8, 10),
    new Date(2025, 9, 14), new Date(2025, 10, 13), new Date(2025, 11, 10),
    new Date(2026, 0, 14), new Date(2026, 1, 11), new Date(2026, 2, 11),
    new Date(2026, 3, 14), new Date(2026, 4, 12), new Date(2026, 5, 10),
    new Date(2026, 6, 14), new Date(2026, 7, 12), new Date(2026, 8, 16),
    new Date(2026, 9, 13), new Date(2026, 10, 12), new Date(2026, 11, 9),
  ];

  const nextCPI = cpiDates.find(d => getDaysUntil(now, d) >= 0);
  if (nextCPI) {
    const daysToCPI = getDaysUntil(now, nextCPI);
    if (daysToCPI <= 10) {
      // Add market consensus context
      const consensusNote = 'Consensus: ~2.8% YoY. Below = bullish surprise (rate cut hopes), Above = hawkish reaction';
      catalysts.push({
        event: 'US CPI Inflation Data',
        date: nextCPI.toISOString().split('T')[0],
        impact: 'HIGH',
        expectedEffect: 'VOLATILE',
        description: `${formatDays(daysToCPI)}. ${consensusNote}`
      });
    }
  }

  // Weekly Jobless Claims (Every Thursday)
  const daysToThursday = (4 - dayOfWeek + 7) % 7;
  if (daysToThursday <= 3) {
    const nextThursday = new Date(now);
    nextThursday.setDate(now.getDate() + daysToThursday);
    catalysts.push({
      event: 'Weekly Jobless Claims',
      date: nextThursday.toISOString().split('T')[0],
      impact: 'MEDIUM',
      expectedEffect: 'VOLATILE',
      description: formatDays(daysToThursday) + (daysToThursday === 0 ? ' — Watch for market reaction' : '')
    });
  }

  // Options Expiry (3rd Friday)
  let optionsDate = getThirdFriday(year, month);
  if (getDaysUntil(now, optionsDate) < 0) {
    optionsDate = getThirdFriday(month === 11 ? year + 1 : year, (month + 1) % 12);
  }

  const daysToExpiry = getDaysUntil(now, optionsDate);
  if (daysToExpiry <= 7 && daysToExpiry >= 0) {
    const expiryMonth = optionsDate.getMonth();
    const isQuarterly = [2, 5, 8, 11].includes(expiryMonth);
    catalysts.push({
      event: isQuarterly ? 'Quarterly Options Expiry (Major)' : 'Monthly Options Expiry',
      date: optionsDate.toISOString().split('T')[0],
      impact: isQuarterly ? 'HIGH' : 'MEDIUM',
      expectedEffect: 'VOLATILE',
      description: `${formatDays(daysToExpiry)}. ${isQuarterly ? '$B+ in options expire — expect max pain volatility' : 'Large positions rolling'}`
    });
  }

  // Ongoing macro theme
  catalysts.push({
    event: 'Tariff/Trade Policy + Geopolitics',
    date: 'Ongoing',
    impact: 'MEDIUM',
    expectedEffect: 'UNCERTAIN',
    description: 'Trade tensions, regulatory news can trigger sudden moves'
  });

  return catalysts.sort((a, b) => {
    if (a.date === 'Ongoing') return 1;
    if (b.date === 'Ongoing') return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }).slice(0, 3);
}

export function getQuickMacroFlag(): string {
  const catalysts = getUpcomingMacroCatalysts();
  const now = new Date();

  const getDaysUntilDate = (dateStr: string): number => {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(dateStr);
    const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    return Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  };

  const imminent = catalysts.filter(c => {
    if (c.date === 'Ongoing') return false;
    const days = getDaysUntilDate(c.date);
    return days <= 3 && days >= 0;
  });

  if (imminent.length === 0) return '';

  const primary = imminent[0];
  const days = getDaysUntilDate(primary.date);
  const timing = days === 0 ? 'TODAY' : days === 1 ? 'Tomorrow' : `In ${days} days`;

  let flagText = `⚡ MACRO ALERT: ${primary.event} ${timing}`;
  if (imminent.length > 1) {
    flagText += ` + ${imminent.length - 1} more event(s)`;
  }
  flagText += ' — expect volatility';

  return flagText;
}
