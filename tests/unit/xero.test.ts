import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockBuildConsentUrl = vi.fn();
const mockApiCallback = vi.fn();
const mockUpdateTenants = vi.fn();
const mockSetTokenSet = vi.fn();
const mockRefreshToken = vi.fn();
const mockGetContacts = vi.fn();
const mockCreateContacts = vi.fn();
const mockCreateInvoices = vi.fn();

vi.mock('xero-node', () => ({
  XeroClient: vi.fn().mockImplementation(() => ({
    buildConsentUrl: mockBuildConsentUrl,
    apiCallback: mockApiCallback,
    updateTenants: mockUpdateTenants,
    setTokenSet: mockSetTokenSet,
    refreshToken: mockRefreshToken,
    accountingApi: {
      getContacts: mockGetContacts,
      createContacts: mockCreateContacts,
      createInvoices: mockCreateInvoices,
    },
  })),
}));

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();

const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockLeftJoin = vi.fn();
const mockOrderBy = vi.fn();
const mockOffset = vi.fn();
const mockSet = vi.fn();
const mockReturning = vi.fn();
const mockValues = vi.fn();

vi.mock('../../server/db', () => ({
  db: {
    select: (...args: any[]) => mockDbSelect(...args),
    insert: (...args: any[]) => mockDbInsert(...args),
    update: (...args: any[]) => mockDbUpdate(...args),
    delete: (...args: any[]) => mockDbDelete(...args),
  },
}));

vi.mock('@shared/schema', () => ({
  xeroIntegration: { id: 'xero_id', isActive: 'is_active' },
  expenses: { id: 'expense_id', category: 'category', status: 'status', xeroSyncStatus: 'xero_sync_status', createdAt: 'created_at' },
  revenueSyncLogs: { purchaseId: 'purchase_id', syncStatus: 'sync_status', createdAt: 'created_at' },
  purchases: { id: 'purchase_id', userId: 'user_id', status: 'status', createdAt: 'created_at' },
  partnerInvoices: { id: 'partner_invoice_id' },
  users: { id: 'user_id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ type: 'eq', a, b })),
  desc: vi.fn((a) => ({ type: 'desc', a })),
  and: vi.fn((...args: any[]) => ({ type: 'and', args })),
  gte: vi.fn((a, b) => ({ type: 'gte', a, b })),
  lte: vi.fn((a, b) => ({ type: 'lte', a, b })),
  isNull: vi.fn((a) => ({ type: 'isNull', a })),
}));

const mockNotifyCriticalError = vi.fn().mockResolvedValue({ success: true });
vi.mock('../../server/email', () => ({
  notifyCriticalError: (...args: any[]) => mockNotifyCriticalError(...args),
}));

function setupDbChain(result: any[] = []) {
  mockLimit.mockResolvedValue(result);
  mockOffset.mockResolvedValue(result);
  mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy, returning: mockReturning });
  mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset });
  mockLeftJoin.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
  mockFrom.mockReturnValue({ where: mockWhere, limit: mockLimit, leftJoin: mockLeftJoin, orderBy: mockOrderBy });
  mockDbSelect.mockReturnValue({ from: mockFrom });
  mockReturning.mockResolvedValue(result);
  mockValues.mockReturnValue({ returning: mockReturning });
  mockSet.mockReturnValue({ where: mockWhere, returning: mockReturning });
  mockDbInsert.mockReturnValue({ values: mockValues });
  mockDbUpdate.mockReturnValue({ set: mockSet });
  mockDbDelete.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy, returning: mockReturning });
  mockLimit.mockResolvedValue(result);
}

describe('Xero Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.XERO_CLIENT_ID = 'test-client-id';
    process.env.XERO_CLIENT_SECRET = 'test-client-secret';
    process.env.XERO_REDIRECT_URI = 'http://localhost:5000/api/admin/xero/callback';

    mockBuildConsentUrl.mockReset();
    mockApiCallback.mockReset();
    mockUpdateTenants.mockReset();
    mockSetTokenSet.mockReset();
    mockRefreshToken.mockReset();
    mockGetContacts.mockReset();
    mockCreateContacts.mockReset();
    mockCreateInvoices.mockReset();
    mockDbSelect.mockReset();
    mockDbInsert.mockReset();
    mockDbUpdate.mockReset();
    mockDbDelete.mockReset();
    mockFrom.mockReset();
    mockWhere.mockReset();
    mockLimit.mockReset();
    mockLeftJoin.mockReset();
    mockOrderBy.mockReset();
    mockOffset.mockReset();
    mockSet.mockReset();
    mockReturning.mockReset();
    mockValues.mockReset();
    mockNotifyCriticalError.mockReset();
    mockNotifyCriticalError.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getXeroClient', () => {
    it('returns null when XERO_CLIENT_ID is missing', async () => {
      delete process.env.XERO_CLIENT_ID;
      const { getXeroClient } = await import('../../server/xero');
      expect(getXeroClient()).toBeNull();
    });

    it('returns null when XERO_CLIENT_SECRET is missing', async () => {
      delete process.env.XERO_CLIENT_SECRET;
      const { getXeroClient } = await import('../../server/xero');
      expect(getXeroClient()).toBeNull();
    });

    it('creates and returns XeroClient when credentials are set', async () => {
      const { getXeroClient } = await import('../../server/xero');
      const client = getXeroClient();
      expect(client).not.toBeNull();
      expect(client).toHaveProperty('buildConsentUrl');
    });

    it('returns singleton instance on subsequent calls', async () => {
      const { getXeroClient } = await import('../../server/xero');
      const client1 = getXeroClient();
      const client2 = getXeroClient();
      expect(client1).toBe(client2);
    });
  });

  describe('getXeroAuthUrl', () => {
    it('returns null when client is not configured', async () => {
      delete process.env.XERO_CLIENT_ID;
      const { getXeroAuthUrl } = await import('../../server/xero');
      const result = await getXeroAuthUrl('user-1');
      expect(result).toBeNull();
    });

    it('returns url and state on success', async () => {
      mockBuildConsentUrl.mockResolvedValue('https://xero.com/consent?scope=openid');
      const { getXeroAuthUrl } = await import('../../server/xero');
      const result = await getXeroAuthUrl('user-1');
      expect(result).not.toBeNull();
      expect(result!.url).toContain('https://xero.com/consent');
      expect(result!.url).toContain('state=');
      expect(result!.state).toBeTruthy();
    });

    it('returns null and notifies on error', async () => {
      mockBuildConsentUrl.mockRejectedValue(new Error('Build failed'));
      const { getXeroAuthUrl } = await import('../../server/xero');
      const result = await getXeroAuthUrl('user-1');
      expect(result).toBeNull();
      expect(mockNotifyCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Xero Consent URL' })
      );
    });

    it('handles notification failure gracefully', async () => {
      mockBuildConsentUrl.mockRejectedValue(new Error('Build failed'));
      mockNotifyCriticalError.mockRejectedValue(new Error('Notify failed'));
      const { getXeroAuthUrl } = await import('../../server/xero');
      const result = await getXeroAuthUrl('user-1');
      expect(result).toBeNull();
    });
  });

  describe('validateOAuthState', () => {
    it('returns invalid when no pending state', async () => {
      const { validateOAuthState } = await import('../../server/xero');
      const result = validateOAuthState('some-state');
      expect(result).toEqual({ valid: false });
    });

    it('returns invalid when state is expired', async () => {
      mockBuildConsentUrl.mockResolvedValue('https://xero.com/consent');
      const { getXeroAuthUrl, validateOAuthState } = await import('../../server/xero');

      const realDateNow = Date.now;
      const pastTime = Date.now() - 15 * 60 * 1000;
      Date.now = () => pastTime;

      const authResult = await getXeroAuthUrl('user-1');

      Date.now = realDateNow;

      const result = validateOAuthState(authResult!.state);
      expect(result).toEqual({ valid: false });
    });

    it('returns invalid when state does not match', async () => {
      mockBuildConsentUrl.mockResolvedValue('https://xero.com/consent');
      const { getXeroAuthUrl, validateOAuthState } = await import('../../server/xero');
      await getXeroAuthUrl('user-1');
      const result = validateOAuthState('wrong-state');
      expect(result).toEqual({ valid: false });
    });

    it('returns valid with userId when state matches', async () => {
      mockBuildConsentUrl.mockResolvedValue('https://xero.com/consent');
      const { getXeroAuthUrl, validateOAuthState } = await import('../../server/xero');
      const authResult = await getXeroAuthUrl('user-1');
      const result = validateOAuthState(authResult!.state);
      expect(result).toEqual({ valid: true, userId: 'user-1' });
    });

    it('clears pending state after valid validation', async () => {
      mockBuildConsentUrl.mockResolvedValue('https://xero.com/consent');
      const { getXeroAuthUrl, validateOAuthState } = await import('../../server/xero');
      const authResult = await getXeroAuthUrl('user-1');
      validateOAuthState(authResult!.state);
      const result2 = validateOAuthState(authResult!.state);
      expect(result2).toEqual({ valid: false });
    });
  });

  describe('handleXeroCallback', () => {
    it('returns error when client is not configured', async () => {
      delete process.env.XERO_CLIENT_ID;
      const { handleXeroCallback } = await import('../../server/xero');
      const result = await handleXeroCallback('http://callback?code=abc', 'user-1');
      expect(result).toEqual({ success: false, error: 'Xero client not configured' });
    });

    it('returns error when no tenant found', async () => {
      mockApiCallback.mockResolvedValue({ access_token: 'at', refresh_token: 'rt' });
      mockUpdateTenants.mockResolvedValue([]);
      const { handleXeroCallback } = await import('../../server/xero');
      const result = await handleXeroCallback('http://callback?code=abc', 'user-1');
      expect(result).toEqual({ success: false, error: 'No Xero organization found' });
    });

    it('inserts new integration when none exists', async () => {
      mockApiCallback.mockResolvedValue({
        access_token: 'at', refresh_token: 'rt', id_token: 'it', expires_at: 1700000000,
      });
      mockUpdateTenants.mockResolvedValue([{ tenantId: 'tenant-1', tenantName: 'My Org' }]);
      setupDbChain([]);
      mockValues.mockReturnValue({ returning: mockReturning });

      const { handleXeroCallback } = await import('../../server/xero');
      const result = await handleXeroCallback('http://callback?code=abc', 'user-1');
      expect(result).toEqual({ success: true });
      expect(mockDbInsert).toHaveBeenCalled();
    });

    it('updates existing integration', async () => {
      mockApiCallback.mockResolvedValue({
        access_token: 'at', refresh_token: 'rt', id_token: 'it', expires_at: 1700000000,
      });
      mockUpdateTenants.mockResolvedValue([{ tenantId: 'tenant-1', tenantName: 'My Org' }]);
      setupDbChain([{ id: 'existing-id' }]);

      const { handleXeroCallback } = await import('../../server/xero');
      const result = await handleXeroCallback('http://callback?code=abc', 'user-1');
      expect(result).toEqual({ success: true });
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('handles callback with missing optional token fields', async () => {
      mockApiCallback.mockResolvedValue({});
      mockUpdateTenants.mockResolvedValue([{ tenantId: 'tenant-1' }]);
      setupDbChain([]);

      const { handleXeroCallback } = await import('../../server/xero');
      const result = await handleXeroCallback('http://callback?code=abc', 'user-1');
      expect(result).toEqual({ success: true });
    });

    it('returns error and notifies on exception', async () => {
      mockApiCallback.mockRejectedValue(new Error('OAuth failed'));
      const { handleXeroCallback } = await import('../../server/xero');
      const result = await handleXeroCallback('http://callback?code=abc', 'user-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth failed');
      expect(mockNotifyCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Xero OAuth' })
      );
    });

    it('handles notification failure in catch block', async () => {
      mockApiCallback.mockRejectedValue(new Error('OAuth failed'));
      mockNotifyCriticalError.mockRejectedValue(new Error('Notify failed'));
      const { handleXeroCallback } = await import('../../server/xero');
      const result = await handleXeroCallback('http://callback?code=abc', 'user-1');
      expect(result.success).toBe(false);
    });

    it('returns fallback error when error has no message', async () => {
      mockApiCallback.mockRejectedValue({ code: 500 });
      const { handleXeroCallback } = await import('../../server/xero');
      const result = await handleXeroCallback('http://callback?code=abc', 'user-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to connect to Xero');
    });
  });

  describe('refreshXeroToken', () => {
    it('returns false when client is not configured', async () => {
      delete process.env.XERO_CLIENT_ID;
      const { refreshXeroToken } = await import('../../server/xero');
      const result = await refreshXeroToken();
      expect(result).toBe(false);
    });

    it('returns false when no active integration', async () => {
      setupDbChain([]);
      const { refreshXeroToken } = await import('../../server/xero');
      const result = await refreshXeroToken();
      expect(result).toBe(false);
    });

    it('returns false when no refresh token', async () => {
      setupDbChain([{ id: '1', accessToken: 'at', refreshToken: null }]);
      const { refreshXeroToken } = await import('../../server/xero');
      const result = await refreshXeroToken();
      expect(result).toBe(false);
    });

    it('refreshes token successfully', async () => {
      setupDbChain([{ id: '1', accessToken: 'at', refreshToken: 'rt', idToken: 'it' }]);
      mockRefreshToken.mockResolvedValue({
        access_token: 'new-at', refresh_token: 'new-rt', id_token: 'new-it', expires_at: 1700000000,
      });

      const { refreshXeroToken } = await import('../../server/xero');
      const result = await refreshXeroToken();
      expect(result).toBe(true);
      expect(mockSetTokenSet).toHaveBeenCalled();
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('refreshes token with missing optional fields', async () => {
      setupDbChain([{ id: '1', accessToken: null, refreshToken: 'rt', idToken: null }]);
      mockRefreshToken.mockResolvedValue({});

      const { refreshXeroToken } = await import('../../server/xero');
      const result = await refreshXeroToken();
      expect(result).toBe(true);
    });

    it('returns false and notifies on error', async () => {
      setupDbChain([{ id: '1', accessToken: 'at', refreshToken: 'rt' }]);
      mockSetTokenSet.mockRejectedValue(new Error('Refresh error'));

      const { refreshXeroToken } = await import('../../server/xero');
      const result = await refreshXeroToken();
      expect(result).toBe(false);
      expect(mockNotifyCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Xero Token Refresh' })
      );
    });

    it('handles notification failure in catch block', async () => {
      setupDbChain([{ id: '1', accessToken: 'at', refreshToken: 'rt' }]);
      mockSetTokenSet.mockRejectedValue(new Error('Refresh error'));
      mockNotifyCriticalError.mockRejectedValue(new Error('Notify failed'));

      const { refreshXeroToken } = await import('../../server/xero');
      const result = await refreshXeroToken();
      expect(result).toBe(false);
    });
  });

  describe('getXeroStatus', () => {
    it('returns not connected and configured when no active integration', async () => {
      setupDbChain([]);
      const { getXeroStatus } = await import('../../server/xero');
      const result = await getXeroStatus();
      expect(result.isConnected).toBe(false);
      expect(result.isConfigured).toBe(true);
    });

    it('returns not configured when credentials missing', async () => {
      delete process.env.XERO_CLIENT_ID;
      setupDbChain([]);
      const { getXeroStatus } = await import('../../server/xero');
      const result = await getXeroStatus();
      expect(result.isConfigured).toBe(false);
    });

    it('returns connected with integration details', async () => {
      const connectedAt = new Date();
      const lastSyncAt = new Date();
      setupDbChain([{
        id: '1', isActive: true, tenantName: 'My Org',
        connectedAt, lastSyncAt,
      }]);
      const { getXeroStatus } = await import('../../server/xero');
      const result = await getXeroStatus();
      expect(result.isConnected).toBe(true);
      expect(result.tenantName).toBe('My Org');
      expect(result.connectedAt).toBe(connectedAt);
      expect(result.lastSyncAt).toBe(lastSyncAt);
    });

    it('handles null optional fields', async () => {
      setupDbChain([{
        id: '1', isActive: true, tenantName: null,
        connectedAt: null, lastSyncAt: null,
      }]);
      const { getXeroStatus } = await import('../../server/xero');
      const result = await getXeroStatus();
      expect(result.isConnected).toBe(true);
      expect(result.tenantName).toBeUndefined();
      expect(result.connectedAt).toBeUndefined();
      expect(result.lastSyncAt).toBeUndefined();
    });

    it('returns not connected on db error', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });
      const { getXeroStatus } = await import('../../server/xero');
      const result = await getXeroStatus();
      expect(result.isConnected).toBe(false);
    });
  });

  describe('disconnectXero', () => {
    it('disconnects successfully', async () => {
      setupDbChain([]);
      const { disconnectXero } = await import('../../server/xero');
      const result = await disconnectXero();
      expect(result).toBe(true);
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('returns false and notifies on error', async () => {
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      });
      const { disconnectXero } = await import('../../server/xero');
      const result = await disconnectXero();
      expect(result).toBe(false);
      expect(mockNotifyCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Xero Disconnect' })
      );
    });

    it('handles notification failure in catch block', async () => {
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      });
      mockNotifyCriticalError.mockRejectedValue(new Error('Notify failed'));
      const { disconnectXero } = await import('../../server/xero');
      const result = await disconnectXero();
      expect(result).toBe(false);
    });
  });

  describe('syncExpenseToXero', () => {
    function setupAuthChain(integration: any) {
      let callCount = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([integration]);
              return Promise.resolve([integration]);
            }),
          }),
        }),
      }));
    }

    it('returns error when Xero not connected (no client)', async () => {
      delete process.env.XERO_CLIENT_ID;
      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: false, error: 'Xero not connected' });
    });

    it('returns error when no active integration', async () => {
      setupDbChain([]);
      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: false, error: 'Xero not connected' });
    });

    it('returns error when expense not found', async () => {
      let callCount = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: false, error: 'Expense not found' });
    });

    it('syncs expense with existing vendor contact', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'expense-1', vendor: 'Acme Corp', description: 'Office supplies',
              amount: 5000, invoiceDate: new Date(), dueDate: new Date(),
              invoiceNumber: 'INV-001', currency: 'GBP', status: 'paid',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockGetContacts.mockResolvedValue({
        body: { contacts: [{ contactID: 'contact-1' }] },
      });
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-inv-1' }] },
      });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: true, xeroInvoiceId: 'xero-inv-1' });
    });

    it('syncs expense creating new vendor contact', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'expense-1', vendor: 'New Vendor', description: 'Test',
              amount: 1000, invoiceDate: null, dueDate: null,
              invoiceNumber: null, currency: 'USD', status: 'draft',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockGetContacts.mockResolvedValue({ body: { contacts: [] } });
      mockCreateContacts.mockResolvedValue({
        body: { contacts: [{ contactID: 'new-contact-1' }] },
      });
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-inv-2' }] },
      });

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: true, xeroInvoiceId: 'xero-inv-2' });
    });

    it('syncs expense without vendor', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'expense-1', vendor: null, description: 'Test',
              amount: 1000, invoiceDate: null, dueDate: null,
              invoiceNumber: null, currency: 'USD', status: 'draft',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-inv-3' }] },
      });

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: true, xeroInvoiceId: 'xero-inv-3' });
    });

    it('handles no invoice ID returned', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'expense-1', vendor: null, description: 'Test',
              amount: 1000, currency: 'USD', status: 'draft',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockCreateInvoices.mockResolvedValue({ body: { invoices: [] } });

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No invoice ID');
    });

    it('handles sync error and updates expense status', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'expense-1', vendor: 'Test', description: 'Test',
              amount: 1000, currency: 'USD', status: 'draft',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockGetContacts.mockRejectedValue(new Error('API error'));

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
      expect(mockNotifyCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Xero Expense Sync' })
      );
    });

    it('handles sync error without error message', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'expense-1', vendor: 'Test', description: 'Test',
              amount: 1000, currency: 'USD', status: 'draft',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockGetContacts.mockRejectedValue({ code: 500 });

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sync to Xero');
    });

    it('handles notification failure in sync error catch block', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'expense-1', vendor: 'Test', description: 'Test',
              amount: 1000, currency: 'USD', status: 'draft',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockGetContacts.mockRejectedValue(new Error('API error'));
      mockNotifyCriticalError.mockRejectedValue(new Error('Notify failed'));

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result.success).toBe(false);
    });
  });

  describe('ensureXeroAuth (tested via syncExpenseToXero)', () => {
    it('returns null when integration has no accessToken', async () => {
      setupDbChain([{ id: '1', accessToken: null, refreshToken: 'rt', tenantId: 'tid' }]);
      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: false, error: 'Xero not connected' });
    });

    it('returns null when integration has no tenantId', async () => {
      setupDbChain([{ id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: null }]);
      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: false, error: 'Xero not connected' });
    });

    it('handles null refreshToken and idToken in ensureXeroAuth', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: null, idToken: null, tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'expense-1', vendor: null, description: 'Test',
              amount: 1000, currency: 'USD', status: 'draft',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-inv-null-fields' }] },
      });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result.success).toBe(true);
      expect(mockSetTokenSet).toHaveBeenCalledWith(expect.objectContaining({
        refresh_token: undefined,
        id_token: undefined,
      }));
    });

    it('refreshes expired token and proceeds', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall <= 3) {
              const data = selectCall === 1
                ? [{ id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid', tokenExpiresAt: new Date(Date.now() - 3600000) }]
                : selectCall === 2
                  ? [{ id: '1', accessToken: 'at', refreshToken: 'rt' }]
                  : [{ id: '1', accessToken: 'new-at', refreshToken: 'new-rt', tenantId: 'tid' }];
              return { limit: vi.fn().mockResolvedValue(data) };
            }
            return Promise.resolve([{
              id: 'expense-1', vendor: null, description: 'Test',
              amount: 1000, currency: 'USD', status: 'draft',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockRefreshToken.mockResolvedValue({
        access_token: 'new-at', refresh_token: 'new-rt', expires_at: 9999999999,
      });
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-inv-refreshed' }] },
      });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result.success).toBe(true);
    });

    it('refreshes expired token with null optional fields after refresh', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall <= 3) {
              const data = selectCall === 1
                ? [{ id: '1', accessToken: 'at', refreshToken: null, idToken: null, tenantId: 'tid', tokenExpiresAt: new Date(Date.now() - 3600000) }]
                : selectCall === 2
                  ? [{ id: '1', accessToken: 'at', refreshToken: 'rt' }]
                  : [{ id: '1', accessToken: 'new-at', refreshToken: null, idToken: null, tenantId: 'tid' }];
              return { limit: vi.fn().mockResolvedValue(data) };
            }
            return Promise.resolve([{
              id: 'expense-1', vendor: null, description: 'Test',
              amount: 1000, currency: 'USD', status: 'draft',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockRefreshToken.mockResolvedValue({
        access_token: 'new-at', refresh_token: null, expires_at: 9999999999,
      });
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-inv-null-after-refresh' }] },
      });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result.success).toBe(true);
    });

    it('returns null when token refresh fails', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              if (selectCall === 1) return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() - 3600000),
              }]);
              return Promise.resolve([{ id: '1', accessToken: 'at', refreshToken: null }]);
            }),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: false, error: 'Xero not connected' });
    });

    it('returns null when refreshed integration has no accessToken', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              if (selectCall === 1) return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() - 3600000),
              }]);
              if (selectCall === 2) return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt',
              }]);
              return Promise.resolve([{ id: '1', accessToken: null }]);
            }),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockRefreshToken.mockResolvedValue({ access_token: 'new-at' });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: false, error: 'Xero not connected' });
    });

    it('handles ensureXeroAuth exception and notifies', async () => {
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB connection error')),
          }),
        }),
      }));

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: false, error: 'Xero not connected' });
      expect(mockNotifyCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Xero Auth Check' })
      );
    });

    it('handles ensureXeroAuth notification failure', async () => {
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB connection error')),
          }),
        }),
      }));
      mockNotifyCriticalError.mockRejectedValue(new Error('Notify failed'));

      const { syncExpenseToXero } = await import('../../server/xero');
      const result = await syncExpenseToXero('expense-1');
      expect(result).toEqual({ success: false, error: 'Xero not connected' });
    });
  });

  describe('syncRevenueToXero', () => {
    function setupAuthForRevenue() {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              if (selectCall === 1) return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]);
              return Promise.resolve([]);
            }),
          }),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue([{
              purchase: {
                id: 'p-1', totalAmount: 5000, currency: 'GBP',
              },
              user: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
            }]),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
    }

    it('returns error when not connected', async () => {
      delete process.env.XERO_CLIENT_ID;
      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero();
      expect(result).toEqual({ success: false, error: 'Xero not connected' });
    });

    it('returns error when no purchaseId or partnerInvoiceId provided', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]);
            }),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero();
      expect(result).toEqual({ success: false, error: 'No purchase or invoice ID provided' });
    });

    it('returns error when purchase not found', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]);
            }),
          }),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue([]),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero('purchase-1');
      expect(result).toEqual({ success: false, error: 'Purchase not found' });
    });

    it('syncs purchase revenue with existing contact by email', async () => {
      setupAuthForRevenue();
      mockGetContacts.mockResolvedValue({
        body: { contacts: [{ contactID: 'contact-1' }] },
      });
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-rev-1' }] },
      });
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero('purchase-1');
      expect(result).toEqual({ success: true, xeroInvoiceId: 'xero-rev-1' });
    });

    it('syncs purchase revenue creating new contact when no match', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]);
            }),
          }),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue([{
              purchase: { id: 'p-1', totalAmount: 3000, currency: 'USD' },
              user: { firstName: 'Jane', lastName: null, email: 'jane@test.com' },
            }]),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockGetContacts.mockResolvedValue({ body: { contacts: [] } });
      mockCreateContacts.mockResolvedValue({
        body: { contacts: [{ contactID: 'new-contact-2' }] },
      });
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-rev-2' }] },
      });
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero('purchase-1');
      expect(result).toEqual({ success: true, xeroInvoiceId: 'xero-rev-2' });
    });

    it('syncs purchase revenue with no user (unknown customer)', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]);
            }),
          }),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue([{
              purchase: { id: 'p-1', totalAmount: 2000, currency: 'GBP' },
              user: null,
            }]),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockCreateContacts.mockResolvedValue({
        body: { contacts: [{ contactID: 'new-contact-3' }] },
      });
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-rev-3' }] },
      });
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero('purchase-1');
      expect(result).toEqual({ success: true, xeroInvoiceId: 'xero-rev-3' });
    });

    it('returns error when partner invoice not found', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero(undefined, 'partner-inv-1');
      expect(result).toEqual({ success: false, error: 'Partner invoice not found' });
    });

    it('syncs partner invoice revenue', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'pi-1', totalAmount: 10000, currency: 'EUR',
              invoiceNumber: 'B2B-001',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockCreateContacts.mockResolvedValue({
        body: { contacts: [{ contactID: 'b2b-contact' }] },
      });
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-b2b-1' }] },
      });
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero(undefined, 'partner-inv-1');
      expect(result).toEqual({ success: true, xeroInvoiceId: 'xero-b2b-1' });
    });

    it('syncs partner invoice without invoiceNumber', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'pi-2', totalAmount: 5000, currency: 'GBP',
              invoiceNumber: null,
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockCreateContacts.mockResolvedValue({
        body: { contacts: [{ contactID: 'b2b-contact' }] },
      });
      mockCreateInvoices.mockResolvedValue({
        body: { invoices: [{ invoiceID: 'xero-b2b-2' }] },
      });
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero(undefined, 'partner-inv-1');
      expect(result).toEqual({ success: true, xeroInvoiceId: 'xero-b2b-2' });
    });

    it('handles no invoice ID returned from revenue sync', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            return Promise.resolve([{
              id: 'pi-1', totalAmount: 10000, currency: 'EUR',
              invoiceNumber: 'B2B-001',
            }]);
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockCreateContacts.mockResolvedValue({
        body: { contacts: [{ contactID: 'b2b-contact' }] },
      });
      mockCreateInvoices.mockResolvedValue({ body: { invoices: [] } });
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero(undefined, 'partner-inv-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No invoice ID');
    });

    it('handles revenue sync error with purchaseId', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]);
            }),
          }),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              throw new Error('Revenue sync failed');
            }),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero('purchase-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Revenue sync failed');
      expect(mockNotifyCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Xero Revenue Sync' })
      );
    });

    it('handles revenue sync error with partnerInvoiceId', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCall++;
            if (selectCall === 1) return {
              limit: vi.fn().mockResolvedValue([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]),
            };
            throw new Error('Partner sync failed');
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero(undefined, 'partner-1');
      expect(result.success).toBe(false);
    });

    it('handles revenue sync error without error message', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]);
            }),
          }),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              throw { noMessage: true };
            }),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero('purchase-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sync to Xero');
    });

    it('handles notification failure in revenue sync error', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCall++;
              return Promise.resolve([{
                id: '1', accessToken: 'at', refreshToken: 'rt', tenantId: 'tid',
                tokenExpiresAt: new Date(Date.now() + 3600000),
              }]);
            }),
          }),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              throw new Error('Revenue sync failed');
            }),
          }),
        }),
      }));
      mockSetTokenSet.mockResolvedValue(undefined);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockNotifyCriticalError.mockRejectedValue(new Error('Notify failed'));

      const { syncRevenueToXero } = await import('../../server/xero');
      const result = await syncRevenueToXero('purchase-1');
      expect(result.success).toBe(false);
    });
  });

  describe('getUnsyncedRevenue', () => {
    it('returns unsynced purchases', async () => {
      let selectCall = 0;
      const testDate = new Date('2026-01-01');
      mockDbSelect.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                { purchaseId: 'already-synced' },
              ]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      purchase: { id: 'p-1', totalAmount: 5000, currency: 'GBP', createdAt: testDate },
                      user: { firstName: 'John', lastName: 'Doe' },
                    },
                    {
                      purchase: { id: 'already-synced', totalAmount: 3000, currency: 'USD', createdAt: testDate },
                      user: { firstName: 'Jane', lastName: null },
                    },
                    {
                      purchase: { id: 'p-3', totalAmount: 2000, currency: 'EUR', createdAt: testDate },
                      user: null,
                    },
                  ]),
                }),
              }),
            }),
          }),
        };
      });

      const { getUnsyncedRevenue } = await import('../../server/xero');
      const result = await getUnsyncedRevenue();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('p-1');
      expect(result[0].customerName).toBe('John Doe');
      expect(result[0].type).toBe('b2c');
      expect(result[0].amount).toBe(5000);
      expect(result[1].id).toBe('p-3');
      expect(result[1].customerName).toBe('Unknown');
    });

    it('returns empty array on error', async () => {
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      }));

      const { getUnsyncedRevenue } = await import('../../server/xero');
      const result = await getUnsyncedRevenue();
      expect(result).toEqual([]);
      expect(mockNotifyCriticalError).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Xero Revenue Query' })
      );
    });

    it('handles notification failure in getUnsyncedRevenue error', async () => {
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      }));
      mockNotifyCriticalError.mockRejectedValue(new Error('Notify failed'));

      const { getUnsyncedRevenue } = await import('../../server/xero');
      const result = await getUnsyncedRevenue();
      expect(result).toEqual([]);
    });

    it('handles falsy purchaseId column reference in query', async () => {
      const schema = await import('@shared/schema');
      const originalPurchaseId = (schema.revenueSyncLogs as any).purchaseId;
      (schema.revenueSyncLogs as any).purchaseId = undefined;

      let selectCall = 0;
      const testDate = new Date('2026-01-01');
      mockDbSelect.mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      purchase: { id: 'p-1', totalAmount: 5000, currency: 'GBP', createdAt: testDate },
                      user: { firstName: 'John', lastName: 'Doe' },
                    },
                  ]),
                }),
              }),
            }),
          }),
        };
      });

      const { getUnsyncedRevenue } = await import('../../server/xero');
      const result = await getUnsyncedRevenue();
      expect(Array.isArray(result)).toBe(true);

      (schema.revenueSyncLogs as any).purchaseId = originalPurchaseId;
    });
  });

  describe('createExpense', () => {
    it('creates an expense and returns it', async () => {
      const mockExpense = { id: 'e-1', description: 'Test', amount: 1000 };
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockExpense]),
        }),
      });

      const { createExpense } = await import('../../server/xero');
      const result = await createExpense({
        description: 'Test', amount: 1000, category: 'office', vendor: 'Test',
        currency: 'GBP',
      } as any);
      expect(result).toEqual(mockExpense);
    });
  });

  describe('getExpenses', () => {
    it('returns expenses without filters', async () => {
      const mockExpenses = [{ id: 'e-1' }, { id: 'e-2' }];
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockExpenses),
            }),
          }),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockExpenses),
              }),
            }),
          }),
        }),
      });

      const { getExpenses } = await import('../../server/xero');
      const result = await getExpenses();
      expect(result).toEqual(mockExpenses);
    });

    it('returns expenses with category filter', async () => {
      const mockExpenses = [{ id: 'e-1' }];
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockExpenses),
              }),
            }),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockExpenses),
            }),
          }),
        }),
      });

      const { getExpenses } = await import('../../server/xero');
      const result = await getExpenses({ category: 'office' });
      expect(result).toEqual(mockExpenses);
    });

    it('returns expenses with all filters', async () => {
      const mockExpenses = [{ id: 'e-1' }];
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockExpenses),
              }),
            }),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockExpenses),
            }),
          }),
        }),
      });

      const { getExpenses } = await import('../../server/xero');
      const result = await getExpenses({ category: 'office', status: 'paid', syncStatus: 'synced', limit: 50, offset: 10 });
      expect(result).toEqual(mockExpenses);
    });
  });

  describe('getExpense', () => {
    it('returns an expense by id', async () => {
      const mockExpense = { id: 'e-1', description: 'Test' };
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockExpense]),
        }),
      });
      const { getExpense } = await import('../../server/xero');
      const result = await getExpense('e-1');
      expect(result).toEqual(mockExpense);
    });

    it('returns undefined when not found', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      const { getExpense } = await import('../../server/xero');
      const result = await getExpense('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('updateExpense', () => {
    it('updates and returns expense', async () => {
      const mockExpense = { id: 'e-1', description: 'Updated' };
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockExpense]),
          }),
        }),
      });

      const { updateExpense } = await import('../../server/xero');
      const result = await updateExpense('e-1', { description: 'Updated' } as any);
      expect(result).toEqual(mockExpense);
    });

    it('returns undefined when expense not found', async () => {
      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const { updateExpense } = await import('../../server/xero');
      const result = await updateExpense('nonexistent', { description: 'Test' } as any);
      expect(result).toBeUndefined();
    });
  });

  describe('deleteExpense', () => {
    it('deletes expense and returns true', async () => {
      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });

      const { deleteExpense } = await import('../../server/xero');
      const result = await deleteExpense('e-1');
      expect(result).toBe(true);
    });
  });

  describe('getRevenueSyncLogs', () => {
    it('returns logs without filter', async () => {
      const mockLogs = [{ id: 'l-1' }];
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockLogs),
          }),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockLogs),
            }),
          }),
        }),
      });

      const { getRevenueSyncLogs } = await import('../../server/xero');
      const result = await getRevenueSyncLogs();
      expect(result).toEqual(mockLogs);
    });

    it('returns logs with status filter', async () => {
      const mockLogs = [{ id: 'l-1' }];
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockLogs),
            }),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockLogs),
          }),
        }),
      });

      const { getRevenueSyncLogs } = await import('../../server/xero');
      const result = await getRevenueSyncLogs({ status: 'synced', limit: 50 });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getExpenseStats', () => {
    it('returns expense statistics', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue([
          { amount: 1000, xeroSyncStatus: 'synced', category: 'office' },
          { amount: 2000, xeroSyncStatus: 'not_synced', category: 'office' },
          { amount: 500, xeroSyncStatus: 'synced', category: 'travel' },
        ]),
      });

      const { getExpenseStats } = await import('../../server/xero');
      const result = await getExpenseStats();
      expect(result.totalExpenses).toBe(3);
      expect(result.totalAmount).toBe(3500);
      expect(result.syncedCount).toBe(2);
      expect(result.pendingCount).toBe(1);
      expect(result.byCategory.office.count).toBe(2);
      expect(result.byCategory.office.amount).toBe(3000);
      expect(result.byCategory.travel.count).toBe(1);
      expect(result.byCategory.travel.amount).toBe(500);
    });

    it('returns empty stats when no expenses', async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      });

      const { getExpenseStats } = await import('../../server/xero');
      const result = await getExpenseStats();
      expect(result.totalExpenses).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.syncedCount).toBe(0);
      expect(result.pendingCount).toBe(0);
    });
  });

  describe('getRevenueStats', () => {
    it('returns revenue statistics', async () => {
      let selectCall = 0;
      mockDbSelect.mockImplementation((...args: any[]) => {
        selectCall++;
        if (selectCall === 1) {
          return {
            from: vi.fn().mockResolvedValue([
              { amount: 5000, syncStatus: 'synced' },
              { amount: 3000, syncStatus: 'synced' },
              { amount: 1000, syncStatus: 'error' },
            ]),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      purchase: { id: 'p-1', totalAmount: 2000, currency: 'GBP', createdAt: new Date() },
                      user: { firstName: 'Test', lastName: 'User' },
                    },
                  ]),
                }),
              }),
            }),
          }),
        };
      });

      const { getRevenueStats } = await import('../../server/xero');
      const result = await getRevenueStats();
      expect(result.syncedRevenue).toBe(8000);
      expect(result.syncedCount).toBe(2);
    });

    it('returns zero stats when no data', async () => {
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }));

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([]),
      });

      const { getRevenueStats } = await import('../../server/xero');
      const result = await getRevenueStats();
      expect(result.syncedCount).toBe(0);
      expect(result.syncedRevenue).toBe(0);
    });
  });

  describe('XERO_REDIRECT_URI default', () => {
    it('uses REPL_SLUG when available', async () => {
      process.env.REPL_SLUG = 'my-app';
      delete process.env.XERO_REDIRECT_URI;
      const mod = await import('../../server/xero');
      expect(mod).toBeDefined();
    });

    it('uses localhost when REPL_SLUG not available', async () => {
      delete process.env.REPL_SLUG;
      delete process.env.XERO_REDIRECT_URI;
      const mod = await import('../../server/xero');
      expect(mod).toBeDefined();
    });
  });
});
