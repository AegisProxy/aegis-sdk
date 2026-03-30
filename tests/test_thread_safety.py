"""Concurrent use of AegisProtector (Python RLock)."""

import threading
import unittest
from typing import List

from aegisproxy_sdk import AegisProtector


class TestThreadSafety(unittest.TestCase):
    def test_concurrent_redact_unredact(self):
        p = AegisProtector()
        errors: List[BaseException] = []
        barrier = threading.Barrier(8)

        def worker(i: int) -> None:
            try:
                barrier.wait()
                for _ in range(50):
                    ph = p.redact(f"text-{i}", session_id=f"sess-{i % 3}")
                    self.assertEqual(p.unredact(ph), f"text-{i}")
            except BaseException as e:
                errors.append(e)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(errors, [])
        self.assertTrue(p.validate_integrity())


if __name__ == "__main__":
    unittest.main()
