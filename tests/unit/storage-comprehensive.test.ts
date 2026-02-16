import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const selectChain = {
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  offset: vi.fn(),
  leftJoin: vi.fn(),
  innerJoin: vi.fn(),
};

const insertChain = {
  values: vi.fn(),
  returning: vi.fn(),
  onConflictDoUpdate: vi.fn(),
};

const updateChain = {
  set: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
};

const deleteChain = {
  where: vi.fn(),
  returning: vi.fn(),
};

function setupSelectChain(result: any[]) {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: any) => resolve(result));
  mockDb.select.mockReturnValue(chain);
  return chain;
}

function setupInsertChain(result: any[]) {
  const chain: any = {};
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: any) => resolve(result));
  mockDb.insert.mockReturnValue(chain);
  return chain;
}

function setupUpdateChain(result: any[] = []) {
  const chain: any = {};
  chain.set = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: any) => resolve(result));
  mockDb.update.mockReturnValue(chain);
  return chain;
}

function setupDeleteChain(result: any[] = []) {
  const chain: any = {};
  chain.where = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: any) => resolve(result));
  mockDb.delete.mockReturnValue(chain);
  return chain;
}

vi.mock('../../server/db', () => ({
  db: mockDb,
  pool: { query: vi.fn() },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: any[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  or: vi.fn((...args: any[]) => ({ type: 'or', args })),
  desc: vi.fn((col: any) => ({ type: 'desc', col })),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  inArray: vi.fn((...args: any[]) => ({ type: 'inArray', args })),
  gte: vi.fn((...args: any[]) => ({ type: 'gte', args })),
  lte: vi.fn((...args: any[]) => ({ type: 'lte', args })),
  isNull: vi.fn((col: any) => ({ type: 'isNull', col })),
  isNotNull: vi.fn((col: any) => ({ type: 'isNotNull', col })),
  count: vi.fn(() => ({ type: 'count' })),
  countDistinct: vi.fn(() => ({ type: 'countDistinct' })),
}));

const mockSchema: Record<string, any> = {};
const schemaNames = [
  'users', 'purchases', 'purchaseItems', 'assessmentResults', 'invitations',
  'promptArchitectureEvaluations', 'aiqRationales', 'jobRoles', 'candidateTags',
  'candidateNotes', 'cachedRoleAlignments', 'reportExports', 'userReferences',
  'marketingOptins', 'goldenSetPrompts', 'goldenSetResults', 'organizations',
  'partnerAccounts', 'partnerApiKeys', 'assessmentSessions', 'usageEvents',
  'partnerTestPackages', 'partnerQuotaLedger', 'partnerInvoices',
  'partnerMonthlyUsage', 'partnerOrganisations', 'partnerOverageLedger',
  'errorLogs', 'partnerWebhooks', 'webhookDeliveryLogs', 'partnerAtsIntegrations',
  'partnerScheduledExports', 'partnerNotifications', 'partnerNotificationRecipients',
  'partnerTeamMembers', 'billingChangeRequests', 'partnerCandidateImports',
  'partnerCandidateInvitations', 'partnerResultPurchases', 'systemSettings',
  'emailVerificationCodes', 'auditLogs', 'ecosystemProjects', 'ecosystemTeamMembers',
  'aiUsageCosts', 'partnerAnalysisReports', 'multiCandidateComparisons',
  'stripeWebhookEvents', 'autoTopUpRetries', 'adminNotifications',
];

for (const name of schemaNames) {
  mockSchema[name] = {
    id: `${name}.id`,
    userId: `${name}.userId`,
    email: `${name}.email`,
    partnerId: `${name}.partnerId`,
    status: `${name}.status`,
    createdAt: `${name}.createdAt`,
    stripeSessionId: `${name}.stripeSessionId`,
    purchaseId: `${name}.purchaseId`,
    purchaseItemId: `${name}.purchaseItemId`,
    resultId: `${name}.resultId`,
    invitationId: `${name}.invitationId`,
    partnerInvitationId: `${name}.partnerInvitationId`,
    senderId: `${name}.senderId`,
    token: `${name}.token`,
    resetToken: `${name}.resetToken`,
    autoLoginToken: `${name}.autoLoginToken`,
    projectId: `${name}.projectId`,
    organizationId: `${name}.organizationId`,
    slug: `${name}.slug`,
    prefix: `${name}.prefix`,
    key: `${name}.key`,
    sessionId: `${name}.sessionId`,
    eventId: `${name}.eventId`,
    eventType: `${name}.eventType`,
    webhookId: `${name}.webhookId`,
    importId: `${name}.importId`,
    externalUserId: `${name}.externalUserId`,
    shareToken: `${name}.shareToken`,
    jobRoleId: `${name}.jobRoleId`,
    assessmentType: `${name}.assessmentType`,
    fingerprint: `${name}.fingerprint`,
    severity: `${name}.severity`,
    role: `${name}.role`,
    isActive: `${name}.isActive`,
    billingMonth: `${name}.billingMonth`,
    isTestSession: `${name}.isTestSession`,
    reportType: `${name}.reportType`,
    candidateIds: `${name}.candidateIds`,
    roleId: `${name}.roleId`,
    action: `${name}.action`,
    resourceType: `${name}.resourceType`,
    verified: `${name}.verified`,
    expiresAt: `${name}.expiresAt`,
    code: `${name}.code`,
    notificationType: `${name}.notificationType`,
    notificationId: `${name}.notificationId`,
    teamMemberId: `${name}.teamMemberId`,
    isRead: `${name}.isRead`,
    readAt: `${name}.readAt`,
  };
}

vi.mock('@shared/schema', () => mockSchema);

vi.mock('@shared/notification-types', () => ({
  canReceiveNotification: vi.fn().mockReturnValue(true),
}));

let DatabaseStorage: any;
let storage: any;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('../../server/storage');
  DatabaseStorage = mod.DatabaseStorage;
  storage = new DatabaseStorage();
});

describe('DatabaseStorage - User Operations', () => {
  it('getUser should return user when found', async () => {
    const user = { id: 'user-1', email: 'test@example.com' };
    setupSelectChain([user]);

    const result = await storage.getUser('user-1');
    expect(result).toEqual(user);
    expect(mockDb.select).toHaveBeenCalled();
  });

  it('getUser should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getUser('nonexistent');
    expect(result).toBeUndefined();
  });

  it('getUserByEmail should normalize and return user', async () => {
    const user = { id: 'user-1', email: 'test@example.com' };
    setupSelectChain([user]);

    const result = await storage.getUserByEmail('  Test@Example.com  ');
    expect(result).toEqual(user);
  });

  it('getUserByEmail should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getUserByEmail('nobody@test.com');
    expect(result).toBeUndefined();
  });

  it('getUserByResetToken should return user', async () => {
    const user = { id: 'user-1', resetToken: 'token123' };
    setupSelectChain([user]);

    const result = await storage.getUserByResetToken('token123');
    expect(result).toEqual(user);
  });

  it('createUser should insert and return user with normalized data', async () => {
    const user = { id: 'user-1', email: 'test@example.com', firstName: 'Test' };
    setupInsertChain([user]);

    const result = await storage.createUser({ email: ' Test@Example.com ', firstName: ' Test ', passwordHash: 'hash' });
    expect(result).toEqual(user);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('upsertUser should insert or update user', async () => {
    const user = { id: 'user-1', email: 'test@example.com' };
    setupInsertChain([user]);

    const result = await storage.upsertUser({ id: 'user-1', email: 'test@example.com' });
    expect(result).toEqual(user);
  });

  it('deleteUser should delete by id', async () => {
    setupDeleteChain();

    await storage.deleteUser('user-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('setResetToken should update user with token and expiry', async () => {
    setupUpdateChain();

    await storage.setResetToken('user-1', 'resetToken', new Date());
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('setAutoLoginToken should update user', async () => {
    setupUpdateChain();

    await storage.setAutoLoginToken('user-1', 'autoToken', new Date());
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('getUserByAutoLoginToken should return user', async () => {
    const user = { id: 'user-1', autoLoginToken: 'token' };
    setupSelectChain([user]);

    const result = await storage.getUserByAutoLoginToken('token');
    expect(result).toEqual(user);
  });

  it('clearAutoLoginToken should set token to null', async () => {
    setupUpdateChain();

    await storage.clearAutoLoginToken('user-1');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('updatePassword should update hash and clear reset token', async () => {
    setupUpdateChain();

    await storage.updatePassword('user-1', 'newHash');
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Purchase Operations', () => {
  it('createPurchase should insert and return purchase', async () => {
    const purchase = { id: 'pur-1', userId: 'user-1', status: 'pending' };
    setupInsertChain([purchase]);

    const result = await storage.createPurchase({ userId: 'user-1' });
    expect(result).toEqual(purchase);
  });

  it('getPurchase should return purchase when found', async () => {
    const purchase = { id: 'pur-1', userId: 'user-1' };
    setupSelectChain([purchase]);

    const result = await storage.getPurchase('pur-1');
    expect(result).toEqual(purchase);
  });

  it('getPurchase should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getPurchase('nonexistent');
    expect(result).toBeUndefined();
  });

  it('getPurchaseByStripeSession should return purchase', async () => {
    const purchase = { id: 'pur-1', stripeSessionId: 'sess_123' };
    setupSelectChain([purchase]);

    const result = await storage.getPurchaseByStripeSession('sess_123');
    expect(result).toEqual(purchase);
  });

  it('getPurchasesByUser should return purchases ordered by date', async () => {
    const purchases = [{ id: 'pur-2' }, { id: 'pur-1' }];
    setupSelectChain(purchases);

    const result = await storage.getPurchasesByUser('user-1');
    expect(result).toEqual(purchases);
  });

  it('updatePurchaseStatus should update status', async () => {
    setupUpdateChain();

    await storage.updatePurchaseStatus('pur-1', 'completed', new Date());
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('updatePurchaseStripeSession should update session id', async () => {
    setupUpdateChain();

    await storage.updatePurchaseStripeSession('pur-1', 'sess_new');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('updatePurchase should update partial fields', async () => {
    setupUpdateChain();

    await storage.updatePurchase('pur-1', { status: 'completed' });
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Purchase Item Operations', () => {
  it('createPurchaseItem should insert and return item', async () => {
    const item = { id: 'item-1', purchaseId: 'pur-1' };
    setupInsertChain([item]);

    const result = await storage.createPurchaseItem({ purchaseId: 'pur-1' });
    expect(result).toEqual(item);
  });

  it('getPurchaseItems should return items for purchase', async () => {
    const items = [{ id: 'item-1' }, { id: 'item-2' }];
    setupSelectChain(items);

    const result = await storage.getPurchaseItems('pur-1');
    expect(result).toEqual(items);
  });

  it('updatePurchaseItemStatus should update status', async () => {
    setupUpdateChain();

    await storage.updatePurchaseItemStatus('item-1', 'completed');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('deletePurchaseItem should delete item', async () => {
    setupDeleteChain();

    await storage.deletePurchaseItem('item-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('getPurchaseItem should return single item', async () => {
    const item = { id: 'item-1', purchaseId: 'pur-1' };
    setupSelectChain([item]);

    const result = await storage.getPurchaseItem('item-1');
    expect(result).toEqual(item);
  });
});

describe('DatabaseStorage - Assessment Result Operations', () => {
  it('createAssessmentResult should insert and return result', async () => {
    const result = { id: 'result-1', userId: 'user-1' };
    setupInsertChain([result]);

    const res = await storage.createAssessmentResult({ userId: 'user-1', assessmentType: 'fit' });
    expect(res).toEqual(result);
  });

  it('getAssessmentResult should return result when found', async () => {
    const result = { id: 'result-1' };
    setupSelectChain([result]);

    const res = await storage.getAssessmentResult('result-1');
    expect(res).toEqual(result);
  });

  it('getAssessmentResult should return undefined when not found', async () => {
    setupSelectChain([]);

    const res = await storage.getAssessmentResult('nonexistent');
    expect(res).toBeUndefined();
  });

  it('getResultsByUser should return array of results', async () => {
    const results = [{ id: 'r1' }, { id: 'r2' }];
    setupSelectChain(results);

    const res = await storage.getResultsByUser('user-1');
    expect(res).toEqual(results);
  });

  it('getResultByPurchaseItem should return single result', async () => {
    const result = { id: 'r1', purchaseItemId: 'item-1' };
    setupSelectChain([result]);

    const res = await storage.getResultByPurchaseItem('item-1');
    expect(res).toEqual(result);
  });

  it('updateAssessmentResultStatus should update status', async () => {
    setupUpdateChain();

    await storage.updateAssessmentResultStatus('result-1', 'completed', new Date());
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('updateAssessmentScores should update scores', async () => {
    setupUpdateChain();

    await storage.updateAssessmentScores('result-1', { HA: 80, IC: 70 }, 150, 85);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('updateAssessmentResult should update partial fields', async () => {
    setupUpdateChain();

    await storage.updateAssessmentResult('result-1', { status: 'completed' });
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Invitation Operations', () => {
  it('createInvitation should insert and return invitation', async () => {
    const inv = { id: 'inv-1', senderId: 'user-1' };
    setupInsertChain([inv]);

    const result = await storage.createInvitation({ senderId: 'user-1', recipientEmail: 'a@b.com' });
    expect(result).toEqual(inv);
  });

  it('getInvitation should return invitation when found', async () => {
    const inv = { id: 'inv-1' };
    setupSelectChain([inv]);

    const result = await storage.getInvitation('inv-1');
    expect(result).toEqual(inv);
  });

  it('getInvitationByToken should return invitation', async () => {
    const inv = { id: 'inv-1', token: 'abc123' };
    setupSelectChain([inv]);

    const result = await storage.getInvitationByToken('abc123');
    expect(result).toEqual(inv);
  });

  it('getInvitationsBySender should return invitations', async () => {
    const invs = [{ id: 'inv-1' }, { id: 'inv-2' }];
    setupSelectChain(invs);

    const result = await storage.getInvitationsBySender('user-1');
    expect(result).toHaveLength(2);
  });

  it('updateInvitationStatus should update status', async () => {
    setupUpdateChain();

    await storage.updateInvitationStatus('inv-1', 'completed', new Date());
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Prompt Evaluation Operations', () => {
  it('createPromptEvaluation should insert and return evaluation', async () => {
    const evaluation = { id: 'eval-1', resultId: 'result-1' };
    setupInsertChain([evaluation]);

    const result = await storage.createPromptEvaluation({ resultId: 'result-1' });
    expect(result).toEqual(evaluation);
  });

  it('getEvaluationsByResult should return evaluations', async () => {
    const evals = [{ id: 'eval-1' }];
    setupSelectChain(evals);

    const result = await storage.getEvaluationsByResult('result-1');
    expect(result).toEqual(evals);
  });

  it('updatePromptEvaluationStatus should update with all fields', async () => {
    setupUpdateChain();

    await storage.updatePromptEvaluationStatus('eval-1', 'completed', { score: 80 }, 80, 'Good', new Date());
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - AIQ Rationale Operations', () => {
  it('createAiqRationale should insert and return rationale', async () => {
    const rationale = { id: 'rat-1', resultId: 'result-1' };
    setupInsertChain([rationale]);

    const result = await storage.createAiqRationale({ resultId: 'result-1' });
    expect(result).toEqual(rationale);
  });

  it('getRationalesByResult should return rationales', async () => {
    const rats = [{ id: 'rat-1' }];
    setupSelectChain(rats);

    const result = await storage.getRationalesByResult('result-1');
    expect(result).toEqual(rats);
  });
});

describe('DatabaseStorage - Job Role Operations', () => {
  it('createJobRole should insert and return role', async () => {
    const role = { id: 'role-1', name: 'Engineer' };
    setupInsertChain([role]);

    const result = await storage.createJobRole({ name: 'Engineer' });
    expect(result).toEqual(role);
  });

  it('getJobRole should return role when found', async () => {
    const role = { id: 'role-1' };
    setupSelectChain([role]);

    const result = await storage.getJobRole('role-1');
    expect(result).toEqual(role);
  });

  it('getAllJobRoles should return all roles', async () => {
    const roles = [{ id: 'role-1' }, { id: 'role-2' }];
    setupSelectChain(roles);

    const result = await storage.getAllJobRoles();
    expect(result).toEqual(roles);
  });

  it('updateJobRole should update role', async () => {
    setupUpdateChain();

    await storage.updateJobRole('role-1', { name: 'Senior Engineer' });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('deleteJobRole should delete role', async () => {
    setupDeleteChain();

    await storage.deleteJobRole('role-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Candidate Tag Operations', () => {
  it('createCandidateTag should insert and return tag', async () => {
    const tag = { id: 'tag-1', userId: 'user-1', tag: 'top-performer' };
    setupInsertChain([tag]);

    const result = await storage.createCandidateTag({ userId: 'user-1', tag: 'top-performer' });
    expect(result).toEqual(tag);
  });

  it('getTagsByCandidate should return tags', async () => {
    const tags = [{ id: 'tag-1' }, { id: 'tag-2' }];
    setupSelectChain(tags);

    const result = await storage.getTagsByCandidate('user-1');
    expect(result).toEqual(tags);
  });

  it('deleteTag should delete tag', async () => {
    setupDeleteChain();

    await storage.deleteTag('tag-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Candidate Note Operations', () => {
  it('createCandidateNote should insert and return note', async () => {
    const note = { id: 'note-1', userId: 'user-1', noteText: 'Great candidate' };
    setupInsertChain([note]);

    const result = await storage.createCandidateNote({ userId: 'user-1', noteText: 'Great candidate' });
    expect(result).toEqual(note);
  });

  it('getNotesByCandidate should return notes', async () => {
    const notes = [{ id: 'note-1' }];
    setupSelectChain(notes);

    const result = await storage.getNotesByCandidate('user-1');
    expect(result).toEqual(notes);
  });

  it('updateNote should update note text', async () => {
    setupUpdateChain();

    await storage.updateNote('note-1', 'Updated text');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('deleteNote should delete note', async () => {
    setupDeleteChain();

    await storage.deleteNote('note-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Report Export Operations', () => {
  it('createReportExport should insert and return report', async () => {
    const report = { id: 'report-1', userId: 'user-1' };
    setupInsertChain([report]);

    const result = await storage.createReportExport({ userId: 'user-1' });
    expect(result).toEqual(report);
  });

  it('getReportExport should return report when found', async () => {
    const report = { id: 'report-1' };
    setupSelectChain([report]);

    const result = await storage.getReportExport('report-1');
    expect(result).toEqual(report);
  });

  it('getReportExport should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getReportExport('nonexistent');
    expect(result).toBeUndefined();
  });
});

describe('DatabaseStorage - Marketing Optin Operations', () => {
  it('createMarketingOptin should insert and return optin', async () => {
    const optin = { id: 'optin-1', email: 'test@example.com' };
    setupInsertChain([optin]);

    const result = await storage.createMarketingOptin({ email: 'test@example.com' });
    expect(result).toEqual(optin);
  });

  it('getMarketingOptins should return all optins', async () => {
    const optins = [{ id: 'optin-1' }, { id: 'optin-2' }];
    setupSelectChain(optins);

    const result = await storage.getMarketingOptins();
    expect(result).toEqual(optins);
  });
});

describe('DatabaseStorage - Organization Operations', () => {
  it('createOrganization should insert and return org', async () => {
    const org = { id: 'org-1', name: 'Test Org' };
    setupInsertChain([org]);

    const result = await storage.createOrganization({ name: 'Test Org' });
    expect(result).toEqual(org);
  });

  it('getOrganization should return org when found', async () => {
    const org = { id: 'org-1' };
    setupSelectChain([org]);

    const result = await storage.getOrganization('org-1');
    expect(result).toEqual(org);
  });

  it('getOrganization should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getOrganization('nonexistent');
    expect(result).toBeUndefined();
  });

  it('getAllOrganizations should return all orgs', async () => {
    const orgs = [{ id: 'org-1' }, { id: 'org-2' }];
    setupSelectChain(orgs);

    const result = await storage.getAllOrganizations();
    expect(result).toEqual(orgs);
  });

  it('updateOrganization should update org', async () => {
    setupUpdateChain();

    await storage.updateOrganization('org-1', { name: 'Updated Org' });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('deleteOrganization should delete org', async () => {
    setupDeleteChain();

    await storage.deleteOrganization('org-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Partner Account Operations', () => {
  it('createPartnerAccount should insert and return partner', async () => {
    const partner = { id: 'partner-1', name: 'Test Partner' };
    setupInsertChain([partner]);

    const result = await storage.createPartnerAccount({ name: 'Test Partner' });
    expect(result).toEqual(partner);
  });

  it('getPartnerAccount should return partner when found', async () => {
    const partner = { id: 'partner-1' };
    setupSelectChain([partner]);

    const result = await storage.getPartnerAccount('partner-1');
    expect(result).toEqual(partner);
  });

  it('getPartnerAccount should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getPartnerAccount('nonexistent');
    expect(result).toBeUndefined();
  });

  it('getPartnerAccountByEmail should return partner', async () => {
    const partner = { id: 'partner-1', email: 'partner@test.com' };
    setupSelectChain([partner]);

    const result = await storage.getPartnerAccountByEmail('partner@test.com');
    expect(result).toEqual(partner);
  });

  it('getPartnerAccountByOrganizationId should return partner', async () => {
    const partner = { id: 'partner-1', organizationId: 'org-1' };
    setupSelectChain([partner]);

    const result = await storage.getPartnerAccountByOrganizationId('org-1');
    expect(result).toEqual(partner);
  });

  it('getAllPartnerAccounts should return all partners', async () => {
    const partners = [{ id: 'p-1' }, { id: 'p-2' }];
    setupSelectChain(partners);

    const result = await storage.getAllPartnerAccounts();
    expect(result).toEqual(partners);
  });

  it('updatePartnerAccount should update partner', async () => {
    setupUpdateChain();

    await storage.updatePartnerAccount('partner-1', { name: 'Updated' });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('deletePartnerAccount should delete partner', async () => {
    setupDeleteChain();

    await storage.deletePartnerAccount('partner-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Ecosystem Project Operations', () => {
  it('createEcosystemProject should insert and return project', async () => {
    const project = { id: 'eco-1', userId: 'user-1', name: 'Team Analysis' };
    setupInsertChain([project]);

    const result = await storage.createEcosystemProject({ userId: 'user-1', name: 'Team Analysis' });
    expect(result).toEqual(project);
  });

  it('getEcosystemProject should return project when found', async () => {
    const project = { id: 'eco-1' };
    setupSelectChain([project]);

    const result = await storage.getEcosystemProject('eco-1');
    expect(result).toEqual(project);
  });

  it('getEcosystemProject should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getEcosystemProject('nonexistent');
    expect(result).toBeUndefined();
  });

  it('getEcosystemProjectsByUser should return user projects', async () => {
    const projects = [{ id: 'eco-1' }, { id: 'eco-2' }];
    setupSelectChain(projects);

    const result = await storage.getEcosystemProjectsByUser('user-1');
    expect(result).toEqual(projects);
  });

  it('getEcosystemProjectsByPartner should return partner projects', async () => {
    const projects = [{ id: 'eco-1' }];
    setupSelectChain(projects);

    const result = await storage.getEcosystemProjectsByPartner('partner-1');
    expect(result).toEqual(projects);
  });

  it('updateEcosystemProject should update and return project', async () => {
    const updated = { id: 'eco-1', name: 'Updated' };
    setupUpdateChain([updated]);

    const result = await storage.updateEcosystemProject('eco-1', { name: 'Updated' });
    expect(result).toEqual(updated);
  });

  it('deleteEcosystemProject should delete project', async () => {
    setupDeleteChain();

    await storage.deleteEcosystemProject('eco-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Ecosystem Team Member Operations', () => {
  it('addEcosystemTeamMember should insert and return member', async () => {
    const member = { id: 'mem-1', projectId: 'eco-1', name: 'Alice' };
    setupInsertChain([member]);

    const result = await storage.addEcosystemTeamMember({ projectId: 'eco-1', name: 'Alice' });
    expect(result).toEqual(member);
  });

  it('getEcosystemTeamMembers should return members for project', async () => {
    const members = [{ id: 'mem-1' }, { id: 'mem-2' }];
    setupSelectChain(members);

    const result = await storage.getEcosystemTeamMembers('eco-1');
    expect(result).toEqual(members);
  });

  it('updateEcosystemTeamMember should update and return member', async () => {
    const updated = { id: 'mem-1', name: 'Updated' };
    setupUpdateChain([updated]);

    const result = await storage.updateEcosystemTeamMember('mem-1', { name: 'Updated' });
    expect(result).toEqual(updated);
  });

  it('deleteEcosystemTeamMember should delete member', async () => {
    setupDeleteChain();

    await storage.deleteEcosystemTeamMember('mem-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - System Settings Operations', () => {
  it('getSystemSetting should return setting when found', async () => {
    const setting = { key: 'maintenance', value: 'false' };
    setupSelectChain([setting]);

    const result = await storage.getSystemSetting('maintenance');
    expect(result).toEqual(setting);
  });

  it('getSystemSetting should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getSystemSetting('nonexistent');
    expect(result).toBeUndefined();
  });

  it('getAllSystemSettings should return all settings', async () => {
    const settings = [{ key: 'k1' }, { key: 'k2' }];
    setupSelectChain(settings);

    const result = await storage.getAllSystemSettings();
    expect(result).toEqual(settings);
  });

  it('deleteSystemSetting should delete setting by key', async () => {
    setupDeleteChain();

    await storage.deleteSystemSetting('maintenance');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Email Verification Code Operations', () => {
  it('createEmailVerificationCode should insert and return code', async () => {
    const code = { id: 'code-1', email: 'test@example.com', code: '123456' };
    setupInsertChain([code]);

    const result = await storage.createEmailVerificationCode({ email: 'test@example.com', code: '123456' });
    expect(result).toEqual(code);
  });

  it('updateEmailVerificationCode should update code', async () => {
    setupUpdateChain();

    await storage.updateEmailVerificationCode('code-1', { attempts: 3 });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('deleteEmailVerificationCode should delete code', async () => {
    setupDeleteChain();

    await storage.deleteEmailVerificationCode('code-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Partner Team Member Operations', () => {
  it('createPartnerTeamMember should insert and return member', async () => {
    const member = { id: 'ptm-1', partnerId: 'partner-1', email: 'member@test.com' };
    setupInsertChain([member]);

    const result = await storage.createPartnerTeamMember({ partnerId: 'partner-1', email: 'member@test.com' });
    expect(result).toEqual(member);
  });

  it('getPartnerTeamMember should return member when found', async () => {
    const member = { id: 'ptm-1' };
    setupSelectChain([member]);

    const result = await storage.getPartnerTeamMember('ptm-1');
    expect(result).toEqual(member);
  });

  it('getPartnerTeamMemberByEmail should return member', async () => {
    const member = { id: 'ptm-1', partnerId: 'partner-1', email: 'member@test.com' };
    setupSelectChain([member]);

    const result = await storage.getPartnerTeamMemberByEmail('partner-1', 'member@test.com');
    expect(result).toEqual(member);
  });

  it('getPartnerTeamMembers should return all members for partner', async () => {
    const members = [{ id: 'ptm-1' }, { id: 'ptm-2' }];
    setupSelectChain(members);

    const result = await storage.getPartnerTeamMembers('partner-1');
    expect(result).toEqual(members);
  });

  it('updatePartnerTeamMember should update member', async () => {
    setupUpdateChain();

    await storage.updatePartnerTeamMember('ptm-1', { role: 'admin' });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('deletePartnerTeamMember should delete member', async () => {
    setupDeleteChain();

    await storage.deletePartnerTeamMember('ptm-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('deleteAllPartnerTeamMembers should delete all members for partner', async () => {
    setupDeleteChain();

    await storage.deleteAllPartnerTeamMembers('partner-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Assessment Session Operations', () => {
  it('createAssessmentSession should insert and return session', async () => {
    const session = { id: 'sess-1', partnerId: 'partner-1' };
    setupInsertChain([session]);

    const result = await storage.createAssessmentSession({ partnerId: 'partner-1' });
    expect(result).toEqual(session);
  });

  it('getAssessmentSession should return session when found', async () => {
    const session = { id: 'sess-1' };
    setupSelectChain([session]);

    const result = await storage.getAssessmentSession('sess-1');
    expect(result).toEqual(session);
  });

  it('getAssessmentSession should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getAssessmentSession('nonexistent');
    expect(result).toBeUndefined();
  });

  it('updateAssessmentSession should update session', async () => {
    setupUpdateChain();

    await storage.updateAssessmentSession('sess-1', { status: 'completed' });
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Usage Event Operations', () => {
  it('createUsageEvent should insert and return event', async () => {
    const event = { id: 'evt-1', partnerId: 'partner-1', eventType: 'test_completion' };
    setupInsertChain([event]);

    const result = await storage.createUsageEvent({ partnerId: 'partner-1', eventType: 'test_completion' });
    expect(result).toEqual(event);
  });
});

describe('DatabaseStorage - Partner Webhook Operations', () => {
  it('createPartnerWebhook should insert and return webhook', async () => {
    const webhook = { id: 'wh-1', partnerId: 'partner-1', url: 'https://example.com/webhook' };
    setupInsertChain([webhook]);

    const result = await storage.createPartnerWebhook({ partnerId: 'partner-1', url: 'https://example.com/webhook' });
    expect(result).toEqual(webhook);
  });

  it('getPartnerWebhook should return webhook when found', async () => {
    const webhook = { id: 'wh-1' };
    setupSelectChain([webhook]);

    const result = await storage.getPartnerWebhook('wh-1');
    expect(result).toEqual(webhook);
  });

  it('getPartnerWebhooks should return webhooks for partner', async () => {
    const webhooks = [{ id: 'wh-1' }];
    setupSelectChain(webhooks);

    const result = await storage.getPartnerWebhooks('partner-1');
    expect(result).toEqual(webhooks);
  });

  it('updatePartnerWebhook should update webhook', async () => {
    setupUpdateChain();

    await storage.updatePartnerWebhook('wh-1', { url: 'https://new.com/hook' });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('deletePartnerWebhook should delete webhook', async () => {
    setupDeleteChain();

    await storage.deletePartnerWebhook('wh-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Error Log Operations', () => {
  it('createErrorLog should insert and return error log', async () => {
    const errorLog = { id: 'err-1', message: 'Test error', severity: 'error' };
    setupInsertChain([errorLog]);

    const result = await storage.createErrorLog({ message: 'Test error', severity: 'error' });
    expect(result).toEqual(errorLog);
  });

  it('getErrorLog should return log when found', async () => {
    const errorLog = { id: 'err-1' };
    setupSelectChain([errorLog]);

    const result = await storage.getErrorLog('err-1');
    expect(result).toEqual(errorLog);
  });

  it('getErrorLog should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getErrorLog('nonexistent');
    expect(result).toBeUndefined();
  });

  it('updateErrorLog should update error log', async () => {
    setupUpdateChain();

    await storage.updateErrorLog('err-1', { status: 'resolved' });
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Partner Candidate Invitation Operations', () => {
  it('createPartnerCandidateInvitation should insert and return invitation', async () => {
    const invitation = { id: 'pci-1', partnerId: 'partner-1', email: 'candidate@test.com' };
    setupInsertChain([invitation]);

    const result = await storage.createPartnerCandidateInvitation({ partnerId: 'partner-1', email: 'candidate@test.com' });
    expect(result).toEqual(invitation);
  });

  it('getPartnerCandidateInvitation should return invitation when found', async () => {
    const invitation = { id: 'pci-1' };
    setupSelectChain([invitation]);

    const result = await storage.getPartnerCandidateInvitation('pci-1');
    expect(result).toEqual(invitation);
  });

  it('getPartnerCandidateInvitationByToken should return invitation', async () => {
    const invitation = { id: 'pci-1', token: 'token123' };
    setupSelectChain([invitation]);

    const result = await storage.getPartnerCandidateInvitationByToken('token123');
    expect(result).toEqual(invitation);
  });

  it('updatePartnerCandidateInvitation should update invitation', async () => {
    setupUpdateChain();

    await storage.updatePartnerCandidateInvitation('pci-1', { status: 'completed' });
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Audit Log Operations', () => {
  it('createAuditLog should insert and return audit log', async () => {
    const log = { id: 'audit-1', action: 'login', userId: 'user-1' };
    setupInsertChain([log]);

    const result = await storage.createAuditLog({ action: 'login', userId: 'user-1' });
    expect(result).toEqual(log);
  });
});

describe('DatabaseStorage - AI Usage Cost Operations', () => {
  it('createAiUsageCost should insert and return cost record', async () => {
    const cost = { id: 'cost-1', operationType: 'scoring', model: 'gpt-4', costCents: 5 };
    setupInsertChain([cost]);

    const result = await storage.createAiUsageCost({ operationType: 'scoring', model: 'gpt-4', costCents: 5 });
    expect(result).toEqual(cost);
  });
});

describe('DatabaseStorage - Partner Analysis Report Operations', () => {
  it('createPartnerAnalysisReport should insert and return report', async () => {
    const report = { id: 'par-1', partnerId: 'partner-1', reportType: 'team_analysis' };
    setupInsertChain([report]);

    const result = await storage.createPartnerAnalysisReport({ partnerId: 'partner-1', reportType: 'team_analysis' });
    expect(result).toEqual(report);
  });

  it('getPartnerAnalysisReport should return report when found', async () => {
    const report = { id: 'par-1' };
    setupSelectChain([report]);

    const result = await storage.getPartnerAnalysisReport('par-1');
    expect(result).toEqual(report);
  });

  it('getPartnerAnalysisReport should return undefined when not found', async () => {
    setupSelectChain([]);

    const result = await storage.getPartnerAnalysisReport('nonexistent');
    expect(result).toBeUndefined();
  });

  it('deletePartnerAnalysisReport should delete report', async () => {
    setupDeleteChain();

    await storage.deletePartnerAnalysisReport('par-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - User Reference Operations', () => {
  it('createUserReference should insert and return reference', async () => {
    const ref = { id: 'ref-1', userId: 'user-1' };
    setupInsertChain([ref]);

    const result = await storage.createUserReference({ userId: 'user-1' });
    expect(result).toEqual(ref);
  });

  it('getUserReference should return reference when found', async () => {
    const ref = { id: 'ref-1', userId: 'user-1' };
    setupSelectChain([ref]);

    const result = await storage.getUserReference('user-1');
    expect(result).toEqual(ref);
  });
});

describe('DatabaseStorage - Multi-Candidate Comparison Operations', () => {
  it('createMultiCandidateComparison should insert and return comparison', async () => {
    const comp = { id: 'comp-1', jobRoleId: 'role-1', createdBy: 'user-1' };
    setupInsertChain([comp]);

    const result = await storage.createMultiCandidateComparison({ jobRoleId: 'role-1', createdBy: 'user-1' });
    expect(result).toEqual(comp);
  });

  it('getMultiCandidateComparison should return comparison when found', async () => {
    const comp = { id: 'comp-1' };
    setupSelectChain([comp]);

    const result = await storage.getMultiCandidateComparison('comp-1');
    expect(result).toEqual(comp);
  });

  it('getMultiCandidateComparisonsByRole should return comparisons', async () => {
    const comps = [{ id: 'comp-1' }];
    setupSelectChain(comps);

    const result = await storage.getMultiCandidateComparisonsByRole('role-1');
    expect(result).toEqual(comps);
  });

  it('getMultiCandidateComparisonsByCreator should return comparisons', async () => {
    const comps = [{ id: 'comp-1' }];
    setupSelectChain(comps);

    const result = await storage.getMultiCandidateComparisonsByCreator('user-1');
    expect(result).toEqual(comps);
  });
});

describe('DatabaseStorage - Admin Operations', () => {
  it('getAllResults should return all assessment results', async () => {
    const results = [{ id: 'r1' }, { id: 'r2' }];
    setupSelectChain(results);

    const result = await storage.getAllResults();
    expect(result).toEqual(results);
  });

  it('getAllInvitations should return all invitations', async () => {
    const invitations = [{ id: 'inv-1' }];
    setupSelectChain(invitations);

    const result = await storage.getAllInvitations();
    expect(result).toEqual(invitations);
  });
});

describe('DatabaseStorage - Partner API Key Operations', () => {
  it('createPartnerApiKey should insert and return key', async () => {
    const key = { id: 'key-1', partnerId: 'partner-1', keyHash: 'hash123' };
    setupInsertChain([key]);

    const result = await storage.createPartnerApiKey({ partnerId: 'partner-1', keyHash: 'hash123' });
    expect(result).toEqual(key);
  });

  it('getPartnerApiKey should return key when found', async () => {
    const key = { id: 'key-1' };
    setupSelectChain([key]);

    const result = await storage.getPartnerApiKey('key-1');
    expect(result).toEqual(key);
  });

  it('revokePartnerApiKey should update key to revoked', async () => {
    setupUpdateChain();

    await storage.revokePartnerApiKey('key-1');
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Billing Change Request Operations', () => {
  it('createBillingChangeRequest should insert and return request', async () => {
    const req = { id: 'bcr-1', partnerId: 'partner-1', requestedTier: 'growth' };
    setupInsertChain([req]);

    const result = await storage.createBillingChangeRequest({ partnerId: 'partner-1', requestedTier: 'growth' });
    expect(result).toEqual(req);
  });

  it('getBillingChangeRequest should return request when found', async () => {
    const req = { id: 'bcr-1' };
    setupSelectChain([req]);

    const result = await storage.getBillingChangeRequest('bcr-1');
    expect(result).toEqual(req);
  });

  it('getBillingChangeRequestsByPartner should return requests', async () => {
    const reqs = [{ id: 'bcr-1' }];
    setupSelectChain(reqs);

    const result = await storage.getBillingChangeRequestsByPartner('partner-1');
    expect(result).toEqual(reqs);
  });
});

describe('DatabaseStorage - Partner Invoice Operations', () => {
  it('createPartnerInvoice should insert and return invoice', async () => {
    const invoice = { id: 'inv-1', partnerId: 'partner-1', amount: 1000 };
    setupInsertChain([invoice]);

    const result = await storage.createPartnerInvoice({ partnerId: 'partner-1', amount: 1000 });
    expect(result).toEqual(invoice);
  });

  it('getPartnerInvoice should return invoice when found', async () => {
    const invoice = { id: 'inv-1' };
    setupSelectChain([invoice]);

    const result = await storage.getPartnerInvoice('inv-1');
    expect(result).toEqual(invoice);
  });

  it('getPartnerInvoices should return invoices for partner', async () => {
    const invoices = [{ id: 'inv-1' }];
    setupSelectChain(invoices);

    const result = await storage.getPartnerInvoices('partner-1');
    expect(result).toEqual(invoices);
  });

  it('updatePartnerInvoice should update invoice', async () => {
    setupUpdateChain();

    await storage.updatePartnerInvoice('inv-1', { status: 'paid' });
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Golden Set Operations', () => {
  it('createGoldenSetPrompt should insert and return prompt', async () => {
    const prompt = { id: 'gs-1', promptText: 'Test prompt' };
    setupInsertChain([prompt]);

    const result = await storage.createGoldenSetPrompt({ promptText: 'Test prompt' });
    expect(result).toEqual(prompt);
  });

  it('getAllGoldenSetPrompts should return all prompts', async () => {
    const prompts = [{ id: 'gs-1' }, { id: 'gs-2' }];
    setupSelectChain(prompts);

    const result = await storage.getAllGoldenSetPrompts();
    expect(result).toEqual(prompts);
  });

  it('createGoldenSetResult should insert and return result', async () => {
    const gsResult = { id: 'gsr-1', promptId: 'gs-1' };
    setupInsertChain([gsResult]);

    const result = await storage.createGoldenSetResult({ promptId: 'gs-1' });
    expect(result).toEqual(gsResult);
  });

  it('deleteAllGoldenSetPrompts should delete all prompts', async () => {
    setupDeleteChain();

    await storage.deleteAllGoldenSetPrompts();
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('deleteAllGoldenSetResults should delete all results', async () => {
    setupDeleteChain();

    await storage.deleteAllGoldenSetResults();
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Cached Role Alignment Operations', () => {
  it('createRoleAlignment should insert and return alignment', async () => {
    const alignment = { id: 'ra-1', userId: 'user-1', jobRoleId: 'role-1' };
    setupInsertChain([alignment]);

    const result = await storage.createRoleAlignment({ userId: 'user-1', jobRoleId: 'role-1' });
    expect(result).toEqual(alignment);
  });

  it('getRoleAlignmentsByCandidate should return alignments', async () => {
    const alignments = [{ id: 'ra-1' }];
    setupSelectChain(alignments);

    const result = await storage.getRoleAlignmentsByCandidate('user-1');
    expect(result).toEqual(alignments);
  });

  it('invalidateRoleAlignmentCache should delete alignment', async () => {
    setupDeleteChain();

    await storage.invalidateRoleAlignmentCache('user-1', 'role-1');
    expect(mockDb.delete).toHaveBeenCalled();
  });
});

describe('DatabaseStorage - Partner Result Purchase Operations', () => {
  it('createPartnerResultPurchase should insert and return purchase', async () => {
    const purchase = { id: 'prp-1', userId: 'user-1' };
    setupInsertChain([purchase]);

    const result = await storage.createPartnerResultPurchase({ userId: 'user-1' });
    expect(result).toEqual(purchase);
  });

  it('getPartnerResultPurchase should return purchase when found', async () => {
    const purchase = { id: 'prp-1' };
    setupSelectChain([purchase]);

    const result = await storage.getPartnerResultPurchase('prp-1');
    expect(result).toEqual(purchase);
  });

  it('getPartnerResultPurchasesByUser should return purchases', async () => {
    const purchases = [{ id: 'prp-1' }];
    setupSelectChain(purchases);

    const result = await storage.getPartnerResultPurchasesByUser('user-1');
    expect(result).toEqual(purchases);
  });

  it('updatePartnerResultPurchase should update purchase', async () => {
    setupUpdateChain();

    await storage.updatePartnerResultPurchase('prp-1', { status: 'completed' });
    expect(mockDb.update).toHaveBeenCalled();
  });
});
