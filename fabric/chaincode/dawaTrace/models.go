package main

import "time"

// BatchStatus represents the lifecycle state of a pharmaceutical batch.
type BatchStatus string

const (
	StatusActive         BatchStatus = "ACTIVE"
	StatusInTransit      BatchStatus = "IN_TRANSIT"
	StatusDispensed      BatchStatus = "DISPENSED"
	StatusRecalled       BatchStatus = "RECALLED"
	StatusSuspendedReview BatchStatus = "SUSPENDED_REVIEW"

	// ChemistViolationThreshold is the number of unverified batch sales in 90 days
	// that triggers a license suspension review.
	ChemistViolationThreshold = 3

	// ViolationWindowDays defines the rolling window for chemist violation counting.
	ViolationWindowDays = 90
)

// Batch represents a pharmaceutical batch record on the Fabric ledger.
// It is the canonical source of regulatory truth for a batch.
type Batch struct {
	BatchID          string            `json:"batchId"`
	ManufacturerID   string            `json:"manufacturerId"`
	DrugName         string            `json:"drugName"`
	Composition      string            `json:"composition"`
	ExpiryDate       string            `json:"expiryDate"` // ISO 8601: 2026-12-31
	Quantity         int               `json:"quantity"`
	CurrentCustodian string            `json:"currentCustodian"`
	Status           BatchStatus       `json:"status"`
	Details          map[string]string `json:"details"`    // Additional metadata (license no, GMP cert, etc.)
	DataHash         string            `json:"dataHash"`   // SHA-256 of batch JSON at mint time; anchored to Sui
	SuiObjectID      string            `json:"suiObjectId"` // Set by bridge after Sui BatchObject creation
	CreatedAt        int64             `json:"createdAt"`   // Unix timestamp (seconds)
	UpdatedAt        int64             `json:"updatedAt"`   // Unix timestamp (seconds)
}

// TransferRecord tracks a single custody handoff between supply chain nodes.
type TransferRecord struct {
	RecordID    string `json:"recordId"`
	BatchID     string `json:"batchId"`
	FromNode    string `json:"fromNode"`
	ToNode      string `json:"toNode"`
	Quantity    int    `json:"quantity"`
	GPSLocation string `json:"gpsLocation"` // "lat,lng" at time of transfer
	Timestamp   int64  `json:"timestamp"`
	TxID        string `json:"txId"` // Fabric transaction ID for audit
}

// DispenseRecord logs a chemist dispensing event.
// PatientHash must be SHA-256(aadhaarNumber + batchId + timestamp) — NEVER raw Aadhaar.
type DispenseRecord struct {
	RecordID    string `json:"recordId"`
	BatchID     string `json:"batchId"`
	ChemistID   string `json:"chemistId"`
	Quantity    int    `json:"quantity"`
	PatientHash string `json:"patientHash"` // SHA-256, PDPB compliant — raw Aadhaar never stored
	Timestamp   int64  `json:"timestamp"`
}

// RecallRecord documents a CDSCO recall action.
type RecallRecord struct {
	BatchID       string `json:"batchId"`
	RegulatorID   string `json:"regulatorId"`
	Reason        string `json:"reason"`
	Timestamp     int64  `json:"timestamp"`
	SuiTxDigest   string `json:"suiTxDigest"` // Set by bridge after Sui markRecalled confirms
}

// ChemistViolation tracks unverified batch sales for license suspension logic.
type ChemistViolation struct {
	ChemistID         string   `json:"chemistId"`
	ViolationCount    int      `json:"violationCount"`
	Suspended         bool     `json:"suspended"` // true = SUSPENDED_REVIEW, human regulator must lift
	ViolationBatchIDs []string `json:"violationBatchIds"`
	LastViolationAt   int64    `json:"lastViolationAt"`
}

// LicenseNode represents a Fabric network participant (manufacturer, distributor, chemist).
type LicenseNode struct {
	NodeID      string `json:"nodeId"`
	NodeType    string `json:"nodeType"` // "MANUFACTURER" | "DISTRIBUTOR" | "C&F" | "STOCKIST" | "CHEMIST"
	LicenseNo   string `json:"licenseNo"`
	Active      bool   `json:"active"`
	RegisteredAt int64 `json:"registeredAt"`
}

// now returns the current Unix timestamp in seconds.
func now() int64 {
	return time.Now().Unix()
}
