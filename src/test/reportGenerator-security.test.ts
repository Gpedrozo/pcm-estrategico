import { describe, expect, it } from 'vitest';
import { parseEquipmentFile } from '@/lib/reportGenerator';

describe('parseEquipmentFile – security', () => {
  it('rejects files larger than 10 MB', async () => {
    // Create a File mock with size > 10 MB
    const bigContent = new ArrayBuffer(11 * 1024 * 1024);
    const bigFile = new File([bigContent], 'huge.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    // Override size for environments where File constructor may not honour ArrayBuffer length
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });

    await expect(parseEquipmentFile(bigFile)).rejects.toThrow('Arquivo excede o limite de 10 MB');
  });

  it('accepts files under 10 MB (will fail at XLSX parse, not at size check)', async () => {
    const smallContent = new Uint8Array(100);
    const smallFile = new File([smallContent], 'small.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    try {
      await parseEquipmentFile(smallFile);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      // Must NOT be our size-limit error
      expect(msg).not.toContain('Arquivo excede o limite');
    }
  });
});
