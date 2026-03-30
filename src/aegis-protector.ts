/**
 * AegisProtector class for redacting and unredacting sensitive information.
 */

import * as crypto from 'crypto';

function sessionKey(sessionId: string | undefined): string {
  return sessionId ?? '';
}

function forwardMapKey(sessionId: string | undefined, text: string): string {
  return JSON.stringify([sessionKey(sessionId), text]);
}

/** JSON shape from exportState / accepted by importState (v1). Matches Python export_state. */
export type AegisExportedStateV1 = {
  v: 1;
  entries: Array<{ session_id: string | null; text: string; placeholder: string }>;
};

/**
 * Protects sensitive information through redaction and unredaction.
 */
export class AegisProtector {
  private mapping: Map<string, string> = new Map();
  private reverseMapping: Map<string, string> = new Map();

  /**
   * Redact sensitive information in text with a consistent placeholder.
   *
   * The same text will always be replaced with the same placeholder within
   * the same session, ensuring referential integrity.
   *
   * @param text - The sensitive text to redact
   * @param entityType - Optional type of entity (e.g., 'name', 'email', 'ssn')
   * @param sessionId - Optional logical session (e.g. chat or request id). Same text
   *   in different sessions gets different placeholders so parallel flows stay
   *   isolated in one protector instance.
   * @returns A placeholder string that can be used to unredact the text later
   */
  redact(text: string, entityType?: string, sessionId?: string): string {
    const fk = forwardMapKey(sessionId, text);
    const existing = this.mapping.get(fk);
    if (existing !== undefined) {
      return existing;
    }

    const sk = sessionKey(sessionId);
    const digestInput = `${sk}\0${text}`;
    const hash = crypto.createHash('sha256').update(digestInput, 'utf8').digest('hex').substring(0, 8);

    const placeholder = entityType
      ? `[REDACTED_${entityType.toUpperCase()}_${hash}]`
      : `[REDACTED_${hash}]`;

    this.mapping.set(fk, placeholder);
    this.reverseMapping.set(placeholder, text);

    return placeholder;
  }

  /**
   * Unredact a placeholder back to the original text.
   *
   * @param placeholder - The placeholder to unredact
   * @returns The original text
   * @throws Error if the placeholder is not found in the mapping
   */
  unredact(placeholder: string): string {
    const original = this.reverseMapping.get(placeholder);
    if (original === undefined) {
      throw new Error(`Placeholder '${placeholder}' not found in mapping`);
    }
    return original;
  }

  /**
   * Validate the integrity of the mapping.
   *
   * Ensures that:
   * 1. Every key in mapping has a corresponding value in reverseMapping
   * 2. Every key in reverseMapping has a corresponding value in mapping
   * 3. The mappings are inverses of each other
   *
   * @returns true if integrity is valid, false otherwise
   */
  validateIntegrity(): boolean {
    if (this.mapping.size !== this.reverseMapping.size) {
      return false;
    }

    for (const [forwardKey, placeholder] of this.mapping.entries()) {
      const reversedText = this.reverseMapping.get(placeholder);
      let text: string;
      try {
        const parsed = JSON.parse(forwardKey) as [string, string];
        text = parsed[1];
      } catch {
        return false;
      }
      if (reversedText === undefined || reversedText !== text) {
        return false;
      }
    }

    for (const [placeholder, text] of this.reverseMapping.entries()) {
      let found = false;
      for (const [fk, ph] of this.mapping.entries()) {
        if (ph !== placeholder) continue;
        try {
          const parsed = JSON.parse(fk) as [string, string];
          if (parsed[1] === text) {
            found = true;
            break;
          }
        } catch {
          return false;
        }
      }
      if (!found) {
        return false;
      }
    }

    return true;
  }

  /**
   * Snapshot mappings for persistence (e.g. encrypt and store per session).
   * Use importState after decrypting the same payload to rehydrate this instance.
   */
  exportState(): AegisExportedStateV1 {
    const entries: AegisExportedStateV1['entries'] = [];
    for (const [forwardKey, placeholder] of this.mapping.entries()) {
      let sk: string;
      let text: string;
      try {
        const parsed = JSON.parse(forwardKey) as [string, string];
        sk = parsed[0];
        text = parsed[1];
      } catch {
        throw new Error('exportState: invalid internal forward key');
      }
      entries.push({
        session_id: sk === '' ? null : sk,
        text,
        placeholder,
      });
    }
    return { v: 1, entries };
  }

  /**
   * Replace mappings from exportState output. Validates before committing.
   */
  importState(data: AegisExportedStateV1): void {
    if (!data || data.v !== 1 || !Array.isArray(data.entries)) {
      throw new Error('importState requires data with v === 1 and entries array');
    }

    this.mapping.clear();
    this.reverseMapping.clear();

    for (let i = 0; i < data.entries.length; i++) {
      const e = data.entries[i];
      if (!e || typeof e.text !== 'string' || typeof e.placeholder !== 'string') {
        this.mapping.clear();
        this.reverseMapping.clear();
        throw new Error(`importState entry ${i} needs string text and placeholder`);
      }
      if (e.session_id != null && typeof e.session_id !== 'string') {
        this.mapping.clear();
        this.reverseMapping.clear();
        throw new Error(`importState entry ${i} session_id must be string or null`);
      }
      const fk = forwardMapKey(e.session_id ?? undefined, e.text);
      if (this.mapping.has(fk)) {
        this.mapping.clear();
        this.reverseMapping.clear();
        throw new Error(`importState duplicate forward key at entry ${i}`);
      }
      if (this.reverseMapping.has(e.placeholder)) {
        this.mapping.clear();
        this.reverseMapping.clear();
        throw new Error(`importState duplicate placeholder at entry ${i}`);
      }
      this.mapping.set(fk, e.placeholder);
      this.reverseMapping.set(e.placeholder, e.text);
    }

    if (!this.validateIntegrity()) {
      this.mapping.clear();
      this.reverseMapping.clear();
      throw new Error('imported state failed integrity validation');
    }
  }
}
