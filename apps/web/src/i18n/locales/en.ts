export default {
  nav: {
    overview: 'Overview',
    batches: 'Batches',
    recalls: 'Recalls',
    analytics: 'Analytics',
  },
  sidebar: {
    subtitle: 'Regulatory Dashboard',
    signOut: 'Sign out',
  },
  dashboard: {
    title: 'Overview',
    activeRecalls: 'Active Recalls',
    recentBatches: 'Recent Batches',
    viewAll: 'View all',
    noBatches: 'No batches on chain yet.',
    mintFirst: 'Mint the first batch',
    stats: {
      activeBatches: 'Active batches',
      recalledBatches: 'Recalled batches',
      totalOnChain: 'Total on chain',
      suiAnchored: 'Sui anchored',
    },
  },
  batches: {
    title: 'Batches',
    mint: 'Mint batch',
    search: 'Search batches…',
    noResults: 'No batches found.',
  },
  recalls: {
    title: 'Recalls',
    issue: 'Issue recall',
    noRecalls: 'No active recalls.',
    columns: {
      batch: 'Batch',
      reason: 'Reason',
      issuedBy: 'Issued by',
      date: 'Date',
      sui: 'Sui',
    },
  },
  analytics: {
    title: 'Analytics',
  },
  common: {
    loading: 'Loading…',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter',
    viewDetails: 'View details',
  },
  status: {
    ACTIVE: 'Active',
    IN_TRANSIT: 'In Transit',
    DISPENSED: 'Dispensed',
    RECALLED: 'Recalled',
    SUSPENDED_REVIEW: 'Suspended Review',
  },
} as const;
