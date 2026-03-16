/// BridgeCapability — capability object held by the C-DAC bridge relay.
/// All state-mutating calls on Sui (mint, recall, award points) require
/// this capability. This pattern allows key rotation: C-DAC transfers
/// the capability to a new address without redeploying contracts.
module dawa_trace::bridge_cap {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    /// The capability object. Only one exists; held by C-DAC bridge relay.
    /// Has `key` only — not `store` — so it cannot be wrapped or transferred
    /// by anything other than explicit transfer calls in this module.
    public struct BridgeCapability has key {
        id: UID,
    }

    /// AdminCapability is held by the contract deployer (CDAC admin).
    /// Used to transfer BridgeCapability to a new relay address.
    public struct AdminCapability has key {
        id: UID,
    }

    /// Called once during publish. Creates BridgeCapability and AdminCapability,
    /// transfers both to the deployer.
    fun init(ctx: &mut TxContext) {
        let bridge_cap = BridgeCapability { id: object::new(ctx) };
        let admin_cap = AdminCapability { id: object::new(ctx) };
        transfer::transfer(bridge_cap, tx_context::sender(ctx));
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    /// Admin can transfer the BridgeCapability to a new relay address.
    /// Use this when rotating the C-DAC signing key.
    public fun transfer_bridge_cap(
        _admin: &AdminCapability,
        cap: BridgeCapability,
        new_relay: address,
    ) {
        transfer::transfer(cap, new_relay);
    }

    #[test_only]
    public fun create_for_testing(ctx: &mut TxContext): BridgeCapability {
        BridgeCapability { id: object::new(ctx) }
    }

    #[test_only]
    public fun destroy_for_testing(cap: BridgeCapability) {
        let BridgeCapability { id } = cap;
        object::delete(id);
    }
}
