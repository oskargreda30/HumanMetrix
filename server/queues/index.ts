import { emailQueue, scoringQueue } from './jobQueue';
import { 
  handleEmailJob, 
  sendInvitationEmailAsync, 
  sendPasswordResetEmailAsync,
  sendWelcomeEmailAsync,
  sendPaymentReceiptEmailAsync,
  sendContactFormEmailAsync
} from './emailWorker';
import { handleScoringJob, submitPromptScoringAsync, submitPromptArchitectureEvaluationAsync } from './scoringWorker';

export function initializeJobQueues(): void {
  console.log('🔧 Initializing job queues...');
  
  emailQueue.registerHandler('email', handleEmailJob);
  scoringQueue.registerHandler('scoring', handleScoringJob);
  
  console.log('✅ Job queues initialized');
}

export async function shutdownJobQueues(): Promise<void> {
  console.log('🛑 Shutting down job queues...');
  await Promise.all([
    emailQueue.shutdown(),
    scoringQueue.shutdown(),
  ]);
  console.log('✅ Job queues shutdown complete');
}

export function getQueueStats() {
  return {
    email: emailQueue.getStats(),
    scoring: scoringQueue.getStats(),
  };
}

export { emailQueue, scoringQueue };
export { 
  sendInvitationEmailAsync,
  sendPasswordResetEmailAsync,
  sendWelcomeEmailAsync,
  sendPaymentReceiptEmailAsync,
  sendContactFormEmailAsync,
  submitPromptScoringAsync,
  submitPromptArchitectureEvaluationAsync
};
