/**
 * Example: encrypt AegisProtector.exportState(), upsert to Supabase, load and importState.
 *
 * Setup:
 *   cd examples/supabase && npm install
 *   Set SUPABASE_URL, SUPABASE_ANON_KEY (browser: only anon + logged-in user JWT).
 *
 * The password should come from user input (password-derived key), KMS, or a server-held
 * secret—never hard-code in client builds for production.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { AegisProtector, type AegisExportedStateV1 } from 'aegis-sdk';
import { decryptJson, encryptJson } from './crypto';

export async function saveEncryptedMappings(params: {
  supabase: SupabaseClient;
  ownerId: string;
  sessionKey: string;
  protector: AegisProtector;
  encryptionPassword: string;
}): Promise<void> {
  const payload = params.protector.exportState();
  const bundle = await encryptJson(payload, params.encryptionPassword);

  const { error } = await params.supabase.from('aegis_session_mappings').upsert(
    {
      owner_id: params.ownerId,
      session_key: params.sessionKey,
      salt: bundle.saltB64,
      iv: bundle.ivB64,
      ciphertext: bundle.ciphertextB64,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner_id,session_key' },
  );

  if (error) throw error;
}

export async function loadEncryptedMappings(params: {
  supabase: SupabaseClient;
  ownerId: string;
  sessionKey: string;
  encryptionPassword: string;
}): Promise<AegisProtector> {
  const { data, error } = await params.supabase
    .from('aegis_session_mappings')
    .select('salt, iv, ciphertext')
    .eq('owner_id', params.ownerId)
    .eq('session_key', params.sessionKey)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return new AegisProtector();
  }

  const state = await decryptJson<AegisExportedStateV1>(
    {
      saltB64: data.salt,
      ivB64: data.iv,
      ciphertextB64: data.ciphertext,
    },
    params.encryptionPassword,
  );

  const protector = new AegisProtector();
  protector.importState(state);
  return protector;
}
