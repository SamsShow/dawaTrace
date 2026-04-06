/// BatchObject — on-chain record of a pharmaceutical batch.
/// Created when a manufacturer mints a batch on Sui.
/// Ownership transfers with each supply chain handoff, creating a public audit trail.
module dawa_trace::batch {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};
    use dawa_trace::bridge_cap::BridgeCapability;

    // =====================================================================
    // Error codes
    // =====================================================================

    const EAlreadyRecalled: u64 = 1;
    const EInvalidStatus: u64 = 2;

    // =====================================================================
    // Structs
    // =====================================================================

    /// On-chain batch record. Immutable fields (drug_name, manufacturer,
    /// composition, expiry_date, drug_license_number) are set at creation.
    /// Mutable fields (status, recalled, data_hash) update as state evolves.
    public struct BatchObject has key, store {
        id: UID,
        /// Unique batch identifier
        batch_id: String,
        /// Manufacturer's node ID
        manufacturer: String,
        /// Drug license number of the manufacturer
        drug_license_number: String,
        /// Human-readable drug name (e.g., "Paracetamol 500mg")
        drug_name: String,
        /// Drug composition summary
        composition: String,
        /// Expiry date as ISO 8601 string (e.g., "2027-12-31")
        expiry_date: String,
        /// Initial quantity manufactured
        quantity: u64,
        /// Batch lifecycle status: 0=ACTIVE, 1=IN_TRANSIT, 2=DISPENSED, 3=RECALLED, 4=SUSPENDED_REVIEW
        status: u8,
        /// SHA-256 of the batch data — integrity proof
        data_hash: vector<u8>,
        /// Set to true when CDSCO issues a recall
        recalled: bool,
        /// Unix timestamp (milliseconds) when this object was created on Sui
        created_at: u64,
    }

    // =====================================================================
    // Status constants
    // =====================================================================

    const STATUS_ACTIVE: u8 = 0;
    const STATUS_IN_TRANSIT: u8 = 1;
    const STATUS_DISPENSED: u8 = 2;
    const STATUS_RECALLED: u8 = 3;
    const STATUS_SUSPENDED_REVIEW: u8 = 4;

    // =====================================================================
    // Events
    // =====================================================================

    public struct BatchMinted has copy, drop {
        batch_id: String,
        object_id: ID,
        manufacturer: String,
    }

    public struct BatchRecalled has copy, drop {
        batch_id: String,
        object_id: ID,
    }

    public struct BatchStatusChanged has copy, drop {
        batch_id: String,
        object_id: ID,
        old_status: u8,
        new_status: u8,
    }

    public struct HashAnchored has copy, drop {
        batch_id: String,
        object_id: ID,
        new_hash: vector<u8>,
    }

    // =====================================================================
    // Functions
    // =====================================================================

    /// Creates a BatchObject and transfers ownership to the manufacturer's address.
    public fun mint_batch(
        batch_id: String,
        manufacturer: String,
        drug_license_number: String,
        drug_name: String,
        composition: String,
        expiry_date: String,
        quantity: u64,
        data_hash: vector<u8>,
        manufacturer_address: address,
        _cap: &BridgeCapability,
        ctx: &mut TxContext,
    ) {
        let id = object::new(ctx);
        let object_id = object::uid_to_inner(&id);

        event::emit(BatchMinted {
            batch_id: string::utf8(*string::bytes(&batch_id)),
            object_id,
            manufacturer: string::utf8(*string::bytes(&manufacturer)),
        });

        let batch = BatchObject {
            id,
            batch_id,
            manufacturer,
            drug_license_number,
            drug_name,
            composition,
            expiry_date,
            quantity,
            status: STATUS_ACTIVE,
            data_hash,
            recalled: false,
            created_at: tx_context::epoch_timestamp_ms(ctx),
        };

        transfer::transfer(batch, manufacturer_address);
    }

    /// Marks the batch as recalled — patient QR scan will return red screen.
    /// Idempotent guard: aborts if already recalled.
    public fun mark_recalled(
        batch: &mut BatchObject,
        _cap: &BridgeCapability,
    ) {
        assert!(!batch.recalled, EAlreadyRecalled);

        batch.recalled = true;
        let old_status = batch.status;
        batch.status = STATUS_RECALLED;

        event::emit(BatchRecalled {
            batch_id: string::utf8(*string::bytes(&batch.batch_id)),
            object_id: object::uid_to_inner(&batch.id),
        });

        event::emit(BatchStatusChanged {
            batch_id: string::utf8(*string::bytes(&batch.batch_id)),
            object_id: object::uid_to_inner(&batch.id),
            old_status,
            new_status: STATUS_RECALLED,
        });
    }

    /// Updates the batch status (e.g., ACTIVE → IN_TRANSIT → DISPENSED).
    /// Cannot set status to RECALLED via this function — use mark_recalled.
    public fun update_status(
        batch: &mut BatchObject,
        new_status: u8,
        _cap: &BridgeCapability,
    ) {
        assert!(new_status <= STATUS_SUSPENDED_REVIEW, EInvalidStatus);
        assert!(new_status != STATUS_RECALLED, EInvalidStatus);
        assert!(!batch.recalled, EAlreadyRecalled);

        let old_status = batch.status;
        batch.status = new_status;

        event::emit(BatchStatusChanged {
            batch_id: string::utf8(*string::bytes(&batch.batch_id)),
            object_id: object::uid_to_inner(&batch.id),
            old_status,
            new_status,
        });
    }

    /// Anchors an updated data hash after a state change (transfer, dispense).
    public fun anchor_hash(
        batch: &mut BatchObject,
        new_hash: vector<u8>,
        _cap: &BridgeCapability,
    ) {
        batch.data_hash = new_hash;

        event::emit(HashAnchored {
            batch_id: string::utf8(*string::bytes(&batch.batch_id)),
            object_id: object::uid_to_inner(&batch.id),
            new_hash,
        });
    }

    // =====================================================================
    // Public read functions
    // =====================================================================

    public fun verify_batch(batch: &BatchObject): (String, bool, vector<u8>, String, u8) {
        (
            batch.batch_id,
            batch.recalled,
            batch.data_hash,
            batch.expiry_date,
            batch.status,
        )
    }

    public fun batch_id(batch: &BatchObject): String { batch.batch_id }
    public fun is_recalled(batch: &BatchObject): bool { batch.recalled }
    public fun drug_name(batch: &BatchObject): String { batch.drug_name }
    public fun manufacturer(batch: &BatchObject): String { batch.manufacturer }
    public fun drug_license_number(batch: &BatchObject): String { batch.drug_license_number }
    public fun expiry_date(batch: &BatchObject): String { batch.expiry_date }
    public fun data_hash(batch: &BatchObject): vector<u8> { batch.data_hash }
    public fun status(batch: &BatchObject): u8 { batch.status }
    public fun quantity(batch: &BatchObject): u64 { batch.quantity }
    public fun created_at(batch: &BatchObject): u64 { batch.created_at }
}
