// Notification type registry for role-based routing
// Role hierarchy: viewer < member < developer < admin/owner

export type NotificationRole = 'viewer' | 'member' | 'developer' | 'admin' | 'owner';

export type NotificationType =
  // Assessment & Results (viewer+)
  | 'assessment_completed'
  | 'results_ready'
  | 'assessment_started'
  | 'assessment_all_completed'
  // Candidate & Invitation (member+)
  | 'new_candidate'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_expired'
  | 'assessment_link_expired'
  | 'bulk_invitation_completed'
  | 'usage_alert'
  | 'high_incomplete_rate'
  // Developer tools (developer+)
  | 'api_key_created'
  | 'api_key_rotated'
  | 'api_key_revoked'
  | 'api_key_regenerated'
  | 'api_auth_failed'
  | 'new_ip_access'
  | 'webhook_created'
  | 'webhook_updated'
  | 'webhook_deleted'
  | 'webhook_failed'
  | 'integration_connected'
  | 'integration_disconnected'
  | 'scheduled_export_created'
  | 'scheduled_export_completed'
  | 'scheduled_export_failed'
  // Admin/Billing (admin+)
  | 'purchase_success'
  | 'payment_failed'
  | 'quota_warning'
  | 'quota_critical'
  | 'quota_exhausted'
  | 'billing_type_changed'
  | 'card_on_file_added'
  | 'card_on_file_removed'
  | 'card_expiring'
  | 'low_balance'
  | 'overage_billing_processed'
  | 'invoice_generated'
  | 'billing_change_requested'
  | 'monthly_summary'
  // Team management (admin+)
  | 'team_member_invited'
  | 'team_member_joined'
  | 'team_member_removed'
  | 'team_member_role_changed'
  // Security (admin+)
  | 'security_alert'
  | 'suspicious_activity';

// Role hierarchy values (higher = more permissions)
export const ROLE_LEVELS: Record<NotificationRole, number> = {
  viewer: 1,
  member: 2,
  developer: 3,
  admin: 4,
  owner: 5,
};

// Minimum role required to receive each notification type
export const NOTIFICATION_MIN_ROLE: Record<NotificationType, NotificationRole> = {
  // Viewer level
  assessment_completed: 'viewer',
  results_ready: 'viewer',
  assessment_started: 'viewer',
  assessment_all_completed: 'viewer',
  // Member level
  new_candidate: 'member',
  invitation_sent: 'member',
  invitation_accepted: 'member',
  invitation_expired: 'member',
  assessment_link_expired: 'member',
  bulk_invitation_completed: 'member',
  usage_alert: 'member',
  high_incomplete_rate: 'member',
  // Developer level
  api_key_created: 'developer',
  api_key_rotated: 'developer',
  api_key_revoked: 'developer',
  api_key_regenerated: 'developer',
  api_auth_failed: 'developer',
  new_ip_access: 'developer',
  webhook_created: 'developer',
  webhook_updated: 'developer',
  webhook_deleted: 'developer',
  webhook_failed: 'developer',
  integration_connected: 'developer',
  integration_disconnected: 'developer',
  scheduled_export_created: 'developer',
  scheduled_export_completed: 'developer',
  scheduled_export_failed: 'developer',
  // Admin level
  purchase_success: 'admin',
  payment_failed: 'admin',
  quota_warning: 'admin',
  quota_critical: 'admin',
  quota_exhausted: 'admin',
  billing_type_changed: 'admin',
  card_on_file_added: 'admin',
  card_on_file_removed: 'admin',
  card_expiring: 'admin',
  low_balance: 'admin',
  overage_billing_processed: 'admin',
  invoice_generated: 'admin',
  billing_change_requested: 'admin',
  monthly_summary: 'admin',
  team_member_invited: 'admin',
  team_member_joined: 'admin',
  team_member_removed: 'admin',
  team_member_role_changed: 'admin',
  security_alert: 'admin',
  suspicious_activity: 'admin',
};

// Check if a role can receive a notification type
export function canReceiveNotification(role: NotificationRole, type: NotificationType): boolean {
  const minRole = NOTIFICATION_MIN_ROLE[type];
  if (!minRole) return false;
  return ROLE_LEVELS[role] >= ROLE_LEVELS[minRole];
}

// Get all eligible roles for a notification type
export function getEligibleRoles(type: NotificationType): NotificationRole[] {
  const minRole = NOTIFICATION_MIN_ROLE[type];
  if (!minRole) return [];
  const minLevel = ROLE_LEVELS[minRole];
  return (Object.keys(ROLE_LEVELS) as NotificationRole[]).filter(
    role => ROLE_LEVELS[role] >= minLevel
  );
}
