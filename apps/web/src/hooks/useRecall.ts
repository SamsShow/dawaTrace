import { useMutation, gql } from '@apollo/client';

const ISSUE_RECALL = gql`
  mutation IssueRecall($batchId: String!, $reason: String!) {
    issueRecall(batchId: $batchId, reason: $reason) {
      success
      message
    }
  }
`;

export function useRecall() {
  const [issueRecall, { loading, error, data }] = useMutation(ISSUE_RECALL);

  const recall = async (batchId: string, reason: string) => {
    return issueRecall({ variables: { batchId, reason } });
  };

  return { recall, loading, error, success: data?.issueRecall?.success };
}
