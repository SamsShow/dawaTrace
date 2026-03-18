package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract defines the DawaTrace chaincode.
type SmartContract struct {
	contractapi.Contract
}

// jsonMarshal is a helper to serialize to JSON bytes.
func jsonMarshal(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}

// jsonUnmarshal is a helper to deserialize from JSON bytes.
func jsonUnmarshal(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}

// hashJSON computes SHA-256 of the JSON representation of v.
func hashJSON(v interface{}) (string, error) {
	data, err := jsonMarshal(v)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]), nil
}

// MintBatch creates a new pharmaceutical batch record on the Fabric ledger
// and emits a MintEvent for the bridge relay to create a Sui BatchObject.
func (s *SmartContract) MintBatch(
	ctx contractapi.TransactionContextInterface,
	batchID string,
	mfgID string,
	drugName string,
	composition string,
	expiryDate string,
	detailsJSON string,
	qty int,
) error {
	// Check batch does not already exist
	existing, err := ctx.GetStub().GetState("BATCH_" + batchID)
	if err != nil {
		return fmt.Errorf("failed to read world state: %w", err)
	}
	if existing != nil {
		return fmt.Errorf("batch %s already exists", batchID)
	}

	if err := validateNodeLicense(ctx, mfgID); err != nil {
		return err
	}

	var details map[string]string
	if detailsJSON != "" {
		if err := jsonUnmarshal([]byte(detailsJSON), &details); err != nil {
			return fmt.Errorf("invalid detailsJSON: %w", err)
		}
	}

	t := now()
	batch := Batch{
		BatchID:          batchID,
		ManufacturerID:   mfgID,
		DrugName:         drugName,
		Composition:      composition,
		ExpiryDate:       expiryDate,
		Quantity:         qty,
		CurrentCustodian: mfgID,
		Status:           StatusActive,
		Details:          details,
		SuiObjectID:      "", // Set later by bridge via UpdateSuiObjectID
		CreatedAt:        t,
		UpdatedAt:        t,
	}

	dataHash, err := hashJSON(batch)
	if err != nil {
		return fmt.Errorf("failed to hash batch: %w", err)
	}
	batch.DataHash = dataHash

	batchBytes, err := jsonMarshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %w", err)
	}

	if err := ctx.GetStub().PutState("BATCH_"+batchID, batchBytes); err != nil {
		return fmt.Errorf("failed to write batch to state: %w", err)
	}

	// Emit MintEvent — bridge relay subscribes to this to create the Sui BatchObject
	event := MintEvent{
		BatchID:        batchID,
		ManufacturerID: mfgID,
		DrugName:       drugName,
		Composition:    composition,
		ExpiryDate:     expiryDate,
		Quantity:       qty,
		DataHash:       dataHash,
		Timestamp:      t,
	}
	eventBytes, err := jsonMarshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal MintEvent: %w", err)
	}
	return ctx.GetStub().SetEvent(EventMintBatch, eventBytes)
}

// TransferBatch records a custody handoff between supply chain nodes.
// Validates that the sender is the current custodian and quantity is valid.
func (s *SmartContract) TransferBatch(
	ctx contractapi.TransactionContextInterface,
	batchID string,
	fromNode string,
	toNode string,
	qty int,
	gpsLocation string,
) error {
	batchBytes, err := ctx.GetStub().GetState("BATCH_" + batchID)
	if err != nil {
		return fmt.Errorf("failed to read batch: %w", err)
	}
	if batchBytes == nil {
		return fmt.Errorf("batch %s not found", batchID)
	}

	var batch Batch
	if err := jsonUnmarshal(batchBytes, &batch); err != nil {
		return fmt.Errorf("failed to unmarshal batch: %w", err)
	}

	if err := validateBatchActive(&batch); err != nil {
		return err
	}
	if batch.CurrentCustodian != fromNode {
		return fmt.Errorf("fromNode %s is not the current custodian (%s)", fromNode, batch.CurrentCustodian)
	}
	if err := validateQuantity(batch.Quantity, qty); err != nil {
		return err
	}
	if err := validateNodeLicense(ctx, toNode); err != nil {
		return err
	}

	batch.CurrentCustodian = toNode
	batch.Status = StatusInTransit
	batch.UpdatedAt = now()

	dataHash, err := hashJSON(batch)
	if err != nil {
		return fmt.Errorf("failed to hash batch: %w", err)
	}
	batch.DataHash = dataHash

	batchBytes, err = jsonMarshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %w", err)
	}
	if err := ctx.GetStub().PutState("BATCH_"+batchID, batchBytes); err != nil {
		return fmt.Errorf("failed to update batch state: %w", err)
	}

	// Record transfer history
	txID := ctx.GetStub().GetTxID()
	record := TransferRecord{
		RecordID:    txID,
		BatchID:     batchID,
		FromNode:    fromNode,
		ToNode:      toNode,
		Quantity:    qty,
		GPSLocation: gpsLocation,
		Timestamp:   batch.UpdatedAt,
		TxID:        txID,
	}
	recordBytes, err := jsonMarshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal transfer record: %w", err)
	}
	if err := ctx.GetStub().PutState("TRANSFER_"+txID, recordBytes); err != nil {
		return fmt.Errorf("failed to write transfer record: %w", err)
	}

	event := TransferEvent{
		BatchID:   batchID,
		FromNode:  fromNode,
		ToNode:    toNode,
		Quantity:  qty,
		DataHash:  dataHash,
		Timestamp: batch.UpdatedAt,
	}
	eventBytes, err := jsonMarshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal TransferEvent: %w", err)
	}
	return ctx.GetStub().SetEvent(EventTransferBatch, eventBytes)
}

// DispenseMedicine logs a chemist dispensing a batch to a patient.
// PatientHash must be SHA-256(aadhaarNumber + batchId + timestamp) — raw Aadhaar never on-chain.
func (s *SmartContract) DispenseMedicine(
	ctx contractapi.TransactionContextInterface,
	batchID string,
	chemistID string,
	qty int,
	patientHash string,
) error {
	if err := validatePatientHash(patientHash); err != nil {
		return err
	}

	batchBytes, err := ctx.GetStub().GetState("BATCH_" + batchID)
	if err != nil {
		return fmt.Errorf("failed to read batch: %w", err)
	}
	if batchBytes == nil {
		return fmt.Errorf("batch %s not found", batchID)
	}

	var batch Batch
	if err := jsonUnmarshal(batchBytes, &batch); err != nil {
		return fmt.Errorf("failed to unmarshal batch: %w", err)
	}

	if err := validateBatchActive(&batch); err != nil {
		return err
	}
	if err := validateQuantity(batch.Quantity, qty); err != nil {
		return err
	}

	batch.Quantity -= qty
	batch.UpdatedAt = now()
	if batch.Quantity == 0 {
		batch.Status = StatusDispensed
	}

	batchBytes, err = jsonMarshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %w", err)
	}
	if err := ctx.GetStub().PutState("BATCH_"+batchID, batchBytes); err != nil {
		return fmt.Errorf("failed to update batch state: %w", err)
	}

	txID := ctx.GetStub().GetTxID()
	dispense := DispenseRecord{
		RecordID:    txID,
		BatchID:     batchID,
		ChemistID:   chemistID,
		Quantity:    qty,
		PatientHash: patientHash,
		Timestamp:   batch.UpdatedAt,
	}
	dispenseBytes, err := jsonMarshal(dispense)
	if err != nil {
		return fmt.Errorf("failed to marshal dispense record: %w", err)
	}
	if err := ctx.GetStub().PutState("DISPENSE_"+txID, dispenseBytes); err != nil {
		return fmt.Errorf("failed to write dispense record: %w", err)
	}

	event := DispenseEvent{
		BatchID:   batchID,
		ChemistID: chemistID,
		Quantity:  qty,
		Timestamp: batch.UpdatedAt,
	}
	eventBytes, err := jsonMarshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal DispenseEvent: %w", err)
	}
	return ctx.GetStub().SetEvent(EventDispense, eventBytes)
}

// IssueRecall marks a batch as RECALLED and emits a RecallEvent.
// The bridge relay must anchor this to Sui within 60 seconds (recall SLA).
func (s *SmartContract) IssueRecall(
	ctx contractapi.TransactionContextInterface,
	batchID string,
	regulatorID string,
	reason string,
) error {
	batchBytes, err := ctx.GetStub().GetState("BATCH_" + batchID)
	if err != nil {
		return fmt.Errorf("failed to read batch: %w", err)
	}
	if batchBytes == nil {
		return fmt.Errorf("batch %s not found", batchID)
	}

	var batch Batch
	if err := jsonUnmarshal(batchBytes, &batch); err != nil {
		return fmt.Errorf("failed to unmarshal batch: %w", err)
	}

	if batch.Status == StatusRecalled {
		return fmt.Errorf("batch %s is already recalled", batchID)
	}

	batch.Status = StatusRecalled
	batch.UpdatedAt = now()

	batchBytes, err = jsonMarshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %w", err)
	}
	if err := ctx.GetStub().PutState("BATCH_"+batchID, batchBytes); err != nil {
		return fmt.Errorf("failed to update batch state: %w", err)
	}

	// Record recall
	recall := RecallRecord{
		BatchID:     batchID,
		RegulatorID: regulatorID,
		Reason:      reason,
		Timestamp:   batch.UpdatedAt,
		SuiTxDigest: "", // Set by bridge after Sui confirmation
	}
	recallHash, err := hashJSON(recall)
	if err != nil {
		return fmt.Errorf("failed to hash recall: %w", err)
	}
	recallBytes, err := jsonMarshal(recall)
	if err != nil {
		return fmt.Errorf("failed to marshal recall: %w", err)
	}
	if err := ctx.GetStub().PutState("RECALL_"+batchID, recallBytes); err != nil {
		return fmt.Errorf("failed to write recall record: %w", err)
	}

	// Emit RecallEvent — bridge must process within 60s (Urgent=true → priority queue)
	event := RecallEvent{
		BatchID:     batchID,
		RegulatorID: regulatorID,
		Reason:      reason,
		DataHash:    recallHash,
		Timestamp:   batch.UpdatedAt,
		Urgent:      true,
	}
	eventBytes, err := jsonMarshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal RecallEvent: %w", err)
	}
	return ctx.GetStub().SetEvent(EventRecall, eventBytes)
}

// FlagChemist increments a chemist's violation counter for selling unverified batches.
// At ChemistViolationThreshold (3 in 90 days), triggers a license suspension review.
func (s *SmartContract) FlagChemist(
	ctx contractapi.TransactionContextInterface,
	chemistID string,
	batchID string,
) error {
	shouldSuspend, violation, err := checkAndIncrementViolation(ctx, chemistID, batchID)
	if err != nil {
		return err
	}

	violationBytes, err := jsonMarshal(violation)
	if err != nil {
		return fmt.Errorf("failed to marshal violation: %w", err)
	}
	if err := ctx.GetStub().PutState("VIOLATION_"+chemistID, violationBytes); err != nil {
		return fmt.Errorf("failed to write violation record: %w", err)
	}

	event := ChemistFlaggedEvent{
		ChemistID:      chemistID,
		ViolationCount: violation.ViolationCount,
		Suspended:      shouldSuspend,
		Timestamp:      now(),
	}
	eventBytes, err := jsonMarshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal ChemistFlaggedEvent: %w", err)
	}
	return ctx.GetStub().SetEvent(EventChemistFlagged, eventBytes)
}

// UpdateSuiObjectID is called by the API gateway after the bridge confirms
// the Sui BatchObject was created, recording the Sui Object ID on the batch.
func (s *SmartContract) UpdateSuiObjectID(
	ctx contractapi.TransactionContextInterface,
	batchID string,
	suiObjectID string,
) error {
	batchBytes, err := ctx.GetStub().GetState("BATCH_" + batchID)
	if err != nil {
		return fmt.Errorf("failed to read batch: %w", err)
	}
	if batchBytes == nil {
		return fmt.Errorf("batch %s not found", batchID)
	}

	var batch Batch
	if err := jsonUnmarshal(batchBytes, &batch); err != nil {
		return fmt.Errorf("failed to unmarshal batch: %w", err)
	}

	batch.SuiObjectID = suiObjectID
	batch.UpdatedAt = now()

	batchBytes, err = jsonMarshal(batch)
	if err != nil {
		return fmt.Errorf("failed to marshal batch: %w", err)
	}
	return ctx.GetStub().PutState("BATCH_"+batchID, batchBytes)
}

// GetBatch returns the full batch record by ID.
func (s *SmartContract) GetBatch(
	ctx contractapi.TransactionContextInterface,
	batchID string,
) (*Batch, error) {
	batchBytes, err := ctx.GetStub().GetState("BATCH_" + batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to read batch: %w", err)
	}
	if batchBytes == nil {
		return nil, fmt.Errorf("batch %s not found", batchID)
	}

	var batch Batch
	if err := jsonUnmarshal(batchBytes, &batch); err != nil {
		return nil, fmt.Errorf("failed to unmarshal batch: %w", err)
	}
	return &batch, nil
}

// GetRecall returns the recall record for a batch.
func (s *SmartContract) GetRecall(
	ctx contractapi.TransactionContextInterface,
	batchID string,
) (*RecallRecord, error) {
	recallBytes, err := ctx.GetStub().GetState("RECALL_" + batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to read recall: %w", err)
	}
	if recallBytes == nil {
		return nil, fmt.Errorf("no recall found for batch %s", batchID)
	}

	var recall RecallRecord
	if err := jsonUnmarshal(recallBytes, &recall); err != nil {
		return nil, fmt.Errorf("failed to unmarshal recall: %w", err)
	}
	return &recall, nil
}

// GetAllBatches returns all batch records from the ledger by scanning keys with the BATCH_ prefix.
func (s *SmartContract) GetAllBatches(ctx contractapi.TransactionContextInterface) ([]*Batch, error) {
	// GetStateByRange with "BATCH_" to "BATCH_\xff" captures all BATCH_ prefixed keys.
	resultsIterator, err := ctx.GetStub().GetStateByRange("BATCH_", "BATCH_\xff")
	if err != nil {
		return nil, fmt.Errorf("failed to get batch range: %w", err)
	}
	defer resultsIterator.Close()

	var batches []*Batch
	for resultsIterator.HasNext() {
		kv, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate batches: %w", err)
		}

		var batch Batch
		if err := jsonUnmarshal(kv.Value, &batch); err != nil {
			return nil, fmt.Errorf("failed to unmarshal batch at key %s: %w", kv.Key, err)
		}
		batches = append(batches, &batch)
	}

	if batches == nil {
		batches = []*Batch{}
	}
	return batches, nil
}

// GetAllRecalls returns all recall records from the ledger by scanning keys with the RECALL_ prefix.
func (s *SmartContract) GetAllRecalls(ctx contractapi.TransactionContextInterface) ([]*RecallRecord, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("RECALL_", "RECALL_\xff")
	if err != nil {
		return nil, fmt.Errorf("failed to get recall range: %w", err)
	}
	defer resultsIterator.Close()

	var recalls []*RecallRecord
	for resultsIterator.HasNext() {
		kv, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate recalls: %w", err)
		}

		var recall RecallRecord
		if err := jsonUnmarshal(kv.Value, &recall); err != nil {
			return nil, fmt.Errorf("failed to unmarshal recall at key %s: %w", kv.Key, err)
		}
		recalls = append(recalls, &recall)
	}

	if recalls == nil {
		recalls = []*RecallRecord{}
	}
	return recalls, nil
}

// GetChemistViolation returns the violation record for a single chemist.
func (s *SmartContract) GetChemistViolation(
	ctx contractapi.TransactionContextInterface,
	chemistID string,
) (*ChemistViolation, error) {
	data, err := ctx.GetStub().GetState("VIOLATION_" + chemistID)
	if err != nil {
		return nil, fmt.Errorf("failed to read violation record: %w", err)
	}
	if data == nil {
		return nil, fmt.Errorf("no violation record found for chemist %s", chemistID)
	}

	var violation ChemistViolation
	if err := jsonUnmarshal(data, &violation); err != nil {
		return nil, fmt.Errorf("failed to unmarshal violation: %w", err)
	}
	return &violation, nil
}

// GetAllChemistViolations returns all chemist violation records from the ledger.
func (s *SmartContract) GetAllChemistViolations(ctx contractapi.TransactionContextInterface) ([]*ChemistViolation, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("VIOLATION_", "VIOLATION_\xff")
	if err != nil {
		return nil, fmt.Errorf("failed to get violation range: %w", err)
	}
	defer resultsIterator.Close()

	var violations []*ChemistViolation
	for resultsIterator.HasNext() {
		kv, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate violations: %w", err)
		}

		var violation ChemistViolation
		if err := jsonUnmarshal(kv.Value, &violation); err != nil {
			return nil, fmt.Errorf("failed to unmarshal violation at key %s: %w", kv.Key, err)
		}
		violations = append(violations, &violation)
	}

	if violations == nil {
		violations = []*ChemistViolation{}
	}
	return violations, nil
}

// LiftSuspension resets a chemist's violation count and removes the suspension.
// Only a regulator should call this (enforced via org MSP in production).
func (s *SmartContract) LiftSuspension(
	ctx contractapi.TransactionContextInterface,
	chemistID string,
	regulatorID string,
) error {
	key := "VIOLATION_" + chemistID
	data, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read violation record: %w", err)
	}
	if data == nil {
		return fmt.Errorf("no violation record found for chemist %s", chemistID)
	}

	var violation ChemistViolation
	if err := jsonUnmarshal(data, &violation); err != nil {
		return fmt.Errorf("failed to unmarshal violation: %w", err)
	}

	if !violation.Suspended {
		return fmt.Errorf("chemist %s is not currently suspended", chemistID)
	}

	violation.ViolationCount = 0
	violation.Suspended = false
	violation.ViolationBatchIDs = []string{}
	violation.LastViolationAt = now()

	violationBytes, err := jsonMarshal(violation)
	if err != nil {
		return fmt.Errorf("failed to marshal violation: %w", err)
	}
	if err := ctx.GetStub().PutState(key, violationBytes); err != nil {
		return fmt.Errorf("failed to write violation record: %w", err)
	}

	return nil
}
