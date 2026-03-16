package main

import (
	"encoding/json"
	"testing"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-chaincode-go/shimtest"
)

func newTestStub(t *testing.T) *shimtest.MockStub {
	t.Helper()
	cc := new(SmartContract)
	stub := shimtest.NewMockStub("dawaTrace", cc)
	// Initialize chaincode
	res := stub.MockInit("init-tx", [][]byte{[]byte("init")})
	if res.Status != shim.OK {
		t.Fatalf("Failed to init chaincode: %s", res.Message)
	}
	return stub
}

func TestMintBatch(t *testing.T) {
	stub := newTestStub(t)

	res := stub.MockInvoke("tx1", [][]byte{
		[]byte("MintBatch"),
		[]byte("BATCH-001"),
		[]byte("MFG-001"),
		[]byte("Paracetamol 500mg"),
		[]byte("Paracetamol 500mg, Starch, Magnesium stearate"),
		[]byte("2027-12-31"),
		[]byte(`{"licenseNo":"MFG-LIC-001","gmpCert":"GMP-2024-001"}`),
		[]byte("10000"),
	})
	if res.Status != shim.OK {
		t.Fatalf("MintBatch failed: %s", res.Message)
	}

	// Verify batch was created
	batchBytes := stub.State["BATCH_BATCH-001"]
	if batchBytes == nil {
		t.Fatal("Batch not found in state after MintBatch")
	}

	var batch Batch
	if err := json.Unmarshal(batchBytes, &batch); err != nil {
		t.Fatalf("Failed to unmarshal batch: %v", err)
	}

	if batch.BatchID != "BATCH-001" {
		t.Errorf("Expected batchID BATCH-001, got %s", batch.BatchID)
	}
	if batch.Status != StatusActive {
		t.Errorf("Expected status ACTIVE, got %s", batch.Status)
	}
	if batch.DataHash == "" {
		t.Error("Expected non-empty DataHash")
	}
}

func TestMintBatch_Duplicate(t *testing.T) {
	stub := newTestStub(t)

	args := [][]byte{
		[]byte("MintBatch"),
		[]byte("BATCH-001"),
		[]byte("MFG-001"),
		[]byte("Paracetamol 500mg"),
		[]byte("Paracetamol 500mg"),
		[]byte("2027-12-31"),
		[]byte("{}"),
		[]byte("1000"),
	}
	stub.MockInvoke("tx1", args)
	res := stub.MockInvoke("tx2", args) // duplicate
	if res.Status == shim.OK {
		t.Error("Expected error for duplicate batch, got OK")
	}
}

func TestTransferBatch(t *testing.T) {
	stub := newTestStub(t)

	stub.MockInvoke("tx1", [][]byte{
		[]byte("MintBatch"),
		[]byte("BATCH-002"),
		[]byte("MFG-001"),
		[]byte("Amoxicillin 250mg"),
		[]byte("Amoxicillin trihydrate"),
		[]byte("2027-06-30"),
		[]byte("{}"),
		[]byte("5000"),
	})

	res := stub.MockInvoke("tx2", [][]byte{
		[]byte("TransferBatch"),
		[]byte("BATCH-002"),
		[]byte("MFG-001"),
		[]byte("DIST-001"),
		[]byte("5000"),
		[]byte("19.0760,72.8777"),
	})
	if res.Status != shim.OK {
		t.Fatalf("TransferBatch failed: %s", res.Message)
	}

	batchBytes := stub.State["BATCH_BATCH-002"]
	var batch Batch
	json.Unmarshal(batchBytes, &batch)
	if batch.CurrentCustodian != "DIST-001" {
		t.Errorf("Expected custodian DIST-001, got %s", batch.CurrentCustodian)
	}
}

func TestIssueRecall(t *testing.T) {
	stub := newTestStub(t)

	stub.MockInvoke("tx1", [][]byte{
		[]byte("MintBatch"),
		[]byte("BATCH-003"),
		[]byte("MFG-001"),
		[]byte("Suspicious Drug"),
		[]byte("Unknown compound"),
		[]byte("2027-01-01"),
		[]byte("{}"),
		[]byte("1000"),
	})

	res := stub.MockInvoke("tx2", [][]byte{
		[]byte("IssueRecall"),
		[]byte("BATCH-003"),
		[]byte("CDSCO-REGULATOR-001"),
		[]byte("Contamination detected in lab tests"),
	})
	if res.Status != shim.OK {
		t.Fatalf("IssueRecall failed: %s", res.Message)
	}

	batchBytes := stub.State["BATCH_BATCH-003"]
	var batch Batch
	json.Unmarshal(batchBytes, &batch)
	if batch.Status != StatusRecalled {
		t.Errorf("Expected status RECALLED, got %s", batch.Status)
	}
}

func TestFlagChemist_Suspension(t *testing.T) {
	stub := newTestStub(t)

	// Flag same chemist 3 times (threshold)
	for i := 1; i <= ChemistViolationThreshold; i++ {
		batchID := []byte("BATCH-" + string(rune('0'+i)))
		res := stub.MockInvoke("tx", [][]byte{
			[]byte("FlagChemist"),
			[]byte("CHEM-001"),
			batchID,
		})
		if res.Status != shim.OK {
			t.Fatalf("FlagChemist failed on attempt %d: %s", i, res.Message)
		}
	}

	violationBytes := stub.State["VIOLATION_CHEM-001"]
	if violationBytes == nil {
		t.Fatal("Violation record not found")
	}
	var v ChemistViolation
	json.Unmarshal(violationBytes, &v)
	if !v.Suspended {
		t.Errorf("Expected chemist to be suspended after %d violations", ChemistViolationThreshold)
	}
}

func TestDispenseMedicine_InvalidPatientHash(t *testing.T) {
	stub := newTestStub(t)

	stub.MockInvoke("tx1", [][]byte{
		[]byte("MintBatch"),
		[]byte("BATCH-004"),
		[]byte("MFG-001"),
		[]byte("Test Drug"),
		[]byte("Test"),
		[]byte("2027-12-31"),
		[]byte("{}"),
		[]byte("100"),
	})

	// Invalid patient hash (too short)
	res := stub.MockInvoke("tx2", [][]byte{
		[]byte("DispenseMedicine"),
		[]byte("BATCH-004"),
		[]byte("CHEM-001"),
		[]byte("10"),
		[]byte("short"),
	})
	if res.Status == shim.OK {
		t.Error("Expected error for invalid patient hash, got OK")
	}
}
