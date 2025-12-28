/**
 * HumanMetrix Embeddable Widget
 * Version 1.0.0
 * 
 * Usage:
 * <script src="https://your-domain.replit.app/embed/widget.js"></script>
 * <script>
 *   HumanMetrixWidget.init({
 *     apiKey: 'hm_live_your_api_key',
 *     assessmentType: 'fit',
 *     candidateId: 'external-123',
 *     container: '#assessment-container', // optional, defaults to modal
 *     onComplete: function(results) { console.log(results); },
 *     onError: function(error) { console.error(error); }
 *   });
 * </script>
 */

(function(window) {
  'use strict';

  var HumanMetrixWidget = {
    version: '1.0.0',
    baseUrl: '',
    config: null,
    iframe: null,
    modal: null,

    init: function(options) {
      var self = this;
      
      if (!options.apiKey) {
        console.error('[HumanMetrix] apiKey is required');
        return;
      }
      
      if (!options.assessmentType) {
        console.error('[HumanMetrix] assessmentType is required');
        return;
      }

      this.config = {
        apiKey: options.apiKey,
        assessmentType: options.assessmentType,
        candidateId: options.candidateId || null,
        candidateEmail: options.candidateEmail || null,
        metadata: options.metadata || {},
        container: options.container || null,
        theme: options.theme || 'dark',
        onComplete: options.onComplete || function() {},
        onError: options.onError || function() {},
        onStart: options.onStart || function() {},
        onClose: options.onClose || function() {}
      };

      // Determine base URL from script src
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.indexOf('widget.js') > -1) {
          this.baseUrl = scripts[i].src.replace(/\/embed\/widget\.js.*$/, '');
          break;
        }
      }

      if (!this.baseUrl) {
        this.baseUrl = window.location.origin;
      }

      // Listen for postMessage events from iframe
      window.addEventListener('message', function(event) {
        self.handleMessage(event);
      });

      // Create session and launch
      this.createSession();
    },

    createSession: function() {
      var self = this;
      
      fetch(this.baseUrl + '/api/partner/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify({
          assessmentType: this.config.assessmentType,
          externalUserId: this.config.candidateId,
          externalEmail: this.config.candidateEmail,
          metadata: this.config.metadata
        })
      })
      .then(function(response) {
        if (!response.ok) {
          return response.json().then(function(err) {
            throw new Error(err.error || 'Failed to create session');
          });
        }
        return response.json();
      })
      .then(function(data) {
        self.launchAssessment(data.sessionId);
      })
      .catch(function(error) {
        console.error('[HumanMetrix] Error:', error);
        self.config.onError(error);
      });
    },

    launchAssessment: function(sessionId) {
      var self = this;
      var url = this.baseUrl + '/embed/assessment?session=' + sessionId + '&theme=' + this.config.theme;

      if (this.config.container) {
        // Embed in specified container
        var container = document.querySelector(this.config.container);
        if (!container) {
          console.error('[HumanMetrix] Container not found:', this.config.container);
          return;
        }
        
        this.iframe = this.createIframe(url);
        container.appendChild(this.iframe);
      } else {
        // Open in modal
        this.openModal(url);
      }

      this.config.onStart({ sessionId: sessionId });
    },

    createIframe: function(url) {
      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = 'width:100%;height:100%;border:none;min-height:600px;';
      iframe.setAttribute('allow', 'clipboard-write');
      iframe.setAttribute('data-testid', 'humanmetrix-widget-iframe');
      return iframe;
    },

    openModal: function(url) {
      var self = this;
      var isDark = this.config.theme === 'dark';
      
      // Create modal overlay
      this.modal = document.createElement('div');
      this.modal.id = 'humanmetrix-modal';
      this.modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;align-items:center;justify-content:center;';
      
      // Create modal content with theme-aware styling
      var modalContent = document.createElement('div');
      var modalBg = isDark ? '#1e293b' : '#ffffff';
      modalContent.style.cssText = 'position:relative;width:90%;max-width:800px;height:90%;max-height:700px;background:' + modalBg + ';border-radius:12px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);';
      
      // Create close button with theme-aware color
      var closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      var closeBtnColor = isDark ? '#94a3b8' : '#64748b';
      closeBtn.style.cssText = 'position:absolute;top:10px;right:15px;background:none;border:none;color:' + closeBtnColor + ';font-size:28px;cursor:pointer;z-index:10;line-height:1;';
      closeBtn.onclick = function() { self.closeModal(); };
      closeBtn.setAttribute('data-testid', 'button-close-modal');
      
      // Create iframe
      this.iframe = this.createIframe(url);
      this.iframe.style.cssText = 'width:100%;height:100%;border:none;';
      
      modalContent.appendChild(closeBtn);
      modalContent.appendChild(this.iframe);
      this.modal.appendChild(modalContent);
      document.body.appendChild(this.modal);
      
      // Close on escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') self.closeModal();
      });
      
      // Close on backdrop click
      this.modal.addEventListener('click', function(e) {
        if (e.target === self.modal) self.closeModal();
      });
    },

    closeModal: function() {
      if (this.modal) {
        this.modal.remove();
        this.modal = null;
      }
      this.config.onClose();
    },

    handleMessage: function(event) {
      if (!event.data || !event.data.type) return;
      
      // Validate origin - only accept messages from our embed iframe
      var iframeOrigin = this.baseUrl;
      try {
        var parsedUrl = new URL(iframeOrigin);
        iframeOrigin = parsedUrl.origin;
      } catch (e) {
        iframeOrigin = window.location.origin;
      }
      
      // Accept messages from same origin or from our iframe's origin
      if (event.origin !== iframeOrigin && event.origin !== window.location.origin) {
        console.warn('[HumanMetrix] Ignoring message from untrusted origin:', event.origin);
        return;
      }
      
      if (event.data.type === 'humanmetrix:completed') {
        this.config.onComplete({
          sessionId: event.data.sessionId,
          scores: event.data.scores,
          totalScore: event.data.totalScore,
          percentile: event.data.percentile
        });
        
        // Auto-close modal after 2 seconds
        if (this.modal) {
          var self = this;
          setTimeout(function() { self.closeModal(); }, 2000);
        }
      }
      
      if (event.data.type === 'humanmetrix:error') {
        this.config.onError(event.data.error);
      }
    },

    destroy: function() {
      if (this.iframe) {
        this.iframe.remove();
        this.iframe = null;
      }
      this.closeModal();
    }
  };

  // Expose to global scope
  window.HumanMetrixWidget = HumanMetrixWidget;

})(window);
