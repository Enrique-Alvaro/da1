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
  code?: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  auctionId: number | null;
  itemId: number | null;
  saleId: number | null;
  paymentMethodId: number | null;
  submissionId: number | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: Notification[];
  unreadCount: number;
  total: number;
  limit: number;
  offset: number;
}

export interface LiveAuctionState {
  auctionId: number;
  status: string;
  canAccess: boolean;
  canBid: boolean;
  cannotAccessReason: string | null;
  cannotBidReason: string | null;
  currentItem: {
    id: number;
    productId: number;
    catalogDescription: string | null;
    basePrice: number;
  } | null;
  currentBid: number | null;
  currentHighestBid: number | null;
  highestBidderId: number | null;
  highestBidderNumber: number | null;
  minNextBid: number | null;
  maxNextBid: number | null;
  isHighestBidder: boolean;
  isCurrentUserWinner: boolean;
  isFinalized: boolean;
  resultType: string | null;
  winnerDisplayName: string | null;
  finalAmount: number | null;
  soldItemId: number | null;
  shouldRedirectToResult: boolean;
  serverTime: string;
}

export interface ItemFinalizationResult {
  auctionId: number;
  itemId: number;
  productId: number;
  status: string;
  resultType: 'BIDDER_WON' | 'COMPANY_PURCHASED' | 'NOT_FINALIZED';
  resultStatus: 'FINALIZED' | 'NOT_FINALIZED';
  winnerUserId: number | null;
  winnerDisplayName: string | null;
  finalAmount: number | null;
  currency: string;
  basePrice: number;
  commissionAmount: number;
  shippingAmount: number;
  totalAmount: number | null;
  registroId: number | null;
  finalizedAt: string | null;
  isCurrentUserWinner?: boolean;
  productTitle: string | null;
  title?: string | null;
}

export interface PurchaseItem {
  registroId: number;
  auctionId: number;
  itemId: number;
  productId: number;
  title: string | null;
  productTitle: string | null;
  finalAmount: number;
  commissionAmount: number;
  shippingAmount: number;
  totalAmount: number;
  currency: string;
  finalizedAt: string | null;
  status: string;
  paymentMethodSummary: string | null;
}
