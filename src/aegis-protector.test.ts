/**
 * Unit tests for AegisProtector class.
 */

import { AegisProtector } from './aegis-protector';

describe('AegisProtector', () => {
  let protector: AegisProtector;

  beforeEach(() => {
    protector = new AegisProtector();
  });

  describe('redact', () => {
    it('should redact basic text', () => {
      const text = 'John Doe';
      const placeholder = protector.redact(text);

      expect(placeholder).toMatch(/^\[REDACTED_/);
      expect(placeholder).not.toBe(text);
    });

    it('should redact with entity type', () => {
      const text = 'john@example.com';
      const placeholder = protector.redact(text, 'email');

      expect(placeholder).toMatch(/^\[REDACTED_EMAIL_/);
      expect(placeholder).toContain('EMAIL');
    });
  });

  describe('unredact', () => {
    it('should unredact basic text', () => {
      const text = 'Jane Smith';
      const placeholder = protector.redact(text);
      const unredacted = protector.unredact(placeholder);

      expect(unredacted).toBe(text);
    });

    it('should throw error for unknown placeholder', () => {
      expect(() => {
        protector.unredact('[REDACTED_UNKNOWN]');
      }).toThrow('Placeholder \'[REDACTED_UNKNOWN]\' not found in mapping');
    });
  });

  describe('referential integrity', () => {
    it('should always use the same placeholder for the same text', () => {
      const text = 'Secret Name';

      // Redact the same text multiple times
      const placeholder1 = protector.redact(text);
      const placeholder2 = protector.redact(text);
      const placeholder3 = protector.redact(text);

      // All placeholders should be identical
      expect(placeholder1).toBe(placeholder2);
      expect(placeholder2).toBe(placeholder3);

      // All should unredact to the original text
      expect(protector.unredact(placeholder1)).toBe(text);
      expect(protector.unredact(placeholder2)).toBe(text);
      expect(protector.unredact(placeholder3)).toBe(text);
    });

    it('should use different placeholders for different texts', () => {
      const text1 = 'Alice';
      const text2 = 'Bob';

      const placeholder1 = protector.redact(text1);
      const placeholder2 = protector.redact(text2);

      // Placeholders should be different
      expect(placeholder1).not.toBe(placeholder2);

      // Each should unredact to their original text
      expect(protector.unredact(placeholder1)).toBe(text1);
      expect(protector.unredact(placeholder2)).toBe(text2);
    });

    it('should maintain integrity with entity types', () => {
      const email = 'test@example.com';

      const placeholder1 = protector.redact(email, 'email');
      const placeholder2 = protector.redact(email, 'email');

      // Same placeholders for same email
      expect(placeholder1).toBe(placeholder2);

      // Both should unredact correctly
      expect(protector.unredact(placeholder1)).toBe(email);
      expect(protector.unredact(placeholder2)).toBe(email);
    });

    it('should handle multiple redactions with unredactions', () => {
      const texts = ['Alice', 'Bob', 'Charlie', 'Alice', 'Bob'];
      const placeholders = texts.map(text => protector.redact(text));

      // Alice appears at index 0 and 3, Bob at 1 and 4
      expect(placeholders[0]).toBe(placeholders[3]); // Alice placeholders match
      expect(placeholders[1]).toBe(placeholders[4]); // Bob placeholders match

      // All unredactions should work correctly
      placeholders.forEach((placeholder, index) => {
        expect(protector.unredact(placeholder)).toBe(texts[index]);
      });

      // Integrity should be valid
      expect(protector.validateIntegrity()).toBe(true);
    });
  });

  describe('validateIntegrity', () => {
    it('should validate integrity with valid mappings', () => {
      // Add some redactions
      protector.redact('Name1');
      protector.redact('Name2');
      protector.redact('Name3');

      // Integrity should be valid
      expect(protector.validateIntegrity()).toBe(true);
    });

    it('should validate integrity with empty mappings', () => {
      // Empty mappings should still be valid
      expect(protector.validateIntegrity()).toBe(true);
    });
  });
});
