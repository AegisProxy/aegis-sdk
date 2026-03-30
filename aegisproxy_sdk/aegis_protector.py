"""AegisProtector class for redacting and unredacting sensitive information."""

import hashlib
import threading
from typing import Any, Dict, List, Optional, Tuple


class AegisProtector:
    """Protects sensitive information through redaction and unredaction."""

    def __init__(self):
        """Initialize the AegisProtector with empty mappings."""
        self._lock = threading.RLock()
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

        Thread-safe: safe to call concurrently on the same instance (Python).

        Args:
            text: The sensitive text to redact
            entity_type: Optional type of entity (e.g., 'name', 'email', 'ssn')
            session_id: Optional logical session (e.g. chat or request id). Same text
                in different sessions gets different placeholders so parallel flows
                stay isolated in one protector instance.

        Returns:
            A placeholder string that can be used to unredact the text later
        """
        with self._lock:
            sk = self._session_key(session_id)
            forward_key = (sk, text)
            if forward_key in self._mapping:
                return self._mapping[forward_key]

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

        Thread-safe.

        Args:
            placeholder: The placeholder to unredact

        Returns:
            The original text

        Raises:
            ValueError: If the placeholder is not found in the mapping
        """
        with self._lock:
            if placeholder not in self._reverse_mapping:
                raise ValueError(f"Placeholder '{placeholder}' not found in mapping")
            return self._reverse_mapping[placeholder]

    def _validate_integrity_unlocked(self) -> bool:
        if len(self._mapping) != len(self._reverse_mapping):
            return False

        for forward_key, placeholder in self._mapping.items():
            if placeholder not in self._reverse_mapping:
                return False
            _, text = forward_key
            if self._reverse_mapping[placeholder] != text:
                return False

        for placeholder, text in self._reverse_mapping.items():
            found = False
            for (_, t), ph in self._mapping.items():
                if ph == placeholder and t == text:
                    found = True
                    break
            if not found:
                return False

        return True

    def validate_integrity(self) -> bool:
        """
        Validate the integrity of the mapping.

        Thread-safe snapshot of consistency at time of call.

        Returns:
            True if integrity is valid, False otherwise
        """
        with self._lock:
            return self._validate_integrity_unlocked()

    def export_state(self) -> Dict[str, Any]:
        """
        Snapshot mappings for persistence (e.g. encrypt and store per session).

        Thread-safe.

        Returns:
            A JSON-serializable dict with version and entries. Use import_state()
            after decrypting the same payload to rehydrate this instance.
        """
        with self._lock:
            entries: List[Dict[str, Any]] = []
            for (sk, text), placeholder in self._mapping.items():
                entries.append(
                    {
                        "session_id": sk if sk != "" else None,
                        "text": text,
                        "placeholder": placeholder,
                    }
                )
            return {"v": 1, "entries": entries}

    def import_state(self, data: Dict[str, Any]) -> None:
        """
        Replace mappings from export_state() output. Validates structure and
        integrity before committing.

        Thread-safe.

        Args:
            data: Dict matching export_state() format

        Raises:
            ValueError: If version or entries are invalid or integrity check fails
        """
        if not isinstance(data, dict) or data.get("v") != 1:
            raise ValueError("import_state requires data with v == 1")
        raw_entries = data.get("entries")
        if not isinstance(raw_entries, list):
            raise ValueError("import_state entries must be a list")

        with self._lock:
            self._mapping.clear()
            self._reverse_mapping.clear()
            try:
                for i, e in enumerate(raw_entries):
                    if not isinstance(e, dict):
                        raise ValueError(f"import_state entry {i} must be an object")
                    text = e.get("text")
                    placeholder = e.get("placeholder")
                    if not isinstance(text, str) or not isinstance(placeholder, str):
                        raise ValueError(
                            f"import_state entry {i} needs str text and placeholder"
                        )
                    sid = e.get("session_id")
                    if sid is not None and not isinstance(sid, str):
                        raise ValueError(
                            f"import_state entry {i} session_id must be str or null"
                        )
                    sk = self._session_key(sid)
                    forward_key = (sk, text)
                    if forward_key in self._mapping:
                        raise ValueError(
                            f"import_state duplicate forward key at entry {i}"
                        )
                    if placeholder in self._reverse_mapping:
                        raise ValueError(
                            f"import_state duplicate placeholder at entry {i}"
                        )
                    self._mapping[forward_key] = placeholder
                    self._reverse_mapping[placeholder] = text

                if not self._validate_integrity_unlocked():
                    raise ValueError("imported state failed integrity validation")
            except Exception:
                self._mapping.clear()
                self._reverse_mapping.clear()
                raise
