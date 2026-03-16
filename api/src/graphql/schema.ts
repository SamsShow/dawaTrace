export const typeDefs = `#graphql
  type Batch {
    batchId: String!
    manufacturerId: String!
    drugName: String!
    composition: String!
    expiryDate: String!
    quantity: Int!
    currentCustodian: String!
    status: BatchStatus!
    dataHash: String!
    suiObjectId: String!
    createdAt: Float!
    updatedAt: Float!
  }

  enum BatchStatus {
    ACTIVE
    IN_TRANSIT
    DISPENSED
    RECALLED
    SUSPENDED_REVIEW
  }

  type RecallRecord {
    batchId: String!
    regulatorId: String!
    reason: String!
    timestamp: Float!
    suiTxDigest: String!
  }

  type CustodyRecord {
    objectId: String!
    batchId: String!
    fromNode: String!
    toNode: String!
    quantity: Int!
    sequence: Int!
    timestamp: Float!
  }

  type BatchVerification {
    batchId: String!
    isValid: Boolean!
    recalled: Boolean!
    fabricDataHash: String!
    expiryDate: String!
    custodyChain: [CustodyRecord!]!
    suiObjectId: String!
  }

  type AnomalyAlert {
    batchId: String!
    type: String!
    description: String!
    detectedAt: Float!
  }

  type Query {
    batch(batchId: String!): Batch
    recall(batchId: String!): RecallRecord
    verifyBatch(suiObjectId: String!): BatchVerification
    anomalies(limit: Int): [AnomalyAlert!]!
  }

  type Mutation {
    mintBatch(
      batchId: String!
      drugName: String!
      composition: String!
      expiryDate: String!
      quantity: Int!
      details: String
    ): MutationResult!

    transferBatch(
      batchId: String!
      toNode: String!
      quantity: Int!
      gpsLocation: String
    ): MutationResult!

    issueRecall(
      batchId: String!
      reason: String!
    ): MutationResult!

    flagChemist(
      chemistId: String!
      batchId: String!
    ): MutationResult!
  }

  type MutationResult {
    success: Boolean!
    message: String!
  }

  type Subscription {
    batchEvent: BatchEventPayload!
    recallIssued: RecallRecord!
  }

  type BatchEventPayload {
    eventType: String!
    batchId: String!
    timestamp: Float!
  }
`;
