/**
 * PendingChange entity - tracks changes that need to be synced
 */
export type EntityType = "session" | "note" | "image";
export type OperationType = "create" | "update" | "delete";

export interface PendingChange {
  id: string;
  entityType: EntityType;
  entityId: string;
  operation: OperationType;
  timestamp: number;
  data?: unknown;
  retryCount: number;
}

