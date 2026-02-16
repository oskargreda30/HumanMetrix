import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    createEcosystemProject: vi.fn(),
    getEcosystemProject: vi.fn(),
    getEcosystemProjectsByUser: vi.fn(),
    getEcosystemProjectsByPartner: vi.fn(),
    updateEcosystemProject: vi.fn(),
    deleteEcosystemProject: vi.fn(),
    getEcosystemTeamMembers: vi.fn(),
    addEcosystemTeamMember: vi.fn(),
    updateEcosystemTeamMember: vi.fn(),
    deleteEcosystemTeamMember: vi.fn(),
    getPartnerTeamMemberByEmail: vi.fn(),
    getUser: vi.fn(),
    getPartnerAccountByOrganizationId: vi.fn(),
    getPartnerQuotaBalance: vi.fn(),
    updatePartnerAccount: vi.fn(),
    getSessionsByPartner: vi.fn(),
    getPartnerCandidateInvitations: vi.fn(),
    getResultsByPartnerInvitation: vi.fn(),
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
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
  pool: { query: vi.fn() },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  sql: vi.fn(),
  and: vi.fn((...args: any[]) => args),
  or: vi.fn((...args: any[]) => args),
  gte: vi.fn((...args: any[]) => args),
  isNotNull: vi.fn((col: any) => col),
  isNull: vi.fn((col: any) => col),
  inArray: vi.fn((...args: any[]) => args),
  count: vi.fn(),
}));

vi.mock('@shared/schema', () => ({
  ecosystemProjects: { id: 'id', userId: 'userId', partnerId: 'partnerId' },
  ecosystemTeamMembers: { id: 'id', projectId: 'projectId' },
  bugReports: { id: 'id', status: 'status', createdAt: 'createdAt' },
}));

vi.mock('@shared/currencies', () => ({
  convertToStripeCurrencyAmount: vi.fn((amount: number) => amount),
  getStripeCurrencyCode: vi.fn(() => 'gbp'),
  COUNTRY_CURRENCY_MAP: { GB: 'GBP', US: 'USD' },
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({
            summary: 'Test summary',
            capabilityPriorities: [
              { code: 'HA', name: 'High Agency', priority: 'high', reasoning: 'test' },
            ],
            keyThemes: ['theme1'],
          }) } }],
        }),
      },
    },
  })),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://stripe.com/test', id: 'ses_123' }),
        list: vi.fn().mockResolvedValue({ data: [] }),
      },
    },
  })),
}));

vi.mock('multer', () => {
  const multerFn: any = vi.fn().mockReturnValue({
    single: vi.fn().mockReturnValue((req: any, res: any, next: any) => next()),
    array: vi.fn().mockReturnValue((req: any, res: any, next: any) => next()),
  });
  multerFn.memoryStorage = vi.fn();
  return { default: multerFn };
});

vi.mock('../../server/airwallex', () => ({
  createPaymentIntent: vi.fn().mockResolvedValue({ id: 'intent_123', clientSecret: 'secret' }),
  formatAmountForAirwallex: vi.fn((amount: number) => amount),
  airwallexEnv: 'demo',
}));

vi.mock('../../server/payment-routing', () => ({
  getPaymentProviders: vi.fn(() => ({ primary: 'stripe', fallback: 'airwallex' })),
  createCheckoutWithFallback: vi.fn(async (_p: any, _f: any, _afn: any, sfn: any) => sfn()),
}));

import express from 'express';
import { registerEcosystemRoutes } from '../../server/ecosystem-routes';
import request from 'supertest';

let app: express.Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'test@example.com' };
    next();
  });
  registerEcosystemRoutes(app);
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Ecosystem Routes', () => {
  describe('POST /api/ecosystem/projects', () => {
    it('should create a new ecosystem project', async () => {
      const mockProject = { id: 'proj-1', userId: 'user-1', name: 'My Team Analysis', status: 'draft' };
      mockStorage.createEcosystemProject.mockResolvedValue(mockProject);

      const res = await request(app)
        .post('/api/ecosystem/projects')
        .send({ name: 'Test Project' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('proj-1');
      expect(mockStorage.createEcosystemProject).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', status: 'draft' })
      );
    });

    it('should create project with default name if none provided', async () => {
      const mockProject = { id: 'proj-2', userId: 'user-1', name: 'My Team Analysis' };
      mockStorage.createEcosystemProject.mockResolvedValue(mockProject);

      const res = await request(app)
        .post('/api/ecosystem/projects')
        .send({});

      expect(res.status).toBe(201);
      expect(mockStorage.createEcosystemProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Team Analysis' })
      );
    });

    it('should create project with partnerId', async () => {
      const mockProject = { id: 'proj-3', userId: 'user-1', partnerId: 'partner-1' };
      mockStorage.createEcosystemProject.mockResolvedValue(mockProject);

      const res = await request(app)
        .post('/api/ecosystem/projects')
        .send({ partnerId: 'partner-1' });

      expect(res.status).toBe(201);
      expect(mockStorage.createEcosystemProject).toHaveBeenCalledWith(
        expect.objectContaining({ partnerId: 'partner-1' })
      );
    });

    it('should return 500 on storage error', async () => {
      mockStorage.createEcosystemProject.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/ecosystem/projects')
        .send({ name: 'Test' });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/ecosystem/projects', () => {
    it('should return user projects', async () => {
      const projects = [{ id: 'proj-1' }, { id: 'proj-2' }];
      mockStorage.getEcosystemProjectsByUser.mockResolvedValue(projects);

      const res = await request(app).get('/api/ecosystem/projects');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should return empty array when no projects', async () => {
      mockStorage.getEcosystemProjectsByUser.mockResolvedValue([]);

      const res = await request(app).get('/api/ecosystem/projects');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('should return 500 on error', async () => {
      mockStorage.getEcosystemProjectsByUser.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/ecosystem/projects');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/ecosystem/projects/:id', () => {
    it('should return a specific project', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app).get('/api/ecosystem/projects/proj-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('proj-1');
    });

    it('should return 404 if project not found', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app).get('/api/ecosystem/projects/nonexistent');

      expect(res.status).toBe(404);
    });

    it('should return 403 if user does not own the project', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app).get('/api/ecosystem/projects/proj-1');

      expect(res.status).toBe(403);
    });

    it('should allow access via partner membership', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: 'partner-1' };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getPartnerTeamMemberByEmail.mockResolvedValue({ id: 'member-1' });

      const res = await request(app).get('/api/ecosystem/projects/proj-1');

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/ecosystem/projects/:id', () => {
    it('should update project', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      const updated = { ...project, name: 'Updated Name' };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.updateEcosystemProject.mockResolvedValue(updated);

      const res = await request(app)
        .patch('/api/ecosystem/projects/proj-1')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(mockStorage.updateEcosystemProject).toHaveBeenCalled();
    });

    it('should return 404 for non-existent project', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/ecosystem/projects/nonexistent')
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });

    it('should return 403 for unauthorized access', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .patch('/api/ecosystem/projects/proj-1')
        .send({ name: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/ecosystem/projects/:id', () => {
    it('should delete project owned by user', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.deleteEcosystemProject.mockResolvedValue(undefined);

      const res = await request(app).delete('/api/ecosystem/projects/proj-1');

      expect(res.status).toBe(204);
      expect(mockStorage.deleteEcosystemProject).toHaveBeenCalledWith('proj-1');
    });

    it('should return 404 for non-existent project', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app).delete('/api/ecosystem/projects/nonexistent');

      expect(res.status).toBe(404);
    });

    it('should return 403 for unauthorized delete', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app).delete('/api/ecosystem/projects/proj-1');

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/ecosystem/projects/:id/save-mission', () => {
    it('should save mission statement', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 1 };
      const updated = { ...project, missionStatement: 'Our mission', currentStep: 3 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.updateEcosystemProject.mockResolvedValue(updated);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/save-mission')
        .send({ missionStatement: 'Our mission' });

      expect(res.status).toBe(200);
      expect(mockStorage.updateEcosystemProject).toHaveBeenCalledWith('proj-1', expect.objectContaining({
        missionStatement: 'Our mission',
        currentStep: 3,
      }));
    });

    it('should return 400 for empty mission statement', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 1 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/save-mission')
        .send({ missionStatement: '' });

      expect(res.status).toBe(400);
    });

    it('should not decrease currentStep', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 5 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.updateEcosystemProject.mockResolvedValue(project);

      await request(app)
        .post('/api/ecosystem/projects/proj-1/save-mission')
        .send({ missionStatement: 'Mission' });

      expect(mockStorage.updateEcosystemProject).toHaveBeenCalledWith('proj-1', expect.objectContaining({
        currentStep: 5,
      }));
    });
  });

  describe('POST /api/ecosystem/projects/:id/organization-context', () => {
    it('should update organization context', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 2 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.updateEcosystemProject.mockResolvedValue({ ...project, currentStep: 4 });

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/organization-context')
        .send({ industry: 'Tech', teamSize: 5, workMode: 'remote' });

      expect(res.status).toBe(200);
      expect(mockStorage.updateEcosystemProject).toHaveBeenCalledWith('proj-1', expect.objectContaining({
        industry: 'Tech',
        teamSize: 5,
        workMode: 'remote',
        currentStep: 4,
      }));
    });

    it('should reject invalid workMode', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 2 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/organization-context')
        .send({ workMode: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should accept deep dive context fields', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 2 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.updateEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/organization-context')
        .send({
          delayedTasks: 'Reports',
          conflictTopics: 'Priorities',
          wishedSkills: 'Data analysis',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/ecosystem/projects/:id/team-members', () => {
    it('should return team members', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      const members = [
        { id: 'mem-1', name: 'Alice', fitScores: { HA: 80, IC: 70 } },
        { id: 'mem-2', name: 'Bob', fitScores: null },
      ];
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue(members);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/team-members');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should normalize fitScores from full names to codes', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      const members = [
        { id: 'mem-1', name: 'Alice', fitScores: { 'high agency': 80, 'growth mindset': 75 } },
      ];
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue(members);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/team-members');

      expect(res.status).toBe(200);
      expect(res.body[0].fitScores).toEqual({ HA: 80, GM: 75 });
    });

    it('should return 404 for non-existent project', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app).get('/api/ecosystem/projects/nonexistent/team-members');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/ecosystem/projects/:id/team-members', () => {
    it('should add a team member', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 3 };
      const member = { id: 'mem-1', name: 'Alice', sourceType: 'manual' };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.addEcosystemTeamMember.mockResolvedValue(member);
      mockStorage.updateEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/team-members')
        .send({ name: 'Alice', sourceType: 'manual' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('mem-1');
    });

    it('should set assessmentCompleted when all 6 scores provided', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 4 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.addEcosystemTeamMember.mockResolvedValue({ id: 'mem-1' });

      await request(app)
        .post('/api/ecosystem/projects/proj-1/team-members')
        .send({
          name: 'Alice',
          sourceType: 'manual',
          fitScores: { HA: 80, IC: 70, RA: 60, EE: 50, GM: 90, IA: 85 },
        });

      expect(mockStorage.addEcosystemTeamMember).toHaveBeenCalledWith(
        expect.objectContaining({ assessmentCompleted: true })
      );
    });

    it('should reject invalid sourceType', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 3 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/team-members')
        .send({ name: 'Alice', sourceType: 'invalid_type' });

      expect(res.status).toBe(400);
    });

    it('should update project step to 4 if below', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 3 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.addEcosystemTeamMember.mockResolvedValue({ id: 'mem-1' });
      mockStorage.updateEcosystemProject.mockResolvedValue(project);

      await request(app)
        .post('/api/ecosystem/projects/proj-1/team-members')
        .send({ name: 'Alice', sourceType: 'manual' });

      expect(mockStorage.updateEcosystemProject).toHaveBeenCalledWith('proj-1', expect.objectContaining({ currentStep: 4 }));
    });
  });

  describe('PATCH /api/ecosystem/projects/:id/team-members/:memberId', () => {
    it('should update a team member', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      const updated = { id: 'mem-1', name: 'Alice Updated' };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.updateEcosystemTeamMember.mockResolvedValue(updated);

      const res = await request(app)
        .patch('/api/ecosystem/projects/proj-1/team-members/mem-1')
        .send({ name: 'Alice Updated' });

      expect(res.status).toBe(200);
      expect(mockStorage.updateEcosystemTeamMember).toHaveBeenCalledWith('mem-1', { name: 'Alice Updated' });
    });

    it('should return 403 for unauthorized update', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .patch('/api/ecosystem/projects/proj-1/team-members/mem-1')
        .send({ name: 'test' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/ecosystem/projects/:id/team-members/:memberId', () => {
    it('should delete a team member', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.deleteEcosystemTeamMember.mockResolvedValue(undefined);

      const res = await request(app).delete('/api/ecosystem/projects/proj-1/team-members/mem-1');

      expect(res.status).toBe(204);
      expect(mockStorage.deleteEcosystemTeamMember).toHaveBeenCalledWith('mem-1');
    });

    it('should return 404 for non-existent project', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app).delete('/api/ecosystem/projects/nonexistent/team-members/mem-1');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/ecosystem/projects/:id/generate-analysis', () => {
    it('should return 404 for non-existent project', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/ecosystem/projects/nonexistent/generate-analysis')
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return 402 if project not paid', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, isPaid: false };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/generate-analysis')
        .send({});

      expect(res.status).toBe(402);
    });

    it('should return 400 if no team members', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, isPaid: true };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/generate-analysis')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 if no members have valid FIT scores', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, isPaid: true };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([
        { id: 'mem-1', name: 'Alice', fitScores: null },
      ]);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/generate-analysis')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 403 for unauthorized access', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: null, isPaid: true };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/generate-analysis')
        .send({});

      expect(res.status).toBe(403);
    });

    it('should require partner account for regeneration', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, isPaid: true };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: null });

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/generate-analysis')
        .send({ isRegeneration: true });

      expect(res.status).toBe(403);
    });

    it('should return 400 if insufficient credits for regeneration', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, isPaid: true };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getUser.mockResolvedValue({ id: 'user-1', organizationId: 'org-1' });
      mockStorage.getPartnerAccountByOrganizationId.mockResolvedValue({ id: 'partner-1', testsConsumed: 0 });
      mockStorage.getPartnerQuotaBalance.mockResolvedValue({ remaining: 5 });

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/generate-analysis')
        .send({ isRegeneration: true });

      expect(res.status).toBe(400);
      expect(res.body.creditsRequired).toBe(20);
    });
  });

  describe('GET /api/ecosystem/partner/projects', () => {
    it('should return user projects when no partnerId', async () => {
      mockStorage.getEcosystemProjectsByUser.mockResolvedValue([{ id: 'proj-1' }]);

      const res = await request(app).get('/api/ecosystem/partner/projects');

      expect(res.status).toBe(200);
      expect(mockStorage.getEcosystemProjectsByUser).toHaveBeenCalledWith('user-1');
    });

    it('should return partner projects when partnerId provided', async () => {
      mockStorage.getEcosystemProjectsByPartner.mockResolvedValue([{ id: 'proj-1' }]);

      const res = await request(app).get('/api/ecosystem/partner/projects?partnerId=partner-1');

      expect(res.status).toBe(200);
      expect(mockStorage.getEcosystemProjectsByPartner).toHaveBeenCalledWith('partner-1');
    });
  });

  describe('GET /api/ecosystem/projects/:id/searchable-candidates', () => {
    it('should return 404 for non-existent project', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app).get('/api/ecosystem/projects/nonexistent/searchable-candidates');

      expect(res.status).toBe(404);
    });

    it('should return 403 if not project owner', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: 'partner-1' };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/searchable-candidates');

      expect(res.status).toBe(403);
    });

    it('should return empty array if no partnerId', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/searchable-candidates');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return candidates from partner sessions', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: 'partner-1' };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([]);
      mockStorage.getSessionsByPartner.mockResolvedValue([
        {
          id: 'ses-1',
          assessmentType: 'fit',
          isTestSession: false,
          externalEmail: 'alice@test.com',
          status: 'completed',
          scores: { HA: 80, IC: 70, RA: 60, EE: 50, GM: 90, IA: 85 },
          completedAt: new Date(),
        },
      ]);
      mockStorage.getPartnerCandidateInvitations.mockResolvedValue([]);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/searchable-candidates');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].email).toBe('alice@test.com');
    });

    it('should exclude already added team members', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: 'partner-1' };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([
        { id: 'mem-1', email: 'alice@test.com' },
      ]);
      mockStorage.getSessionsByPartner.mockResolvedValue([
        {
          id: 'ses-1',
          assessmentType: 'fit',
          isTestSession: false,
          externalEmail: 'alice@test.com',
          status: 'completed',
          scores: { HA: 80 },
          completedAt: new Date(),
        },
      ]);
      mockStorage.getPartnerCandidateInvitations.mockResolvedValue([]);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/searchable-candidates');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('should skip test sessions', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: 'partner-1' };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([]);
      mockStorage.getSessionsByPartner.mockResolvedValue([
        {
          id: 'ses-1',
          assessmentType: 'fit',
          isTestSession: true,
          externalEmail: 'alice@test.com',
          status: 'completed',
          scores: { HA: 80 },
        },
      ]);
      mockStorage.getPartnerCandidateInvitations.mockResolvedValue([]);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/searchable-candidates');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST /api/ecosystem/projects/:id/create-checkout', () => {
    it('should return 404 for non-existent project', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/ecosystem/projects/nonexistent/create-checkout')
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return 403 for unauthorized access', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/create-checkout')
        .send({});

      expect(res.status).toBe(403);
    });

    it('should return 400 if already paid', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, isPaid: true };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/create-checkout')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 if no team members with scores', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, isPaid: false };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/create-checkout')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/ecosystem/projects/:id/verify-payment', () => {
    it('should return 404 for non-existent project', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/ecosystem/projects/nonexistent/verify-payment')
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return success for already paid project', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, isPaid: true };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/verify-payment')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.alreadyPaid).toBe(true);
    });

    it('should return 403 for unauthorized access', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: null, isPaid: false };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/verify-payment')
        .send({});

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/ecosystem/projects/:id/analyze-mission', () => {
    it('should return 404 for non-existent project', async () => {
      mockStorage.getEcosystemProject.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/ecosystem/projects/nonexistent/analyze-mission')
        .send({ missionStatement: 'Test' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for empty mission statement', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null, currentStep: 1 };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/analyze-mission')
        .send({ missionStatement: '' });

      expect(res.status).toBe(400);
    });

    it('should return 403 for unauthorized access', async () => {
      const project = { id: 'proj-1', userId: 'other-user', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);

      const res = await request(app)
        .post('/api/ecosystem/projects/proj-1/analyze-mission')
        .send({ missionStatement: 'Test' });

      expect(res.status).toBe(403);
    });
  });
});

describe('Ecosystem Helper Functions', () => {
  describe('normalizeFitScores', () => {
    it('should pass through short codes', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([
        { id: 'mem-1', fitScores: { HA: 80, IC: 70, RA: 60, EE: 50, GM: 90, IA: 85 } },
      ]);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/team-members');

      expect(res.body[0].fitScores).toEqual({ HA: 80, IC: 70, RA: 60, EE: 50, GM: 90, IA: 85 });
    });

    it('should convert full names to codes', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([
        { id: 'mem-1', fitScores: { 'resilience & adaptability': 60, 'empathy & ethics': 50, 'impact ambition': 85 } },
      ]);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/team-members');

      expect(res.body[0].fitScores).toEqual({ RA: 60, EE: 50, IA: 85 });
    });

    it('should skip non-numeric values', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([
        { id: 'mem-1', fitScores: { HA: 80, IC: 'not a number' } },
      ]);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/team-members');

      expect(res.body[0].fitScores).toEqual({ HA: 80 });
    });

    it('should handle null fitScores', async () => {
      const project = { id: 'proj-1', userId: 'user-1', partnerId: null };
      mockStorage.getEcosystemProject.mockResolvedValue(project);
      mockStorage.getEcosystemTeamMembers.mockResolvedValue([
        { id: 'mem-1', fitScores: null },
      ]);

      const res = await request(app).get('/api/ecosystem/projects/proj-1/team-members');

      expect(res.body[0].fitScores).toBeNull();
    });
  });
});
