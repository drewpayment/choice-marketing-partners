import { User } from '@cmp/interfaces';

/**
 * Interface for the 'Sessions' data
 */
export interface SessionsEntity extends User {
  sessionId: string | number; // Primary ID
}
