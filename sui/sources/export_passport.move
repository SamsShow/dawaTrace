/// ExportPassport — an NFT issued for each export-destined batch.
/// Verifiable by importing country health authorities via LayerZero.
/// Makes India's pharmaceutical exports cryptographically provable worldwide.
module dawa_trace::export_passport {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::String;
    use dawa_trace::bridge_cap::BridgeCapability;

    // =====================================================================
    // Structs
    // =====================================================================

    /// An NFT representing a WHO-GMP verified export batch.
    /// Bridgeable via LayerZero to 140+ chains for importing country verification.
    public struct ExportPassport has key, store {
        id: UID,
        /// Matches the Fabric batchId
        batch_id: String,
        /// Destination country / importing authority
        destination: String,
        /// Target chain for LayerZero bridge (e.g., "ethereum", "polygon")
        destination_chain: String,
        /// SHA-256 of Fabric batch state at shipment time
        fabric_data_hash: vector<u8>,
        /// WHO-GMP certificate reference
        gmp_cert_ref: String,
        /// Quantity shipped for export
        export_quantity: u64,
        /// Shipment date (ISO 8601)
        shipment_date: String,
        /// Has this passport been invalidated (e.g., batch recalled post-shipment)?
        invalidated: bool,
    }

    // =====================================================================
    // Events
    // =====================================================================

    public struct PassportMinted has copy, drop {
        batch_id: String,
        passport_id: ID,
        destination: String,
        destination_chain: String,
    }

    public struct PassportInvalidated has copy, drop {
        batch_id: String,
        passport_id: ID,
    }

    // =====================================================================
    // Functions
    // =====================================================================

    /// Mints an ExportPassport NFT at point of shipment.
    /// Passport is transferred to the manufacturer/exporter's address.
    /// Importing country health authority scans QR → verifies on their chain via LayerZero.
    public fun mint_export_passport(
        batch_id: String,
        destination: String,
        destination_chain: String,
        fabric_data_hash: vector<u8>,
        gmp_cert_ref: String,
        export_quantity: u64,
        shipment_date: String,
        exporter_address: address,
        _cap: &BridgeCapability,
        ctx: &mut TxContext,
    ) {
        let id = object::new(ctx);
        let passport_id = object::uid_to_inner(&id);

        event::emit(PassportMinted {
            batch_id,
            passport_id,
            destination,
            destination_chain,
        });

        let passport = ExportPassport {
            id,
            batch_id,
            destination,
            destination_chain,
            fabric_data_hash,
            gmp_cert_ref,
            export_quantity,
            shipment_date,
            invalidated: false,
        };

        transfer::transfer(passport, exporter_address);
    }

    /// Invalidates an ExportPassport if the batch is recalled post-shipment.
    public fun invalidate_passport(
        passport: &mut ExportPassport,
        _cap: &BridgeCapability,
    ) {
        passport.invalidated = true;

        event::emit(PassportInvalidated {
            batch_id: passport.batch_id,
            passport_id: object::uid_to_inner(&passport.id),
        });
    }

    // =====================================================================
    // Public read functions
    // =====================================================================

    public fun batch_id(passport: &ExportPassport): String { passport.batch_id }
    public fun destination(passport: &ExportPassport): String { passport.destination }
    public fun is_invalidated(passport: &ExportPassport): bool { passport.invalidated }
    public fun fabric_data_hash(passport: &ExportPassport): vector<u8> { passport.fabric_data_hash }
    public fun gmp_cert_ref(passport: &ExportPassport): String { passport.gmp_cert_ref }
}
