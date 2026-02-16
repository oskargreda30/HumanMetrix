import { describe, it, expect } from 'vitest';
import {
  sessions,
  USER_ROLES,
  PIPELINE_STAGES,
  PIPELINE_STAGE_ORDER,
  PIPELINE_STAGE_LABELS,
  organizations,
  insertOrganizationSchema,
  users,
  purchases,
  insertPurchaseSchema,
  purchaseItems,
  insertPurchaseItemSchema,
  assessmentResults,
  insertAssessmentResultSchema,
  invitations,
  insertInvitationSchema,
  userReferences,
  insertUserReferenceSchema,
  promptArchitectureEvaluations,
  insertPromptArchitectureEvaluationSchema,
  aiqRationales,
  insertAiqRationaleSchema,
  jobRoles,
  insertJobRoleSchema,
  candidateTags,
  insertCandidateTagSchema,
  candidateNotes,
  insertCandidateNoteSchema,
  cachedRoleAlignments,
  insertCachedRoleAlignmentSchema,
  multiCandidateComparisons,
  insertMultiCandidateComparisonSchema,
  reportExports,
  insertReportExportSchema,
  marketingOptins,
  insertMarketingOptinSchema,
  goldenSetPrompts,
  insertGoldenSetPromptSchema,
  goldenSetResults,
  insertGoldenSetResultSchema,
  ASSESSMENT_TYPES,
  ASSESSMENT_PRICES,
  BASE_FEE,
  B2C_RETAIL_PRICE_PER_ASSESSMENT,
  B2B_VOLUME_TIERS,
  REPORT_DISCOUNTS,
  CREDIT_EXPIRATION_MONTHS,
  formatPriceGBP,
  getTrialQuotaForTier,
  getPriceForTier,
  normalizeAssessmentId,
  partnerAccounts,
  insertPartnerAccountSchema,
  partnerOrganisations,
  insertPartnerOrganisationSchema,
  partnerOverageLedger,
  insertPartnerOverageLedgerSchema,
  partnerApiKeys,
  insertPartnerApiKeySchema,
  assessmentSessions,
  insertAssessmentSessionSchema,
  usageEvents,
  insertUsageEventSchema,
  partnerTestPackages,
  insertPartnerTestPackageSchema,
  partnerQuotaLedger,
  insertPartnerQuotaLedgerSchema,
  partnerInvoices,
  insertPartnerInvoiceSchema,
  partnerMonthlyUsage,
  insertPartnerMonthlyUsageSchema,
  PARTNER_BILLING_TYPES,
  ERROR_SEVERITY,
  ERROR_STATUS,
  errorLogs,
  insertErrorLogSchema,
  WEBHOOK_EVENTS,
  partnerWebhooks,
  insertPartnerWebhookSchema,
  webhookDeliveryLogs,
  insertWebhookDeliveryLogSchema,
  partnerAtsIntegrations,
  insertPartnerAtsIntegrationSchema,
  partnerScheduledExports,
  insertPartnerScheduledExportSchema,
  partnerNotifications,
  insertPartnerNotificationSchema,
  partnerNotificationRecipients,
  insertPartnerNotificationRecipientSchema,
  partnerTeamMembers,
  insertPartnerTeamMemberSchema,
  billingChangeRequests,
  insertBillingChangeRequestSchema,
  partnerEnquiries,
  insertPartnerEnquirySchema,
  partnerCandidateImports,
  insertPartnerCandidateImportSchema,
  partnerCandidateInvitations,
  insertPartnerCandidateInvitationSchema,
  partnerResultPurchases,
  insertPartnerResultPurchaseSchema,
  systemSettings,
  insertSystemSettingSchema,
  SYSTEM_SETTING_KEYS,
  broadcastMessages,
  insertBroadcastMessageSchema,
  emailVerificationCodes,
  insertEmailVerificationCodeSchema,
  xeroIntegration,
  insertXeroIntegrationSchema,
  EXPENSE_CATEGORIES,
  expenses,
  insertExpenseSchema,
  revenueSyncLogs,
  insertRevenueSyncLogSchema,
  adminNotifications,
  insertAdminNotificationSchema,
  auditLogs,
  insertAuditLogSchema,
  ECOSYSTEM_PROJECT_STATUS,
  ecosystemProjects,
  insertEcosystemProjectSchema,
  ecosystemTeamMembers,
  insertEcosystemTeamMemberSchema,
  AI_USAGE_OPERATION_TYPES,
  aiUsageCosts,
  insertAiUsageCostSchema,
  partnerAnalysisReports,
  insertPartnerAnalysisReportSchema,
  stripeWebhookEvents,
  autoTopUpRetries,
  insertAutoTopUpRetrySchema,
  emailLogs,
  insertEmailLogSchema,
  appLogs,
  BUG_SEVERITY,
  BUG_STATUS,
  BUG_STATUS_ORDER,
  BUG_STATUS_LABELS,
  bugReports,
  insertBugReportSchema,
} from '@shared/schema';

import type {
  UserRole,
  PipelineStage,
  InsertOrganization,
  Organization,
  UpsertUser,
  User,
  InsertPurchase,
  Purchase,
  InsertPurchaseItem,
  PurchaseItem,
  InsertAssessmentResult,
  AssessmentResult,
  InsertInvitation,
  Invitation,
  InsertUserReference,
  UserReference,
  InsertPromptArchitectureEvaluation,
  PromptArchitectureEvaluation,
  InsertAiqRationale,
  AiqRationale,
  JobRoleDomain,
  InsertJobRole,
  JobRole,
  InsertCandidateTag,
  CandidateTag,
  InsertCandidateNote,
  CandidateNote,
  InsertCachedRoleAlignment,
  CachedRoleAlignment,
  InsertMultiCandidateComparison,
  MultiCandidateComparison,
  InsertReportExport,
  ReportExport,
  InsertMarketingOptin,
  MarketingOptin,
  InsertGoldenSetPrompt,
  GoldenSetPrompt,
  InsertGoldenSetResult,
  GoldenSetResult,
  InsertPartnerAccount,
  PartnerAccount,
  InsertPartnerOrganisation,
  PartnerOrganisation,
  ExpenseCategory,
  InsertExpense,
  Expense,
  InsertAdminNotification,
  AdminNotification,
  InsertAuditLog,
  AuditLog,
  EcosystemProjectStatus,
  InsertEcosystemProject,
  EcosystemProject,
  InsertEcosystemTeamMember,
  EcosystemTeamMember,
  AiUsageOperationType,
  InsertAiUsageCost,
  AiUsageCost,
  InsertPartnerAnalysisReport,
  PartnerAnalysisReport,
  StripeWebhookEvent,
  InsertAutoTopUpRetry,
  AutoTopUpRetry,
  InsertEmailLog,
  EmailLog,
  AppLog,
  InsertAppLog,
  BugSeverity,
  BugStatus,
  InsertBugReport,
  BugReport,
} from '@shared/schema';

describe('shared/schema.ts - Table definitions exist', () => {
  const tables = [
    { name: 'sessions', table: sessions },
    { name: 'organizations', table: organizations },
    { name: 'users', table: users },
    { name: 'purchases', table: purchases },
    { name: 'purchaseItems', table: purchaseItems },
    { name: 'assessmentResults', table: assessmentResults },
    { name: 'invitations', table: invitations },
    { name: 'userReferences', table: userReferences },
    { name: 'promptArchitectureEvaluations', table: promptArchitectureEvaluations },
    { name: 'aiqRationales', table: aiqRationales },
    { name: 'jobRoles', table: jobRoles },
    { name: 'candidateTags', table: candidateTags },
    { name: 'candidateNotes', table: candidateNotes },
    { name: 'cachedRoleAlignments', table: cachedRoleAlignments },
    { name: 'multiCandidateComparisons', table: multiCandidateComparisons },
    { name: 'reportExports', table: reportExports },
    { name: 'marketingOptins', table: marketingOptins },
    { name: 'goldenSetPrompts', table: goldenSetPrompts },
    { name: 'goldenSetResults', table: goldenSetResults },
    { name: 'partnerAccounts', table: partnerAccounts },
    { name: 'partnerOrganisations', table: partnerOrganisations },
    { name: 'partnerOverageLedger', table: partnerOverageLedger },
    { name: 'partnerApiKeys', table: partnerApiKeys },
    { name: 'assessmentSessions', table: assessmentSessions },
    { name: 'usageEvents', table: usageEvents },
    { name: 'partnerTestPackages', table: partnerTestPackages },
    { name: 'partnerQuotaLedger', table: partnerQuotaLedger },
    { name: 'partnerInvoices', table: partnerInvoices },
    { name: 'partnerMonthlyUsage', table: partnerMonthlyUsage },
    { name: 'errorLogs', table: errorLogs },
    { name: 'partnerWebhooks', table: partnerWebhooks },
    { name: 'webhookDeliveryLogs', table: webhookDeliveryLogs },
    { name: 'partnerAtsIntegrations', table: partnerAtsIntegrations },
    { name: 'partnerScheduledExports', table: partnerScheduledExports },
    { name: 'partnerNotifications', table: partnerNotifications },
    { name: 'partnerNotificationRecipients', table: partnerNotificationRecipients },
    { name: 'partnerTeamMembers', table: partnerTeamMembers },
    { name: 'billingChangeRequests', table: billingChangeRequests },
    { name: 'partnerEnquiries', table: partnerEnquiries },
    { name: 'partnerCandidateImports', table: partnerCandidateImports },
    { name: 'partnerCandidateInvitations', table: partnerCandidateInvitations },
    { name: 'partnerResultPurchases', table: partnerResultPurchases },
    { name: 'systemSettings', table: systemSettings },
    { name: 'broadcastMessages', table: broadcastMessages },
    { name: 'emailVerificationCodes', table: emailVerificationCodes },
    { name: 'xeroIntegration', table: xeroIntegration },
    { name: 'expenses', table: expenses },
    { name: 'revenueSyncLogs', table: revenueSyncLogs },
    { name: 'adminNotifications', table: adminNotifications },
    { name: 'auditLogs', table: auditLogs },
    { name: 'ecosystemProjects', table: ecosystemProjects },
    { name: 'ecosystemTeamMembers', table: ecosystemTeamMembers },
    { name: 'aiUsageCosts', table: aiUsageCosts },
    { name: 'partnerAnalysisReports', table: partnerAnalysisReports },
    { name: 'stripeWebhookEvents', table: stripeWebhookEvents },
    { name: 'autoTopUpRetries', table: autoTopUpRetries },
    { name: 'emailLogs', table: emailLogs },
    { name: 'appLogs', table: appLogs },
    { name: 'bugReports', table: bugReports },
  ];

  tables.forEach(({ name, table }) => {
    it(`${name} table is defined`, () => {
      expect(table).toBeDefined();
      expect(table).not.toBeNull();
    });
  });
});

describe('shared/schema.ts - Insert schemas are Zod schemas', () => {
  const schemas = [
    { name: 'insertOrganizationSchema', schema: insertOrganizationSchema },
    { name: 'insertPurchaseSchema', schema: insertPurchaseSchema },
    { name: 'insertPurchaseItemSchema', schema: insertPurchaseItemSchema },
    { name: 'insertAssessmentResultSchema', schema: insertAssessmentResultSchema },
    { name: 'insertInvitationSchema', schema: insertInvitationSchema },
    { name: 'insertUserReferenceSchema', schema: insertUserReferenceSchema },
    { name: 'insertPromptArchitectureEvaluationSchema', schema: insertPromptArchitectureEvaluationSchema },
    { name: 'insertAiqRationaleSchema', schema: insertAiqRationaleSchema },
    { name: 'insertJobRoleSchema', schema: insertJobRoleSchema },
    { name: 'insertCandidateTagSchema', schema: insertCandidateTagSchema },
    { name: 'insertCandidateNoteSchema', schema: insertCandidateNoteSchema },
    { name: 'insertCachedRoleAlignmentSchema', schema: insertCachedRoleAlignmentSchema },
    { name: 'insertMultiCandidateComparisonSchema', schema: insertMultiCandidateComparisonSchema },
    { name: 'insertReportExportSchema', schema: insertReportExportSchema },
    { name: 'insertMarketingOptinSchema', schema: insertMarketingOptinSchema },
    { name: 'insertGoldenSetPromptSchema', schema: insertGoldenSetPromptSchema },
    { name: 'insertGoldenSetResultSchema', schema: insertGoldenSetResultSchema },
    { name: 'insertPartnerAccountSchema', schema: insertPartnerAccountSchema },
    { name: 'insertPartnerOrganisationSchema', schema: insertPartnerOrganisationSchema },
    { name: 'insertPartnerOverageLedgerSchema', schema: insertPartnerOverageLedgerSchema },
    { name: 'insertPartnerApiKeySchema', schema: insertPartnerApiKeySchema },
    { name: 'insertAssessmentSessionSchema', schema: insertAssessmentSessionSchema },
    { name: 'insertUsageEventSchema', schema: insertUsageEventSchema },
    { name: 'insertPartnerTestPackageSchema', schema: insertPartnerTestPackageSchema },
    { name: 'insertPartnerQuotaLedgerSchema', schema: insertPartnerQuotaLedgerSchema },
    { name: 'insertPartnerInvoiceSchema', schema: insertPartnerInvoiceSchema },
    { name: 'insertPartnerMonthlyUsageSchema', schema: insertPartnerMonthlyUsageSchema },
    { name: 'insertErrorLogSchema', schema: insertErrorLogSchema },
    { name: 'insertPartnerWebhookSchema', schema: insertPartnerWebhookSchema },
    { name: 'insertWebhookDeliveryLogSchema', schema: insertWebhookDeliveryLogSchema },
    { name: 'insertPartnerAtsIntegrationSchema', schema: insertPartnerAtsIntegrationSchema },
    { name: 'insertPartnerScheduledExportSchema', schema: insertPartnerScheduledExportSchema },
    { name: 'insertPartnerNotificationSchema', schema: insertPartnerNotificationSchema },
    { name: 'insertPartnerNotificationRecipientSchema', schema: insertPartnerNotificationRecipientSchema },
    { name: 'insertPartnerTeamMemberSchema', schema: insertPartnerTeamMemberSchema },
    { name: 'insertBillingChangeRequestSchema', schema: insertBillingChangeRequestSchema },
    { name: 'insertPartnerEnquirySchema', schema: insertPartnerEnquirySchema },
    { name: 'insertPartnerCandidateImportSchema', schema: insertPartnerCandidateImportSchema },
    { name: 'insertPartnerCandidateInvitationSchema', schema: insertPartnerCandidateInvitationSchema },
    { name: 'insertPartnerResultPurchaseSchema', schema: insertPartnerResultPurchaseSchema },
    { name: 'insertSystemSettingSchema', schema: insertSystemSettingSchema },
    { name: 'insertBroadcastMessageSchema', schema: insertBroadcastMessageSchema },
    { name: 'insertEmailVerificationCodeSchema', schema: insertEmailVerificationCodeSchema },
    { name: 'insertXeroIntegrationSchema', schema: insertXeroIntegrationSchema },
    { name: 'insertExpenseSchema', schema: insertExpenseSchema },
    { name: 'insertRevenueSyncLogSchema', schema: insertRevenueSyncLogSchema },
    { name: 'insertAdminNotificationSchema', schema: insertAdminNotificationSchema },
    { name: 'insertAuditLogSchema', schema: insertAuditLogSchema },
    { name: 'insertEcosystemProjectSchema', schema: insertEcosystemProjectSchema },
    { name: 'insertEcosystemTeamMemberSchema', schema: insertEcosystemTeamMemberSchema },
    { name: 'insertAiUsageCostSchema', schema: insertAiUsageCostSchema },
    { name: 'insertPartnerAnalysisReportSchema', schema: insertPartnerAnalysisReportSchema },
    { name: 'insertAutoTopUpRetrySchema', schema: insertAutoTopUpRetrySchema },
    { name: 'insertEmailLogSchema', schema: insertEmailLogSchema },
    { name: 'insertBugReportSchema', schema: insertBugReportSchema },
  ];

  schemas.forEach(({ name, schema }) => {
    it(`${name} is defined and has .parse method`, () => {
      expect(schema).toBeDefined();
      expect(schema).not.toBeNull();
      expect(typeof schema.parse).toBe('function');
    });

    it(`${name} has .safeParse method`, () => {
      expect(typeof schema.safeParse).toBe('function');
    });
  });
});

describe('shared/schema.ts - Constants', () => {
  it('USER_ROLES is defined with expected values', () => {
    expect(USER_ROLES).toBeDefined();
    expect(USER_ROLES.CANDIDATE).toBe('candidate');
    expect(USER_ROLES.PARTNER_TEAM_MEMBER).toBe('partner_team_member');
    expect(USER_ROLES.ORGANIZATION_ADMIN).toBe('organization_admin');
    expect(USER_ROLES.PARTNER_ADMIN).toBe('partner_admin');
    expect(USER_ROLES.SUPER_ADMIN).toBe('super_admin');
  });

  it('PIPELINE_STAGES is defined with expected values', () => {
    expect(PIPELINE_STAGES).toBeDefined();
    expect(PIPELINE_STAGES.NEW).toBe('new');
    expect(PIPELINE_STAGES.IN_PROGRESS).toBe('in_progress');
    expect(PIPELINE_STAGES.COMPLETED).toBe('completed');
    expect(PIPELINE_STAGES.REVIEWING).toBe('reviewing');
    expect(PIPELINE_STAGES.SHORTLISTED).toBe('shortlisted');
    expect(PIPELINE_STAGES.HIRED).toBe('hired');
    expect(PIPELINE_STAGES.REJECTED).toBe('rejected');
  });

  it('PIPELINE_STAGE_ORDER is an array with correct length', () => {
    expect(Array.isArray(PIPELINE_STAGE_ORDER)).toBe(true);
    expect(PIPELINE_STAGE_ORDER).toHaveLength(7);
    expect(PIPELINE_STAGE_ORDER[0]).toBe('new');
  });

  it('PIPELINE_STAGE_LABELS has labels for all stages', () => {
    expect(PIPELINE_STAGE_LABELS).toBeDefined();
    expect(PIPELINE_STAGE_LABELS.new).toBe('New');
    expect(PIPELINE_STAGE_LABELS.in_progress).toBe('In Progress');
    expect(PIPELINE_STAGE_LABELS.completed).toBe('Completed');
    expect(PIPELINE_STAGE_LABELS.reviewing).toBe('Under Review');
    expect(PIPELINE_STAGE_LABELS.shortlisted).toBe('Shortlisted');
    expect(PIPELINE_STAGE_LABELS.hired).toBe('Hired');
    expect(PIPELINE_STAGE_LABELS.rejected).toBe('Rejected');
  });

  it('ASSESSMENT_TYPES is defined', () => {
    expect(ASSESSMENT_TYPES).toBeDefined();
    expect(typeof ASSESSMENT_TYPES).toBe('object');
  });

  it('ASSESSMENT_PRICES is defined', () => {
    expect(ASSESSMENT_PRICES).toBeDefined();
    expect(typeof ASSESSMENT_PRICES).toBe('object');
  });

  it('BASE_FEE is 1500', () => {
    expect(BASE_FEE).toBe(1500);
  });

  it('B2C_RETAIL_PRICE_PER_ASSESSMENT is 2000', () => {
    expect(B2C_RETAIL_PRICE_PER_ASSESSMENT).toBe(2000);
  });

  it('B2B_VOLUME_TIERS is defined', () => {
    expect(B2B_VOLUME_TIERS).toBeDefined();
    expect(typeof B2B_VOLUME_TIERS).toBe('object');
  });

  it('REPORT_DISCOUNTS is defined', () => {
    expect(REPORT_DISCOUNTS).toBeDefined();
    expect(typeof REPORT_DISCOUNTS).toBe('object');
  });

  it('CREDIT_EXPIRATION_MONTHS is 6', () => {
    expect(CREDIT_EXPIRATION_MONTHS).toBe(6);
  });

  it('PARTNER_BILLING_TYPES is defined', () => {
    expect(PARTNER_BILLING_TYPES).toBeDefined();
    expect(typeof PARTNER_BILLING_TYPES).toBe('object');
  });

  it('ERROR_SEVERITY is defined', () => {
    expect(ERROR_SEVERITY).toBeDefined();
    expect(typeof ERROR_SEVERITY).toBe('object');
  });

  it('ERROR_STATUS is defined', () => {
    expect(ERROR_STATUS).toBeDefined();
    expect(typeof ERROR_STATUS).toBe('object');
  });

  it('WEBHOOK_EVENTS is defined', () => {
    expect(WEBHOOK_EVENTS).toBeDefined();
    expect(typeof WEBHOOK_EVENTS).toBe('object');
  });

  it('SYSTEM_SETTING_KEYS is defined', () => {
    expect(SYSTEM_SETTING_KEYS).toBeDefined();
    expect(typeof SYSTEM_SETTING_KEYS).toBe('object');
  });

  it('EXPENSE_CATEGORIES is defined', () => {
    expect(EXPENSE_CATEGORIES).toBeDefined();
    expect(typeof EXPENSE_CATEGORIES).toBe('object');
  });

  it('ECOSYSTEM_PROJECT_STATUS is defined', () => {
    expect(ECOSYSTEM_PROJECT_STATUS).toBeDefined();
    expect(typeof ECOSYSTEM_PROJECT_STATUS).toBe('object');
  });

  it('AI_USAGE_OPERATION_TYPES is defined', () => {
    expect(AI_USAGE_OPERATION_TYPES).toBeDefined();
    expect(typeof AI_USAGE_OPERATION_TYPES).toBe('object');
  });

  it('BUG_SEVERITY is defined', () => {
    expect(BUG_SEVERITY).toBeDefined();
    expect(typeof BUG_SEVERITY).toBe('object');
  });

  it('BUG_STATUS is defined', () => {
    expect(BUG_STATUS).toBeDefined();
    expect(typeof BUG_STATUS).toBe('object');
  });

  it('BUG_STATUS_ORDER is defined', () => {
    expect(Array.isArray(BUG_STATUS_ORDER)).toBe(true);
    expect(BUG_STATUS_ORDER.length).toBeGreaterThan(0);
  });

  it('BUG_STATUS_LABELS is defined', () => {
    expect(BUG_STATUS_LABELS).toBeDefined();
    expect(typeof BUG_STATUS_LABELS).toBe('object');
  });
});

describe('shared/schema.ts - Utility functions', () => {
  it('formatPriceGBP formats pence to GBP string', () => {
    expect(formatPriceGBP(1500)).toContain('15');
  });

  it('getTrialQuotaForTier returns a number', () => {
    const result = getTrialQuotaForTier('starter');
    expect(typeof result).toBe('number');
  });

  it('getPriceForTier returns a number', () => {
    const result = getPriceForTier('starter');
    expect(typeof result).toBe('number');
  });

  it('normalizeAssessmentId returns a valid key', () => {
    const result = normalizeAssessmentId('fit');
    expect(result).toBeDefined();
  });
});

describe('shared/schema.ts - Type exports compile correctly', () => {
  it('UserRole type is usable', () => {
    const role: UserRole = 'candidate';
    expect(role).toBe('candidate');
  });

  it('PipelineStage type is usable', () => {
    const stage: PipelineStage = 'new';
    expect(stage).toBe('new');
  });

  it('JobRoleDomain type is usable', () => {
    const domain: JobRoleDomain = 'technology';
    expect(domain).toBe('technology');
  });

  it('EcosystemProjectStatus type is usable', () => {
    const status: EcosystemProjectStatus = ECOSYSTEM_PROJECT_STATUS.DRAFT;
    expect(status).toBe('draft');
  });

  it('BugSeverity type is usable', () => {
    const severity: BugSeverity = BUG_SEVERITY.CRITICAL as BugSeverity;
    expect(severity).toBeDefined();
  });

  it('BugStatus type is usable', () => {
    const status: BugStatus = BUG_STATUS.NEW as BugStatus;
    expect(status).toBe('new');
  });
});
