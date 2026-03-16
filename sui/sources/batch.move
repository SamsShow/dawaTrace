/// BatchObject — the public digital twin of a Hyperledger Fabric batch record.
/// Created by the C-DAC bridge relay when a batch is minted on Fabric.
/// Ownership transfers with each supply chain handoff, creating a public audit trail.
/// All regulatory truth lives on Fabric; this is the public verification window.
module dawa_trace::batch {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};
    use dawa_trace::bridge_cap::BridgeCapability;

    // =====================================================================
    // Structs
    // =====================================================================

    /// The public digital twin of a Fabric batch record.
    /// Immutable fields (drug_name, manufacturer, composition, expiry_date)
    /// are set at creation and never change.
    /// Mutable fields (recalled, fabric_data_hash) update as state evolves on Fabric.
    public struct BatchObject has key, store {
        id: UID,
        /// Matches the Fabric batchId — primary cross-chain identifier
        batch_id: String,
        /// Manufacturer's Fabric node ID / Aadhaar-linked DID
        manufacturer: String,
        /// Human-readable drug name (e.g., "Paracetamol 500mg")
        drug_name: String,
        /// Drug composition summary
        composition: String,
        /// Expiry date as ISO 8601 string (e.g., "2027-12-31")
        expiry_date: String,
        /// Initial quantity manufactured
        quantity: u64,
        /// SHA-256 of the Fabric batch JSON at mint time — proves Fabric↔Sui parity
        fabric_data_hash: vector<u8>,
        /// Set to true by bridge relay when CDSCO issues a recall on Fabric
        recalled: bool,
        /// Unix timestamp (seconds) when this object was created on Sui
        created_at: u64,
    }

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

    public struct HashAnchored has copy, drop {
        batch_id: String,
        object_id: ID,
        new_hash: vector<u8>,
    }

    // =====================================================================
    // Functions
    // =====================================================================

    /// Called by bridge relay when a MintEvent is received from Fabric.
    /// Creates a BatchObject and transfers ownership to the manufacturer's address.
    public fun mint_batch(
        batch_id: String,
        manufacturer: String,
        drug_name: String,
        composition: String,
        expiry_date: String,
        quantity: u64,
        fabric_data_hash: vector<u8>,
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
            drug_name,
            composition,
            expiry_date,
            quantity,
            fabric_data_hash,
            recalled: false,
            created_at: tx_context::epoch(ctx),
        };

        transfer::transfer(batch, manufacturer_address);
    }

    /// Called by bridge relay when a RecallEvent is received from Fabric.
    /// Marks the batch as recalled — patient app QR scan will return red screen.
    /// This must complete within 60 seconds of the Fabric recall being committed.
    public fun mark_recalled(
        batch: &mut BatchObject,
        _cap: &BridgeCapability,
    ) {
        batch.recalled = true;

        event::emit(BatchRecalled {
            batch_id: string::utf8(*string::bytes(&batch.batch_id)),
            object_id: object::uid_to_inner(&batch.id),
        });
    }

    /// Called by bridge relay on each Fabric state change (transfer, dispense)
    /// to anchor the updated data hash, maintaining Fabric↔Sui hash parity.
    public fun anchor_hash(
        batch: &mut BatchObject,
        new_hash: vector<u8>,
        _cap: &BridgeCapability,
    ) {
        batch.fabric_data_hash = new_hash;

        event::emit(HashAnchored {
            batch_id: string::utf8(*string::bytes(&batch.batch_id)),
            object_id: object::uid_to_inner(&batch.id),
            new_hash,
        });
    }

    // =====================================================================
    // Public read functions (called by patient app, chemist app, export partners)
    // =====================================================================

    /// Returns the key verification fields for a batch.
    /// Called millions of times daily by the patient QR scan flow.
    public fun verify_batch(batch: &BatchObject): (String, bool, vector<u8>, String) {
        (
            batch.batch_id,
            batch.recalled,
            batch.fabric_data_hash,
            batch.expiry_date,
        )
    }

    public fun batch_id(batch: &BatchObject): String { batch.batch_id }
    public fun is_recalled(batch: &BatchObject): bool { batch.recalled }
    public fun drug_name(batch: &BatchObject): String { batch.drug_name }
    public fun manufacturer(batch: &BatchObject): String { batch.manufacturer }
    public fun expiry_date(batch: &BatchObject): String { batch.expiry_date }
    public fun fabric_data_hash(batch: &BatchObject): vector<u8> { batch.fabric_data_hash }
}
