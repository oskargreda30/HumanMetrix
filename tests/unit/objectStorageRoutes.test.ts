import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetObjectEntityUploadURL = vi.fn();
const mockNormalizeObjectEntityPath = vi.fn();
const mockGetObjectEntityFile = vi.fn();
const mockDownloadObject = vi.fn();

vi.mock('../../server/replit_integrations/object_storage/objectStorage', () => {
  class MockObjectNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ObjectNotFoundError';
    }
  }
  return {
    ObjectStorageService: vi.fn().mockImplementation(() => ({
      getObjectEntityUploadURL: mockGetObjectEntityUploadURL,
      normalizeObjectEntityPath: mockNormalizeObjectEntityPath,
      getObjectEntityFile: mockGetObjectEntityFile,
      downloadObject: mockDownloadObject,
    })),
    ObjectNotFoundError: MockObjectNotFoundError,
  };
});

import { registerObjectStorageRoutes } from '../../server/replit_integrations/object_storage/routes';
import { ObjectNotFoundError } from '../../server/replit_integrations/object_storage/objectStorage';

describe('registerObjectStorageRoutes', () => {
  let routeHandlers: Record<string, Function>;
  let mockApp: any;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    routeHandlers = {};

    mockApp = {
      post: vi.fn((path: string, handler: Function) => {
        routeHandlers[`POST ${path}`] = handler;
      }),
      get: vi.fn((path: string, handler: Function) => {
        routeHandlers[`GET ${path}`] = handler;
      }),
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    registerObjectStorageRoutes(mockApp);
  });

  it('should register POST /api/uploads/request-url route', () => {
    expect(mockApp.post).toHaveBeenCalledWith('/api/uploads/request-url', expect.any(Function));
  });

  it('should register GET /objects/:objectPath(*) route', () => {
    expect(mockApp.get).toHaveBeenCalledWith('/objects/:objectPath(*)', expect.any(Function));
  });

  describe('POST /api/uploads/request-url', () => {
    let handler: Function;

    beforeEach(() => {
      handler = routeHandlers['POST /api/uploads/request-url'];
    });

    it('should return 400 if name is missing', async () => {
      mockReq = { body: {} };
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing required field: name' });
    });

    it('should return upload URL and metadata on success', async () => {
      const fakeUploadURL = 'https://storage.googleapis.com/fake-upload-url';
      const fakeObjectPath = '/objects/uploads/test-uuid';
      mockGetObjectEntityUploadURL.mockResolvedValue(fakeUploadURL);
      mockNormalizeObjectEntityPath.mockReturnValue(fakeObjectPath);

      mockReq = { body: { name: 'test.jpg', size: 12345, contentType: 'image/jpeg' } };
      await handler(mockReq, mockRes);

      expect(mockGetObjectEntityUploadURL).toHaveBeenCalled();
      expect(mockNormalizeObjectEntityPath).toHaveBeenCalledWith(fakeUploadURL);
      expect(mockRes.json).toHaveBeenCalledWith({
        uploadURL: fakeUploadURL,
        objectPath: fakeObjectPath,
        metadata: { name: 'test.jpg', size: 12345, contentType: 'image/jpeg' },
      });
    });

    it('should return 500 on error', async () => {
      mockGetObjectEntityUploadURL.mockRejectedValue(new Error('Storage error'));
      mockReq = { body: { name: 'test.jpg' } };
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to generate upload URL' });
    });
  });

  describe('GET /objects/:objectPath(*)', () => {
    let handler: Function;

    beforeEach(() => {
      handler = routeHandlers['GET /objects/:objectPath(*)'];
    });

    it('should serve the object file on success', async () => {
      const mockFile = { name: 'test-file' };
      mockGetObjectEntityFile.mockResolvedValue(mockFile);
      mockDownloadObject.mockResolvedValue(undefined);

      mockReq = { path: '/objects/uploads/test-uuid' };
      await handler(mockReq, mockRes);

      expect(mockGetObjectEntityFile).toHaveBeenCalledWith('/objects/uploads/test-uuid');
      expect(mockDownloadObject).toHaveBeenCalledWith(mockFile, mockRes);
    });

    it('should return 404 for ObjectNotFoundError', async () => {
      mockGetObjectEntityFile.mockRejectedValue(new ObjectNotFoundError('not found'));

      mockReq = { path: '/objects/uploads/missing' };
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Object not found' });
    });

    it('should return 500 for generic errors', async () => {
      mockGetObjectEntityFile.mockRejectedValue(new Error('Something broke'));

      mockReq = { path: '/objects/uploads/broken' };
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to serve object' });
    });
  });
});
