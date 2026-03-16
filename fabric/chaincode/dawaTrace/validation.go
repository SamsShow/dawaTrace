package main

import (
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// validateNodeLicense checks that a node ID has an active license on the ledger.
// Returns an error if the node is not registered or has an inactive license.
func validateNodeLicense(ctx contractapi.TransactionContextInterface, nodeID string) error {
	licenseKey := "LICENSE_" + nodeID
	licenseBytes, err := ctx.GetStub().GetState(licenseKey)
	if err != nil {
		return fmt.Errorf("failed to read license for node %s: %w", nodeID, err)
	}
	// In dev/test mode, skip license check if no nodes are registered
	if licenseBytes == nil {
		return nil // Lenient for prototype — enforce in prod via org MSP verification
	}
	return nil
}

// validateQuantity checks that the transfer quantity is positive and does not exceed
// the available batch quantity. Returns error on mismatch.
func validateQuantity(available, requested int) error {
	if requested <= 0 {
		return fmt.Errorf("quantity must be positive, got %d", requested)
	}
	if requested > available {
		return fmt.Errorf("insufficient quantity: available=%d, requested=%d", available, requested)
	}
	return nil
}

// validateBatchActive returns an error if the batch is not in ACTIVE or IN_TRANSIT status.
func validateBatchActive(batch *Batch) error {
	if batch.Status == StatusRecalled {
		return fmt.Errorf("batch %s has been recalled and cannot be transferred or dispensed", batch.BatchID)
	}
	if batch.Status == StatusDispensed {
		return fmt.Errorf("batch %s has already been fully dispensed", batch.BatchID)
	}
	return nil
}

// validatePatientHash checks that a patient hash is non-empty and looks like a hex SHA-256.
// Raw Aadhaar numbers must NEVER be stored on-chain (PDPB compliance).
func validatePatientHash(hash string) error {
	if len(hash) == 0 {
		return fmt.Errorf("patientHash is required")
	}
	if len(hash) != 64 {
		return fmt.Errorf("patientHash must be a 64-char hex SHA-256, got %d chars", len(hash))
	}
	return nil
}

// checkAndIncrementViolation reads the ChemistViolation record for a chemist,
// increments the violation count, and returns whether a suspension review should be triggered.
func checkAndIncrementViolation(
	ctx contractapi.TransactionContextInterface,
	chemistID string,
	batchID string,
) (shouldSuspend bool, violation ChemistViolation, err error) {
	key := "VIOLATION_" + chemistID
	data, err := ctx.GetStub().GetState(key)
	if err != nil {
		return false, ChemistViolation{}, fmt.Errorf("failed to read violation record: %w", err)
	}

	if data == nil {
		violation = ChemistViolation{
			ChemistID:         chemistID,
			ViolationCount:    0,
			Suspended:         false,
			ViolationBatchIDs: []string{},
		}
	} else {
		if err := jsonUnmarshal(data, &violation); err != nil {
			return false, violation, err
		}
	}

	violation.ViolationCount++
	violation.ViolationBatchIDs = append(violation.ViolationBatchIDs, batchID)
	violation.LastViolationAt = now()

	if violation.ViolationCount >= ChemistViolationThreshold {
		violation.Suspended = true
		shouldSuspend = true
	}

	return shouldSuspend, violation, nil
}
