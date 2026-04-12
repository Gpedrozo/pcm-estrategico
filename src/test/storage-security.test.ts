import { describe, expect, it } from 'vitest';
import { uploadToStorage } from '@/services/storage';

describe('uploadToStorage – security', () => {
  it('rejects buckets outside the allowlist', async () => {
    const fakeFile = new File(['x'], 'evil.txt', { type: 'text/plain' });
    await expect(uploadToStorage('private-secrets', 'file.txt', fakeFile)).rejects.toThrow(
      'Bucket não permitido',
    );
  });

  it('rejects path traversal with ..', async () => {
    const fakeFile = new File(['x'], 'evil.txt', { type: 'text/plain' });
    await expect(uploadToStorage('public', '../../../etc/passwd', fakeFile)).rejects.toThrow(
      'Caminho inválido',
    );
  });

  it('rejects absolute paths starting with /', async () => {
    const fakeFile = new File(['x'], 'evil.txt', { type: 'text/plain' });
    await expect(uploadToStorage('public', '/root/evil.txt', fakeFile)).rejects.toThrow(
      'Caminho inválido',
    );
  });

  it('accepts valid bucket and path', async () => {
    const allowed = ['public', 'support-attachments', 'logos', 'documentos', 'avatars'];
    for (const bucket of allowed) {
      // This will fail at Supabase client level (not bucket/path validation)
      // We just verify it does NOT throw our security errors
      try {
        await uploadToStorage(bucket, 'valid/path/file.png', new File(['x'], 'f.png'));
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '';
        expect(msg).not.toBe('Bucket não permitido');
        expect(msg).not.toBe('Caminho inválido');
      }
    }
  });
});
