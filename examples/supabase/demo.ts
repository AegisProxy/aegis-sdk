/**
 * Optional end-to-end check after applying schema.sql and signing in.
 *
 * From repo root: npm run build
 * From this folder: npm install && SUPABASE_URL=... SUPABASE_ANON_KEY=... npx tsx demo.ts
 */

import { createClient } from '@supabase/supabase-js';
import { AegisProtector } from 'aegis-sdk';
import { loadEncryptedMappings, saveEncryptedMappings } from './persist-flow';

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, anon);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error('Sign in first (e.g. set session) so RLS sees auth.uid()');
    process.exit(1);
  }

  const protector = new AegisProtector();
  protector.redact('secret value', undefined, 'my-chat');

  await saveEncryptedMappings({
    supabase,
    ownerId: user.id,
    sessionKey: 'my-chat',
    protector,
    encryptionPassword: 'replace-with-real-secret',
  });

  const restored = await loadEncryptedMappings({
    supabase,
    ownerId: user.id,
    sessionKey: 'my-chat',
    encryptionPassword: 'replace-with-real-secret',
  });

  const ph = restored.exportState().entries.find((e) => e.text === 'secret value')!.placeholder;
  console.log(restored.unredact(ph));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
