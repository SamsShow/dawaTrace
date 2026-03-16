/** TypeScript interfaces matching the Fabric chaincode Go structs in models.go */

export type BatchStatus = 'ACTIVE' | 'IN_TRANSIT' | 'DISPENSED' | 'RECALLED' | 'SUSPENDED_REVIEW';

export interface FabricBatch {
  batchId: string;
  manufacturerId: string;
  drugName: string;
  composition: string;
  expiryDate: string;
  quantity: number;
  currentCustodian: string;
  status: BatchStatus;
  details: Record<string, string>;
  dataHash: string;
  suiObjectId: string;
  createdAt: number;
  updatedAt: number;
}

export interface FabricTransferRecord {
  recordId: string;
  batchId: string;
  fromNode: string;
  toNode: string;
  quantity: number;
  gpsLocation: string;
  timestamp: number;
  txId: string;
}

export interface FabricDispenseRecord {
  recordId: string;
  batchId: string;
  chemistId: string;
  quantity: number;
  patientHash: string; // SHA-256, never raw Aadhaar
  timestamp: number;
}

export interface FabricRecallRecord {
  batchId: string;
  regulatorId: string;
  reason: string;
  timestamp: number;
  suiTxDigest: string;
}

export interface FabricChemistViolation {
  chemistId: string;
  violationCount: number;
  suspended: boolean;
  violationBatchIds: string[];
  lastViolationAt: number;
}
