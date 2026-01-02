/**
 * HumanMetrix JavaScript SDK
 * Version 1.0.0
 * 
 * Usage (Browser):
 * <script src="https://your-domain.replit.app/embed/sdk.js"></script>
 * <script>
 *   var client = new HumanMetrixClient('hm_live_your_api_key');
 *   client.createSession({ assessmentType: 'fit', candidateId: '123' })
 *     .then(function(session) { console.log(session); });
 * </script>
 * 
 * Usage (Node.js):
 * const HumanMetrixClient = require('humanmetrix-sdk');
 * const client = new HumanMetrixClient('hm_live_your_api_key');
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.HumanMetrixClient = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  /**
   * HumanMetrix API Client
   * @param {string} apiKey - Your API key (hm_live_* or hm_test_*)
   * @param {object} options - Configuration options
   */
  function HumanMetrixClient(apiKey, options) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    options = options || {};
    
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || this._detectBaseUrl();
    this.timeout = options.timeout || 30000;
  }

  HumanMetrixClient.prototype._detectBaseUrl = function() {
    if (typeof window !== 'undefined') {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.indexOf('sdk.js') > -1) {
          return scripts[i].src.replace(/\/embed\/sdk\.js.*$/, '');
        }
      }
      return window.location.origin;
    }
    return 'https://www.humanmetrix.co.uk';
  };

  HumanMetrixClient.prototype._request = function(method, path, data) {
    var self = this;
    var url = this.baseUrl + path;
    
    var options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    return fetch(url, options)
      .then(function(response) {
        return response.json().then(function(json) {
          if (!response.ok) {
            var error = new Error(json.error || 'Request failed');
            error.status = response.status;
            error.response = json;
            throw error;
          }
          return json;
        });
      });
  };

  /**
   * Get partner account information
   * @returns {Promise<Object>} Partner info
   */
  HumanMetrixClient.prototype.getAccountInfo = function() {
    return this._request('GET', '/api/partner/me');
  };

  /**
   * Get available assessment types
   * @returns {Promise<Object>} Assessment types
   */
  HumanMetrixClient.prototype.getAssessmentTypes = function() {
    return this._request('GET', '/api/partner/assessment-types');
  };

  /**
   * Create a new assessment session
   * @param {Object} params - Session parameters
   * @param {string} params.assessmentType - One of: fit, ai_readiness, prompt_architecture, aiq
   * @param {string} [params.candidateId] - External candidate identifier
   * @param {string} [params.candidateEmail] - Candidate email
   * @param {Object} [params.metadata] - Custom metadata
   * @param {string} [params.webhookUrl] - URL for completion webhook
   * @param {number} [params.expiresInMinutes] - Session expiry (30-10080, default 1440)
   * @returns {Promise<Object>} Session data
   */
  HumanMetrixClient.prototype.createSession = function(params) {
    if (!params || !params.assessmentType) {
      return Promise.reject(new Error('assessmentType is required'));
    }
    
    return this._request('POST', '/api/partner/sessions', {
      assessmentType: params.assessmentType,
      externalUserId: params.candidateId,
      externalEmail: params.candidateEmail,
      metadata: params.metadata,
      webhookUrl: params.webhookUrl,
      expiresInMinutes: params.expiresInMinutes
    });
  };

  /**
   * Get session status
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session data
   */
  HumanMetrixClient.prototype.getSession = function(sessionId) {
    if (!sessionId) {
      return Promise.reject(new Error('sessionId is required'));
    }
    return this._request('GET', '/api/partner/sessions/' + sessionId);
  };

  /**
   * Get session results (only for completed sessions)
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Results data
   */
  HumanMetrixClient.prototype.getResults = function(sessionId) {
    if (!sessionId) {
      return Promise.reject(new Error('sessionId is required'));
    }
    return this._request('GET', '/api/partner/sessions/' + sessionId + '/results');
  };

  /**
   * List all sessions
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Max results (1-200, default 50)
   * @returns {Promise<Object>} Sessions list
   */
  HumanMetrixClient.prototype.listSessions = function(options) {
    options = options || {};
    var query = options.limit ? '?limit=' + options.limit : '';
    return this._request('GET', '/api/partner/sessions' + query);
  };

  /**
   * Get usage statistics for current billing period
   * @returns {Promise<Object>} Usage data
   */
  HumanMetrixClient.prototype.getUsage = function() {
    return this._request('GET', '/api/partner/usage');
  };

  /**
   * Launch assessment in a modal
   * @param {string} sessionId - Session ID
   * @param {Object} [options] - Display options
   */
  HumanMetrixClient.prototype.launchWidget = function(sessionId, options) {
    if (typeof window === 'undefined') {
      throw new Error('launchWidget is only available in browser environments');
    }
    
    options = options || {};
    var url = this.baseUrl + '/embed/assessment?session=' + sessionId;
    
    // Create modal
    var modal = document.createElement('div');
    modal.id = 'humanmetrix-sdk-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;align-items:center;justify-content:center;';
    
    var content = document.createElement('div');
    content.style.cssText = 'position:relative;width:90%;max-width:800px;height:90%;max-height:700px;background:#1e293b;border-radius:12px;overflow:hidden;';
    
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:10px;right:15px;background:none;border:none;color:#94a3b8;font-size:28px;cursor:pointer;z-index:10;';
    closeBtn.onclick = function() { modal.remove(); if (options.onClose) options.onClose(); };
    
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    
    content.appendChild(closeBtn);
    content.appendChild(iframe);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Listen for completion with origin validation
    var self = this;
    var expectedOrigin;
    try {
      expectedOrigin = new URL(this.baseUrl).origin;
    } catch (e) {
      expectedOrigin = window.location.origin;
    }
    
    var messageHandler = function(event) {
      // Validate message origin
      if (event.origin !== expectedOrigin && event.origin !== window.location.origin) {
        console.warn('[HumanMetrix SDK] Ignoring message from untrusted origin:', event.origin);
        return;
      }
      
      if (event.data && event.data.type === 'humanmetrix:completed') {
        if (options.onComplete) {
          options.onComplete(event.data);
        }
        window.removeEventListener('message', messageHandler);
        setTimeout(function() { modal.remove(); }, 2000);
      }
    };
    window.addEventListener('message', messageHandler);
    
    return {
      close: function() { modal.remove(); window.removeEventListener('message', messageHandler); }
    };
  };

  /**
   * Get widget URL for embedding
   * @param {string} sessionId - Session ID
   * @returns {string} Widget URL
   */
  HumanMetrixClient.prototype.getWidgetUrl = function(sessionId) {
    return this.baseUrl + '/embed/assessment?session=' + sessionId;
  };

  return HumanMetrixClient;
}));
