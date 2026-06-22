export type AuctionApiStatus = 'scheduled' | 'live' | 'closed';

export interface AuctionScheduleFields {
  date: string | null;
  time: string | null;
  endTime: string | null;
  status: AuctionApiStatus | string;
}
