#[test_only]
module dawa_trace::batch_tests {
    use sui::test_scenario;
    use std::string;
    use dawa_trace::batch;
    use dawa_trace::bridge_cap;

    const BRIDGE_RELAY: address = @0xBR1DGE;
    const MANUFACTURER: address = @0xMFG001;

    #[test]
    fun test_mint_batch_success() {
        let mut scenario = test_scenario::begin(BRIDGE_RELAY);

        // Create BridgeCapability for testing
        let ctx = test_scenario::ctx(&mut scenario);
        let cap = bridge_cap::create_for_testing(ctx);

        // Mint a batch
        let batch_id = string::utf8(b"BATCH-001");
        let manufacturer = string::utf8(b"MFG-001");
        let drug_name = string::utf8(b"Paracetamol 500mg");
        let composition = string::utf8(b"Paracetamol 500mg, Starch");
        let expiry_date = string::utf8(b"2027-12-31");
        let fabric_hash = b"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

        batch::mint_batch(
            batch_id,
            manufacturer,
            drug_name,
            composition,
            expiry_date,
            10000,
            fabric_hash,
            MANUFACTURER,
            &cap,
            test_scenario::ctx(&mut scenario),
        );

        bridge_cap::destroy_for_testing(cap);

        // Verify batch was transferred to manufacturer
        test_scenario::next_tx(&mut scenario, MANUFACTURER);
        {
            let batch_obj = test_scenario::take_from_sender<batch::BatchObject>(&scenario);
            assert!(batch::batch_id(&batch_obj) == string::utf8(b"BATCH-001"), 0);
            assert!(!batch::is_recalled(&batch_obj), 1);
            assert!(batch::drug_name(&batch_obj) == string::utf8(b"Paracetamol 500mg"), 2);
            test_scenario::return_to_sender(&scenario, batch_obj);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_mark_recalled() {
        let mut scenario = test_scenario::begin(BRIDGE_RELAY);

        let ctx = test_scenario::ctx(&mut scenario);
        let cap = bridge_cap::create_for_testing(ctx);

        batch::mint_batch(
            string::utf8(b"BATCH-002"),
            string::utf8(b"MFG-001"),
            string::utf8(b"Amoxicillin 250mg"),
            string::utf8(b"Amoxicillin trihydrate"),
            string::utf8(b"2027-06-30"),
            5000,
            b"deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            MANUFACTURER,
            &cap,
            test_scenario::ctx(&mut scenario),
        );

        bridge_cap::destroy_for_testing(cap);

        test_scenario::next_tx(&mut scenario, MANUFACTURER);
        {
            let mut batch_obj = test_scenario::take_from_sender<batch::BatchObject>(&scenario);
            assert!(!batch::is_recalled(&batch_obj), 0);

            // Create a new cap for recall
            let cap2 = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
            batch::mark_recalled(&mut batch_obj, &cap2);
            bridge_cap::destroy_for_testing(cap2);

            assert!(batch::is_recalled(&batch_obj), 1);
            test_scenario::return_to_sender(&scenario, batch_obj);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_anchor_hash_update() {
        let mut scenario = test_scenario::begin(BRIDGE_RELAY);

        let ctx = test_scenario::ctx(&mut scenario);
        let cap = bridge_cap::create_for_testing(ctx);

        let original_hash = b"0000000000000000000000000000000000000000000000000000000000000000";
        batch::mint_batch(
            string::utf8(b"BATCH-003"),
            string::utf8(b"MFG-001"),
            string::utf8(b"Test Drug"),
            string::utf8(b"Test composition"),
            string::utf8(b"2027-01-01"),
            1000,
            original_hash,
            MANUFACTURER,
            &cap,
            test_scenario::ctx(&mut scenario),
        );

        bridge_cap::destroy_for_testing(cap);

        test_scenario::next_tx(&mut scenario, MANUFACTURER);
        {
            let mut batch_obj = test_scenario::take_from_sender<batch::BatchObject>(&scenario);
            assert!(batch::fabric_data_hash(&batch_obj) == original_hash, 0);

            let new_hash = b"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
            let cap3 = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
            batch::anchor_hash(&mut batch_obj, new_hash, &cap3);
            bridge_cap::destroy_for_testing(cap3);

            assert!(batch::fabric_data_hash(&batch_obj) == new_hash, 1);
            test_scenario::return_to_sender(&scenario, batch_obj);
        };

        test_scenario::end(scenario);
    }
}
