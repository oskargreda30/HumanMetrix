import { describe, it, expect, vi } from 'vitest';

const { mockBucket } = vi.hoisted(() => {
  const mockBucket = vi.fn().mockImplementation(() => ({
    file: vi.fn().mockImplementation((name: string) => ({
      exists: vi.fn(),
      setMetadata: vi.fn(),
      getMetadata: vi.fn(),
      createReadStream: vi.fn(),
      name,
    })),
  }));
  return { mockBucket };
});

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    bucket: mockBucket,
  })),
  File: vi.fn(),
}));

vi.stubGlobal('fetch', vi.fn());

describe('object_storage/index barrel exports', () => {
  it('should export ObjectStorageService', async () => {
    const mod = await import('../../server/replit_integrations/object_storage/index');
    expect(mod.ObjectStorageService).toBeDefined();
    expect(typeof mod.ObjectStorageService).toBe('function');
  });

  it('should export ObjectNotFoundError', async () => {
    const mod = await import('../../server/replit_integrations/object_storage/index');
    expect(mod.ObjectNotFoundError).toBeDefined();
  });

  it('should export objectStorageClient', async () => {
    const mod = await import('../../server/replit_integrations/object_storage/index');
    expect(mod.objectStorageClient).toBeDefined();
  });

  it('should export canAccessObject', async () => {
    const mod = await import('../../server/replit_integrations/object_storage/index');
    expect(mod.canAccessObject).toBeDefined();
    expect(typeof mod.canAccessObject).toBe('function');
  });

  it('should export getObjectAclPolicy', async () => {
    const mod = await import('../../server/replit_integrations/object_storage/index');
    expect(mod.getObjectAclPolicy).toBeDefined();
    expect(typeof mod.getObjectAclPolicy).toBe('function');
  });

  it('should export setObjectAclPolicy', async () => {
    const mod = await import('../../server/replit_integrations/object_storage/index');
    expect(mod.setObjectAclPolicy).toBeDefined();
    expect(typeof mod.setObjectAclPolicy).toBe('function');
  });

  it('should export registerObjectStorageRoutes', async () => {
    const mod = await import('../../server/replit_integrations/object_storage/index');
    expect(mod.registerObjectStorageRoutes).toBeDefined();
    expect(typeof mod.registerObjectStorageRoutes).toBe('function');
  });
});
