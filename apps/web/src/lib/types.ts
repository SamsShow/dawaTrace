export type OrgRole = 'MANUFACTURER' | 'DISTRIBUTOR' | 'CHEMIST' | 'REGULATOR' | 'BRIDGE';
export type BatchStatus = 'ACTIVE' | 'IN_TRANSIT' | 'DISPENSED' | 'RECALLED' | 'SUSPENDED_REVIEW';

export interface Batch {
  batchId: string;
  manufacturerId: string;
  drugName: string;
  composition: string;
  expiryDate: string;
  quantity: number;
  currentCustodian: string;
  status: BatchStatus;
  dataHash: string;
  suiObjectId: string;
  createdAt: number;
  updatedAt: number;
}

export interface RecallRecord {
  batchId: string;
  regulatorId: string;
  reason: string;
  timestamp: number;
  suiTxDigest: string;
}

export interface CustodyRecord {
  objectId: string;
  batchId: string;
  fromNode: string;
  toNode: string;
  quantity: number;
  sequence: number;
  timestamp: number;
}

export interface BatchVerification {
  batchId: string;
  isValid: boolean;
  recalled: boolean;
  fabricDataHash: string;
  expiryDate: string;
  custodyChain: CustodyRecord[];
  suiObjectId: string;
}
