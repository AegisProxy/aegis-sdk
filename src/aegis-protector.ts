/**
 * AegisProtector class for redacting and unredacting sensitive information.
 */

import * as crypto from 'crypto';

/**
 * Protects sensitive information through redaction and unredaction.
 */
export class AegisProtector {
  private mapping: Map<string, string> = new Map();
  private reverseMapping: Map<string, string> = new Map();

  /**
   * Redact sensitive information in text with a consistent placeholder.
   * 
   * The same text will always be replaced with the same placeholder,
   * ensuring referential integrity.
   * 
   * @param text - The sensitive text to redact
   * @param entityType - Optional type of entity (e.g., 'name', 'email', 'ssn')
   * @returns A placeholder string that can be used to unredact the text later
   */
  redact(text: string, entityType?: string): string {
    // Check if we already have a mapping for this text
    const existing = this.mapping.get(text);
    if (existing) {
      return existing;
    }

    // Generate a deterministic placeholder based on the text
    // This ensures the same text always gets the same placeholder
    const hash = crypto.createHash('sha256').update(text).digest('hex').substring(0, 8);
    
    const placeholder = entityType
      ? `[REDACTED_${entityType.toUpperCase()}_${hash}]`
      : `[REDACTED_${hash}]`;

    this.mapping.set(text, placeholder);
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
    // Check that both mappings have the same length
    if (this.mapping.size !== this.reverseMapping.size) {
      return false;
    }

    // Check that all forward mappings have corresponding reverse mappings
    for (const [text, placeholder] of this.mapping.entries()) {
      const reversedText = this.reverseMapping.get(placeholder);
      if (reversedText === undefined || reversedText !== text) {
        return false;
      }
    }

    // Check that all reverse mappings have corresponding forward mappings
    for (const [placeholder, text] of this.reverseMapping.entries()) {
      const forwardPlaceholder = this.mapping.get(text);
      if (forwardPlaceholder === undefined || forwardPlaceholder !== placeholder) {
        return false;
      }
    }

    return true;
  }
}
