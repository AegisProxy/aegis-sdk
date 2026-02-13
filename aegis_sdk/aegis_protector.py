"""AegisProtector class for redacting and unredacting sensitive information."""

import hashlib
from typing import Dict, Optional


class AegisProtector:
    """Protects sensitive information through redaction and unredaction."""

    def __init__(self):
        """Initialize the AegisProtector with empty mappings."""
        self._mapping: Dict[str, str] = {}
        self._reverse_mapping: Dict[str, str] = {}

    def redact(self, text: str, entity_type: Optional[str] = None) -> str:
        """
        Redact sensitive information in text with a consistent placeholder.
        
        The same text will always be replaced with the same placeholder,
        ensuring referential integrity.
        
        Args:
            text: The sensitive text to redact
            entity_type: Optional type of entity (e.g., 'name', 'email', 'ssn')
        
        Returns:
            A placeholder string that can be used to unredact the text later
        """
        if text in self._mapping:
            return self._mapping[text]
        
        # Generate a deterministic placeholder based on the text
        # This ensures the same text always gets the same placeholder
        text_hash = hashlib.sha256(text.encode()).hexdigest()[:8]
        
        if entity_type:
            placeholder = f"[REDACTED_{entity_type.upper()}_{text_hash}]"
        else:
            placeholder = f"[REDACTED_{text_hash}]"
        
        self._mapping[text] = placeholder
        self._reverse_mapping[placeholder] = text
        
        return placeholder

    def unredact(self, placeholder: str) -> str:
        """
        Unredact a placeholder back to the original text.
        
        Args:
            placeholder: The placeholder to unredact
        
        Returns:
            The original text
        
        Raises:
            ValueError: If the placeholder is not found in the mapping
        """
        if placeholder not in self._reverse_mapping:
            raise ValueError(f"Placeholder '{placeholder}' not found in mapping")
        
        return self._reverse_mapping[placeholder]

    def validate_integrity(self) -> bool:
        """
        Validate the integrity of the mapping.
        
        Ensures that:
        1. Every key in _mapping has a corresponding value in _reverse_mapping
        2. Every key in _reverse_mapping has a corresponding value in _mapping
        3. The mappings are inverses of each other
        
        Returns:
            True if integrity is valid, False otherwise
        """
        # Check that both mappings have the same length
        if len(self._mapping) != len(self._reverse_mapping):
            return False
        
        # Check that all forward mappings have corresponding reverse mappings
        for text, placeholder in self._mapping.items():
            if placeholder not in self._reverse_mapping:
                return False
            if self._reverse_mapping[placeholder] != text:
                return False
        
        # Check that all reverse mappings have corresponding forward mappings
        for placeholder, text in self._reverse_mapping.items():
            if text not in self._mapping:
                return False
            if self._mapping[text] != placeholder:
                return False
        
        return True
