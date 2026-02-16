import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockExists, mockSetMetadata, mockGetMetadata, mockCreateReadStream, mockFile, mockBucket } = vi.hoisted(() => {
  const mockExists = vi.fn();
  const mockSetMetadata = vi.fn();
  const mockGetMetadata = vi.fn();
  const mockCreateReadStream = vi.fn();
  const mockFile = vi.fn().mockImplementation((name: string) => ({
    exists: mockExists,
    setMetadata: mockSetMetadata,
    getMetadata: mockGetMetadata,
    createReadStream: mockCreateReadStream,
    name,
  }));
  const mockBucket = vi.fn().mockImplementation(() => ({
    file: mockFile,
  }));
  return { mockExists, mockSetMetadata, mockGetMetadata, mockCreateReadStream, mockFile, mockBucket };
});

vi.mock('@google-cloud/storage', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    bucket: mockBucket,
  })),
  File: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  ObjectAccessGroupType,
  ObjectPermission,
  setObjectAclPolicy,
  getObjectAclPolicy,
  canAccessObject,
} from '../../server/replit_integrations/object_storage/objectAcl';

import {
  ObjectStorageService,
  ObjectNotFoundError,
  objectStorageClient,
} from '../../server/replit_integrations/object_storage/objectStorage';

describe('objectAcl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ObjectAccessGroupType enum', () => {
    it('should be an empty enum', () => {
      expect(ObjectAccessGroupType).toBeDefined();
      expect(Object.keys(ObjectAccessGroupType).length).toBe(0);
    });
  });

  describe('ObjectPermission enum', () => {
    it('should have READ and WRITE values', () => {
      expect(ObjectPermission.READ).toBe('read');
      expect(ObjectPermission.WRITE).toBe('write');
    });
  });

  describe('setObjectAclPolicy', () => {
    it('should set ACL policy on an existing object', async () => {
      const file = {
        exists: vi.fn().mockResolvedValue([true]),
        setMetadata: vi.fn().mockResolvedValue(undefined),
        name: 'test-file',
      } as any;

      const policy = { owner: 'user1', visibility: 'public' as const };
      await setObjectAclPolicy(file, policy);

      expect(file.setMetadata).toHaveBeenCalledWith({
        metadata: {
          'custom:aclPolicy': JSON.stringify(policy),
        },
      });
    });

    it('should throw error if object does not exist', async () => {
      const file = {
        exists: vi.fn().mockResolvedValue([false]),
        setMetadata: vi.fn(),
        name: 'missing-file',
      } as any;

      const policy = { owner: 'user1', visibility: 'private' as const };
      await expect(setObjectAclPolicy(file, policy)).rejects.toThrow(
        'Object not found: missing-file'
      );
      expect(file.setMetadata).not.toHaveBeenCalled();
    });
  });

  describe('getObjectAclPolicy', () => {
    it('should return parsed ACL policy from metadata', async () => {
      const policy = { owner: 'user1', visibility: 'public' as const };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await getObjectAclPolicy(file);
      expect(result).toEqual(policy);
    });

    it('should return null if no ACL policy in metadata', async () => {
      const file = {
        getMetadata: vi.fn().mockResolvedValue([{ metadata: {} }]),
      } as any;

      const result = await getObjectAclPolicy(file);
      expect(result).toBeNull();
    });

    it('should return null if metadata is undefined', async () => {
      const file = {
        getMetadata: vi.fn().mockResolvedValue([{}]),
      } as any;

      const result = await getObjectAclPolicy(file);
      expect(result).toBeNull();
    });

    it('should return null if metadata.metadata is undefined', async () => {
      const file = {
        getMetadata: vi.fn().mockResolvedValue([{ metadata: undefined }]),
      } as any;

      const result = await getObjectAclPolicy(file);
      expect(result).toBeNull();
    });
  });

  describe('canAccessObject', () => {
    it('should return false if no ACL policy exists', async () => {
      const file = {
        getMetadata: vi.fn().mockResolvedValue([{ metadata: {} }]),
      } as any;

      const result = await canAccessObject({
        userId: 'user1',
        objectFile: file,
        requestedPermission: ObjectPermission.READ,
      });
      expect(result).toBe(false);
    });

    it('should allow READ access to public objects', async () => {
      const policy = { owner: 'owner1', visibility: 'public' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await canAccessObject({
        userId: 'anyone',
        objectFile: file,
        requestedPermission: ObjectPermission.READ,
      });
      expect(result).toBe(true);
    });

    it('should allow READ access to public objects without userId', async () => {
      const policy = { owner: 'owner1', visibility: 'public' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await canAccessObject({
        objectFile: file,
        requestedPermission: ObjectPermission.READ,
      });
      expect(result).toBe(true);
    });

    it('should deny WRITE access to public objects without userId', async () => {
      const policy = { owner: 'owner1', visibility: 'public' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await canAccessObject({
        objectFile: file,
        requestedPermission: ObjectPermission.WRITE,
      });
      expect(result).toBe(false);
    });

    it('should deny access to private objects without userId', async () => {
      const policy = { owner: 'owner1', visibility: 'private' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await canAccessObject({
        objectFile: file,
        requestedPermission: ObjectPermission.READ,
      });
      expect(result).toBe(false);
    });

    it('should allow owner access for READ', async () => {
      const policy = { owner: 'owner1', visibility: 'private' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await canAccessObject({
        userId: 'owner1',
        objectFile: file,
        requestedPermission: ObjectPermission.READ,
      });
      expect(result).toBe(true);
    });

    it('should allow owner access for WRITE', async () => {
      const policy = { owner: 'owner1', visibility: 'private' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await canAccessObject({
        userId: 'owner1',
        objectFile: file,
        requestedPermission: ObjectPermission.WRITE,
      });
      expect(result).toBe(true);
    });

    it('should deny non-owner access to private objects with no ACL rules', async () => {
      const policy = { owner: 'owner1', visibility: 'private' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await canAccessObject({
        userId: 'user2',
        objectFile: file,
        requestedPermission: ObjectPermission.READ,
      });
      expect(result).toBe(false);
    });

    it('should deny non-owner access to private objects with empty ACL rules', async () => {
      const policy = { owner: 'owner1', visibility: 'private', aclRules: [] };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await canAccessObject({
        userId: 'user2',
        objectFile: file,
        requestedPermission: ObjectPermission.READ,
      });
      expect(result).toBe(false);
    });

    it('should throw when ACL rules reference unknown group types', async () => {
      const policy = {
        owner: 'owner1',
        visibility: 'private',
        aclRules: [
          {
            group: { type: 'UNKNOWN_TYPE' as any, id: 'group1' },
            permission: ObjectPermission.READ,
          },
        ],
      };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      await expect(
        canAccessObject({
          userId: 'user2',
          objectFile: file,
          requestedPermission: ObjectPermission.READ,
        })
      ).rejects.toThrow('Unknown access group type: UNKNOWN_TYPE');
    });
  });

});

describe('objectStorage', () => {
  let service: ObjectStorageService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ObjectStorageService();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('objectStorageClient', () => {
    it('should be defined', () => {
      expect(objectStorageClient).toBeDefined();
    });
  });

  describe('ObjectNotFoundError', () => {
    it('should create error with correct message and name', () => {
      const error = new ObjectNotFoundError();
      expect(error.message).toBe('Object not found');
      expect(error.name).toBe('ObjectNotFoundError');
      expect(error instanceof ObjectNotFoundError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('getPublicObjectSearchPaths', () => {
    it('should return paths from env var', () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = '/bucket1/public,/bucket2/public';
      const paths = service.getPublicObjectSearchPaths();
      expect(paths).toEqual(['/bucket1/public', '/bucket2/public']);
    });

    it('should trim whitespace from paths', () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = ' /bucket1/public , /bucket2/public ';
      const paths = service.getPublicObjectSearchPaths();
      expect(paths).toEqual(['/bucket1/public', '/bucket2/public']);
    });

    it('should deduplicate paths', () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = '/bucket1/public,/bucket1/public';
      const paths = service.getPublicObjectSearchPaths();
      expect(paths).toEqual(['/bucket1/public']);
    });

    it('should filter out empty paths', () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = '/bucket1/public,,/bucket2/public,';
      const paths = service.getPublicObjectSearchPaths();
      expect(paths).toEqual(['/bucket1/public', '/bucket2/public']);
    });

    it('should throw if env var is not set', () => {
      delete process.env.PUBLIC_OBJECT_SEARCH_PATHS;
      expect(() => service.getPublicObjectSearchPaths()).toThrow(
        'PUBLIC_OBJECT_SEARCH_PATHS not set'
      );
    });

    it('should throw if env var is empty', () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = '';
      expect(() => service.getPublicObjectSearchPaths()).toThrow(
        'PUBLIC_OBJECT_SEARCH_PATHS not set'
      );
    });

    it('should throw if env var contains only commas/whitespace', () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = ' , , ';
      expect(() => service.getPublicObjectSearchPaths()).toThrow(
        'PUBLIC_OBJECT_SEARCH_PATHS not set'
      );
    });
  });

  describe('getPrivateObjectDir', () => {
    it('should return dir from env var', () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      const dir = service.getPrivateObjectDir();
      expect(dir).toBe('/bucket/private');
    });

    it('should throw if env var is not set', () => {
      delete process.env.PRIVATE_OBJECT_DIR;
      expect(() => service.getPrivateObjectDir()).toThrow(
        'PRIVATE_OBJECT_DIR not set'
      );
    });

    it('should throw if env var is empty', () => {
      process.env.PRIVATE_OBJECT_DIR = '';
      expect(() => service.getPrivateObjectDir()).toThrow(
        'PRIVATE_OBJECT_DIR not set'
      );
    });
  });

  describe('searchPublicObject', () => {
    it('should return the first found file', async () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = '/bucket1/public';
      mockExists.mockResolvedValue([true]);

      const result = await service.searchPublicObject('test.txt');
      expect(result).toBeDefined();
      expect(mockBucket).toHaveBeenCalledWith('bucket1');
      expect(mockFile).toHaveBeenCalledWith('public/test.txt');
    });

    it('should search multiple paths and return first match', async () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = '/bucket1/dir1,/bucket2/dir2';
      mockExists
        .mockResolvedValueOnce([false])
        .mockResolvedValueOnce([true]);

      const result = await service.searchPublicObject('file.txt');
      expect(result).toBeDefined();
    });

    it('should return null if file not found in any path', async () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = '/bucket1/public';
      mockExists.mockResolvedValue([false]);

      const result = await service.searchPublicObject('missing.txt');
      expect(result).toBeNull();
    });

    it('should handle search paths without leading slash (parseObjectPath adds it)', async () => {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = 'bucket1/public';
      mockExists.mockResolvedValue([true]);

      const result = await service.searchPublicObject('test.txt');
      expect(result).toBeDefined();
      expect(mockBucket).toHaveBeenCalledWith('bucket1');
    });
  });

  describe('downloadObject', () => {
    it('should stream file to response with public cache', async () => {
      const policy = { owner: 'u1', visibility: 'public' };
      const mockStream = {
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn(),
      };

      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          {
            contentType: 'text/plain',
            size: 100,
            metadata: { 'custom:aclPolicy': JSON.stringify(policy) },
          },
        ]),
        createReadStream: vi.fn().mockReturnValue(mockStream),
      } as any;

      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false,
      } as any;

      await service.downloadObject(file, res);

      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'text/plain',
        'Content-Length': 100,
        'Cache-Control': 'public, max-age=3600',
      });
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });

    it('should use private cache for private objects', async () => {
      const policy = { owner: 'u1', visibility: 'private' };
      const mockStream = {
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn(),
      };

      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          {
            contentType: 'image/png',
            size: 500,
            metadata: { 'custom:aclPolicy': JSON.stringify(policy) },
          },
        ]),
        createReadStream: vi.fn().mockReturnValue(mockStream),
      } as any;

      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false,
      } as any;

      await service.downloadObject(file, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Cache-Control': 'private, max-age=3600',
        })
      );
    });

    it('should use custom cacheTtlSec', async () => {
      const mockStream = {
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn(),
      };

      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          {
            contentType: 'text/html',
            size: 200,
            metadata: {},
          },
        ]),
        createReadStream: vi.fn().mockReturnValue(mockStream),
      } as any;

      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false,
      } as any;

      await service.downloadObject(file, res, 600);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Cache-Control': 'private, max-age=600',
        })
      );
    });

    it('should use application/octet-stream if no contentType', async () => {
      const mockStream = {
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn(),
      };

      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          {
            contentType: undefined,
            size: 50,
            metadata: {},
          },
        ]),
        createReadStream: vi.fn().mockReturnValue(mockStream),
      } as any;

      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false,
      } as any;

      await service.downloadObject(file, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/octet-stream',
        })
      );
    });

    it('should handle stream errors when headers not sent', async () => {
      const mockStream = {
        on: vi.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'error') {
            setTimeout(() => cb(new Error('stream fail')), 0);
          }
          return this;
        }),
        pipe: vi.fn(),
      };

      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { contentType: 'text/plain', size: 10, metadata: {} },
        ]),
        createReadStream: vi.fn().mockReturnValue(mockStream),
      } as any;

      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false,
      } as any;

      await service.downloadObject(file, res);

      await new Promise((r) => setTimeout(r, 10));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error streaming file' });
    });

    it('should not send error response if headers already sent on stream error', async () => {
      const mockStream = {
        on: vi.fn().mockImplementation(function (this: any, event: string, cb: Function) {
          if (event === 'error') {
            setTimeout(() => cb(new Error('stream fail')), 0);
          }
          return this;
        }),
        pipe: vi.fn(),
      };

      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { contentType: 'text/plain', size: 10, metadata: {} },
        ]),
        createReadStream: vi.fn().mockReturnValue(mockStream),
      } as any;

      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: true,
      } as any;

      await service.downloadObject(file, res);
      await new Promise((r) => setTimeout(r, 10));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle error in getMetadata when headers not sent', async () => {
      const file = {
        getMetadata: vi.fn().mockRejectedValue(new Error('metadata fail')),
        createReadStream: vi.fn(),
      } as any;

      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false,
      } as any;

      await service.downloadObject(file, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error downloading file' });
    });

    it('should not send error if headers already sent on catch', async () => {
      const file = {
        getMetadata: vi.fn().mockRejectedValue(new Error('metadata fail')),
        createReadStream: vi.fn(),
      } as any;

      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: true,
      } as any;

      await service.downloadObject(file, res);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('getObjectEntityUploadURL', () => {
    it('should return a signed URL for upload', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ signed_url: 'https://signed-url.com/upload' }),
      });

      const url = await service.getObjectEntityUploadURL();
      expect(url).toBe('https://signed-url.com/upload');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:1106/object-storage/signed-object-url',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should throw if PRIVATE_OBJECT_DIR is not set', async () => {
      delete process.env.PRIVATE_OBJECT_DIR;
      await expect(service.getObjectEntityUploadURL()).rejects.toThrow(
        'PRIVATE_OBJECT_DIR not set'
      );
    });

    it('should throw if fetch fails', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(service.getObjectEntityUploadURL()).rejects.toThrow(
        'Failed to sign object URL'
      );
    });

    it('should throw if getPrivateObjectDir returns empty string', async () => {
      const spy = vi.spyOn(service, 'getPrivateObjectDir').mockReturnValue('');
      await expect(service.getObjectEntityUploadURL()).rejects.toThrow(
        'PRIVATE_OBJECT_DIR not set'
      );
      spy.mockRestore();
    });
  });

  describe('getObjectEntityFile', () => {
    it('should return the file object for a valid path', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      mockExists.mockResolvedValue([true]);

      const file = await service.getObjectEntityFile('/objects/uploads/file1');
      expect(file).toBeDefined();
      expect(mockBucket).toHaveBeenCalledWith('bucket');
      expect(mockFile).toHaveBeenCalledWith('private/uploads/file1');
    });

    it('should handle PRIVATE_OBJECT_DIR without trailing slash', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      mockExists.mockResolvedValue([true]);

      await service.getObjectEntityFile('/objects/uploads/file1');
      expect(mockFile).toHaveBeenCalledWith('private/uploads/file1');
    });

    it('should handle PRIVATE_OBJECT_DIR with trailing slash', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private/';
      mockExists.mockResolvedValue([true]);

      await service.getObjectEntityFile('/objects/uploads/file1');
      expect(mockFile).toHaveBeenCalledWith('private/uploads/file1');
    });

    it('should throw ObjectNotFoundError if path does not start with /objects/', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      await expect(service.getObjectEntityFile('/other/path')).rejects.toThrow(
        ObjectNotFoundError
      );
    });

    it('should throw ObjectNotFoundError if path has insufficient parts', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      await expect(service.getObjectEntityFile('/objects')).rejects.toThrow(
        ObjectNotFoundError
      );
    });

    it('should throw ObjectNotFoundError if file does not exist', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      mockExists.mockResolvedValue([false]);

      await expect(
        service.getObjectEntityFile('/objects/uploads/missing')
      ).rejects.toThrow(ObjectNotFoundError);
    });

    it('should throw when PRIVATE_OBJECT_DIR produces invalid path for parseObjectPath', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/';
      await expect(
        service.getObjectEntityFile('/objects/x')
      ).rejects.toThrow('Invalid path: must contain at least a bucket name');
    });
  });

  describe('normalizeObjectEntityPath', () => {
    it('should return raw path if not a GCS URL', () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      const result = service.normalizeObjectEntityPath('/objects/file1');
      expect(result).toBe('/objects/file1');
    });

    it('should normalize a GCS URL to /objects/ path', () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      const url = 'https://storage.googleapis.com/bucket/private/uploads/file1?token=abc';
      const result = service.normalizeObjectEntityPath(url);
      expect(result).toBe('/objects/uploads/file1');
    });

    it('should return raw pathname if not under private dir', () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      const url = 'https://storage.googleapis.com/other/path/file1';
      const result = service.normalizeObjectEntityPath(url);
      expect(result).toBe('/other/path/file1');
    });

    it('should handle PRIVATE_OBJECT_DIR without trailing slash when normalizing', () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      const url = 'https://storage.googleapis.com/bucket/private/uploads/file1';
      const result = service.normalizeObjectEntityPath(url);
      expect(result).toBe('/objects/uploads/file1');
    });

    it('should handle PRIVATE_OBJECT_DIR with trailing slash when normalizing', () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private/';
      const url = 'https://storage.googleapis.com/bucket/private/uploads/file1';
      const result = service.normalizeObjectEntityPath(url);
      expect(result).toBe('/objects/uploads/file1');
    });
  });

  describe('trySetObjectEntityAclPolicy', () => {
    it('should set ACL policy and return normalized path for /objects/ path', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      mockExists.mockResolvedValueOnce([true]).mockResolvedValueOnce([true]);
      mockSetMetadata.mockResolvedValue(undefined);

      const policy = { owner: 'user1', visibility: 'private' as const };
      const result = await service.trySetObjectEntityAclPolicy(
        '/objects/uploads/file1',
        policy
      );
      expect(result).toBe('/objects/uploads/file1');
    });

    it('should normalize GCS URL and set ACL', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      mockExists.mockResolvedValueOnce([true]).mockResolvedValueOnce([true]);
      mockSetMetadata.mockResolvedValue(undefined);

      const policy = { owner: 'user1', visibility: 'public' as const };
      const url = 'https://storage.googleapis.com/bucket/private/uploads/file1?sig=x';
      const result = await service.trySetObjectEntityAclPolicy(url, policy);
      expect(result).toBe('/objects/uploads/file1');
    });

    it('should return path unchanged if normalized path does not start with /', async () => {
      process.env.PRIVATE_OBJECT_DIR = '/bucket/private';
      const result = await service.trySetObjectEntityAclPolicy(
        'relative/path/file1',
        { owner: 'user1', visibility: 'public' as const }
      );
      expect(result).toBe('relative/path/file1');
    });
  });

  describe('canAccessObjectEntity', () => {
    it('should delegate to canAccessObject with default READ permission', async () => {
      const policy = { owner: 'owner1', visibility: 'public' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await service.canAccessObjectEntity({
        userId: 'user1',
        objectFile: file,
      });
      expect(result).toBe(true);
    });

    it('should delegate to canAccessObject with specified permission', async () => {
      const policy = { owner: 'owner1', visibility: 'private' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await service.canAccessObjectEntity({
        userId: 'user2',
        objectFile: file,
        requestedPermission: ObjectPermission.WRITE,
      });
      expect(result).toBe(false);
    });

    it('should allow owner with WRITE permission', async () => {
      const policy = { owner: 'owner1', visibility: 'private' };
      const file = {
        getMetadata: vi.fn().mockResolvedValue([
          { metadata: { 'custom:aclPolicy': JSON.stringify(policy) } },
        ]),
      } as any;

      const result = await service.canAccessObjectEntity({
        userId: 'owner1',
        objectFile: file,
        requestedPermission: ObjectPermission.WRITE,
      });
      expect(result).toBe(true);
    });
  });
});
