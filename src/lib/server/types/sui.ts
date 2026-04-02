export interface SuiBatchObject {
  objectId: string;
  batchId: string;
  manufacturer: string;
  drugName: string;
  composition: string;
  expiryDate: string;
  quantity: number;
  dataHash: string;
  recalled: boolean;
  createdAt: number;
}

export interface SuiCustodyRecord {
  objectId: string;
  batchId: string;
  fromNode: string;
  toNode: string;
  quantity: number;
  dataHash: string;
  sequence: number;
  timestamp: number;
}

export interface BatchVerificationResult {
  batchId: string;
  isValid: boolean;
  recalled: boolean;
  dataHash: string;
  expiryDate: string;
  custodyChain: SuiCustodyRecord[];
  suiObjectId: string;
}
