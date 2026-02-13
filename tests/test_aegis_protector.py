"""Unit tests for AegisProtector class."""

import unittest
from aegis_sdk import AegisProtector


class TestAegisProtector(unittest.TestCase):
    """Test cases for the AegisProtector class."""

    def setUp(self):
        """Set up a fresh AegisProtector instance for each test."""
        self.protector = AegisProtector()

    def test_redact_basic(self):
        """Test basic redaction functionality."""
        text = "John Doe"
        placeholder = self.protector.redact(text)
        
        self.assertTrue(placeholder.startswith("[REDACTED_"))
        self.assertNotEqual(text, placeholder)

    def test_redact_with_entity_type(self):
        """Test redaction with entity type."""
        text = "john@example.com"
        placeholder = self.protector.redact(text, entity_type="email")
        
        self.assertTrue(placeholder.startswith("[REDACTED_EMAIL_"))
        self.assertIn("EMAIL", placeholder)

    def test_unredact_basic(self):
        """Test basic unredaction functionality."""
        text = "Jane Smith"
        placeholder = self.protector.redact(text)
        unredacted = self.protector.unredact(placeholder)
        
        self.assertEqual(text, unredacted)

    def test_unredact_unknown_placeholder(self):
        """Test unredaction with unknown placeholder raises ValueError."""
        with self.assertRaises(ValueError):
            self.protector.unredact("[REDACTED_UNKNOWN]")

    def test_referential_integrity_same_text(self):
        """Test that the same text always gets the same placeholder (referential integrity)."""
        text = "Secret Name"
        
        # Redact the same text multiple times
        placeholder1 = self.protector.redact(text)
        placeholder2 = self.protector.redact(text)
        placeholder3 = self.protector.redact(text)
        
        # All placeholders should be identical
        self.assertEqual(placeholder1, placeholder2)
        self.assertEqual(placeholder2, placeholder3)
        
        # All should unredact to the original text
        self.assertEqual(self.protector.unredact(placeholder1), text)
        self.assertEqual(self.protector.unredact(placeholder2), text)
        self.assertEqual(self.protector.unredact(placeholder3), text)

    def test_referential_integrity_different_texts(self):
        """Test that different texts get different placeholders."""
        text1 = "Alice"
        text2 = "Bob"
        
        placeholder1 = self.protector.redact(text1)
        placeholder2 = self.protector.redact(text2)
        
        # Placeholders should be different
        self.assertNotEqual(placeholder1, placeholder2)
        
        # Each should unredact to their original text
        self.assertEqual(self.protector.unredact(placeholder1), text1)
        self.assertEqual(self.protector.unredact(placeholder2), text2)

    def test_validate_integrity_valid(self):
        """Test integrity validation with valid mappings."""
        # Add some redactions
        self.protector.redact("Name1")
        self.protector.redact("Name2")
        self.protector.redact("Name3")
        
        # Integrity should be valid
        self.assertTrue(self.protector.validate_integrity())

    def test_validate_integrity_empty(self):
        """Test integrity validation with empty mappings."""
        # Empty mappings should still be valid
        self.assertTrue(self.protector.validate_integrity())

    def test_multiple_redactions_with_unredactions(self):
        """Test multiple redactions followed by unredactions."""
        texts = ["Alice", "Bob", "Charlie", "Alice", "Bob"]
        placeholders = [self.protector.redact(text) for text in texts]
        
        # Alice appears at index 0 and 3, Bob at 1 and 4
        self.assertEqual(placeholders[0], placeholders[3])  # Alice placeholders match
        self.assertEqual(placeholders[1], placeholders[4])  # Bob placeholders match
        
        # All unredactions should work correctly
        for i, placeholder in enumerate(placeholders):
            self.assertEqual(self.protector.unredact(placeholder), texts[i])
        
        # Integrity should be valid
        self.assertTrue(self.protector.validate_integrity())

    def test_referential_integrity_with_entity_types(self):
        """Test referential integrity when using entity types."""
        email = "test@example.com"
        
        placeholder1 = self.protector.redact(email, entity_type="email")
        placeholder2 = self.protector.redact(email, entity_type="email")
        
        # Same placeholders for same email
        self.assertEqual(placeholder1, placeholder2)
        
        # Both should unredact correctly
        self.assertEqual(self.protector.unredact(placeholder1), email)
        self.assertEqual(self.protector.unredact(placeholder2), email)


if __name__ == "__main__":
    unittest.main()
