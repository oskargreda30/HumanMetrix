import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const { mockStorage, mockDb, mockObjectStorageClient } = vi.hoisted(() => ({
  mockStorage: {
    getUser: vi.fn(),
  },
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockObjectStorageClient: {
    bucket: vi.fn().mockReturnValue({
      file: vi.fn().mockReturnValue({
        save: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue([true]),
        getMetadata: vi.fn().mockResolvedValue([{ contentType: 'image/png' }]),
        createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn() }),
        delete: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

vi.mock('../../server/auth', () => ({
  isAuthenticated: vi.fn((req: any, res: any, next: any) => {
    if (req.user) {
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  }),
}));

vi.mock('../../server/db', () => ({
  db: mockDb,
  pool: { query: vi.fn() },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  sql: vi.fn(),
  and: vi.fn((...args: any[]) => args),
}));

vi.mock('@shared/schema', () => ({
  bugReports: {
    id: 'id',
    status: 'status',
    createdAt: 'createdAt',
    title: 'title',
    description: 'description',
  },
}));

vi.mock('multer', () => {
  const multerFn: any = vi.fn().mockReturnValue({
    single: vi.fn().mockReturnValue((req: any, res: any, next: any) => next()),
    array: vi.fn().mockReturnValue((req: any, res: any, next: any) => {
      (req as any).files = req._testFiles || [];
      next();
    }),
  });
  multerFn.memoryStorage = vi.fn();
  return { default: multerFn };
});

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'medium' } }],
        }),
      },
    },
  })),
}));

vi.mock('../../server/replit_integrations/object_storage/objectStorage', () => ({
  objectStorageClient: mockObjectStorageClient,
}));

vi.mock('../../server/email', () => ({
  sendBugReportNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));

import express from 'express';
import { registerBugReportRoutes } from '../../server/bug-report-routes';
import request from 'supertest';

let app: express.Express;

function setupChainedSelect(result: any[]) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
      orderBy: vi.fn().mockResolvedValue(result),
    }),
  });
}

function setupChainedInsert(result: any[]) {
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  });
}

function setupChainedUpdate(result: any[]) {
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

function setupChainedDelete(result: any[]) {
  mockDb.delete.mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  });
}

function setupChainedCount(countValue: number) {
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: countValue }]),
    }),
  });
}

beforeAll(() => {
  app = express();
  app.use(express.json());
  registerBugReportRoutes(app);
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Bug Report Routes', () => {
  describe('POST /api/bug-reports', () => {
    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/bug-reports')
        .send({ title: 'Bug' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });

    it('should return 400 if no screenshots', async () => {
      const res = await request(app)
        .post('/api/bug-reports')
        .field('title', 'Bug')
        .field('description', 'Details')
        .field('reporterEmail', 'test@example.com')
        .field('reporterName', 'Test User');

      expect(res.status).toBe(400);
    });

    it('should return 500 if object storage not configured', async () => {
      const originalEnv = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      delete process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

      const app2 = express();
      app2.use(express.json());
      app2.use((req: any, _res: any, next: any) => {
        req.body = { title: 'Bug', description: 'Details', reporterEmail: 'test@example.com', reporterName: 'Test User' };
        (req as any).files = [{ originalname: 'screenshot.png', buffer: Buffer.from('test'), mimetype: 'image/png' }];
        next();
      });
      registerBugReportRoutes(app2);

      const res = await request(app2)
        .post('/api/bug-reports')
        .send({});

      process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID = originalEnv;

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin/bug-reports/new-count', () => {
    it('should return count for super_admin', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'admin-1' };
        next();
      });
      registerBugReportRoutes(adminApp);

      mockStorage.getUser.mockResolvedValue({ id: 'admin-1', role: 'super_admin' });
      setupChainedCount(3);

      const res = await request(adminApp).get('/api/admin/bug-reports/new-count');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
    });

    it('should return 403 for non-super_admin', async () => {
      const userApp = express();
      userApp.use(express.json());
      userApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'user-1' };
        next();
      });
      registerBugReportRoutes(userApp);

      mockStorage.getUser.mockResolvedValue({ id: 'user-1', role: 'user' });

      const res = await request(userApp).get('/api/admin/bug-reports/new-count');

      expect(res.status).toBe(403);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/admin/bug-reports/new-count');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/bug-reports', () => {
    it('should return all reports for super_admin', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'admin-1' };
        next();
      });
      registerBugReportRoutes(adminApp);

      mockStorage.getUser.mockResolvedValue({ id: 'admin-1', role: 'super_admin' });
      const reports = [{ id: 'br-1', title: 'Bug 1' }, { id: 'br-2', title: 'Bug 2' }];
      setupChainedSelect(reports);

      const res = await request(adminApp).get('/api/admin/bug-reports');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should return 403 for non-admin', async () => {
      const userApp = express();
      userApp.use(express.json());
      userApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'user-1' };
        next();
      });
      registerBugReportRoutes(userApp);

      mockStorage.getUser.mockResolvedValue({ id: 'user-1', role: 'user' });

      const res = await request(userApp).get('/api/admin/bug-reports');

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/bug-reports/:id', () => {
    it('should update bug report status', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'admin-1' };
        next();
      });
      registerBugReportRoutes(adminApp);

      mockStorage.getUser.mockResolvedValue({ id: 'admin-1', role: 'super_admin' });
      const updatedReport = { id: 'br-1', status: 'in_progress' };
      setupChainedUpdate([updatedReport]);

      const res = await request(adminApp)
        .patch('/api/admin/bug-reports/br-1')
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_progress');
    });

    it('should return 404 if report not found', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'admin-1' };
        next();
      });
      registerBugReportRoutes(adminApp);

      mockStorage.getUser.mockResolvedValue({ id: 'admin-1', role: 'super_admin' });
      setupChainedUpdate([]);

      const res = await request(adminApp)
        .patch('/api/admin/bug-reports/nonexistent')
        .send({ status: 'resolved' });

      expect(res.status).toBe(404);
    });

    it('should update admin notes', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'admin-1' };
        next();
      });
      registerBugReportRoutes(adminApp);

      mockStorage.getUser.mockResolvedValue({ id: 'admin-1', role: 'super_admin' });
      const updatedReport = { id: 'br-1', adminNotes: 'Fixed in v2.1' };
      setupChainedUpdate([updatedReport]);

      const res = await request(adminApp)
        .patch('/api/admin/bug-reports/br-1')
        .send({ adminNotes: 'Fixed in v2.1' });

      expect(res.status).toBe(200);
    });

    it('should return 403 for non-admin', async () => {
      const userApp = express();
      userApp.use(express.json());
      userApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'user-1' };
        next();
      });
      registerBugReportRoutes(userApp);

      mockStorage.getUser.mockResolvedValue({ id: 'user-1', role: 'user' });

      const res = await request(userApp)
        .patch('/api/admin/bug-reports/br-1')
        .send({ status: 'resolved' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/bug-reports/:id', () => {
    it('should delete bug report and its screenshots', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'admin-1' };
        next();
      });
      registerBugReportRoutes(adminApp);

      mockStorage.getUser.mockResolvedValue({ id: 'admin-1', role: 'super_admin' });
      const deletedReport = {
        id: 'br-1',
        screenshotUrl: '/bucket/path/screenshot.png',
        screenshotUrls: ['/bucket/path/screenshot.png', '/bucket/path/screenshot2.png'],
      };
      setupChainedDelete([deletedReport]);

      const res = await request(adminApp).delete('/api/admin/bug-reports/br-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 if report not found', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'admin-1' };
        next();
      });
      registerBugReportRoutes(adminApp);

      mockStorage.getUser.mockResolvedValue({ id: 'admin-1', role: 'super_admin' });
      setupChainedDelete([]);

      const res = await request(adminApp).delete('/api/admin/bug-reports/nonexistent');

      expect(res.status).toBe(404);
    });

    it('should return 403 for non-admin', async () => {
      const userApp = express();
      userApp.use(express.json());
      userApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'user-1' };
        next();
      });
      registerBugReportRoutes(userApp);

      mockStorage.getUser.mockResolvedValue({ id: 'user-1', role: 'user' });

      const res = await request(userApp).delete('/api/admin/bug-reports/br-1');

      expect(res.status).toBe(403);
    });

    it('should handle reports with only screenshotUrl (no screenshotUrls array)', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'admin-1' };
        next();
      });
      registerBugReportRoutes(adminApp);

      mockStorage.getUser.mockResolvedValue({ id: 'admin-1', role: 'super_admin' });
      const deletedReport = {
        id: 'br-1',
        screenshotUrl: '/bucket/path/screenshot.png',
        screenshotUrls: [],
      };
      setupChainedDelete([deletedReport]);

      const res = await request(adminApp).delete('/api/admin/bug-reports/br-1');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/bug-reports/screenshot/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/bug-reports/screenshot/br-1');

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin', async () => {
      const userApp = express();
      userApp.use(express.json());
      userApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'user-1' };
        next();
      });
      registerBugReportRoutes(userApp);

      mockStorage.getUser.mockResolvedValue({ id: 'user-1', role: 'user' });

      const res = await request(userApp).get('/api/bug-reports/screenshot/br-1');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/bug-reports/screenshot/:id/:index', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/bug-reports/screenshot/br-1/0');

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin', async () => {
      const userApp = express();
      userApp.use(express.json());
      userApp.use((req: any, _res: any, next: any) => {
        req.user = { id: 'user-1' };
        next();
      });
      registerBugReportRoutes(userApp);

      mockStorage.getUser.mockResolvedValue({ id: 'user-1', role: 'user' });

      const res = await request(userApp).get('/api/bug-reports/screenshot/br-1/0');

      expect(res.status).toBe(403);
    });
  });
});
