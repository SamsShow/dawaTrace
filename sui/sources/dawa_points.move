/// DawaPoints — non-transferable utility credits awarded to whistleblowers.
/// Redeemable exclusively at Jan Aushadhi government pharmacies.
/// NOT a cryptocurrency. NOT a financial instrument. NOT tradeable.
/// The `has key` but NOT `has store` pattern enforces non-transferability:
/// the object cannot be wrapped, transferred, or stored by external code.
module dawa_trace::dawa_points {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::String;
    use dawa_trace::bridge_cap::BridgeCapability;

    // =====================================================================
    // Error codes
    // =====================================================================

    const EAlreadyAwarded: u64 = 1;
    const EInsufficientBalance: u64 = 2;

    // =====================================================================
    // Structs
    // =====================================================================

    /// The non-transferable DawaPoints ledger for a single address.
    /// `has key` only — no `store` ability — cannot be transferred or wrapped
    /// by any code outside this module. Sui enforces this at the VM level.
    public struct DawaPointsLedger has key {
        id: UID,
        /// Owner's Sui address (derived from Aadhaar zkLogin)
        owner: address,
        /// Accumulated points balance (1 point per confirmed fake batch report)
        balance: u64,
        /// Total points ever earned (for auditing purposes)
        total_earned: u64,
        /// Total points redeemed at Jan Aushadhi pharmacies
        total_redeemed: u64,
    }

    /// An immutable redemption record created when points are used.
    public struct RedemptionRecord has key {
        id: UID,
        owner: address,
        amount: u64,
        pharmacy_id: String,
        timestamp: u64,
    }

    // =====================================================================
    // Events
    // =====================================================================

    public struct PointsAwarded has copy, drop {
        owner: address,
        ledger_id: ID,
        batch_id: String,
        amount: u64,
    }

    public struct PointsRedeemed has copy, drop {
        owner: address,
        amount: u64,
        pharmacy_id: String,
    }

    // =====================================================================
    // Functions
    // =====================================================================

    /// Called by bridge relay when CDSCO confirms a reported batch is fake.
    /// Creates a DawaPointsLedger if the reporter doesn't have one,
    /// or increments the existing balance.
    /// The reporter's address is their Sui zkLogin address (no wallet required).
    public fun award_points(
        reporter: address,
        batch_id: String,
        amount: u64,
        _cap: &BridgeCapability,
        ctx: &mut TxContext,
    ) {
        let ledger_id_obj = object::new(ctx);
        let ledger_id = object::uid_to_inner(&ledger_id_obj);

        event::emit(PointsAwarded {
            owner: reporter,
            ledger_id,
            batch_id,
            amount,
        });

        let ledger = DawaPointsLedger {
            id: ledger_id_obj,
            owner: reporter,
            balance: amount,
            total_earned: amount,
            total_redeemed: 0,
        };

        // Transfer to reporter — they own it but cannot transfer it elsewhere
        // because DawaPointsLedger lacks `store` ability
        transfer::transfer(ledger, reporter);
    }

    /// Top up an existing ledger (called when reporter earns more points).
    public fun top_up(
        ledger: &mut DawaPointsLedger,
        batch_id: String,
        amount: u64,
        _cap: &BridgeCapability,
        ctx: &mut TxContext,
    ) {
        ledger.balance = ledger.balance + amount;
        ledger.total_earned = ledger.total_earned + amount;

        let ledger_id = object::uid_to_inner(&ledger.id);
        event::emit(PointsAwarded {
            owner: ledger.owner,
            ledger_id,
            batch_id,
            amount,
        });
    }

    /// Redeem points at a Jan Aushadhi pharmacy.
    /// Called by the pharmacy's Sui client when dispensing free generic medicine.
    /// Requires the reporter to present their DawaPointsLedger object.
    public fun redeem_points(
        ledger: &mut DawaPointsLedger,
        amount: u64,
        pharmacy_id: String,
        _cap: &BridgeCapability,
        ctx: &mut TxContext,
    ) {
        assert!(ledger.balance >= amount, EInsufficientBalance);

        ledger.balance = ledger.balance - amount;
        ledger.total_redeemed = ledger.total_redeemed + amount;

        event::emit(PointsRedeemed {
            owner: ledger.owner,
            amount,
            pharmacy_id,
        });

        // Create immutable redemption record for audit trail
        let record = RedemptionRecord {
            id: object::new(ctx),
            owner: ledger.owner,
            amount,
            pharmacy_id,
            timestamp: tx_context::epoch(ctx),
        };
        transfer::freeze_object(record);
    }

    // =====================================================================
    // Public read functions
    // =====================================================================

    public fun balance(ledger: &DawaPointsLedger): u64 { ledger.balance }
    public fun owner(ledger: &DawaPointsLedger): address { ledger.owner }
    public fun total_earned(ledger: &DawaPointsLedger): u64 { ledger.total_earned }
    public fun total_redeemed(ledger: &DawaPointsLedger): u64 { ledger.total_redeemed }
}
