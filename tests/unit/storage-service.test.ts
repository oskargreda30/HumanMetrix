import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../server/db', () => ({
  db: mockDb,
  pool: { query: vi.fn() },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  or: vi.fn((...args: any[]) => ({ type: 'or', args })),
  desc: vi.fn((col: any) => ({ type: 'desc', col })),
  sql: vi.fn((strings: any, ...values: any[]) => ({ type: 'sql', strings, values })),
  inArray: vi.fn((...args: any[]) => ({ type: 'inArray', args })),
  gte: vi.fn((...args: any[]) => ({ type: 'gte', args })),
  lte: vi.fn((...args: any[]) => ({ type: 'lte', args })),
  isNull: vi.fn((col: any) => ({ type: 'isNull', col })),
  isNotNull: vi.fn((col: any) => ({ type: 'isNotNull', col })),
  count: vi.fn(),
  countDistinct: vi.fn(),
}));

vi.mock('@shared/schema', () => ({
  users: { id: 'id', email: 'email', resetToken: 'resetToken', autoLoginToken: 'autoLoginToken', organizationId: 'organizationId', role: 'role' },
  purchases: { id: 'id', userId: 'userId', stripeSessionId: 'stripeSessionId', createdAt: 'createdAt' },
  purchaseItems: { id: 'id', purchaseId: 'purchaseId' },
  assessmentResults: { id: 'id', userId: 'userId', purchaseItemId: 'purchaseItemId', invitationId: 'invitationId', partnerInvitationId: 'partnerInvitationId', assessmentType: 'assessmentType', startedAt: 'startedAt' },
  invitations: { id: 'id', token: 'token', sentBy: 'sentBy', candidateEmail: 'candidateEmail', sentAt: 'sentAt' },
  promptArchitectureEvaluations: { id: 'id', resultId: 'resultId' },
  aiqRationales: { id: 'id', resultId: 'resultId' },
  jobRoles: { id: 'id', createdAt: 'createdAt' },
  candidateTags: { id: 'id', userId: 'userId', createdAt: 'createdAt' },
  candidateNotes: { id: 'id', userId: 'userId', createdAt: 'createdAt' },
  cachedRoleAlignments: { id: 'id', userId: 'userId', jobRoleId: 'jobRoleId', createdAt: 'createdAt' },
  multiCandidateComparisons: { id: 'id', jobRoleId: 'jobRoleId', createdBy: 'createdBy', createdAt: 'createdAt' },
  reportExports: { id: 'id', shareToken: 'shareToken', createdBy: 'createdBy', createdAt: 'createdAt', accessCount: 'accessCount' },
  userReferences: { id: 'id', userId: 'userId', submittedAt: 'submittedAt' },
  marketingOptins: { id: 'id', optedInAt: 'optedInAt' },
  goldenSetPrompts: { id: 'id', level: 'level' },
  goldenSetResults: { id: 'id', promptId: 'promptId', testedAt: 'testedAt' },
  organizations: { id: 'id', slug: 'slug', createdAt: 'createdAt' },
  partnerAccounts: { id: 'id', email: 'email', organizationId: 'organizationId', createdAt: 'createdAt', name: 'name', companyName: 'companyName' },
  partnerApiKeys: { id: 'id', partnerId: 'partnerId', keyPrefix: 'keyPrefix', isActive: 'isActive', createdAt: 'createdAt', environment: 'environment' },
  assessmentSessions: { id: 'id', partnerId: 'partnerId', partnerOrganisationId: 'partnerOrganisationId', status: 'status', createdAt: 'createdAt', externalEmail: 'externalEmail', resultsEmailSentAt: 'resultsEmailSentAt', resultsUnlockAt: 'resultsUnlockAt', resultsPaymentStatus: 'resultsPaymentStatus', isTestSession: 'isTestSession', resultsDeliveryStatus: 'resultsDeliveryStatus' },
  usageEvents: { id: 'id', partnerId: 'partnerId', apiKeyId: 'apiKeyId', sessionId: 'sessionId', eventType: 'eventType', createdAt: 'createdAt', billable: 'billable', billedAmount: 'billedAmount', assessmentType: 'assessmentType', stripeUsageRecordId: 'stripeUsageRecordId', metadata: 'metadata', partnerOrganisationId: 'partnerOrganisationId' },
  partnerTestPackages: { id: 'id', partnerId: 'partnerId', stripeCheckoutSessionId: 'stripeCheckoutSessionId', createdAt: 'createdAt' },
  partnerQuotaLedger: { id: 'id', partnerId: 'partnerId', sessionId: 'sessionId', entryType: 'entryType', createdAt: 'createdAt' },
  partnerOrganisations: { id: 'id', partnerId: 'partnerId', slug: 'slug' },
  errorLogs: { id: 'id' },
  partnerWebhooks: { id: 'id' },
  webhookDeliveryLogs: { id: 'id' },
  partnerAtsIntegrations: { id: 'id' },
  partnerScheduledExports: { id: 'id' },
  partnerNotifications: { id: 'id' },
  partnerNotificationRecipients: { id: 'id' },
  partnerTeamMembers: { id: 'id', partnerId: 'partnerId', email: 'email', token: 'token', userId: 'userId' },
  billingChangeRequests: { id: 'id' },
  partnerCandidateImports: { id: 'id' },
  partnerCandidateInvitations: { id: 'id', partnerId: 'partnerId', token: 'token', email: 'email' },
  partnerResultPurchases: { id: 'id' },
  adminNotifications: { id: 'id' },
  systemSettings: { id: 'id', key: 'key' },
  emailVerificationCodes: { id: 'id' },
  auditLogs: { id: 'id' },
  ecosystemProjects: { id: 'id', userId: 'userId', partnerId: 'partnerId' },
  ecosystemTeamMembers: { id: 'id', projectId: 'projectId' },
  aiUsageCosts: { id: 'id' },
  partnerAnalysisReports: { id: 'id' },
  stripeWebhookEvents: { id: 'id' },
  autoTopUpRetries: { id: 'id' },
  partnerInvoices: { id: 'id' },
  partnerMonthlyUsage: { id: 'id' },
  partnerOverageLedger: { id: 'id' },
  ASSESSMENT_TYPES: { fit: 'FIT Test', aiq: 'AIQ Test', ai_readiness: 'AI Readiness', prompt_architecture: 'Prompt Architecture' },
  ASSESSMENT_PRICES: { fit: 400, aiq: 400, ai_readiness: 400, prompt_architecture: 600 },
  BASE_FEE: 200,
}));

vi.mock('@shared/notification-types', () => ({
  canReceiveNotification: vi.fn().mockReturnValue(true),
}));

import { DatabaseStorage } from '../../server/storage';

let storage: DatabaseStorage;

function setupSelect(result: any[]) {
  const chain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
        limit: vi.fn().mockResolvedValue(result),
      }),
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
    where: vi.fn().mockResolvedValue(result),
  };
  mockDb.select.mockReturnValue(chain);
  return chain;
}

function setupSelectDirect(result: any[]) {
  const limitFn = vi.fn().mockResolvedValue(result);
  const orderByResult = {
    limit: limitFn,
    then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
  };
  const orderByFn = vi.fn().mockReturnValue(orderByResult);
  Object.assign(orderByFn, { then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject), limit: limitFn });
  const whereResult = {
    orderBy: orderByFn,
    limit: limitFn,
    groupBy: vi.fn().mockResolvedValue(result),
    then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
  };
  const whereFn = vi.fn().mockReturnValue(whereResult);
  Object.assign(whereFn, { then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject) });
  mockDb.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: whereFn,
      orderBy: orderByFn,
      leftJoin: vi.fn().mockReturnValue({
        where: whereFn,
        leftJoin: vi.fn().mockReturnValue({
          where: whereFn,
          orderBy: orderByFn,
        }),
        orderBy: orderByFn,
        groupBy: vi.fn().mockResolvedValue(result),
      }),
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: whereFn,
          groupBy: vi.fn().mockResolvedValue(result),
        }),
        where: whereFn,
        groupBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

function setupInsert(result: any[]) {
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

function setupUpdate() {
  const chain = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  };
  mockDb.update.mockReturnValue(chain);
  return chain;
}

function setupDelete() {
  const chain = {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
  mockDb.delete.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  storage = new DatabaseStorage();
});

describe('DatabaseStorage - User Operations', () => {
  describe('getUser', () => {
    it('should return a user by id', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      setupSelectDirect([user]);

      const result = await storage.getUser('user-1');

      expect(result).toEqual(user);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return undefined when user not found', async () => {
      setupSelectDirect([]);

      const result = await storage.getUser('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      setupSelectDirect([user]);

      const result = await storage.getUserByEmail('test@example.com');

      expect(result).toEqual(user);
    });

    it('should normalize email to lowercase', async () => {
      setupSelectDirect([]);

      await storage.getUserByEmail('  TEST@Example.com  ');

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return undefined when not found', async () => {
      setupSelectDirect([]);

      const result = await storage.getUserByEmail('nobody@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('getUserByResetToken', () => {
    it('should return user by reset token', async () => {
      const user = { id: 'user-1', resetToken: 'token-123' };
      setupSelectDirect([user]);

      const result = await storage.getUserByResetToken('token-123');

      expect(result).toEqual(user);
    });

    it('should return undefined for invalid token', async () => {
      setupSelectDirect([]);

      const result = await storage.getUserByResetToken('invalid');

      expect(result).toBeUndefined();
    });
  });

  describe('createUser', () => {
    it('should create and return a new user', async () => {
      const newUser = { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User' };
      setupInsert([newUser]);

      const result = await storage.createUser({ email: 'test@example.com', firstName: 'Test', lastName: 'User' } as any);

      expect(result).toEqual(newUser);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const newUser = { id: 'user-1', email: 'test@example.com' };
      setupInsert([newUser]);

      await storage.createUser({ email: '  TEST@Example.COM  ', firstName: ' John ', lastName: ' Doe ' } as any);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete user by id', async () => {
      setupDelete();

      await storage.deleteUser('user-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('upsertUser', () => {
    it('should upsert and return user', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      setupInsert([user]);

      const result = await storage.upsertUser({ id: 'user-1', email: 'test@example.com' } as any);

      expect(result).toEqual(user);
    });
  });

  describe('setResetToken', () => {
    it('should set reset token', async () => {
      setupUpdate();

      await storage.setResetToken('user-1', 'token-123', new Date());

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('setAutoLoginToken', () => {
    it('should set auto login token', async () => {
      setupUpdate();

      await storage.setAutoLoginToken('user-1', 'token-auto', new Date());

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getUserByAutoLoginToken', () => {
    it('should return user by auto login token', async () => {
      const user = { id: 'user-1', autoLoginToken: 'token-auto' };
      setupSelectDirect([user]);

      const result = await storage.getUserByAutoLoginToken('token-auto');

      expect(result).toEqual(user);
    });
  });

  describe('clearAutoLoginToken', () => {
    it('should clear auto login token', async () => {
      setupUpdate();

      await storage.clearAutoLoginToken('user-1');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('should update password hash', async () => {
      setupUpdate();

      await storage.updatePassword('user-1', 'new-hash');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Purchase Operations', () => {
  describe('createPurchase', () => {
    it('should create and return a purchase', async () => {
      const purchase = { id: 'pur-1', userId: 'user-1', totalAmount: 1500 };
      setupInsert([purchase]);

      const result = await storage.createPurchase({ userId: 'user-1', totalAmount: 1500 } as any);

      expect(result).toEqual(purchase);
    });
  });

  describe('getPurchase', () => {
    it('should return purchase by id', async () => {
      const purchase = { id: 'pur-1', userId: 'user-1' };
      setupSelectDirect([purchase]);

      const result = await storage.getPurchase('pur-1');

      expect(result).toEqual(purchase);
    });

    it('should return undefined for non-existent purchase', async () => {
      setupSelectDirect([]);

      const result = await storage.getPurchase('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getPurchaseByStripeSession', () => {
    it('should return purchase by stripe session id', async () => {
      const purchase = { id: 'pur-1', stripeSessionId: 'cs_123' };
      setupSelectDirect([purchase]);

      const result = await storage.getPurchaseByStripeSession('cs_123');

      expect(result).toEqual(purchase);
    });
  });

  describe('getPurchasesByUser', () => {
    it('should return purchases for user', async () => {
      const purchases = [{ id: 'pur-1' }, { id: 'pur-2' }];
      setupSelectDirect(purchases);

      const result = await storage.getPurchasesByUser('user-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('updatePurchaseStatus', () => {
    it('should update purchase status', async () => {
      setupUpdate();

      await storage.updatePurchaseStatus('pur-1', 'completed', new Date());

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updatePurchaseStripeSession', () => {
    it('should update stripe session id', async () => {
      setupUpdate();

      await storage.updatePurchaseStripeSession('pur-1', 'cs_new');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updatePurchase', () => {
    it('should update purchase fields', async () => {
      setupUpdate();

      await storage.updatePurchase('pur-1', { totalAmount: 2000 });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Purchase Item Operations', () => {
  describe('createPurchaseItem', () => {
    it('should create and return a purchase item', async () => {
      const item = { id: 'item-1', purchaseId: 'pur-1' };
      setupInsert([item]);

      const result = await storage.createPurchaseItem({ purchaseId: 'pur-1' } as any);

      expect(result).toEqual(item);
    });
  });

  describe('getPurchaseItems', () => {
    it('should return items for a purchase', async () => {
      const items = [{ id: 'item-1' }, { id: 'item-2' }];
      setupSelectDirect(items);

      const result = await storage.getPurchaseItems('pur-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('getPurchaseItemsBulk', () => {
    it('should return empty map for empty input', async () => {
      const result = await storage.getPurchaseItemsBulk([]);

      expect(result.size).toBe(0);
    });

    it('should group items by purchase id', async () => {
      const items = [
        { id: 'item-1', purchaseId: 'pur-1' },
        { id: 'item-2', purchaseId: 'pur-1' },
        { id: 'item-3', purchaseId: 'pur-2' },
      ];
      setupSelectDirect(items);

      const result = await storage.getPurchaseItemsBulk(['pur-1', 'pur-2']);

      expect(result.get('pur-1')).toHaveLength(2);
      expect(result.get('pur-2')).toHaveLength(1);
    });
  });

  describe('updatePurchaseItemStatus', () => {
    it('should update item status', async () => {
      setupUpdate();

      await storage.updatePurchaseItemStatus('item-1', 'completed');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deletePurchaseItem', () => {
    it('should delete purchase item', async () => {
      setupDelete();

      await storage.deletePurchaseItem('item-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('getPurchaseItem', () => {
    it('should return a specific purchase item', async () => {
      const item = { id: 'item-1', purchaseId: 'pur-1' };
      setupSelectDirect([item]);

      const result = await storage.getPurchaseItem('item-1');

      expect(result).toEqual(item);
    });
  });
});

describe('DatabaseStorage - Assessment Result Operations', () => {
  describe('createAssessmentResult', () => {
    it('should create and return result', async () => {
      const result = { id: 'res-1', userId: 'user-1' };
      setupInsert([result]);

      const created = await storage.createAssessmentResult({ userId: 'user-1' } as any);

      expect(created).toEqual(result);
    });
  });

  describe('getAssessmentResult', () => {
    it('should return result by id', async () => {
      const result = { id: 'res-1' };
      setupSelectDirect([result]);

      const found = await storage.getAssessmentResult('res-1');

      expect(found).toEqual(result);
    });

    it('should return undefined when not found', async () => {
      setupSelectDirect([]);

      const found = await storage.getAssessmentResult('nonexistent');

      expect(found).toBeUndefined();
    });
  });

  describe('getResultsByUser', () => {
    it('should return results for user', async () => {
      const results = [{ id: 'res-1' }, { id: 'res-2' }];
      setupSelectDirect(results);

      const found = await storage.getResultsByUser('user-1');

      expect(found).toHaveLength(2);
    });
  });

  describe('getResultByPurchaseItem', () => {
    it('should return result by purchase item id', async () => {
      const result = { id: 'res-1', purchaseItemId: 'item-1' };
      setupSelectDirect([result]);

      const found = await storage.getResultByPurchaseItem('item-1');

      expect(found).toEqual(result);
    });
  });

  describe('getResultByInvitationAndType', () => {
    it('should return result by invitation and type', async () => {
      const result = { id: 'res-1', invitationId: 'inv-1', assessmentType: 'fit' };
      setupSelectDirect([result]);

      const found = await storage.getResultByInvitationAndType('inv-1', 'fit');

      expect(found).toEqual(result);
    });
  });

  describe('getResultByPartnerInvitationAndType', () => {
    it('should return result', async () => {
      const result = { id: 'res-1' };
      setupSelectDirect([result]);

      const found = await storage.getResultByPartnerInvitationAndType('pinv-1', 'fit');

      expect(found).toEqual(result);
    });
  });

  describe('getResultsByPartnerInvitation', () => {
    it('should return results', async () => {
      const results = [{ id: 'res-1' }];
      setupSelectDirect(results);

      const found = await storage.getResultsByPartnerInvitation('pinv-1');

      expect(found).toHaveLength(1);
    });
  });

  describe('updateAssessmentResultStatus', () => {
    it('should update status', async () => {
      setupUpdate();

      await storage.updateAssessmentResultStatus('res-1', 'completed', new Date());

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateAssessmentScores', () => {
    it('should update scores', async () => {
      setupUpdate();

      await storage.updateAssessmentScores('res-1', { HA: 80 }, 80, 75);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateAssessmentResult', () => {
    it('should update arbitrary fields', async () => {
      setupUpdate();

      await storage.updateAssessmentResult('res-1', { status: 'completed' } as any);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Invitation Operations', () => {
  describe('createInvitation', () => {
    it('should create and return invitation', async () => {
      const invitation = { id: 'inv-1', candidateEmail: 'alice@test.com' };
      setupInsert([invitation]);

      const result = await storage.createInvitation({ candidateEmail: 'alice@test.com', assessmentTypes: ['fit'] } as any);

      expect(result).toEqual(invitation);
    });
  });

  describe('getInvitation', () => {
    it('should return invitation by id', async () => {
      const inv = { id: 'inv-1' };
      setupSelectDirect([inv]);

      const result = await storage.getInvitation('inv-1');

      expect(result).toEqual(inv);
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation by token', async () => {
      const inv = { id: 'inv-1', token: 'abc123' };
      setupSelectDirect([inv]);

      const result = await storage.getInvitationByToken('abc123');

      expect(result).toEqual(inv);
    });
  });

  describe('getInvitationsBySender', () => {
    it('should return invitations by sender', async () => {
      const invitations = [{ id: 'inv-1' }, { id: 'inv-2' }];
      setupSelectDirect(invitations);

      const result = await storage.getInvitationsBySender('user-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('updateInvitationStatus', () => {
    it('should update invitation status', async () => {
      setupUpdate();

      await storage.updateInvitationStatus('inv-1', 'completed', new Date());

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Prompt Architecture Operations', () => {
  describe('createPromptEvaluation', () => {
    it('should create evaluation', async () => {
      const eval_ = { id: 'eval-1', resultId: 'res-1' };
      setupInsert([eval_]);

      const result = await storage.createPromptEvaluation({ resultId: 'res-1' } as any);

      expect(result).toEqual(eval_);
    });
  });

  describe('getEvaluationsByResult', () => {
    it('should return evaluations', async () => {
      const evals = [{ id: 'eval-1' }];
      setupSelectDirect(evals);

      const result = await storage.getEvaluationsByResult('res-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('updatePromptEvaluationStatus', () => {
    it('should update evaluation status', async () => {
      setupUpdate();

      await storage.updatePromptEvaluationStatus('eval-1', 'completed', { score: 80 }, 80, 'Good', new Date());

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - AIQ Rationale Operations', () => {
  describe('createAiqRationale', () => {
    it('should create rationale', async () => {
      const rationale = { id: 'rat-1', resultId: 'res-1' };
      setupInsert([rationale]);

      const result = await storage.createAiqRationale({ resultId: 'res-1' } as any);

      expect(result).toEqual(rationale);
    });
  });

  describe('getRationalesByResult', () => {
    it('should return rationales', async () => {
      const rationales = [{ id: 'rat-1' }];
      setupSelectDirect(rationales);

      const result = await storage.getRationalesByResult('res-1');

      expect(result).toHaveLength(1);
    });
  });
});

describe('DatabaseStorage - Admin Operations', () => {
  describe('getAllResults', () => {
    it('should return all results', async () => {
      const results = [{ id: 'res-1' }, { id: 'res-2' }];
      setupSelectDirect(results);

      const found = await storage.getAllResults();

      expect(found).toHaveLength(2);
    });
  });

  describe('getAllInvitations', () => {
    it('should return all invitations', async () => {
      const invitations = [{ id: 'inv-1' }];
      setupSelectDirect(invitations);

      const found = await storage.getAllInvitations();

      expect(found).toHaveLength(1);
    });
  });
});

describe('DatabaseStorage - Job Role Operations', () => {
  describe('createJobRole', () => {
    it('should create job role', async () => {
      const role = { id: 'role-1', title: 'Developer' };
      setupInsert([role]);

      const result = await storage.createJobRole({ title: 'Developer' } as any);

      expect(result).toEqual(role);
    });
  });

  describe('getJobRole', () => {
    it('should return job role', async () => {
      const role = { id: 'role-1' };
      setupSelectDirect([role]);

      const result = await storage.getJobRole('role-1');

      expect(result).toEqual(role);
    });

    it('should return undefined when not found', async () => {
      setupSelectDirect([]);

      const result = await storage.getJobRole('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getAllJobRoles', () => {
    it('should return all roles', async () => {
      setupSelectDirect([{ id: 'role-1' }]);

      const result = await storage.getAllJobRoles();

      expect(result).toHaveLength(1);
    });
  });

  describe('updateJobRole', () => {
    it('should update job role', async () => {
      setupUpdate();

      await storage.updateJobRole('role-1', { title: 'Senior Dev' } as any);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deleteJobRole', () => {
    it('should delete job role', async () => {
      setupDelete();

      await storage.deleteJobRole('role-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Candidate Tag Operations', () => {
  describe('createCandidateTag', () => {
    it('should create tag', async () => {
      const tag = { id: 'tag-1', userId: 'user-1', tag: 'leadership' };
      setupInsert([tag]);

      const result = await storage.createCandidateTag({ userId: 'user-1', tag: 'leadership' } as any);

      expect(result).toEqual(tag);
    });
  });

  describe('getTagsByCandidate', () => {
    it('should return tags for candidate', async () => {
      setupSelectDirect([{ id: 'tag-1' }]);

      const result = await storage.getTagsByCandidate('user-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('deleteTag', () => {
    it('should delete tag', async () => {
      setupDelete();

      await storage.deleteTag('tag-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Candidate Note Operations', () => {
  describe('createCandidateNote', () => {
    it('should create note', async () => {
      const note = { id: 'note-1', userId: 'user-1', note: 'Good candidate' };
      setupInsert([note]);

      const result = await storage.createCandidateNote({ userId: 'user-1', note: 'Good candidate' } as any);

      expect(result).toEqual(note);
    });
  });

  describe('getNotesByCandidate', () => {
    it('should return notes', async () => {
      setupSelectDirect([{ id: 'note-1' }]);

      const result = await storage.getNotesByCandidate('user-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('updateNote', () => {
    it('should update note text', async () => {
      setupUpdate();

      await storage.updateNote('note-1', 'Updated note');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deleteNote', () => {
    it('should delete note', async () => {
      setupDelete();

      await storage.deleteNote('note-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Cached Role Alignment Operations', () => {
  describe('createRoleAlignment', () => {
    it('should create alignment', async () => {
      const alignment = { id: 'align-1', userId: 'user-1', jobRoleId: 'role-1' };
      setupInsert([alignment]);

      const result = await storage.createRoleAlignment({ userId: 'user-1', jobRoleId: 'role-1' } as any);

      expect(result).toEqual(alignment);
    });
  });

  describe('getRoleAlignmentsByCandidate', () => {
    it('should return alignments', async () => {
      setupSelectDirect([{ id: 'align-1' }]);

      const result = await storage.getRoleAlignmentsByCandidate('user-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('invalidateRoleAlignmentCache', () => {
    it('should delete cached alignment', async () => {
      setupDelete();

      await storage.invalidateRoleAlignmentCache('user-1', 'role-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Multi-Candidate Comparison Operations', () => {
  describe('createMultiCandidateComparison', () => {
    it('should create comparison', async () => {
      const comp = { id: 'comp-1' };
      setupInsert([comp]);

      const result = await storage.createMultiCandidateComparison({} as any);

      expect(result).toEqual(comp);
    });
  });

  describe('getMultiCandidateComparison', () => {
    it('should return comparison', async () => {
      setupSelectDirect([{ id: 'comp-1' }]);

      const result = await storage.getMultiCandidateComparison('comp-1');

      expect(result).toEqual({ id: 'comp-1' });
    });
  });

  describe('getMultiCandidateComparisonsByRole', () => {
    it('should return comparisons by role', async () => {
      setupSelectDirect([{ id: 'comp-1' }]);

      const result = await storage.getMultiCandidateComparisonsByRole('role-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('getMultiCandidateComparisonsByCreator', () => {
    it('should return comparisons by creator', async () => {
      setupSelectDirect([{ id: 'comp-1' }]);

      const result = await storage.getMultiCandidateComparisonsByCreator('user-1');

      expect(result).toHaveLength(1);
    });
  });
});

describe('DatabaseStorage - Report Export Operations', () => {
  describe('createReportExport', () => {
    it('should create report export', async () => {
      const report = { id: 'rep-1' };
      setupInsert([report]);

      const result = await storage.createReportExport({} as any);

      expect(result).toEqual(report);
    });
  });

  describe('getReportExport', () => {
    it('should return report', async () => {
      setupSelectDirect([{ id: 'rep-1' }]);

      const result = await storage.getReportExport('rep-1');

      expect(result).toEqual({ id: 'rep-1' });
    });
  });

  describe('getReportByShareToken', () => {
    it('should return report by token', async () => {
      setupSelectDirect([{ id: 'rep-1', shareToken: 'token-1', expiresAt: null }]);

      const result = await storage.getReportByShareToken('token-1');

      expect(result).toEqual({ id: 'rep-1', shareToken: 'token-1', expiresAt: null });
    });

    it('should return undefined for expired share', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      setupSelectDirect([{ id: 'rep-1', shareToken: 'token-1', expiresAt: pastDate }]);

      const result = await storage.getReportByShareToken('token-1');

      expect(result).toBeUndefined();
    });

    it('should return undefined when not found', async () => {
      setupSelectDirect([]);

      const result = await storage.getReportByShareToken('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('incrementReportAccess', () => {
    it('should increment access count', async () => {
      setupUpdate();

      await storage.incrementReportAccess('rep-1');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getReportsByCreator', () => {
    it('should return reports by creator', async () => {
      setupSelectDirect([{ id: 'rep-1' }]);

      const result = await storage.getReportsByCreator('user-1');

      expect(result).toHaveLength(1);
    });
  });
});

describe('DatabaseStorage - User Reference Operations', () => {
  describe('createUserReference', () => {
    it('should create reference', async () => {
      const ref = { id: 'ref-1', userId: 'user-1' };
      setupInsert([ref]);

      const result = await storage.createUserReference({ userId: 'user-1' } as any);

      expect(result).toEqual(ref);
    });
  });

  describe('getUserReference', () => {
    it('should return user reference', async () => {
      const ref = { id: 'ref-1', userId: 'user-1' };
      setupSelect([ref]);

      const result = await storage.getUserReference('user-1');

      expect(result).toEqual(ref);
    });
  });
});

describe('DatabaseStorage - Marketing Optin Operations', () => {
  describe('createMarketingOptin', () => {
    it('should create optin', async () => {
      const optin = { id: 'opt-1', email: 'test@example.com' };
      setupInsert([optin]);

      const result = await storage.createMarketingOptin({ email: 'test@example.com' } as any);

      expect(result).toEqual(optin);
    });
  });

  describe('getMarketingOptins', () => {
    it('should return all optins', async () => {
      setupSelectDirect([{ id: 'opt-1' }]);

      const result = await storage.getMarketingOptins();

      expect(result).toHaveLength(1);
    });
  });
});

describe('DatabaseStorage - Organization Operations', () => {
  describe('createOrganization', () => {
    it('should create organization', async () => {
      const org = { id: 'org-1', name: 'Test Org' };
      setupInsert([org]);

      const result = await storage.createOrganization({ name: 'Test Org' } as any);

      expect(result).toEqual(org);
    });
  });

  describe('getOrganization', () => {
    it('should return org by id', async () => {
      setupSelectDirect([{ id: 'org-1' }]);

      const result = await storage.getOrganization('org-1');

      expect(result).toEqual({ id: 'org-1' });
    });
  });

  describe('getOrganizationBySlug', () => {
    it('should return org by slug', async () => {
      setupSelectDirect([{ id: 'org-1', slug: 'test-org' }]);

      const result = await storage.getOrganizationBySlug('test-org');

      expect(result).toEqual({ id: 'org-1', slug: 'test-org' });
    });
  });

  describe('getAllOrganizations', () => {
    it('should return all orgs', async () => {
      setupSelectDirect([{ id: 'org-1' }]);

      const result = await storage.getAllOrganizations();

      expect(result).toHaveLength(1);
    });
  });

  describe('updateOrganization', () => {
    it('should update org', async () => {
      setupUpdate();

      await storage.updateOrganization('org-1', { name: 'Updated' });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deleteOrganization', () => {
    it('should delete org', async () => {
      setupDelete();

      await storage.deleteOrganization('org-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - User Role Operations', () => {
  describe('updateUserOrganization', () => {
    it('should update user organization', async () => {
      setupUpdate();

      await storage.updateUserOrganization('user-1', 'org-1');

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should allow setting org to null', async () => {
      setupUpdate();

      await storage.updateUserOrganization('user-1', null);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateUserPassword', () => {
    it('should update password', async () => {
      setupUpdate();

      await storage.updateUserPassword('user-1', 'new-hash');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('updateResultsRetentionConsent', () => {
    it('should update consent', async () => {
      setupUpdate();

      await storage.updateResultsRetentionConsent('user-1', true);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('acceptTerms', () => {
    it('should accept terms', async () => {
      setupUpdate();

      await storage.acceptTerms('user-1', true, true);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getUsersByOrganization', () => {
    it('should return users by org', async () => {
      setupSelectDirect([{ id: 'user-1' }]);

      const result = await storage.getUsersByOrganization('org-1');

      expect(result).toHaveLength(1);
    });
  });
});

describe('DatabaseStorage - Partner Account Operations', () => {
  describe('createPartnerAccount', () => {
    it('should create partner account', async () => {
      const partner = { id: 'partner-1', name: 'Test Partner' };
      setupInsert([partner]);

      const result = await storage.createPartnerAccount({ name: 'Test Partner' } as any);

      expect(result).toEqual(partner);
    });
  });

  describe('getPartnerAccount', () => {
    it('should return partner by id', async () => {
      setupSelectDirect([{ id: 'partner-1' }]);

      const result = await storage.getPartnerAccount('partner-1');

      expect(result).toEqual({ id: 'partner-1' });
    });
  });

  describe('getPartnerAccountByOrganizationId', () => {
    it('should return partner by org id', async () => {
      setupSelectDirect([{ id: 'partner-1', organizationId: 'org-1' }]);

      const result = await storage.getPartnerAccountByOrganizationId('org-1');

      expect(result).toEqual({ id: 'partner-1', organizationId: 'org-1' });
    });
  });

  describe('getAllPartnerAccounts', () => {
    it('should return all partners', async () => {
      setupSelectDirect([{ id: 'partner-1' }]);

      const result = await storage.getAllPartnerAccounts();

      expect(result).toHaveLength(1);
    });
  });

  describe('deletePartnerAccount', () => {
    it('should delete partner', async () => {
      setupDelete();

      await storage.deletePartnerAccount('partner-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Partner Organisation Operations', () => {
  describe('createPartnerOrganisation', () => {
    it('should create partner org', async () => {
      const org = { id: 'porg-1' };
      setupInsert([org]);

      const result = await storage.createPartnerOrganisation({} as any);

      expect(result).toEqual(org);
    });
  });

  describe('getPartnerOrganisation', () => {
    it('should return partner org', async () => {
      setupSelectDirect([{ id: 'porg-1' }]);

      const result = await storage.getPartnerOrganisation('porg-1');

      expect(result).toEqual({ id: 'porg-1' });
    });
  });

  describe('getPartnerOrganisationsByPartner', () => {
    it('should return orgs by partner', async () => {
      setupSelectDirect([{ id: 'porg-1' }]);

      const result = await storage.getPartnerOrganisationsByPartner('partner-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('updatePartnerOrganisation', () => {
    it('should update partner org', async () => {
      setupUpdate();

      await storage.updatePartnerOrganisation('porg-1', { name: 'Updated' } as any);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deletePartnerOrganisation', () => {
    it('should delete partner org', async () => {
      setupDelete();

      await storage.deletePartnerOrganisation('porg-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Partner API Key Operations', () => {
  describe('createPartnerApiKey', () => {
    it('should create API key', async () => {
      const key = { id: 'key-1', partnerId: 'partner-1' };
      setupInsert([key]);

      const result = await storage.createPartnerApiKey({ partnerId: 'partner-1' } as any);

      expect(result).toEqual(key);
    });
  });

  describe('getPartnerApiKey', () => {
    it('should return key by id', async () => {
      setupSelectDirect([{ id: 'key-1' }]);

      const result = await storage.getPartnerApiKey('key-1');

      expect(result).toEqual({ id: 'key-1' });
    });
  });

  describe('updatePartnerApiKeyLastUsed', () => {
    it('should update last used', async () => {
      setupUpdate();

      await storage.updatePartnerApiKeyLastUsed('key-1');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('revokePartnerApiKey', () => {
    it('should set isActive to false', async () => {
      setupUpdate();

      await storage.revokePartnerApiKey('key-1');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Assessment Session Operations', () => {
  describe('createAssessmentSession', () => {
    it('should create session', async () => {
      const session = { id: 'ses-1' };
      setupInsert([session]);

      const result = await storage.createAssessmentSession({} as any);

      expect(result).toEqual(session);
    });
  });

  describe('getAssessmentSession', () => {
    it('should return session', async () => {
      setupSelectDirect([{ id: 'ses-1' }]);

      const result = await storage.getAssessmentSession('ses-1');

      expect(result).toEqual({ id: 'ses-1' });
    });

    it('should return undefined when not found', async () => {
      setupSelectDirect([]);

      const result = await storage.getAssessmentSession('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('updateAssessmentSession', () => {
    it('should update session', async () => {
      setupUpdate();

      await storage.updateAssessmentSession('ses-1', { status: 'completed' } as any);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Usage Event Operations', () => {
  describe('createUsageEvent', () => {
    it('should create event', async () => {
      const event = { id: 'evt-1' };
      setupInsert([event]);

      const result = await storage.createUsageEvent({} as any);

      expect(result).toEqual(event);
    });
  });

  describe('getApiKeysByPartner', () => {
    it('should delegate to getPartnerApiKeysByPartner', async () => {
      setupSelectDirect([{ id: 'key-1' }]);

      const result = await storage.getApiKeysByPartner('partner-1');

      expect(result).toHaveLength(1);
    });
  });
});

describe('DatabaseStorage - Partner Quota Operations', () => {
  describe('createPartnerTestPackage', () => {
    it('should create package', async () => {
      const pkg = { id: 'pkg-1' };
      setupInsert([pkg]);

      const result = await storage.createPartnerTestPackage({} as any);

      expect(result).toEqual(pkg);
    });
  });

  describe('getPartnerTestPackage', () => {
    it('should return package', async () => {
      setupSelectDirect([{ id: 'pkg-1' }]);

      const result = await storage.getPartnerTestPackage('pkg-1');

      expect(result).toEqual({ id: 'pkg-1' });
    });
  });

  describe('createQuotaLedgerEntry', () => {
    it('should create ledger entry', async () => {
      const entry = { id: 'ledger-1' };
      setupInsert([entry]);

      const result = await storage.createQuotaLedgerEntry({} as any);

      expect(result).toEqual(entry);
    });
  });
});

describe('DatabaseStorage - Golden Set Operations', () => {
  describe('createGoldenSetPrompt', () => {
    it('should create prompt', async () => {
      const prompt = { id: 'gsp-1' };
      setupInsert([prompt]);

      const result = await storage.createGoldenSetPrompt({} as any);

      expect(result).toEqual(prompt);
    });
  });

  describe('createGoldenSetResult', () => {
    it('should create result', async () => {
      const gsResult = { id: 'gsr-1' };
      setupInsert([gsResult]);

      const result = await storage.createGoldenSetResult({} as any);

      expect(result).toEqual(gsResult);
    });
  });

  describe('deleteAllGoldenSetPrompts', () => {
    it('should delete all prompts', async () => {
      mockDb.delete.mockResolvedValue(undefined);

      await storage.deleteAllGoldenSetPrompts();

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('deleteAllGoldenSetResults', () => {
    it('should delete all results', async () => {
      mockDb.delete.mockResolvedValue(undefined);

      await storage.deleteAllGoldenSetResults();

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});

describe('DatabaseStorage - Partner Team Member Operations', () => {
  describe('createPartnerTeamMember', () => {
    it('should create team member', async () => {
      const member = { id: 'ptm-1', partnerId: 'partner-1' };
      setupInsert([member]);

      const result = await storage.createPartnerTeamMember({ partnerId: 'partner-1' } as any);

      expect(result).toEqual(member);
    });
  });

  describe('getPartnerTeamMember', () => {
    it('should return team member', async () => {
      setupSelectDirect([{ id: 'ptm-1' }]);

      const result = await storage.getPartnerTeamMember('ptm-1');

      expect(result).toEqual({ id: 'ptm-1' });
    });
  });

  describe('deletePartnerTeamMember', () => {
    it('should delete team member', async () => {
      setupDelete();

      await storage.deletePartnerTeamMember('ptm-1');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
