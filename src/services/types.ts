export type CountryCode = string;

export type UserCategory = 'common' | 'special' | 'silver' | 'gold' | 'platinum';

export type UserStatus =
  | 'pending_verification'
  | 'active'
  | 'blocked'
  | 'delinquent'
  | 'suspended';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  documentId: string;
  address: string;
  country: CountryCode;
  photoUrl?: string;
  documentFrontImageUrl?: string;
  documentBackImageUrl?: string;
  category?: UserCategory;
  status?: UserStatus;
  biddingBlockedUntilResolved?: boolean;
  delinquentWinId?: string;
  accountServiceSuspended?: boolean;
  requiresPasswordChange?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  mustChangePassword?: boolean;
  isFirstLogin?: boolean;
  user?: UserProfile;
  emailSentTo?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}
