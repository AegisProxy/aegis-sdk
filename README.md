# Aegis SDK

A universal Python and JavaScript/TypeScript library for building privacy-preserving AI applications. Embed Aegis security directly into your app.

[Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

## Features

- **Dual-Language Support**: Available for both Python and TypeScript/JavaScript
- **Redact/Unredact**: Protect sensitive information with consistent placeholders
- **Referential Integrity**: The same text always maps to the same placeholder (within the same optional session scope)
- **Optional session scope**: Pass a session id so parallel chats/requests stay isolated in one `AegisProtector` instance
- **Integrity Validation**: Built-in validation to ensure mapping consistency
- **Export / import**: Serialize mappings (v1 JSON) for encrypted storage or multi-worker reload
- **Thread-safe (Python)**: One `AegisProtector` instance can be shared across threads
- **Type Safety**: Full TypeScript support with type definitions

## Guarantees, concurrency, and sessions

**What the SDK guarantees**

- Mappings live **in memory** on the `AegisProtector` instance you hold. Correct `unredact` requires the **same** instance (or equivalent state you restored) that produced the placeholders.
- `validate_integrity()` / `validateIntegrity()` checks that forward and reverse maps stay consistent **inside that instance**. It does not prove anything across processes or databases.

**Threading and async (Python)**

- `AegisProtector` is **thread-safe** in Python (internal `RLock`). Multiple threads may call `redact`, `unredact`, `export_state`, `import_state`, and `validate_integrity` on the **same** instance concurrently.

**Concurrency (JavaScript / TypeScript)**

- In typical **Node.js** or **browser** runtimes, JavaScript runs on a **single** event-loop thread; parallel **Workers** do not share memory—use **one `AegisProtector` per worker** or persist state (export + encrypted storage) and load per worker.

**Many workers or machines**

- Each process has its own memory. Placeholders from worker A are meaningless on worker B unless you **share** mapping state (see below) or keep redact and unredact on the **same** worker for a given user session (sticky routing).

**`session_id` (parallel logical flows)**

- Pass an optional **`session_id`** (e.g. chat id, request id, tenant-scoped key) to **`redact`**. The same plaintext in **different** sessions gets **different** placeholders; within one session, referential integrity behaves as before.
- **`unredact`** still takes only the placeholder—the session id is encoded in how the placeholder was chosen, so you do not pass session id again.
- This helps when **one long-lived process** handles **many concurrent sessions** through a **single** protector: sessions do not collide on the same token for the same string.
- It does **not** replace a database: if another process must unredact, that process still needs the **same mapping data** (in-memory copy, or encrypted blob below).

## Database-backed flows and client-side encryption

For horizontal scale, you can persist mapping state per `session_id` (or per job) in a store such as **Supabase**, **Postgres**, or **Redis**.

**Recommended pattern (server-blind storage)**

The database should store **only what the server cannot turn into plaintext** without your app’s keys:

1. On the client or in your app tier, **encrypt** the sensitive payload (e.g. JSON of `{ placeholder → ciphertext }` or a single blob of mapping data) with a key derived from material **held outside** the row (user password, device key, KMS, or a secret in your backend env—not the anon key in the browser for high assurance).
2. **Upload** the **ciphertext** (and optional non-secret metadata: `session_id`, `updated_at`, size).
3. To unredact later: **fetch** the row, **decrypt** locally, **rehydrate** mappings or run `unredact` against placeholders using that state.

This is often described as **end-to-end from the database’s perspective** (the DB operator sees ciphertext only). It is **not** the same thing as a formal **zero-knowledge proof** system; the SDK does not implement ZK proofs—it leaves **crypto and key management** to your application.

**Hashes are not enough for round-trip:** A one-way **hash** of plaintext cannot be “unredacted.” To reconstruct originals later, persist **authenticated ciphertext** (or an encrypted serialization of the mapping), not a hash alone. You can still store a **hash of the ciphertext** for deduplication or integrity checks if you want.

**Does the SDK talk to Supabase?**

- **No.** This package stays small and dependency-free. You wire insert/select and encryption in your app. The README describes the pattern; your code chooses algorithms (e.g. AES-GCM via Web Crypto or libsodium) and key derivation.

**Example project:** See [examples/supabase](examples/supabase/) for SQL (RLS), AES-GCM helpers, and `saveEncryptedMappings` / `loadEncryptedMappings` built on `exportState` / `importState`.

**Authentication (e.g. Supabase)**

- The SDK does **not** perform auth. If you use **Supabase Auth** and the **Supabase client** with the user’s **JWT**, **Row Level Security (RLS)** can restrict rows so only that user (or their session) can read ciphertext for their `session_id`.
- You still **must** care about auth in the sense of **policy**: a **service role** key bypasses RLS—use it only on trusted servers. **Anon** + RLS is appropriate for user-scoped data; never expose service role to the browser.
- “Already authenticated by Supabase” is enough **for who may read which row**; it does **not** by itself encrypt payloads—you add client-side or app-side encryption if the database must not see plaintext.

## Installation

### Python

Using Poetry:
```bash
poetry add aegis-sdk
```

Using pip:
```bash
pip install aegis-sdk
```

### JavaScript/TypeScript

Using npm:
```bash
npm install aegis-sdk
```

Using yarn:
```bash
yarn add aegis-sdk
```

## Usage

### Python

```python
from aegis_sdk import AegisProtector

# Create a protector instance
protector = AegisProtector()

# Redact sensitive information
name = "John Doe"
placeholder = protector.redact(name)
print(placeholder)  # Output: [REDACTED_a1b2c3d4]

# Redact with entity type
email = "john@example.com"
email_placeholder = protector.redact(email, entity_type="email")
print(email_placeholder)  # Output: [REDACTED_EMAIL_e5f6g7h8]

# Optional session id: same string in different sessions → different placeholders
p1 = protector.redact("Acme", session_id="chat-a")
p2 = protector.redact("Acme", session_id="chat-b")

# Unredact to get original text
original = protector.unredact(placeholder)
print(original)  # Output: John Doe

# Verify referential integrity
# Same text always produces the same placeholder
assert protector.redact(name) == placeholder

# Validate integrity of all mappings
is_valid = protector.validate_integrity()
print(is_valid)  # Output: True
```

### TypeScript/JavaScript

```typescript
import { AegisProtector } from 'aegis-sdk';

// Create a protector instance
const protector = new AegisProtector();

// Redact sensitive information
const name = "John Doe";
const placeholder = protector.redact(name);
console.log(placeholder);  // Output: [REDACTED_a1b2c3d4]

// Redact with entity type
const email = "john@example.com";
const emailPlaceholder = protector.redact(email, "email");
console.log(emailPlaceholder);  // Output: [REDACTED_EMAIL_e5f6g7h8]

// Optional third argument: session id (use undefined if you only pass entity type)
const p1 = protector.redact("Acme", undefined, "chat-a");
const p2 = protector.redact("Acme", undefined, "chat-b");

// Unredact to get original text
const original = protector.unredact(placeholder);
console.log(original);  // Output: John Doe

// Verify referential integrity
// Same text always produces the same placeholder
console.log(protector.redact(name) === placeholder);  // Output: true

// Validate integrity of all mappings
const isValid = protector.validateIntegrity();
console.log(isValid);  // Output: true
```

## API Reference

### AegisProtector

#### `redact` — Python

`redact(text, entity_type=None, session_id=None) -> str`

**Parameters:**
- `text`: The sensitive text to redact
- `entity_type` (optional): Type of entity (e.g., `'name'`, `'email'`, `'ssn'`)
- `session_id` (optional): Logical scope (e.g. chat or request id). Same `text` in different sessions yields different placeholders when using one shared `AegisProtector`.

**Returns:** A placeholder string that can be used to unredact the text later

**Examples:**
```python
placeholder = protector.redact("sensitive data", entity_type="custom")
placeholder = protector.redact("sensitive data", session_id="req-123")
placeholder = protector.redact("sensitive data", entity_type="custom", session_id="req-123")
```

#### `redact` — TypeScript

`redact(text: string, entityType?: string, sessionId?: string): string`

Same semantics as Python. If you need only `sessionId`, pass `undefined` for `entityType`: `redact(text, undefined, sessionId)`.

**Example:**
```typescript
const placeholder = protector.redact('sensitive data', 'custom');
const scoped = protector.redact('sensitive data', undefined, 'req-123');
```

#### `unredact(placeholder: string): string`

Unredacts a placeholder back to the original text.

**Parameters:**
- `placeholder`: The placeholder to unredact

**Returns:** The original text

**Throws:** Error/ValueError if the placeholder is not found in the mapping

**Example:**
```python
# Python
original = protector.unredact("[REDACTED_a1b2c3d4]")
```
```typescript
// TypeScript
const original = protector.unredact("[REDACTED_a1b2c3d4]");
```

#### `validate_integrity(): bool` (Python) / `validateIntegrity(): boolean` (TypeScript)

Validates the integrity of the mapping to ensure consistency.

**Returns:** True if integrity is valid, False otherwise

**Example:**
```python
# Python
is_valid = protector.validate_integrity()
```
```typescript
// TypeScript
const isValid = protector.validateIntegrity();
```

#### `export_state()` / `import_state(data)` (Python) · `exportState()` / `importState(data)` (TypeScript)

Serialize and restore all mappings for persistence (e.g. encrypt the JSON, store in Supabase, decrypt later on another worker).

- **Python:** `export_state() -> dict`, `import_state(data: dict) -> None`
- **TypeScript:** `exportState()` returns `AegisExportedStateV1`; `importState(data)` accepts the same shape

**v1 JSON** uses snake_case (`session_id`, `text`, `placeholder`) so Python and TypeScript produce blobs you can use interchangeably.

**Raises:** `ValueError` / `Error` if the payload is the wrong version, malformed, or fails integrity validation after load.

## Referential Integrity

Within a single **session scope** (default: one global scope when `session_id` is omitted), the same input text maps to the same placeholder. That keeps model-facing text consistent (e.g. one token for the same person).

```python
# Python example
protector = AegisProtector()

# Multiple redactions of the same text
p1 = protector.redact("Alice")
p2 = protector.redact("Alice")
p3 = protector.redact("Alice")

# All placeholders are identical
assert p1 == p2 == p3

# All unredact to the same original value
assert protector.unredact(p1) == protector.unredact(p2) == "Alice"
```

With **`session_id`**, the same string in two sessions is intentionally **not** the same placeholder:

```python
a = protector.redact("Alice", session_id="chat-1")
b = protector.redact("Alice", session_id="chat-2")
assert a != b
assert protector.unredact(a) == protector.unredact(b) == "Alice"
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for fixture regeneration, PR expectations, and full setup.

### Python Development

```bash
# Install dependencies
poetry install
# Or: python3 -m pip install -e ".[dev]"

# Run tests
poetry run pytest tests/ -v

# Run tests with coverage
poetry run pytest tests/ --cov=aegis_sdk
```

### TypeScript Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Publishing

Versions are tracked in `package.json`, `pyproject.toml` (`[project]` and `[tool.poetry]`), and `aegis_sdk.__version__` / `version` export in TypeScript—keep them aligned when releasing. Document changes in [CHANGELOG.md](CHANGELOG.md).

### npm

```bash
npm run build
npm pack   # optional: inspect tarball
npm publish --access public
```

Ensure you are logged in (`npm whoami`) and the version was bumped. `prepublishOnly` runs `npm run build`.

### PyPI (pip / Poetry)

Using Poetry:

```bash
poetry build
poetry publish
```

Or build with PEP 517 and upload with Twine:

```bash
python3 -m pip install build twine
python3 -m build
twine upload dist/*
```

Use [TestPyPI](https://packaging.python.org/en/latest/guides/using-testpypi/) first if you want a dry run.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). Pull requests and cross-language tests (`tests/fixtures/export_v1.json`) help keep Python and TypeScript compatible.

## Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/AegisProxy/aegis-sdk).

