/**
 * v1 export JSON must stay compatible with Python (committed fixture).
 */

import * as fs from 'fs';
import * as path from 'path';
import { AegisProtector } from './aegis-protector';

const fixturePath = path.join(__dirname, '..', 'tests', 'fixtures', 'export_v1.json');

describe('cross-language v1 fixture', () => {
  it('imports Python fixture and unredacts', () => {
    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const p = new AegisProtector();
    p.importState(data);
    expect(p.validateIntegrity()).toBe(true);
    expect(p.unredact('[REDACTED_EMAIL_f6c1fcfc]')).toBe('cross-language-fixture-value');
    expect(p.unredact('[REDACTED_4bebc9af]')).toBe('second-value');
    expect(
      p.redact('cross-language-fixture-value', 'email', 'fixture-sess'),
    ).toBe('[REDACTED_EMAIL_f6c1fcfc]');
  });
});
