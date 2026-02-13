# Aegis SDK

A universal Python and JavaScript/TypeScript library for building privacy-preserving AI applications. Embed Aegis security directly into your app.

## Features

- **Dual-Language Support**: Available for both Python and TypeScript/JavaScript
- **Redact/Unredact**: Protect sensitive information with consistent placeholders
- **Referential Integrity**: The same text always maps to the same placeholder
- **Integrity Validation**: Built-in validation to ensure mapping consistency
- **Type Safety**: Full TypeScript support with type definitions

## Installation

### Python

Using Poetry:
```bash
poetry add aegis-sdk
```

Using pip:
```bash
pip install aegis-sdk
```

### JavaScript/TypeScript

Using npm:
```bash
npm install aegis-sdk
```

Using yarn:
```bash
yarn add aegis-sdk
```

## Usage

### Python

```python
from aegis_sdk import AegisProtector

# Create a protector instance
protector = AegisProtector()

# Redact sensitive information
name = "John Doe"
placeholder = protector.redact(name)
print(placeholder)  # Output: [REDACTED_a1b2c3d4]

# Redact with entity type
email = "john@example.com"
email_placeholder = protector.redact(email, entity_type="email")
print(email_placeholder)  # Output: [REDACTED_EMAIL_e5f6g7h8]

# Unredact to get original text
original = protector.unredact(placeholder)
print(original)  # Output: John Doe

# Verify referential integrity
# Same text always produces the same placeholder
assert protector.redact(name) == placeholder

# Validate integrity of all mappings
is_valid = protector.validate_integrity()
print(is_valid)  # Output: True
```

### TypeScript/JavaScript

```typescript
import { AegisProtector } from 'aegis-sdk';

// Create a protector instance
const protector = new AegisProtector();

// Redact sensitive information
const name = "John Doe";
const placeholder = protector.redact(name);
console.log(placeholder);  // Output: [REDACTED_a1b2c3d4]

// Redact with entity type
const email = "john@example.com";
const emailPlaceholder = protector.redact(email, "email");
console.log(emailPlaceholder);  // Output: [REDACTED_EMAIL_e5f6g7h8]

// Unredact to get original text
const original = protector.unredact(placeholder);
console.log(original);  // Output: John Doe

// Verify referential integrity
// Same text always produces the same placeholder
console.log(protector.redact(name) === placeholder);  // Output: true

// Validate integrity of all mappings
const isValid = protector.validateIntegrity();
console.log(isValid);  // Output: true
```

## API Reference

### AegisProtector

#### `redact(text: string, entityType?: string): string`

Redacts sensitive information and returns a consistent placeholder.

**Parameters:**
- `text`: The sensitive text to redact
- `entityType` (optional): Type of entity (e.g., 'name', 'email', 'ssn')

**Returns:** A placeholder string that can be used to unredact the text later

**Example:**
```python
# Python
placeholder = protector.redact("sensitive data", entity_type="custom")
```
```typescript
// TypeScript
const placeholder = protector.redact("sensitive data", "custom");
```

#### `unredact(placeholder: string): string`

Unredacts a placeholder back to the original text.

**Parameters:**
- `placeholder`: The placeholder to unredact

**Returns:** The original text

**Throws:** Error/ValueError if the placeholder is not found in the mapping

**Example:**
```python
# Python
original = protector.unredact("[REDACTED_a1b2c3d4]")
```
```typescript
// TypeScript
const original = protector.unredact("[REDACTED_a1b2c3d4]");
```

#### `validate_integrity(): bool` (Python) / `validateIntegrity(): boolean` (TypeScript)

Validates the integrity of the mapping to ensure consistency.

**Returns:** True if integrity is valid, False otherwise

**Example:**
```python
# Python
is_valid = protector.validate_integrity()
```
```typescript
// TypeScript
const isValid = protector.validateIntegrity();
```

## Referential Integrity

The AegisProtector ensures referential integrity by always mapping the same input text to the same placeholder. This is crucial for maintaining consistency across your application:

```python
# Python example
protector = AegisProtector()

# Multiple redactions of the same text
p1 = protector.redact("Alice")
p2 = protector.redact("Alice")
p3 = protector.redact("Alice")

# All placeholders are identical
assert p1 == p2 == p3

# All unredact to the same original value
assert protector.unredact(p1) == protector.unredact(p2) == "Alice"
```

## Development

### Python Development

```bash
# Install dependencies
poetry install

# Run tests
poetry run pytest tests/ -v

# Run tests with coverage
poetry run pytest tests/ --cov=aegis_sdk
```

### TypeScript Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/AegisProxy/aegis-sdk).

