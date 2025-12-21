/**
 * HumanMetrix JavaScript SDK
 * Version: 1.0.0
 * 
 * Installation:
 * npm install @humanmetrix/sdk
 * 
 * Or via CDN:
 * <script src="https://your-domain.com/embed/sdk.js"></script>
 * 
 * Usage:
 * const hm = new HumanMetrix.Client({ apiKey: 'hm_live_xxx' });
 * const session = await hm.createSession({ assessmentType: 'fit' });
 * hm.launchWidget(session.sessionId, '#container');
 */

(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.HumanMetrix = factory());
})(this, (function() {
  'use strict';

  const SDK_VERSION = '1.0.0';
  const DEFAULT_BASE_URL = 'https://humanmetrix.replit.app';

  class HumanMetrixError extends Error {
    constructor(message, code, details) {
      super(message);
      this.name = 'HumanMetrixError';
      this.code = code;
      this.details = details;
    }
  }

  class HumanMetrixClient {
    constructor(config = {}) {
      if (!config.apiKey) {
        throw new HumanMetrixError('API key is required', 'MISSING_API_KEY');
      }
      
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
      this.timeout = config.timeout || 30000;
      this.debug = config.debug || false;
      
      this._log('Client initialized', { baseUrl: this.baseUrl });
    }

    _log(message, data) {
      if (this.debug) {
        console.log(`[HumanMetrix] ${message}`, data || '');
      }
    }

    async _request(method, endpoint, body) {
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-SDK-Version': SDK_VERSION,
        },
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      this._log(`${method} ${endpoint}`, body);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      options.signal = controller.signal;
      
      try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new HumanMetrixError(
            data.message || data.error || 'Request failed',
            data.code || `HTTP_${response.status}`,
            data
          );
        }
        
        this._log('Response', data);
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new HumanMetrixError('Request timeout', 'TIMEOUT');
        }
        
        if (error instanceof HumanMetrixError) {
          throw error;
        }
        
        throw new HumanMetrixError(
          error.message || 'Network error',
          'NETWORK_ERROR',
          { originalError: error }
        );
      }
    }

    async getPartnerInfo() {
      return this._request('GET', '/api/partner/me');
    }

    async createSession(options = {}) {
      if (!options.assessmentType) {
        throw new HumanMetrixError('assessmentType is required', 'MISSING_PARAM');
      }
      
      const validTypes = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];
      if (!validTypes.includes(options.assessmentType)) {
        throw new HumanMetrixError(
          `Invalid assessmentType. Must be one of: ${validTypes.join(', ')}`,
          'INVALID_PARAM'
        );
      }
      
      return this._request('POST', '/api/partner/sessions', {
        assessmentType: options.assessmentType,
        externalUserId: options.userId || options.externalUserId,
        externalEmail: options.email || options.externalEmail,
        metadata: options.metadata,
        webhookUrl: options.webhookUrl,
        expiresInMinutes: options.expiresInMinutes || 1440,
      });
    }

    async getSession(sessionId) {
      if (!sessionId) {
        throw new HumanMetrixError('sessionId is required', 'MISSING_PARAM');
      }
      return this._request('GET', `/api/partner/sessions/${sessionId}`);
    }

    async getResults(sessionId) {
      if (!sessionId) {
        throw new HumanMetrixError('sessionId is required', 'MISSING_PARAM');
      }
      return this._request('GET', `/api/partner/sessions/${sessionId}/results`);
    }

    async listSessions(options = {}) {
      const limit = options.limit || 50;
      return this._request('GET', `/api/partner/sessions?limit=${limit}`);
    }

    async getUsage() {
      return this._request('GET', '/api/partner/usage');
    }

    async getAssessmentTypes() {
      return this._request('GET', '/api/partner/assessment-types');
    }

    launchWidget(sessionId, container, options = {}) {
      if (!sessionId) {
        throw new HumanMetrixError('sessionId is required', 'MISSING_PARAM');
      }
      
      const containerEl = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
      
      if (!containerEl) {
        throw new HumanMetrixError('Container element not found', 'CONTAINER_NOT_FOUND');
      }
      
      return new Promise((resolve, reject) => {
        if (!window.HumanMetrix || !window.HumanMetrix.Widget) {
          const script = document.createElement('script');
          script.src = `${this.baseUrl}/embed/widget.js`;
          script.onload = () => {
            this._initWidget(sessionId, containerEl, options, resolve, reject);
          };
          script.onerror = () => {
            reject(new HumanMetrixError('Failed to load widget', 'WIDGET_LOAD_ERROR'));
          };
          document.head.appendChild(script);
        } else {
          this._initWidget(sessionId, containerEl, options, resolve, reject);
        }
      });
    }

    _initWidget(sessionId, container, options, resolve, reject) {
      try {
        window.HM_BASE_URL = this.baseUrl;
        
        const widget = window.HumanMetrix.init({
          sessionId,
          container,
          theme: options.theme || 'light',
          onComplete: (result) => {
            if (options.onComplete) options.onComplete(result);
            resolve(result);
          },
          onError: (error) => {
            if (options.onError) options.onError(error);
            reject(error);
          },
        });
        
        if (options.onInit) {
          options.onInit(widget);
        }
      } catch (error) {
        reject(new HumanMetrixError(error.message, 'WIDGET_INIT_ERROR'));
      }
    }

    getWidgetUrl(sessionId, options = {}) {
      const params = new URLSearchParams();
      params.set('session', sessionId);
      if (options.theme) params.set('theme', options.theme);
      return `${this.baseUrl}/embed/assessment?${params.toString()}`;
    }

    generateEmbedCode(sessionId, options = {}) {
      const theme = options.theme || 'light';
      return `<!-- HumanMetrix Assessment Widget -->
<script src="${this.baseUrl}/embed/widget.js" 
        data-session-id="${sessionId}"
        data-theme="${theme}"></script>
<div id="humanmetrix-widget"></div>`;
    }
  }

  const ASSESSMENT_TYPES = {
    FIT: 'fit',
    AI_READINESS: 'ai_readiness',
    PROMPT_ARCHITECTURE: 'prompt_architecture',
    AIQ: 'aiq',
  };

  return {
    version: SDK_VERSION,
    Client: HumanMetrixClient,
    Error: HumanMetrixError,
    ASSESSMENT_TYPES,
  };
}));
