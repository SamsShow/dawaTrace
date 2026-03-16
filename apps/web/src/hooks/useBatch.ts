import { useQuery, gql } from '@apollo/client';
import type { Batch } from '../lib/types';

const GET_BATCH = gql`
  query GetBatch($batchId: String!) {
    batch(batchId: $batchId) {
      batchId
      manufacturerId
      drugName
      composition
      expiryDate
      quantity
      currentCustodian
      status
      dataHash
      suiObjectId
      createdAt
      updatedAt
    }
  }
`;

export function useBatch(batchId: string) {
  return useQuery<{ batch: Batch }>(GET_BATCH, {
    variables: { batchId },
    skip: !batchId,
  });
}

const VERIFY_BATCH = gql`
  query VerifyBatch($suiObjectId: String!) {
    verifyBatch(suiObjectId: $suiObjectId) {
      batchId
      isValid
      recalled
      fabricDataHash
      expiryDate
      custodyChain {
        objectId
        fromNode
        toNode
        quantity
        sequence
        timestamp
      }
      suiObjectId
    }
  }
`;

export function useVerifyBatch(suiObjectId: string) {
  return useQuery(VERIFY_BATCH, {
    variables: { suiObjectId },
    skip: !suiObjectId,
  });
}
