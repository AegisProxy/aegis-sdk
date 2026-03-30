"""v1 export JSON must match between Python and TypeScript (committed fixture)."""

import json
import unittest
from pathlib import Path

from aegis_sdk import AegisProtector

_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "export_v1.json"


class TestCrossLanguageFixture(unittest.TestCase):
    def test_fixture_file_matches_fresh_export(self):
        p = AegisProtector()
        p.redact("cross-language-fixture-value", entity_type="email", session_id="fixture-sess")
        p.redact("second-value", session_id=None)
        expected = json.loads(_FIXTURE.read_text(encoding="utf-8"))
        self.assertEqual(p.export_state(), expected)

    def test_import_fixture_unredacts_like_typescript(self):
        data = json.loads(_FIXTURE.read_text(encoding="utf-8"))
        p = AegisProtector()
        p.import_state(data)
        self.assertTrue(p.validate_integrity())
        self.assertEqual(
            p.unredact("[REDACTED_EMAIL_f6c1fcfc]"),
            "cross-language-fixture-value",
        )
        self.assertEqual(p.unredact("[REDACTED_4bebc9af]"), "second-value")
        self.assertEqual(
            p.redact("cross-language-fixture-value", entity_type="email", session_id="fixture-sess"),
            "[REDACTED_EMAIL_f6c1fcfc]",
        )


if __name__ == "__main__":
    unittest.main()
