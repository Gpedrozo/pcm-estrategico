import { compareVersions } from '../src/components/UpdateChecker';

describe('compareVersions', () => {
  it('returns 1 when first version is newer', () => {
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1);
  });

  it('returns -1 when first version is older', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
  });

  it('returns 0 for equal versions', () => {
    expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
  });

  it('handles partial semver values correctly', () => {
    expect(compareVersions('1.0', '1.0.5')).toBe(-1);
    expect(compareVersions('1.2.1', '1.2')).toBe(1);
  });
});
