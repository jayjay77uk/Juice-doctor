import { describe, it, expect } from 'vitest';
import { windowHistory } from './history';
import type { ChatMessage } from './provider';

const u = (content: string): ChatMessage => ({ role: 'user', content });
const a = (content: string): ChatMessage => ({ role: 'assistant', content });

describe('windowHistory', () => {
  it('keeps at most the last `max` turns', () => {
    const history = [u('1'), a('2'), u('3'), a('4'), u('5'), a('6'), u('7'), a('8'), u('9'), a('10')];
    const win = windowHistory(history, 8);
    expect(win.length).toBeLessThanOrEqual(8);
    expect(win[win.length - 1]!.content).toBe('10');
  });

  it('never starts with an assistant turn (the API rejects that)', () => {
    // A thread that opens with the specialist's welcome message: slicing an
    // odd-length history puts an assistant turn first without the trim.
    const history = [a('welcome'), u('q1'), a('r1'), u('q2'), a('r2'), u('q3'), a('r3'), u('q4'), a('r4')];
    const win = windowHistory(history, 8);
    expect(win[0]!.role).toBe('user');
  });

  it('drops multiple leading assistant turns if needed', () => {
    const win = windowHistory([a('w1'), a('w2'), u('q'), a('r')], 8);
    expect(win.map((m) => m.content)).toEqual(['q', 'r']);
  });

  it('returns empty for an all-assistant window', () => {
    expect(windowHistory([a('w1'), a('w2')], 8)).toEqual([]);
  });

  it('handles an empty history', () => {
    expect(windowHistory([], 8)).toEqual([]);
  });
});
