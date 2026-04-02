export default {
  nav: {
    overview: 'अवलोकन',
    batches: 'बैच',
    recalls: 'वापसी',
    analytics: 'विश्लेषण',
  },
  sidebar: {
    subtitle: 'नियामक डैशबोर्ड',
    signOut: 'साइन आउट',
  },
  dashboard: {
    title: 'अवलोकन',
    activeRecalls: 'सक्रिय वापसी',
    recentBatches: 'हाल के बैच',
    viewAll: 'सभी देखें',
    noBatches: 'अभी तक कोई बैच चेन पर नहीं।',
    mintFirst: 'पहला बैच बनाएं',
    stats: {
      activeBatches: 'सक्रिय बैच',
      recalledBatches: 'वापस किए गए बैच',
      totalOnChain: 'कुल चेन पर',
      suiAnchored: 'Sui एंकर',
    },
  },
  batches: {
    title: 'बैच',
    mint: 'बैच बनाएं',
    search: 'बैच खोजें…',
    noResults: 'कोई बैच नहीं मिला।',
  },
  recalls: {
    title: 'वापसी',
    issue: 'वापसी जारी करें',
    noRecalls: 'कोई सक्रिय वापसी नहीं।',
    columns: {
      batch: 'बैच',
      reason: 'कारण',
      issuedBy: 'जारी किया',
      date: 'तारीख',
      sui: 'Sui',
    },
  },
  analytics: {
    title: 'विश्लेषण',
  },
  common: {
    loading: 'लोड हो रहा है…',
    error: 'त्रुटि',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    search: 'खोजें',
    filter: 'फ़िल्टर',
    viewDetails: 'विवरण देखें',
  },
  status: {
    ACTIVE: 'सक्रिय',
    IN_TRANSIT: 'पारगमन में',
    DISPENSED: 'वितरित',
    RECALLED: 'वापस',
    SUSPENDED_REVIEW: 'निलंबित समीक्षा',
  },
} as const;
