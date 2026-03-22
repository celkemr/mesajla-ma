(function () {
  'use strict';

  var MesajPanel = {
    config: null,
    sessionId: null,
    isOpen: false,
    isTyping: false,

    init: function (config) {
      if (!config || !config.apiKey) {
        console.error('MesajPanel: apiKey gerekli');
        return;
      }
      this.config = Object.assign({
        apiKey: '',
        panelUrl: '',
        position: 'bottom-right',
        botName: 'Asistan',
        welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim?',
        buttonColor: '#2563eb',
        placeholder: 'Mesajınızı yazın...',
        typingIndicator: true,
        onlineIndicator: true,
      }, config);

      this.sessionId = this._getSessionId();
      this._detectPanelUrl();
      this._injectStyles();
      this._createWidget();
    },

    _detectPanelUrl: function () {
      if (this.config.panelUrl) return;
      var scripts = document.querySelectorAll('script[src*="widget.js"]');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src;
        var match = src.match(/^(https?:\/\/[^\/]+)/);
        if (match) { this.config.panelUrl = match[1]; return; }
      }
      this.config.panelUrl = window.location.origin;
    },

    _getSessionId: function () {
      var key = 'mp_session_' + btoa(window.location.hostname).replace(/=/g, '');
      var id = localStorage.getItem(key);
      if (!id) {
        id = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, id);
      }
      return id;
    },

    _injectStyles: function () {
      if (document.getElementById('mp-styles')) return;
      var style = document.createElement('style');
      style.id = 'mp-styles';
      style.textContent = [
        '#mp-btn{position:fixed;bottom:24px;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:99998;transition:transform .2s,box-shadow .2s;}',
        '#mp-btn:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(0,0,0,.3);}',
        '#mp-btn svg{width:26px;height:26px;fill:white;}',
        '#mp-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:white;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;font-family:sans-serif;}',
        '#mp-panel{position:fixed;bottom:92px;width:360px;height:520px;background:white;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);z-index:99999;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
        '#mp-panel.mp-open{display:flex;}',
        '#mp-header{padding:16px 18px;color:white;display:flex;align-items:center;gap:10px;flex-shrink:0;}',
        '#mp-header .mp-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;}',
        '#mp-header .mp-info .mp-name{font-weight:600;font-size:14px;}',
        '#mp-header .mp-info .mp-status{font-size:11px;opacity:.85;display:flex;align-items:center;gap:4px;}',
        '#mp-header .mp-info .mp-status::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#4ade80;}',
        '#mp-close-btn{margin-left:auto;background:rgba(255,255,255,.15);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;}',
        '#mp-close-btn:hover{background:rgba(255,255,255,.3);}',
        '#mp-messages{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:8px;}',
        '#mp-messages::-webkit-scrollbar{width:4px;}#mp-messages::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:2px;}',
        '.mp-msg{max-width:82%;padding:9px 13px;border-radius:16px;font-size:13.5px;line-height:1.5;word-break:break-word;}',
        '.mp-msg.mp-bot{background:#f1f5f9;color:#1e293b;border-bottom-left-radius:4px;align-self:flex-start;}',
        '.mp-msg.mp-user{color:white;border-bottom-right-radius:4px;align-self:flex-end;}',
        '.mp-msg .mp-time{font-size:10px;opacity:.55;margin-top:3px;text-align:right;}',
        '.mp-typing{display:flex;gap:4px;padding:10px 14px;background:#f1f5f9;border-radius:16px;border-bottom-left-radius:4px;align-self:flex-start;}',
        '.mp-typing span{width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:mp-bounce 1.2s infinite;}',
        '.mp-typing span:nth-child(2){animation-delay:.2s;}.mp-typing span:nth-child(3){animation-delay:.4s;}',
        '@keyframes mp-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}',
        '#mp-input-area{padding:12px 14px;border-top:1px solid #f1f5f9;display:flex;gap:8px;flex-shrink:0;}',
        '#mp-input{flex:1;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 13px;font-size:13.5px;outline:none;resize:none;font-family:inherit;line-height:1.4;max-height:100px;overflow-y:auto;}',
        '#mp-input:focus{border-color:#93c5fd;}',
        '#mp-send{width:38px;height:38px;border-radius:10px;border:none;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s;align-self:flex-end;}',
        '#mp-send:disabled{opacity:.4;cursor:default;}',
        '#mp-send svg{width:18px;height:18px;fill:white;}',
      ].join('');
      document.head.appendChild(style);
    },

    _createWidget: function () {
      var self = this;
      var posStyle = this.config.position === 'bottom-left' ? 'left:24px' : 'right:24px';
      var color = this.config.buttonColor;

      // Panel
      var panel = document.createElement('div');
      panel.id = 'mp-panel';
      panel.style.cssText = posStyle;
      panel.innerHTML = [
        '<div id="mp-header" style="background:' + color + '">',
        '  <div class="mp-avatar">🤖</div>',
        '  <div class="mp-info">',
        '    <div class="mp-name">' + this._esc(this.config.botName) + '</div>',
        (this.config.onlineIndicator ? '    <div class="mp-status">Çevrimiçi</div>' : ''),
        '  </div>',
        '  <button id="mp-close-btn">✕</button>',
        '</div>',
        '<div id="mp-messages"></div>',
        '<div id="mp-input-area">',
        '  <textarea id="mp-input" rows="1" placeholder="' + this._esc(this.config.placeholder) + '"></textarea>',
        '  <button id="mp-send" style="background:' + color + '">',
        '    <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>',
        '  </button>',
        '</div>',
      ].join('');
      document.body.appendChild(panel);

      // Button
      var btn = document.createElement('button');
      btn.id = 'mp-btn';
      btn.style.cssText = posStyle + ';background:' + color;
      btn.innerHTML = '<span id="mp-badge"></span><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6V10h12v2zm0-3H6V7h12v2z"/></svg>';
      document.body.appendChild(btn);

      // Events
      btn.onclick = function () { self.toggle(); };
      document.getElementById('mp-close-btn').onclick = function () { self.toggle(); };
      document.getElementById('mp-send').onclick = function () { self.sendMessage(); };

      var input = document.getElementById('mp-input');
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          self.sendMessage();
        }
      });
      input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
      });

      // Geçmiş yükle (yoksa karşılama mesajı göster)
      this._loadHistory();
    },

    _applyServerConfig: function (serverConfig) {
      if (!serverConfig) return;
      var color = serverConfig.buttonColor || this.config.buttonColor;
      if (serverConfig.buttonColor) this.config.buttonColor = serverConfig.buttonColor;
      if (serverConfig.botName) this.config.botName = serverConfig.botName;
      if (serverConfig.welcomeMessage) this.config.welcomeMessage = serverConfig.welcomeMessage;
      if (typeof serverConfig.typingIndicator !== 'undefined') this.config.typingIndicator = serverConfig.typingIndicator;
      if (typeof serverConfig.onlineIndicator !== 'undefined') this.config.onlineIndicator = serverConfig.onlineIndicator;

      // Rengi güncelle
      var btn = document.getElementById('mp-btn');
      var header = document.getElementById('mp-header');
      var send = document.getElementById('mp-send');
      if (btn) btn.style.background = color;
      if (header) header.style.background = color;
      if (send) send.style.background = color;

      // Bot adını güncelle
      var nameEl = document.querySelector('#mp-header .mp-name');
      if (nameEl && serverConfig.botName) nameEl.textContent = serverConfig.botName;

      // Online indicator
      var statusEl = document.querySelector('#mp-header .mp-status');
      if (statusEl) statusEl.style.display = this.config.onlineIndicator ? '' : 'none';
    },

    _loadHistory: function () {
      var self = this;
      fetch(self.config.panelUrl + '/api/chat?sessionId=' + encodeURIComponent(self.sessionId), {
        headers: { 'x-api-key': self.config.apiKey },
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          self._applyServerConfig(data.config);
          var msgs = data.messages || [];
          if (msgs.length === 0) {
            self._addMessage('bot', self.config.welcomeMessage);
          } else {
            msgs.forEach(function (m) {
              self._addMessage(m.role === 'assistant' ? 'bot' : 'user', m.content, m.created_at);
            });
          }
        })
        .catch(function () {
          self._addMessage('bot', self.config.welcomeMessage);
        });
    },

    toggle: function () {
      this.isOpen = !this.isOpen;
      var panel = document.getElementById('mp-panel');
      panel.classList.toggle('mp-open', this.isOpen);
      if (this.isOpen) {
        var input = document.getElementById('mp-input');
        if (input) setTimeout(function () { input.focus(); }, 100);
        var badge = document.getElementById('mp-badge');
        if (badge) badge.style.display = 'none';
      }
    },

    sendMessage: function () {
      var input = document.getElementById('mp-input');
      var text = input.value.trim();
      if (!text || this.isTyping) return;
      input.value = '';
      input.style.height = 'auto';
      this._addMessage('user', text);
      this._sendToApi(text);
    },

    _sendToApi: function (message) {
      var self = this;
      self.isTyping = true;
      document.getElementById('mp-send').disabled = true;
      if (self.config.typingIndicator) self._showTyping();

      fetch(self.config.panelUrl + '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': self.config.apiKey,
        },
        body: JSON.stringify({
          message: message,
          sessionId: self.sessionId,
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (self.config.typingIndicator) self._hideTyping();
          self.isTyping = false;
          document.getElementById('mp-send').disabled = false;
          self._addMessage('bot', data.reply || 'Üzgünüm, bir hata oluştu.');
        })
        .catch(function () {
          if (self.config.typingIndicator) self._hideTyping();
          self.isTyping = false;
          document.getElementById('mp-send').disabled = false;
          self._addMessage('bot', 'Bağlantı hatası. Lütfen tekrar deneyin.');
        });
    },

    _addMessage: function (role, content, createdAt) {
      var messagesEl = document.getElementById('mp-messages');
      var div = document.createElement('div');
      div.className = 'mp-msg mp-' + role;
      if (role === 'user') div.style.background = this.config.buttonColor;
      var d = createdAt ? new Date(createdAt) : new Date();
      var time = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
      div.innerHTML = this._esc(content).replace(/\n/g, '<br>') + '<div class="mp-time">' + time + '</div>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    },

    _showTyping: function () {
      var messagesEl = document.getElementById('mp-messages');
      var div = document.createElement('div');
      div.id = 'mp-typing-indicator';
      div.className = 'mp-typing';
      div.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    },

    _hideTyping: function () {
      var el = document.getElementById('mp-typing-indicator');
      if (el) el.remove();
    },

    _esc: function (str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },
  };

  window.MesajPanel = MesajPanel;
})();
