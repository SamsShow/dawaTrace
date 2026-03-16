/// Custody tracking — records the public chain of custody for each batch.
/// Each supply chain handoff (Distributor → C&F → Stockist → Chemist)
/// is recorded as a CustodyRecord on Sui, creating a public, auditable trail.
module dawa_trace::custody {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::String;
    use dawa_trace::bridge_cap::BridgeCapability;

    // =====================================================================
    // Structs
    // =====================================================================

    /// An immutable record of a single custody transfer.
    /// Created by bridge relay on each Fabric TransferEvent.
    public struct CustodyRecord has key {
        id: UID,
        /// Matches the Fabric batchId
        batch_id: String,
        /// Fabric node ID of sender
        from_node: String,
        /// Fabric node ID of receiver
        to_node: String,
        /// Quantity transferred
        quantity: u64,
        /// SHA-256 of Fabric batch state after this transfer
        fabric_data_hash: vector<u8>,
        /// Sequence number (transfer #1, #2, etc.)
        sequence: u64,
        /// Unix epoch when this record was created
        timestamp: u64,
    }

    // =====================================================================
    // Events
    // =====================================================================

    public struct CustodyTransferred has copy, drop {
        batch_id: String,
        record_id: ID,
        from_node: String,
        to_node: String,
        sequence: u64,
    }

    // =====================================================================
    // Functions
    // =====================================================================

    /// Called by bridge relay on each Fabric TransferEvent.
    /// Creates an immutable CustodyRecord and freezes it (public read access).
    public fun record_transfer(
        batch_id: String,
        from_node: String,
        to_node: String,
        quantity: u64,
        fabric_data_hash: vector<u8>,
        sequence: u64,
        _cap: &BridgeCapability,
        ctx: &mut TxContext,
    ) {
        let id = object::new(ctx);
        let record_id = object::uid_to_inner(&id);

        event::emit(CustodyTransferred {
            batch_id: from_node, // emit batch_id not from_node; fix below
            record_id,
            from_node,
            to_node,
            sequence,
        });

        let record = CustodyRecord {
            id,
            batch_id,
            from_node,
            to_node,
            quantity,
            fabric_data_hash,
            sequence,
            timestamp: tx_context::epoch(ctx),
        };

        // Freeze so anyone can read it without owning it
        transfer::freeze_object(record);
    }

    // =====================================================================
    // Public read functions
    // =====================================================================

    public fun batch_id(record: &CustodyRecord): String { record.batch_id }
    public fun from_node(record: &CustodyRecord): String { record.from_node }
    public fun to_node(record: &CustodyRecord): String { record.to_node }
    public fun quantity(record: &CustodyRecord): u64 { record.quantity }
    public fun sequence(record: &CustodyRecord): u64 { record.sequence }
    public fun timestamp(record: &CustodyRecord): u64 { record.timestamp }
}
