import type { Notification } from './types';

export type NotificationVisual = {
  icon: string;
  backgroundColor: string;
  borderColor: string;
};

export type NotificationNavigation =
  | { type: 'live-auction'; auctionId: number; itemId: number; title?: string }
  | { type: 'catalog'; auctionId: number }
  | { type: 'payment-methods' }
  | { type: 'purchases' }
  | { type: 'submissions' }
  | { type: 'none'; message?: string };

const DEFAULT_VISUAL: NotificationVisual = {
  icon: '🔔',
  backgroundColor: '#EFF6FF',
  borderColor: '#BFDBFE',
};

const VISUAL_BY_TYPE: Record<string, NotificationVisual> = {
  auction_won: { icon: '🏆', backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  auction_lost: { icon: '📋', backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  outbid: { icon: '📉', backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  leading_bid: { icon: '📈', backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' },
  item_finalized: { icon: '🏁', backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  auction_started: { icon: '🔴', backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  auction_ended: { icon: '🏁', backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  payment_method_verified: { icon: '✓', backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' },
  payment_method_rejected: { icon: '✕', backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  payment_pending: { icon: '💳', backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  payment_confirmed: { icon: '✓', backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' },
  submission_accepted: { icon: '✓', backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' },
  submission_rejected: { icon: '✕', backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  submission_pending: { icon: '📦', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  submission_custody_updated: { icon: '🏷', backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
  client_admitted: { icon: '✓', backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' },
};

export function getNotificationVisual(type: string): NotificationVisual {
  return VISUAL_BY_TYPE[type] ?? DEFAULT_VISUAL;
}

export function resolveNotificationNavigation(
  notification: Notification
): NotificationNavigation {
  const { type, auctionId, itemId } = notification;

  switch (type) {
    case 'auction_won':
    case 'payment_pending':
    case 'payment_confirmed':
      return { type: 'purchases' };
    case 'outbid':
    case 'leading_bid':
      if (auctionId != null && itemId != null) {
        return { type: 'live-auction', auctionId, itemId };
      }
      if (auctionId != null) {
        return { type: 'catalog', auctionId };
      }
      return { type: 'none', message: 'El artículo ya no está disponible.' };
    case 'auction_lost':
    case 'item_finalized':
      if (auctionId != null && itemId != null) {
        return { type: 'live-auction', auctionId, itemId };
      }
      return { type: 'none', message: 'El resultado ya no está disponible.' };
    case 'auction_started':
    case 'auction_ended':
      if (auctionId != null) {
        return { type: 'catalog', auctionId };
      }
      return { type: 'none' };
    case 'payment_method_verified':
    case 'payment_method_rejected':
      return { type: 'payment-methods' };
    case 'submission_accepted':
    case 'submission_rejected':
    case 'submission_pending':
    case 'submission_custody_updated':
      return { type: 'submissions' };
    default:
      if (auctionId != null && itemId != null) {
        return { type: 'live-auction', auctionId, itemId };
      }
      if (auctionId != null) {
        return { type: 'catalog', auctionId };
      }
      return { type: 'none' };
  }
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} minuto${minutes === 1 ? '' : 's'}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? '' : 's'}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} día${days === 1 ? '' : 's'}`;

  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
}

export function isItemFinalizedFromLive(state: {
  isFinalized?: boolean;
  soldItemId?: number | null;
  currentItem?: { id: number } | null;
}, watchedItemId: number): boolean {
  if (!state.isFinalized) return false;
  if (state.soldItemId != null) return state.soldItemId === watchedItemId;
  return state.currentItem?.id === watchedItemId;
}
