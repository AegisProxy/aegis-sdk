# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- CI: pin `pytest<9` (pytest 9 requires Python ≥3.10) and require **Python ≥3.9** so `poetry-core` 2.x can build wheels; GitHub Actions matrix uses 3.9 / 3.11 / 3.12.

## [0.1.1] - 2026-03-30

### Added

- **Python:** thread-safe `AegisProtector` using a re-entrant lock (`RLock`) on all public mutating and read paths.
- Cross-language regression tests via committed v1 fixture [`tests/fixtures/export_v1.json`](tests/fixtures/export_v1.json) (Python + TypeScript).
- [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CHANGELOG.md`](CHANGELOG.md).
- GitHub Actions CI workflow (Node + Python tests).
- [`examples/supabase/demo.ts`](examples/supabase/demo.ts) requires `AEGIS_EXAMPLE_ENCRYPTION_PASSWORD` instead of a hard-coded secret.

### Changed

- **Python:** failed `import_state` leaves the instance empty (no partial maps).
- npm `test` script uses `jest --runInBand` for stable worker teardown in CI.
- npm package `files` now includes `README.md` and `LICENSE` for publishes.
- PyPI metadata: `license` set in `[project]` for PEP 621.

## [0.1.0] - 2026-03-30

### Added

- Initial public API: `redact`, `unredact`, `validate_integrity` / `validateIntegrity`, optional `session_id` / `sessionId`, `export_state` / `exportState`, `import_state` / `importState`.
- Dual-language implementation (Python + TypeScript).
- Documentation and Supabase example under `examples/supabase/`.
