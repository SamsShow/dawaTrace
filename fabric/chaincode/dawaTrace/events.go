package main

// Event name constants — the bridge relay (bridge/src/listener.ts) subscribes
// to these exact strings. A mismatch silently drops events and breaks the recall SLA.
const (
	EventMintBatch      = "MintEvent"
	EventTransferBatch  = "TransferEvent"
	EventDispense       = "DispenseEvent"
	EventRecall         = "RecallEvent"
	EventChemistFlagged = "ChemistFlaggedEvent"
	EventSuiObjectSet   = "SuiObjectSetEvent"
)

// MintEvent is emitted when a new batch is created on Fabric.
// The bridge relay uses this to create a corresponding BatchObject on Sui.
type MintEvent struct {
	BatchID        string `json:"batchId"`
	ManufacturerID string `json:"manufacturerId"`
	DrugName       string `json:"drugName"`
	Composition    string `json:"composition"`
	ExpiryDate     string `json:"expiryDate"`
	Quantity       int    `json:"quantity"`
	DataHash       string `json:"dataHash"` // SHA-256 of full Batch JSON — anchored to Sui
	Timestamp      int64  `json:"timestamp"`
}

// TransferEvent is emitted on each custody handoff.
// The bridge anchors the updated data hash to Sui to maintain audit parity.
type TransferEvent struct {
	BatchID     string `json:"batchId"`
	FromNode    string `json:"fromNode"`
	ToNode      string `json:"toNode"`
	Quantity    int    `json:"quantity"`
	DataHash    string `json:"dataHash"` // SHA-256 of Batch state after transfer
	Timestamp   int64  `json:"timestamp"`
}

// DispenseEvent is emitted when a chemist dispenses medicine.
type DispenseEvent struct {
	BatchID   string `json:"batchId"`
	ChemistID string `json:"chemistId"`
	Quantity  int    `json:"quantity"`
	Timestamp int64  `json:"timestamp"`
}

// RecallEvent is emitted when CDSCO issues a recall.
// The bridge must anchor this to Sui within 60 seconds.
// Urgent=true routes this to the URGENT priority lane in the bridge queue.
type RecallEvent struct {
	BatchID     string `json:"batchId"`
	RegulatorID string `json:"regulatorId"`
	Reason      string `json:"reason"`
	DataHash    string `json:"dataHash"` // SHA-256 of RecallRecord
	Timestamp   int64  `json:"timestamp"`
	Urgent      bool   `json:"urgent"` // Always true — drives bridge priority queue
}

// ChemistFlaggedEvent is emitted when a chemist's violation count is incremented.
type ChemistFlaggedEvent struct {
	ChemistID      string `json:"chemistId"`
	ViolationCount int    `json:"violationCount"`
	Suspended      bool   `json:"suspended"`
	Timestamp      int64  `json:"timestamp"`
}

// SuiObjectSetEvent is emitted by the API after the bridge confirms Sui object creation,
// allowing the ledger to record the Sui Object ID back onto the Batch record.
type SuiObjectSetEvent struct {
	BatchID     string `json:"batchId"`
	SuiObjectID string `json:"suiObjectId"`
	Timestamp   int64  `json:"timestamp"`
}
