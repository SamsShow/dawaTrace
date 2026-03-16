import { useState } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import * as SecureStore from 'expo-secure-store';

const SUI_RPC = process.env['EXPO_PUBLIC_SUI_RPC_URL'] ?? 'https://fullnode.devnet.sui.io:443';
const suiClient = new SuiClient({ url: SUI_RPC });

export interface ZkLoginState {
  step: 'idle' | 'generating_nonce' | 'oauth_redirect' | 'proving' | 'done' | 'error';
  suiAddress?: string;
  error?: string;
}

const SECURE_STORE_KEYS = {
  EPHEMERAL_PRIVATE_KEY: 'zklogin_ephemeral_private_key',
  ZK_PROOF: 'zklogin_zk_proof',
  SUI_ADDRESS: 'zklogin_sui_address',
  MAX_EPOCH: 'zklogin_max_epoch',
};

/**
 * Sui zkLogin hook for Aadhaar-linked authentication.
 *
 * Flow (5 phases):
 * Phase 1: generateNonce(ephemeralKeyPair, maxEpoch, randomness)
 * Phase 2: Redirect user to OAuth provider (Aadhaar OIDC or Google fallback)
 * Phase 3: Exchange JWT → zkProof via /api/zkproof endpoint
 * Phase 4: Assemble ZkLoginSignature, derive Sui address from JWT sub + salt
 * Phase 5: Store ephemeralKeyPair + zkProof in expo-secure-store
 *
 * Note: Full Aadhaar OIDC zkLogin requires UIDAI to support OIDC (planned).
 * For Phase 1 prototype, Google OAuth is used as the OIDC provider.
 * The Sui address is derived the same way regardless of OIDC provider.
 */
export function useZkLogin() {
  const [state, setState] = useState<ZkLoginState>({ step: 'idle' });

  /**
   * Phase 1 + 2: Generate ephemeral keypair, compute nonce, initiate OAuth.
   */
  const startLogin = async (oauthProvider: 'google' | 'aadhaar' = 'google') => {
    setState({ step: 'generating_nonce' });

    try {
      // Generate ephemeral keypair (short-lived, expires with maxEpoch)
      const ephemeralKeyPair = new Ed25519Keypair();

      // Get current Sui epoch for maxEpoch calculation
      const { epoch } = await suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 10; // Valid for 10 epochs (~10 hours on mainnet)

      // Store ephemeral private key securely
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.EPHEMERAL_PRIVATE_KEY,
        Buffer.from(ephemeralKeyPair.getSecretKey()).toString('hex')
      );
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.MAX_EPOCH, String(maxEpoch));

      // Generate randomness for nonce
      const randomness = generateRandomness();

      // Compute zkLogin nonce
      // nonce = Poseidon(eph_public_key, max_epoch, randomness)
      // In production: use @mysten/sui/zklogin computeNonce
      const nonce = computeNonce(
        ephemeralKeyPair.getPublicKey().toBase64(),
        maxEpoch,
        randomness
      );

      setState({ step: 'oauth_redirect' });

      // TODO: Open OAuth provider in browser
      // In React Native with Expo: use expo-web-browser + expo-auth-session
      // The OAuth redirect URI returns a JWT that we pass to Phase 3
      console.log('OAuth nonce:', nonce, 'maxEpoch:', maxEpoch);
      console.log('OAuth provider:', oauthProvider);
      // Placeholder: trigger browser auth session here

    } catch (err) {
      setState({ step: 'error', error: String(err) });
    }
  };

  /**
   * Phase 3 + 4 + 5: Exchange JWT from OAuth for zkProof, derive address.
   * Called after OAuth redirect returns the JWT.
   */
  const completeLogin = async (jwtToken: string, userSalt: string) => {
    setState({ step: 'proving' });

    try {
      const apiUrl = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000';

      // Phase 3: Get zkProof from our API (which calls Sui's zkLogin proof service)
      const proofRes = await fetch(`${apiUrl}/api/zkproof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt: jwtToken, userSalt }),
      });
      if (!proofRes.ok) throw new Error('Failed to get zkProof');
      const { zkProof } = await proofRes.json() as { zkProof: unknown };

      // Phase 4: Derive Sui address from JWT sub + userSalt
      // In production: use @mysten/sui/zklogin jwtToAddress
      const suiAddress = deriveSuiAddress(jwtToken, userSalt);

      // Phase 5: Store proof + address securely
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.ZK_PROOF, JSON.stringify(zkProof));
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.SUI_ADDRESS, suiAddress);

      setState({ step: 'done', suiAddress });

    } catch (err) {
      setState({ step: 'error', error: String(err) });
    }
  };

  const getStoredAddress = async (): Promise<string | null> => {
    return SecureStore.getItemAsync(SECURE_STORE_KEYS.SUI_ADDRESS);
  };

  const clearSession = async () => {
    await Promise.all(
      Object.values(SECURE_STORE_KEYS).map((key) => SecureStore.deleteItemAsync(key))
    );
    setState({ step: 'idle' });
  };

  return { state, startLogin, completeLogin, getStoredAddress, clearSession };
}

// ============================================================
// Helpers (placeholder implementations for prototype)
// In production: use @mysten/sui/zklogin utilities
// ============================================================

function generateRandomness(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString('hex');
}

function computeNonce(ephemeralPublicKey: string, maxEpoch: number, randomness: string): string {
  // Placeholder: real implementation uses Poseidon hash from @mysten/sui/zklogin
  return Buffer.from(`${ephemeralPublicKey}:${maxEpoch}:${randomness}`).toString('base64').slice(0, 32);
}

function deriveSuiAddress(jwtToken: string, userSalt: string): string {
  // Placeholder: real implementation uses jwtToAddress from @mysten/sui/zklogin
  const payload = jwtToken.split('.')[1];
  const decoded = JSON.parse(Buffer.from(payload ?? '', 'base64').toString('utf-8')) as { sub?: string };
  return `0x${Buffer.from(`${decoded.sub ?? ''}:${userSalt}`).toString('hex').slice(0, 40)}`;
}
