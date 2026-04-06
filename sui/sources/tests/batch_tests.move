#[test_only]
module dawa_trace::batch_tests {
    use sui::test_scenario;
    use std::string;
    use dawa_trace::batch;
    use dawa_trace::bridge_cap;

    const OPERATOR: address = @0xB1;
    const MANUFACTURER: address = @0xA1;

    #[test]
    fun test_mint_batch_success() {
        let mut scenario = test_scenario::begin(OPERATOR);

        let ctx = test_scenario::ctx(&mut scenario);
        let cap = bridge_cap::create_for_testing(ctx);

        let batch_id = string::utf8(b"BATCH-001");
        let manufacturer = string::utf8(b"MFG-001");
        let drug_license = string::utf8(b"DL-MH-2024-001234");
        let drug_name = string::utf8(b"Paracetamol 500mg");
        let composition = string::utf8(b"Paracetamol 500mg, Starch");
        let expiry_date = string::utf8(b"2027-12-31");
        let hash = b"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

        batch::mint_batch(
            batch_id,
            manufacturer,
            drug_license,
            drug_name,
            composition,
            expiry_date,
            10000,
            hash,
            MANUFACTURER,
            &cap,
            test_scenario::ctx(&mut scenario),
        );

        bridge_cap::destroy_for_testing(cap);

        test_scenario::next_tx(&mut scenario, MANUFACTURER);
        {
            let batch_obj = test_scenario::take_from_sender<batch::BatchObject>(&scenario);
            assert!(batch::batch_id(&batch_obj) == string::utf8(b"BATCH-001"), 0);
            assert!(!batch::is_recalled(&batch_obj), 1);
            assert!(batch::drug_name(&batch_obj) == string::utf8(b"Paracetamol 500mg"), 2);
            assert!(batch::drug_license_number(&batch_obj) == string::utf8(b"DL-MH-2024-001234"), 3);
            assert!(batch::status(&batch_obj) == 0, 4); // STATUS_ACTIVE
            test_scenario::return_to_sender(&scenario, batch_obj);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_mark_recalled() {
        let mut scenario = test_scenario::begin(OPERATOR);

        let ctx = test_scenario::ctx(&mut scenario);
        let cap = bridge_cap::create_for_testing(ctx);

        batch::mint_batch(
            string::utf8(b"BATCH-002"),
            string::utf8(b"MFG-001"),
            string::utf8(b"DL-GJ-2024-005678"),
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
            assert!(batch::status(&batch_obj) == 0, 1); // ACTIVE

            let cap2 = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
            batch::mark_recalled(&mut batch_obj, &cap2);
            bridge_cap::destroy_for_testing(cap2);

            assert!(batch::is_recalled(&batch_obj), 2);
            assert!(batch::status(&batch_obj) == 3, 3); // RECALLED
            test_scenario::return_to_sender(&scenario, batch_obj);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = batch::EAlreadyRecalled)]
    fun test_double_recall_fails() {
        let mut scenario = test_scenario::begin(OPERATOR);

        let ctx = test_scenario::ctx(&mut scenario);
        let cap = bridge_cap::create_for_testing(ctx);

        batch::mint_batch(
            string::utf8(b"BATCH-003"),
            string::utf8(b"MFG-001"),
            string::utf8(b"DL-MH-2024-009999"),
            string::utf8(b"Test Drug"),
            string::utf8(b"Test composition"),
            string::utf8(b"2027-01-01"),
            1000,
            b"0000000000000000000000000000000000000000000000000000000000000000",
            MANUFACTURER,
            &cap,
            test_scenario::ctx(&mut scenario),
        );

        bridge_cap::destroy_for_testing(cap);

        test_scenario::next_tx(&mut scenario, MANUFACTURER);
        {
            let mut batch_obj = test_scenario::take_from_sender<batch::BatchObject>(&scenario);

            let cap2 = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
            batch::mark_recalled(&mut batch_obj, &cap2);
            // Second recall should abort
            batch::mark_recalled(&mut batch_obj, &cap2);

            bridge_cap::destroy_for_testing(cap2);
            test_scenario::return_to_sender(&scenario, batch_obj);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_anchor_hash_update() {
        let mut scenario = test_scenario::begin(OPERATOR);

        let ctx = test_scenario::ctx(&mut scenario);
        let cap = bridge_cap::create_for_testing(ctx);

        let original_hash = b"0000000000000000000000000000000000000000000000000000000000000000";
        batch::mint_batch(
            string::utf8(b"BATCH-004"),
            string::utf8(b"MFG-001"),
            string::utf8(b"DL-MH-2024-001111"),
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
            assert!(batch::data_hash(&batch_obj) == original_hash, 0);

            let new_hash = b"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
            let cap3 = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
            batch::anchor_hash(&mut batch_obj, new_hash, &cap3);
            bridge_cap::destroy_for_testing(cap3);

            assert!(batch::data_hash(&batch_obj) == new_hash, 1);
            test_scenario::return_to_sender(&scenario, batch_obj);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_status() {
        let mut scenario = test_scenario::begin(OPERATOR);

        let ctx = test_scenario::ctx(&mut scenario);
        let cap = bridge_cap::create_for_testing(ctx);

        batch::mint_batch(
            string::utf8(b"BATCH-005"),
            string::utf8(b"MFG-001"),
            string::utf8(b"DL-KA-2024-002222"),
            string::utf8(b"Metformin 500mg"),
            string::utf8(b"Metformin HCl"),
            string::utf8(b"2027-06-30"),
            5000,
            b"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd",
            MANUFACTURER,
            &cap,
            test_scenario::ctx(&mut scenario),
        );

        bridge_cap::destroy_for_testing(cap);

        test_scenario::next_tx(&mut scenario, MANUFACTURER);
        {
            let mut batch_obj = test_scenario::take_from_sender<batch::BatchObject>(&scenario);
            assert!(batch::status(&batch_obj) == 0, 0); // ACTIVE

            let cap2 = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
            batch::update_status(&mut batch_obj, 1, &cap2); // IN_TRANSIT
            assert!(batch::status(&batch_obj) == 1, 1);

            batch::update_status(&mut batch_obj, 2, &cap2); // DISPENSED
            assert!(batch::status(&batch_obj) == 2, 2);

            bridge_cap::destroy_for_testing(cap2);
            test_scenario::return_to_sender(&scenario, batch_obj);
        };

        test_scenario::end(scenario);
    }
}
