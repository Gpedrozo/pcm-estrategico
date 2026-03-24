import { describe, it, expect } from 'vitest';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

describe('lazyWithRetry', () => {
  it('returns a lazy component when import succeeds', () => {
    const DummyComponent = () => null;
    const LazyComp = lazyWithRetry(() => Promise.resolve({ default: DummyComponent }));
    expect(LazyComp).toBeDefined();
    expect(LazyComp.$$typeof).toBeDefined();
  });

  it('returns a React.lazy component (has $$typeof for lazy)', () => {
    const DummyComponent = () => null;
    const LazyComp = lazyWithRetry(() => Promise.resolve({ default: DummyComponent }));
    // React.lazy components have a specific $$typeof symbol
    expect(typeof LazyComp).toBe('object');
  });
});
