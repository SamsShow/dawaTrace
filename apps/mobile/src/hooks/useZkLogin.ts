import { useState, useCallback, useRef } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import {
  generateNonce,
  generateRandomness,
  jwtToAddress,
  getZkLoginSignature,
  genAddressSeed,
} from '@mysten/sui/zklogin';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

WebBrowser.maybeCompleteAuthSession();

const SUI_RPC =
  process.env['EXPO_PUBLIC_SUI_RPC_URL'] ?? 'https://fullnode.devnet.sui.io:443';
const suiClient = new SuiClient({ url: SUI_RPC });

const GOOGLE_CLIENT_ID =
  process.env['EXPO_PUBLIC_GOOGLE_CLIENT_ID'] ?? '';

const PROVER_URL =
  process.env['EXPO_PUBLIC_ZKPROOF_PROVER_URL'] ??
  process.env['EXPO_PUBLIC_API_URL'] ??
  'http://localhost:3000';

const USER_SALT_API_URL =
  process.env['EXPO_PUBLIC_USER_SALT_API_URL'] ??
  `${PROVER_URL}/api/user-salt`;

/** Number of Sui epochs the ephemeral keypair remains valid. */
const EPOCH_VALIDITY = 10;

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
  RANDOMNESS: 'zklogin_randomness',
  USER_SALT: 'zklogin_user_salt',
  JWT_TOKEN: 'zklogin_jwt_token',
} as const;

const googleDiscovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * Sui zkLogin hook for Aadhaar-linked authentication.
 *
 * Flow (5 phases):
 * Phase 1: generateNonce(ephemeralKeyPair, maxEpoch, randomness)
 * Phase 2: Redirect user to OAuth provider (Aadhaar OIDC or Google fallback)
 * Phase 3: Exchange JWT for zkProof via prover service
 * Phase 4: Derive Sui address from JWT sub + salt using jwtToAddress
 * Phase 5: Store ephemeralKeyPair + zkProof in expo-secure-store
 *
 * Note: Full Aadhaar OIDC zkLogin requires UIDAI to support OIDC (planned).
 * For Phase 1 prototype, Google OAuth is used as the OIDC provider.
 * The Sui address is derived the same way regardless of OIDC provider.
 */
export function useZkLogin() {
  const [state, setState] = useState<ZkLoginState>({ step: 'idle' });
  const ephemeralKeyPairRef = useRef<Ed25519Keypair | null>(null);
  const nonceRef = useRef<string>('');
  const maxEpochRef = useRef<number>(0);
  const randomnessRef = useRef<string>('');

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'dawatrace',
    path: 'auth/callback',
  });

  /**
   * Phase 1 + 2: Generate ephemeral keypair, compute nonce, initiate Google OAuth.
   */
  const startLogin = useCallback(
    async (_oauthProvider: 'google' | 'aadhaar' = 'google') => {
      setState({ step: 'generating_nonce' });

      try {
        // Phase 1: Generate ephemeral Ed25519 keypair
        const ephemeralKeyPair = new Ed25519Keypair();
        ephemeralKeyPairRef.current = ephemeralKeyPair;

        // Fetch current Sui epoch to compute maxEpoch
        const { epoch } = await suiClient.getLatestSuiSystemState();
        const maxEpoch = Number(epoch) + EPOCH_VALIDITY;
        maxEpochRef.current = maxEpoch;

        // Generate cryptographic randomness for the nonce
        const randomness = generateRandomness();
        randomnessRef.current = randomness;

        // Compute the zkLogin nonce using Poseidon hash:
        // nonce = Poseidon(eph_public_key, max_epoch, randomness)
        const nonce = generateNonce(
          ephemeralKeyPair.getPublicKey(),
          maxEpoch,
          randomness,
        );
        nonceRef.current = nonce;

        // Persist ephemeral private key, maxEpoch, and randomness
        const exportedKey = ephemeralKeyPair.getSecretKey();
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.EPHEMERAL_PRIVATE_KEY,
          exportedKey,
        );
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.MAX_EPOCH,
          String(maxEpoch),
        );
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.RANDOMNESS,
          randomness,
        );

        // Phase 2: Redirect to Google OAuth
        setState({ step: 'oauth_redirect' });

        const authRequest = new AuthSession.AuthRequest({
          clientId: GOOGLE_CLIENT_ID,
          redirectUri,
          scopes: ['openid', 'email', 'profile'],
          responseType: AuthSession.ResponseType.IdToken,
          extraParams: {
            nonce,
          },
          usePKCE: false,
        });

        const authResult = await authRequest.promptAsync(googleDiscovery);

        if (authResult.type === 'success' && authResult.params['id_token']) {
          const idToken = authResult.params['id_token'];
          await handleOAuthToken(idToken, maxEpoch);
        } else if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
          setState({ step: 'idle' });
        } else {
          throw new Error(
            `OAuth flow failed: ${authResult.type}`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ step: 'error', error: message });
      }
    },
    [redirectUri],
  );

  /**
   * Phases 3-5: Given a JWT id_token from OAuth, fetch zkProof, derive address, store credentials.
   */
  const handleOAuthToken = async (jwtToken: string, maxEpoch: number) => {
    setState({ step: 'proving' });

    try {
      // Fetch or derive the user salt. The salt is a stable per-user value
      // that ensures the same Google account always maps to the same Sui address.
      const userSalt = await fetchUserSalt(jwtToken);

      // Phase 4: Derive Sui address from JWT claims + salt
      const suiAddress = jwtToAddress(jwtToken, userSalt);

      // Phase 3: Request zkProof from the prover service
      const zkProof = await fetchZkProof(
        jwtToken,
        userSalt,
        maxEpoch,
        randomnessRef.current,
        ephemeralKeyPairRef.current!,
      );

      // Phase 5: Persist all credentials in secure storage
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.ZK_PROOF,
        JSON.stringify(zkProof),
      );
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.SUI_ADDRESS,
        suiAddress,
      );
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.USER_SALT,
        userSalt,
      );
      await SecureStore.setItemAsync(
        SECURE_STORE_KEYS.JWT_TOKEN,
        jwtToken,
      );

      setState({ step: 'done', suiAddress });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ step: 'error', error: message });
    }
  };

  /**
   * Phase 3 + 4 + 5: Exchange JWT from OAuth for zkProof, derive address.
   * Called after OAuth redirect returns the JWT (public API for manual flow).
   */
  const completeLogin = useCallback(
    async (jwtToken: string, userSalt: string) => {
      setState({ step: 'proving' });

      try {
        // Restore ephemeral keypair and maxEpoch from secure store if needed
        let maxEpoch = maxEpochRef.current;
        if (!maxEpoch) {
          const stored = await SecureStore.getItemAsync(SECURE_STORE_KEYS.MAX_EPOCH);
          maxEpoch = Number(stored ?? 0);
          maxEpochRef.current = maxEpoch;
        }

        let randomness = randomnessRef.current;
        if (!randomness) {
          randomness =
            (await SecureStore.getItemAsync(SECURE_STORE_KEYS.RANDOMNESS)) ?? '';
          randomnessRef.current = randomness;
        }

        let ephemeralKeyPair = ephemeralKeyPairRef.current;
        if (!ephemeralKeyPair) {
          ephemeralKeyPair = await restoreEphemeralKeyPair();
          ephemeralKeyPairRef.current = ephemeralKeyPair;
        }

        // Phase 4: Derive Sui address from JWT + salt
        const suiAddress = jwtToAddress(jwtToken, userSalt);

        // Phase 3: Request zkProof from the prover service
        const zkProof = await fetchZkProof(
          jwtToken,
          userSalt,
          maxEpoch,
          randomness,
          ephemeralKeyPair,
        );

        // Phase 5: Persist credentials
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.ZK_PROOF,
          JSON.stringify(zkProof),
        );
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.SUI_ADDRESS, suiAddress);
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.USER_SALT, userSalt);
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.JWT_TOKEN, jwtToken);

        setState({ step: 'done', suiAddress });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ step: 'error', error: message });
      }
    },
    [],
  );

  /**
   * Retrieve the stored Sui address (if a valid session exists).
   */
  const getStoredAddress = useCallback(async (): Promise<string | null> => {
    const address = await SecureStore.getItemAsync(SECURE_STORE_KEYS.SUI_ADDRESS);
    if (!address) return null;

    // Check that the session hasn't expired by comparing maxEpoch with current epoch
    const storedMaxEpoch = await SecureStore.getItemAsync(SECURE_STORE_KEYS.MAX_EPOCH);
    if (storedMaxEpoch) {
      try {
        const { epoch } = await suiClient.getLatestSuiSystemState();
        if (Number(epoch) >= Number(storedMaxEpoch)) {
          // Session expired; clear stored credentials
          await clearSession();
          return null;
        }
      } catch {
        // If we can't reach the RPC, return the stored address optimistically
      }
    }

    return address;
  }, []);

  /**
   * Clear all stored zkLogin credentials and reset state.
   */
  const clearSession = useCallback(async () => {
    await Promise.all(
      Object.values(SECURE_STORE_KEYS).map((key) =>
        SecureStore.deleteItemAsync(key),
      ),
    );
    ephemeralKeyPairRef.current = null;
    nonceRef.current = '';
    maxEpochRef.current = 0;
    randomnessRef.current = '';
    setState({ step: 'idle' });
  }, []);

  /**
   * Sign a Sui transaction block using the stored zkLogin credentials.
   * Returns the serialized signature that can be submitted to the Sui network.
   */
  const signTransaction = useCallback(
    async (txBytes: Uint8Array): Promise<string> => {
      // Restore ephemeral keypair
      let ephemeralKeyPair = ephemeralKeyPairRef.current;
      if (!ephemeralKeyPair) {
        ephemeralKeyPair = await restoreEphemeralKeyPair();
        ephemeralKeyPairRef.current = ephemeralKeyPair;
      }

      // Restore zkProof
      const zkProofJson = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ZK_PROOF);
      if (!zkProofJson) {
        throw new Error('No zkProof found in secure store. Please login first.');
      }
      const zkProof = JSON.parse(zkProofJson) as {
        proofPoints: {
          a: string[];
          b: string[][];
          c: string[];
        };
        issBase64Details: { value: string; indexMod4: number };
        headerBase64: string;
      };

      // Restore maxEpoch
      let maxEpoch = maxEpochRef.current;
      if (!maxEpoch) {
        const stored = await SecureStore.getItemAsync(SECURE_STORE_KEYS.MAX_EPOCH);
        maxEpoch = Number(stored ?? 0);
      }

      // Sign the transaction bytes with the ephemeral keypair
      const { signature: ephemeralSignature } =
        await ephemeralKeyPair.signTransaction(txBytes);

      // Compose the full zkLogin signature
      const zkLoginSignature = getZkLoginSignature({
        inputs: {
          ...zkProof,
          addressSeed: await getAddressSeed(),
        },
        maxEpoch,
        userSignature: ephemeralSignature,
      });

      return zkLoginSignature;
    },
    [],
  );

  return { state, startLogin, completeLogin, getStoredAddress, clearSession, signTransaction };
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Restore an Ed25519Keypair from secure store.
 */
async function restoreEphemeralKeyPair(): Promise<Ed25519Keypair> {
  const stored = await SecureStore.getItemAsync(
    SECURE_STORE_KEYS.EPHEMERAL_PRIVATE_KEY,
  );
  if (!stored) {
    throw new Error('No ephemeral keypair found. Please login first.');
  }

  // The key is stored as the bech32-encoded secret key string from getSecretKey()
  const { secretKey } = decodeSuiPrivateKey(stored);
  return Ed25519Keypair.fromSecretKey(secretKey);
}

/**
 * Fetch the user salt from the backend. The salt is a stable value derived from
 * the JWT subject, ensuring the same OAuth identity always maps to the same Sui address.
 */
async function fetchUserSalt(jwtToken: string): Promise<string> {
  const response = await fetch(USER_SALT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt: jwtToken }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch user salt: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { salt: string };
  return data.salt;
}

/**
 * Fetch a zkProof from the prover service. The prover verifies the JWT and
 * generates a zero-knowledge proof that the ephemeral keypair is authorized
 * to act on behalf of the derived Sui address.
 */
async function fetchZkProof(
  jwtToken: string,
  userSalt: string,
  maxEpoch: number,
  randomness: string,
  ephemeralKeyPair: Ed25519Keypair,
): Promise<{
  proofPoints: { a: string[]; b: string[][]; c: string[] };
  issBase64Details: { value: string; indexMod4: number };
  headerBase64: string;
}> {
  const extendedEphemeralPublicKey = ephemeralKeyPair
    .getPublicKey()
    .toBase64();

  const response = await fetch(`${PROVER_URL}/api/zkproof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jwt: jwtToken,
      extendedEphemeralPublicKey,
      maxEpoch,
      jwtRandomness: randomness,
      salt: userSalt,
      keyClaimName: 'sub',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `zkProof request failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    proofPoints: { a: string[]; b: string[][]; c: string[] };
    issBase64Details: { value: string; indexMod4: number };
    headerBase64: string;
  };

  return data;
}

/**
 * Compute the address seed from the stored JWT and user salt.
 * The address seed is used as an input to the zkLogin signature.
 */
async function getAddressSeed(): Promise<string> {
  const jwt = await SecureStore.getItemAsync(SECURE_STORE_KEYS.JWT_TOKEN);
  const salt = await SecureStore.getItemAsync(SECURE_STORE_KEYS.USER_SALT);
  if (!jwt || !salt) {
    throw new Error('Missing JWT or user salt in secure store.');
  }

  // Decode the JWT to extract the subject claim
  const payloadB64 = jwt.split('.')[1];
  if (!payloadB64) {
    throw new Error('Invalid JWT format.');
  }
  const payload = JSON.parse(atob(payloadB64)) as {
    sub: string;
    iss: string;
    aud: string;
  };

  // The address seed is derived from the subject claim and salt
  // using the same formula as jwtToAddress internally
  const addressSeed = genAddressSeed(
    BigInt(salt),
    'sub',
    payload.sub,
    payload.aud,
  );

  return addressSeed.toString();
}
