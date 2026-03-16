#[test_only]
module dawa_trace::dawa_points_tests {
    use sui::test_scenario;
    use std::string;
    use dawa_trace::dawa_points;
    use dawa_trace::bridge_cap;

    const BRIDGE_RELAY: address = @0xBR1DGE;
    const REPORTER: address = @0xREP0RTER;
    const PHARMACY: address = @0xPHARMACY;

    #[test]
    fun test_award_points() {
        let mut scenario = test_scenario::begin(BRIDGE_RELAY);

        let cap = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));

        dawa_points::award_points(
            REPORTER,
            string::utf8(b"BATCH-001"),
            100,
            &cap,
            test_scenario::ctx(&mut scenario),
        );

        bridge_cap::destroy_for_testing(cap);

        test_scenario::next_tx(&mut scenario, REPORTER);
        {
            let ledger = test_scenario::take_from_sender<dawa_points::DawaPointsLedger>(&scenario);
            assert!(dawa_points::balance(&ledger) == 100, 0);
            assert!(dawa_points::total_earned(&ledger) == 100, 1);
            assert!(dawa_points::total_redeemed(&ledger) == 0, 2);
            test_scenario::return_to_sender(&scenario, ledger);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_redeem_points() {
        let mut scenario = test_scenario::begin(BRIDGE_RELAY);

        let cap = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
        dawa_points::award_points(
            REPORTER,
            string::utf8(b"BATCH-001"),
            100,
            &cap,
            test_scenario::ctx(&mut scenario),
        );
        bridge_cap::destroy_for_testing(cap);

        test_scenario::next_tx(&mut scenario, REPORTER);
        {
            let mut ledger = test_scenario::take_from_sender<dawa_points::DawaPointsLedger>(&scenario);

            let cap2 = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
            dawa_points::redeem_points(
                &mut ledger,
                50,
                string::utf8(b"JAN-AUSHADHI-PUNE-001"),
                &cap2,
                test_scenario::ctx(&mut scenario),
            );
            bridge_cap::destroy_for_testing(cap2);

            assert!(dawa_points::balance(&ledger) == 50, 0);
            assert!(dawa_points::total_redeemed(&ledger) == 50, 1);
            test_scenario::return_to_sender(&scenario, ledger);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = dawa_points::EInsufficientBalance)]
    fun test_redeem_insufficient_balance() {
        let mut scenario = test_scenario::begin(BRIDGE_RELAY);

        let cap = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
        dawa_points::award_points(
            REPORTER,
            string::utf8(b"BATCH-001"),
            10,
            &cap,
            test_scenario::ctx(&mut scenario),
        );
        bridge_cap::destroy_for_testing(cap);

        test_scenario::next_tx(&mut scenario, REPORTER);
        {
            let mut ledger = test_scenario::take_from_sender<dawa_points::DawaPointsLedger>(&scenario);

            let cap3 = bridge_cap::create_for_testing(test_scenario::ctx(&mut scenario));
            // Try to redeem more than balance — should abort
            dawa_points::redeem_points(
                &mut ledger,
                100, // only have 10
                string::utf8(b"JAN-AUSHADHI-PUNE-001"),
                &cap3,
                test_scenario::ctx(&mut scenario),
            );
            bridge_cap::destroy_for_testing(cap3);
            test_scenario::return_to_sender(&scenario, ledger);
        };

        test_scenario::end(scenario);
    }
}
