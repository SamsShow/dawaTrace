import { useQuery, useMutation, gql } from '@apollo/client';

export interface ChemistViolation {
  chemistId: string;
  violationCount: number;
  suspended: boolean;
  violationBatchIds: string[];
  lastViolationAt: number;
}

interface MutationResult {
  success: boolean;
  message: string;
}

const CHEMIST_VIOLATIONS_QUERY = gql`
  query ChemistViolations {
    chemistViolations {
      chemistId
      violationCount
      suspended
      violationBatchIds
      lastViolationAt
    }
  }
`;

const ADMIN_OVERVIEW_QUERY = gql`
  query AdminOverview {
    batches {
      batchId
      status
    }
    recalls {
      batchId
    }
    chemistViolations {
      chemistId
      violationCount
      suspended
      violationBatchIds
      lastViolationAt
    }
  }
`;

const LIFT_SUSPENSION_MUTATION = gql`
  mutation LiftSuspension($chemistId: String!) {
    liftSuspension(chemistId: $chemistId) {
      success
      message
    }
  }
`;

const BULK_RECALL_MUTATION = gql`
  mutation BulkRecall($batchIds: [String!]!, $reason: String!) {
    bulkRecall(batchIds: $batchIds, reason: $reason) {
      success
      message
    }
  }
`;

export function useChemistViolations() {
  return useQuery<{ chemistViolations: ChemistViolation[] }>(CHEMIST_VIOLATIONS_QUERY, {
    pollInterval: 30_000,
  });
}

export function useAdminOverview() {
  return useQuery<{
    batches: { batchId: string; status: string }[];
    recalls: { batchId: string }[];
    chemistViolations: ChemistViolation[];
  }>(ADMIN_OVERVIEW_QUERY, {
    pollInterval: 30_000,
  });
}

export function useLiftSuspension() {
  return useMutation<{ liftSuspension: MutationResult }>(LIFT_SUSPENSION_MUTATION, {
    refetchQueries: [{ query: CHEMIST_VIOLATIONS_QUERY }, { query: ADMIN_OVERVIEW_QUERY }],
  });
}

export function useBulkRecall() {
  return useMutation<{ bulkRecall: MutationResult }>(BULK_RECALL_MUTATION, {
    refetchQueries: [{ query: ADMIN_OVERVIEW_QUERY }],
  });
}
