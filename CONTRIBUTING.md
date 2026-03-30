# Contributing

Thank you for helping improve Aegis SDK.

## Development setup

### JavaScript / TypeScript

From the repository root:

```bash
npm install
npm run build
npm test
```

- `npm run test:watch` — Jest in watch mode.
- `npm run test:coverage` — coverage report.

### Python

Use Python 3.8+ and install the package in editable mode with dev dependencies:

```bash
python3 -m pip install -e ".[dev]"
python3 -m pytest tests/ -v
# Or without pytest:
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Or with Poetry:

```bash
poetry install
poetry run pytest tests/ -v
```

## Cross-language v1 fixture

The file `tests/fixtures/export_v1.json` is the contract between Python and TypeScript for **export / import** state (`v: 1`, snake_case keys: `session_id`, `text`, `placeholder`).

If you change how placeholders are computed or how `export_state` / `import_state` serialize entries:

1. Update the implementation in both languages.
2. Regenerate the fixture, for example:

   ```bash
   PYTHONPATH=. python3 -c "
   from aegis_sdk import AegisProtector
   import json
   p = AegisProtector()
   p.redact('cross-language-fixture-value', entity_type='email', session_id='fixture-sess')
   p.redact('second-value', session_id=None)
   print(json.dumps(p.export_state(), indent=2))
   "
   ```

3. Save the output to `tests/fixtures/export_v1.json`.
4. Run **both** `npm test` and `pytest tests/` so `test_cross_language_fixture.py` and `src/cross-language.test.ts` pass.

## Pull requests

- Focus changes on a single concern or ticket when possible.
- Add or update tests for behavior you change.
- Keep docs (`README.md`, `CHANGELOG.md`) in sync with user-visible changes; add an entry under `[Unreleased]` in `CHANGELOG.md` (maintainers may move it to a version on release).

## Code style

- **TypeScript:** match existing formatting and patterns in `src/`.
- **Python:** match existing patterns in `aegis_sdk/`; prefer explicit types where the module already uses them.

## Publishing (maintainers)

See [README.md](README.md#publishing) for npm and PyPI release steps.
