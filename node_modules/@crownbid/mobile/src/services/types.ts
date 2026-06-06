export type UserCategory = 'comun' | 'especial' | 'plata' | 'oro' | 'platino';

export interface UserProfile {
  id: number;
  documentNumber: string;
  fullName: string;
  email: string;
  address: string | null;
  status: string;
  country: { id: number; name: string };
  admitted: 'si' | 'no';
  category: UserCategory;
}

export interface UserMetrics {
  totalAuctionsAttended: number;
  totalWins: number;
  totalBidsPlaced: number;
  totalAmountOffered: number;
  totalAmountWon: number;
  activeLiveAuctionId: number | null;
}

export interface PaymentMethod {
  id: number;
  type: string;
  status: string;
  currency: string;
  holder: string;
  entity: string | null;
  lastDigits: string | null;
  aliasOrCbu: string | null;
  guaranteeAmount: number | null;
  availableAmount: number | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  mustChangePassword?: boolean;
  isFirstLogin?: boolean;
  emailSentTo?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}
