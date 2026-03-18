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

  type ChemistViolation {
    chemistId: String!
    violationCount: Int!
    suspended: Boolean!
    violationBatchIds: [String!]!
    lastViolationAt: Float!
  }

  type StatusCount {
    status: String!
    count: Int!
  }

  type ActivityPoint {
    date: String!
    batches: Int!
    recalls: Int!
  }

  type AnalyticsData {
    totalBatches: Int!
    activeBatches: Int!
    recalledBatches: Int!
    inTransitBatches: Int!
    dispensedBatches: Int!
    totalRecalls: Int!
    statusDistribution: [StatusCount!]!
    recentActivity: [ActivityPoint!]!
  }

  type Query {
    batch(batchId: String!): Batch
    batches: [Batch!]!
    recall(batchId: String!): RecallRecord
    recalls: [RecallRecord!]!
    verifyBatch(suiObjectId: String!): BatchVerification
    anomalies(limit: Int): [AnomalyAlert!]!
    chemistViolations: [ChemistViolation!]!
    chemistViolation(chemistId: String!): ChemistViolation
    analytics: AnalyticsData!
    reports: [Report!]!
    report(id: String!): Report
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

    liftSuspension(chemistId: String!): MutationResult!

    bulkRecall(batchIds: [String!]!, reason: String!): MutationResult!

    submitReport(batchId: String!, reason: String!, reporterAddress: String): MutationResult!
    resolveReport(id: String!, status: ReportStatus!): MutationResult!
  }

  type MutationResult {
    success: Boolean!
    message: String!
  }

  type Report {
    id: String!
    batchId: String!
    reporterAddress: String!
    reason: String!
    status: ReportStatus!
    createdAt: Float!
    resolvedAt: Float
    pointsAwarded: Int
  }

  enum ReportStatus {
    PENDING
    CONFIRMED
    REJECTED
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
