import { describe, expect, it } from 'vitest';
import { parseClientMessage } from './messages';

describe('parseClientMessage sip', () => {
  it('accepts a sip with a target id', () => {
    expect(parseClientMessage({ type: 'action', action: { type: 'sip', toId: 'p2' } })).toEqual({ type: 'sip', toId: 'p2' });
  });
  it('rejects a sip without a usable target', () => {
    expect(parseClientMessage({ type: 'action', action: { type: 'sip' } })).toBeNull();
    expect(parseClientMessage({ type: 'action', action: { type: 'sip', toId: 5 } })).toBeNull();
    expect(parseClientMessage({ type: 'action', action: { type: 'sip', toId: 'x'.repeat(51) } })).toBeNull();
  });
});
