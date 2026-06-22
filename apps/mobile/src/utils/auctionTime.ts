import type { AuctionApiStatus } from '@/types/auction';

export type CountdownPhase = 'ended' | 'until-start' | 'until-end';

export type AuctionCountdownState = {
  phase: CountdownPhase;
  effectiveStatus: AuctionApiStatus;
  remainingMs: number;
  primaryText: string;
  secondaryText: string | null;
  isUrgent: boolean;
  isEnded: boolean;
  isValid: boolean;
};

const MS_MINUTE = 60_000;

export function formatTimePart(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value.trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    return s.length === 5 ? `${s}:00` : s;
  }
  return s.length >= 8 ? s.slice(0, 8) : s;
}

export function formatDatePart(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value.trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** UTC wall-clock datetime (matches API subastas-schedule / SQL Server). */
export function parseAuctionDateTime(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  const dateStr = formatDatePart(date);
  const timeStr = formatTimePart(time);
  if (!dateStr || !timeStr) return null;
  const parsed = new Date(`${dateStr}T${timeStr}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveServerNowMs(serverTime?: string | null): number {
  if (!serverTime) return Date.now();
  const serverMs = Date.parse(serverTime);
  return Number.isNaN(serverMs) ? Date.now() : serverMs;
}

function formatDurationLabel(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }
  if (totalSec >= 300) {
    return `${minutes}m`;
  }
  if (totalSec >= 60) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatClockTime(time: string | null): string | null {
  const normalized = formatTimePart(time);
  if (!normalized) return null;
  const [hh, mm] = normalized.split(':');
  return `${hh}:${mm}`;
}

function formatClosingHint(date: string | null, endTime: string | null, nowMs: number): string | null {
  const endAt = parseAuctionDateTime(date, endTime);
  const clock = formatClockTime(endTime);
  if (!endAt || !clock) return null;

  const today = new Date(nowMs);
  const isToday =
    endAt.getFullYear() === today.getFullYear() &&
    endAt.getMonth() === today.getMonth() &&
    endAt.getDate() === today.getDate();

  if (isToday) {
    return `Cierra hoy a las ${clock}`;
  }
  const dateLabel = endAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  return `Cierra el ${dateLabel} a las ${clock}`;
}

function formatStartingHint(date: string | null, time: string | null): string | null {
  const clock = formatClockTime(time);
  if (!clock) return null;
  const startAt = parseAuctionDateTime(date, time);
  if (!startAt) return null;
  return `Comienza a las ${clock}`;
}

export function computeAuctionCountdown(input: {
  date: string | null | undefined;
  time: string | null | undefined;
  endTime: string | null | undefined;
  status: string;
  nowMs: number;
}): AuctionCountdownState {
  const startAt = parseAuctionDateTime(input.date, input.time);
  const endAt = parseAuctionDateTime(input.date, input.endTime);

  if (!endAt) {
    return {
      phase: 'ended',
      effectiveStatus: input.status === 'closed' ? 'closed' : 'scheduled',
      remainingMs: 0,
      primaryText: 'Fecha de cierre no disponible',
      secondaryText: null,
      isUrgent: false,
      isEnded: input.status === 'closed',
      isValid: false,
    };
  }

  const nowMs = input.nowMs;
  const endedByTime = nowMs >= endAt.getTime();
  const started = startAt ? nowMs >= startAt.getTime() : input.status === 'live' || input.status === 'closed';

  let effectiveStatus: AuctionApiStatus;
  if (input.status === 'closed' || endedByTime) {
    effectiveStatus = 'closed';
  } else if (started) {
    effectiveStatus = 'live';
  } else if (input.status === 'live' && !startAt) {
    effectiveStatus = 'live';
  } else {
    effectiveStatus = 'scheduled';
  }

  if (effectiveStatus === 'closed') {
    return {
      phase: 'ended',
      effectiveStatus: 'closed',
      remainingMs: 0,
      primaryText: 'Finalizada',
      secondaryText: null,
      isUrgent: false,
      isEnded: true,
      isValid: true,
    };
  }

  if (!started && startAt && nowMs < startAt.getTime()) {
    const remainingMs = startAt.getTime() - nowMs;
    return {
      phase: 'until-start',
      effectiveStatus: 'scheduled',
      remainingMs,
      primaryText: `Comienza en ${formatDurationLabel(remainingMs)}`,
      secondaryText: formatClosingHint(formatDatePart(input.date), input.endTime ?? null, nowMs),
      isUrgent: remainingMs < 5 * MS_MINUTE,
      isEnded: false,
      isValid: true,
    };
  }

  const remainingMs = endAt.getTime() - nowMs;
  if (remainingMs <= 0) {
    return {
      phase: 'ended',
      effectiveStatus: 'closed',
      remainingMs: 0,
      primaryText: 'Finalizada',
      secondaryText: null,
      isUrgent: false,
      isEnded: true,
      isValid: true,
    };
  }

  return {
    phase: 'until-end',
    effectiveStatus: 'live',
    remainingMs,
    primaryText: `Termina en ${formatDurationLabel(remainingMs)}`,
    secondaryText:
      formatClosingHint(formatDatePart(input.date), input.endTime ?? null, nowMs) ??
      formatStartingHint(formatDatePart(input.date), input.time ?? null),
    isUrgent: remainingMs < 5 * MS_MINUTE,
    isEnded: false,
    isValid: true,
  };
}
