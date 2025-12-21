/**
 * HumanMetrix Embeddable Assessment Widget
 * Version: 1.0.0
 * 
 * Usage:
 * <script src="https://your-domain.com/embed/widget.js" 
 *         data-session-id="SESSION_ID"></script>
 * <div id="humanmetrix-widget"></div>
 */

(function() {
  'use strict';

  const HM_VERSION = '1.0.0';
  const HM_BASE_URL = window.HM_BASE_URL || (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src.includes('widget.js')) {
        const url = new URL(scripts[i].src);
        return url.origin;
      }
    }
    return window.location.origin;
  })();

  const WIDGET_STYLES = `
    .hm-widget-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    }
    .hm-widget-container.hm-dark {
      background: #1e293b;
      color: #f1f5f9;
    }
    .hm-widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .hm-dark .hm-widget-header {
      border-bottom-color: #334155;
    }
    .hm-widget-logo {
      font-size: 20px;
      font-weight: 700;
      color: #0ea5e9;
    }
    .hm-widget-progress {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #64748b;
    }
    .hm-progress-bar {
      width: 120px;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .hm-dark .hm-progress-bar {
      background: #334155;
    }
    .hm-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0ea5e9, #06b6d4);
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .hm-widget-content {
      min-height: 300px;
    }
    .hm-question {
      margin-bottom: 24px;
    }
    .hm-question-text {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .hm-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .hm-option {
      display: flex;
      align-items: center;
      padding: 16px;
      background: #f8fafc;
      border: 2px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .hm-dark .hm-option {
      background: #334155;
    }
    .hm-option:hover {
      border-color: #0ea5e9;
      background: #f0f9ff;
    }
    .hm-dark .hm-option:hover {
      background: #475569;
    }
    .hm-option.hm-selected {
      border-color: #0ea5e9;
      background: #e0f2fe;
    }
    .hm-dark .hm-option.hm-selected {
      background: #0c4a6e;
    }
    .hm-option-radio {
      width: 20px;
      height: 20px;
      border: 2px solid #cbd5e1;
      border-radius: 50%;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hm-option.hm-selected .hm-option-radio {
      border-color: #0ea5e9;
    }
    .hm-option.hm-selected .hm-option-radio::after {
      content: '';
      width: 10px;
      height: 10px;
      background: #0ea5e9;
      border-radius: 50%;
    }
    .hm-widget-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .hm-dark .hm-widget-footer {
      border-top-color: #334155;
    }
    .hm-btn {
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .hm-btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .hm-btn-secondary:hover {
      background: #e2e8f0;
    }
    .hm-btn-primary {
      background: linear-gradient(135deg, #0ea5e9, #06b6d4);
      color: white;
    }
    .hm-btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .hm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .hm-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      color: #64748b;
    }
    .hm-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #0ea5e9;
      border-radius: 50%;
      animation: hm-spin 1s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes hm-spin {
      to { transform: rotate(360deg); }
    }
    .hm-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .hm-complete {
      text-align: center;
      padding: 48px 24px;
    }
    .hm-complete-icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .hm-complete-icon svg {
      width: 32px;
      height: 32px;
      stroke: white;
    }
    .hm-complete h2 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .hm-complete p {
      color: #64748b;
    }
    .hm-powered-by {
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      margin-top: 16px;
    }
    .hm-powered-by a {
      color: #0ea5e9;
      text-decoration: none;
    }
  `;

  class HumanMetrixWidget {
    constructor(config) {
      this.sessionId = config.sessionId;
      this.container = config.container || document.getElementById('humanmetrix-widget');
      this.theme = config.theme || 'light';
      this.onComplete = config.onComplete || function() {};
      this.onError = config.onError || function() {};
      
      this.session = null;
      this.questions = [];
      this.currentIndex = 0;
      this.answers = {};
      
      this.init();
    }

    async init() {
      this.injectStyles();
      this.render();
      await this.loadSession();
    }

    injectStyles() {
      if (document.getElementById('hm-widget-styles')) return;
      const style = document.createElement('style');
      style.id = 'hm-widget-styles';
      style.textContent = WIDGET_STYLES;
      document.head.appendChild(style);
    }

    render() {
      if (!this.container) {
        console.error('HumanMetrix: Widget container not found');
        return;
      }
      this.container.innerHTML = this.getLoadingHTML();
    }

    getLoadingHTML() {
      return `
        <div class="hm-widget-container ${this.theme === 'dark' ? 'hm-dark' : ''}">
          <div class="hm-loading">
            <div class="hm-spinner"></div>
            <p>Loading assessment...</p>
          </div>
        </div>
      `;
    }

    async loadSession() {
      try {
        const response = await fetch(`${HM_BASE_URL}/api/embed/session/${this.sessionId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to load session');
        }
        
        this.session = await response.json();
        this.questions = this.getQuestionsForType(this.session.assessmentType);
        this.renderQuestion();
      } catch (error) {
        this.renderError(error.message);
        this.onError(error);
      }
    }

    getQuestionsForType(type) {
      const sampleQuestions = {
        fit: [
          { id: 'q1', text: 'I prefer working independently over collaborating with others.', options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
          { id: 'q2', text: 'I adapt quickly to changes in my work environment.', options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
          { id: 'q3', text: 'I feel comfortable taking initiative on new projects.', options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        ],
        ai_readiness: [
          { id: 'q1', text: 'I regularly use AI tools in my daily work.', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
          { id: 'q2', text: 'I understand the basic principles of how AI models work.', options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
          { id: 'q3', text: 'I am comfortable learning new technology tools.', options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
        ],
        prompt_architecture: [
          { id: 'q1', text: 'Write a prompt to summarise a long document for a busy executive.', type: 'textarea' },
          { id: 'q2', text: 'Create a prompt to generate a professional email response.', type: 'textarea' },
        ],
        aiq: [
          { id: 'q1', text: 'An AI system recommends declining a job applicant. What should you do?', options: ['Accept the recommendation without review', 'Review the AI reasoning before deciding', 'Ignore AI and decide based on intuition', 'Request human review of the decision'] },
          { id: 'q2', text: 'You discover an AI model has bias against certain groups. What is your first action?', options: ['Continue using it as-is', 'Report to relevant stakeholders', 'Try to fix it yourself', 'Stop using it immediately'] },
        ]
      };
      return sampleQuestions[type] || sampleQuestions.fit;
    }

    renderQuestion() {
      const question = this.questions[this.currentIndex];
      const progress = ((this.currentIndex + 1) / this.questions.length) * 100;
      
      this.container.innerHTML = `
        <div class="hm-widget-container ${this.theme === 'dark' ? 'hm-dark' : ''}">
          <div class="hm-widget-header">
            <div class="hm-widget-logo">HumanMetrix</div>
            <div class="hm-widget-progress">
              <span>${this.currentIndex + 1}/${this.questions.length}</span>
              <div class="hm-progress-bar">
                <div class="hm-progress-fill" style="width: ${progress}%"></div>
              </div>
            </div>
          </div>
          <div class="hm-widget-content">
            <div class="hm-question">
              <div class="hm-question-text">${question.text}</div>
              ${this.renderOptions(question)}
            </div>
          </div>
          <div class="hm-widget-footer">
            <button class="hm-btn hm-btn-secondary" ${this.currentIndex === 0 ? 'disabled' : ''} onclick="window.hmWidget.prev()">Previous</button>
            <button class="hm-btn hm-btn-primary" id="hm-next-btn" onclick="window.hmWidget.next()">
              ${this.currentIndex === this.questions.length - 1 ? 'Submit' : 'Next'}
            </button>
          </div>
          <div class="hm-powered-by">Powered by <a href="https://humanmetrix.ai" target="_blank">HumanMetrix</a></div>
        </div>
      `;
      
      window.hmWidget = this;
    }

    renderOptions(question) {
      if (question.type === 'textarea') {
        const value = this.answers[question.id] || '';
        return `<textarea class="hm-textarea" style="width:100%;min-height:150px;padding:12px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;resize:vertical;" 
          placeholder="Enter your response..." 
          onchange="window.hmWidget.selectOption('${question.id}', this.value)">${value}</textarea>`;
      }
      
      return `
        <div class="hm-options">
          ${question.options.map((opt, i) => `
            <div class="hm-option ${this.answers[question.id] === i ? 'hm-selected' : ''}" 
                 onclick="window.hmWidget.selectOption('${question.id}', ${i})">
              <div class="hm-option-radio"></div>
              <span>${opt}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    selectOption(questionId, value) {
      this.answers[questionId] = value;
      this.renderQuestion();
    }

    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.renderQuestion();
      }
    }

    async next() {
      const question = this.questions[this.currentIndex];
      if (this.answers[question.id] === undefined) {
        alert('Please select an answer before continuing.');
        return;
      }
      
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++;
        this.renderQuestion();
      } else {
        await this.submit();
      }
    }

    async submit() {
      this.container.innerHTML = this.getLoadingHTML();
      
      try {
        const response = await fetch(`${HM_BASE_URL}/api/embed/session/${this.sessionId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: this.answers })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit assessment');
        }
        
        const result = await response.json();
        this.renderComplete(result);
        this.onComplete(result);
      } catch (error) {
        this.renderError(error.message);
        this.onError(error);
      }
    }

    renderComplete(result) {
      this.container.innerHTML = `
        <div class="hm-widget-container ${this.theme === 'dark' ? 'hm-dark' : ''}">
          <div class="hm-complete">
            <div class="hm-complete-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2>Assessment Complete</h2>
            <p>Thank you for completing the assessment. Your results have been submitted.</p>
            ${result.totalScore ? `<p style="margin-top:16px;font-size:24px;font-weight:700;color:#0ea5e9;">Score: ${result.totalScore}%</p>` : ''}
          </div>
          <div class="hm-powered-by">Powered by <a href="https://humanmetrix.ai" target="_blank">HumanMetrix</a></div>
        </div>
      `;
    }

    renderError(message) {
      this.container.innerHTML = `
        <div class="hm-widget-container ${this.theme === 'dark' ? 'hm-dark' : ''}">
          <div class="hm-error">
            <strong>Error:</strong> ${message}
          </div>
          <div class="hm-powered-by">Powered by <a href="https://humanmetrix.ai" target="_blank">HumanMetrix</a></div>
        </div>
      `;
    }
  }

  window.HumanMetrix = {
    version: HM_VERSION,
    Widget: HumanMetrixWidget,
    init: function(config) {
      return new HumanMetrixWidget(config);
    }
  };

  document.addEventListener('DOMContentLoaded', function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (script.src.includes('widget.js') && script.dataset.sessionId) {
        window.HumanMetrix.init({
          sessionId: script.dataset.sessionId,
          theme: script.dataset.theme || 'light'
        });
        break;
      }
    }
  });
})();
