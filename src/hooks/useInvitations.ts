import { gql, useQuery, useMutation } from '@apollo/client';

const MY_INVITATIONS = gql`
  query MyInvitations {
    myInvitations {
      id inviteCode inviterNodeId targetRole targetOrgName
      expiresAt usedBy usedAt createdAt
    }
  }
`;

const CREATE_INVITATION = gql`
  mutation CreateInvitation($targetRole: String!, $targetOrgName: String) {
    createInvitation(targetRole: $targetRole, targetOrgName: $targetOrgName) {
      id inviteCode inviterNodeId targetRole targetOrgName
      expiresAt usedBy usedAt createdAt
    }
  }
`;

export function useMyInvitations() {
  return useQuery(MY_INVITATIONS);
}

export function useCreateInvitation() {
  return useMutation(CREATE_INVITATION, {
    refetchQueries: [{ query: MY_INVITATIONS }],
  });
}
