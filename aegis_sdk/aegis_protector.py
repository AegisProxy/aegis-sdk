"""AegisProtector class for redacting and unredacting sensitive information."""

import hashlib
from typing import Dict, Optional, Tuple


class AegisProtector:
    """Protects sensitive information through redaction and unredaction."""

    def __init__(self):
        """Initialize the AegisProtector with empty mappings."""
        self._mapping: Dict[Tuple[str, str], str] = {}
        self._reverse_mapping: Dict[str, str] = {}

    @staticmethod
    def _session_key(session_id: Optional[str]) -> str:
        return session_id if session_id is not None else ""

    def redact(
        self,
        text: str,
        entity_type: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """
        Redact sensitive information in text with a consistent placeholder.
        
        The same text will always be replaced with the same placeholder,
        ensuring referential integrity.
        
        Args:
            text: The sensitive text to redact
            entity_type: Optional type of entity (e.g., 'name', 'email', 'ssn')
            session_id: Optional logical session (e.g. chat or request id). Same text
                in different sessions gets different placeholders so parallel flows
                stay isolated in one protector instance.

        Returns:
            A placeholder string that can be used to unredact the text later
        """
        sk = self._session_key(session_id)
        forward_key = (sk, text)
        if forward_key in self._mapping:
            return self._mapping[forward_key]

        # Hash includes session so identical text in different sessions diverges
        digest_input = f"{sk}\0{text}".encode()
        text_hash = hashlib.sha256(digest_input).hexdigest()[:8]
        
        if entity_type:
            placeholder = f"[REDACTED_{entity_type.upper()}_{text_hash}]"
        else:
            placeholder = f"[REDACTED_{text_hash}]"
        
        self._mapping[forward_key] = placeholder
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
        for forward_key, placeholder in self._mapping.items():
            if placeholder not in self._reverse_mapping:
                return False
            _, text = forward_key
            if self._reverse_mapping[placeholder] != text:
                return False

        # Check that all reverse mappings have corresponding forward mappings
        for placeholder, text in self._reverse_mapping.items():
            found = False
            for (sk, t), ph in self._mapping.items():
                if ph == placeholder and t == text:
                    found = True
                    break
            if not found:
                return False
        
        return True
