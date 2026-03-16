/** TypeScript interfaces for Sui BatchObject fields returned by RPC */

export interface SuiBatchObject {
  objectId: string;
  batchId: string;
  manufacturer: string;
  drugName: string;
  composition: string;
  expiryDate: string;
  quantity: number;
  fabricDataHash: string; // hex
  recalled: boolean;
  createdAt: number;
}

export interface SuiCustodyRecord {
  objectId: string;
  batchId: string;
  fromNode: string;
  toNode: string;
  quantity: number;
  fabricDataHash: string;
  sequence: number;
  timestamp: number;
}

export interface BatchVerificationResult {
  batchId: string;
  isValid: boolean;
  recalled: boolean;
  fabricDataHash: string;
  expiryDate: string;
  custodyChain: SuiCustodyRecord[];
  suiObjectId: string;
}
