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
      this._fetchConfigThenCreate();
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

    _fetchConfigThenCreate: function () {
      var self = this;
      fetch(self.config.panelUrl + '/api/widget-config', {
        headers: { 'x-api-key': self.config.apiKey },
      })
        .then(function (r) { return r.json(); })
        .then(function (cfg) {
          if (cfg.buttonColor) self.config.buttonColor = cfg.buttonColor;
          if (cfg.botName) self.config.botName = cfg.botName;
          if (cfg.welcomeMessage) self.config.welcomeMessage = cfg.welcomeMessage;
          if (typeof cfg.typingIndicator !== 'undefined') self.config.typingIndicator = cfg.typingIndicator;
          if (typeof cfg.onlineIndicator !== 'undefined') self.config.onlineIndicator = cfg.onlineIndicator;
          if (cfg.language) self.config.language = cfg.language;
        })
        .catch(function () {})
        .then(function () {
          self._createWidget();
        });
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
        /* === BUTTON === */
        '#mp-btn{position:fixed;bottom:24px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:99998;transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s;box-shadow:0 4px 24px rgba(0,0,0,.22);outline:none;}',
        '#mp-btn:hover{transform:scale(1.12);box-shadow:0 8px 32px rgba(0,0,0,.28);}',
        '#mp-btn:active{transform:scale(.95);}',
        /* pulse ring */
        '#mp-btn::before{content:"";position:absolute;inset:-6px;border-radius:50%;border:3px solid currentColor;opacity:.35;animation:mp-pulse 2.2s ease-out infinite;}',
        '#mp-btn::after{content:"";position:absolute;inset:-12px;border-radius:50%;border:2px solid currentColor;opacity:.15;animation:mp-pulse 2.2s ease-out infinite .6s;}',
        '@keyframes mp-pulse{0%{transform:scale(.85);opacity:.5;}70%{transform:scale(1.15);opacity:0;}100%{transform:scale(1.15);opacity:0;}}',
        /* icon swap */
        '#mp-btn .mp-icon-chat{transition:transform .3s,opacity .3s;}',
        '#mp-btn .mp-icon-close{position:absolute;transition:transform .3s,opacity .3s;opacity:0;transform:rotate(-90deg) scale(.6);}',
        '#mp-btn.mp-active .mp-icon-chat{opacity:0;transform:rotate(90deg) scale(.6);}',
        '#mp-btn.mp-active .mp-icon-close{opacity:1;transform:rotate(0deg) scale(1);}',
        /* badge */
        '#mp-badge{position:absolute;top:-3px;right:-3px;background:#ef4444;color:white;border-radius:50%;width:20px;height:20px;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;font-family:sans-serif;border:2px solid white;animation:mp-badgepop .3s cubic-bezier(.34,1.56,.64,1);}',
        '@keyframes mp-badgepop{from{transform:scale(0);}to{transform:scale(1);}}',
        /* === PANEL === */
        '#mp-panel{position:fixed;bottom:100px;width:380px;height:560px;background:#ffffff;border-radius:20px;box-shadow:0 12px 56px rgba(0,0,0,.18);z-index:99999;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;transition:transform .3s cubic-bezier(.34,1.46,.64,1),opacity .25s ease;}',
        '#mp-panel.mp-open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}',
        /* === HEADER === */
        '#mp-header{padding:18px 20px;color:white;display:flex;align-items:center;gap:12px;flex-shrink:0;position:relative;overflow:hidden;}',
        '#mp-header::after{content:"";position:absolute;top:-30px;right:-20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.08);}',
        '#mp-header .mp-avatar{width:42px;height:42px;border-radius:14px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.12);}',
        '#mp-header .mp-avatar svg{width:22px;height:22px;fill:white;}',
        '#mp-header .mp-info .mp-name{font-weight:700;font-size:15px;letter-spacing:-.01em;}',
        '#mp-header .mp-info .mp-status{font-size:11.5px;opacity:.88;display:flex;align-items:center;gap:5px;margin-top:2px;}',
        '#mp-header .mp-info .mp-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block;animation:mp-blink 2s ease-in-out infinite;}',
        '@keyframes mp-blink{0%,100%{opacity:1;}50%{opacity:.4;}}',
        '#mp-close-btn{margin-left:auto;background:rgba(255,255,255,.18);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .2s;flex-shrink:0;z-index:1;}',
        '#mp-close-btn:hover{background:rgba(255,255,255,.32);}',
        /* === MESSAGES === */
        '#mp-messages{flex:1;overflow-y:auto;padding:16px 16px 8px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;}',
        '#mp-messages::-webkit-scrollbar{width:3px;}#mp-messages::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px;}',
        '.mp-msg{max-width:80%;padding:10px 14px;border-radius:18px;font-size:13.5px;line-height:1.55;word-break:break-word;animation:mp-msgin .25s cubic-bezier(.34,1.46,.64,1);}',
        '@keyframes mp-msgin{from{opacity:0;transform:translateY(8px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);}}',
        '.mp-msg.mp-bot{background:white;color:#1e293b;border-bottom-left-radius:5px;align-self:flex-start;box-shadow:0 1px 6px rgba(0,0,0,.07);}',
        '.mp-msg.mp-user{color:white;border-bottom-right-radius:5px;align-self:flex-end;box-shadow:0 2px 8px rgba(0,0,0,.15);}',
        '.mp-msg .mp-time{font-size:10px;opacity:.5;margin-top:4px;text-align:right;}',
        /* typing */
        '.mp-typing{display:flex;gap:5px;padding:12px 16px;background:white;border-radius:18px;border-bottom-left-radius:5px;align-self:flex-start;box-shadow:0 1px 6px rgba(0,0,0,.07);}',
        '.mp-typing span{width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:mp-bounce 1.2s infinite;}',
        '.mp-typing span:nth-child(2){animation-delay:.2s;}.mp-typing span:nth-child(3){animation-delay:.4s;}',
        '@keyframes mp-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-7px);}}',
        /* === INPUT === */
        '#mp-input-area{padding:12px 14px;border-top:1px solid #e8edf3;display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:white;}',
        '#mp-input{flex:1;border:1.5px solid #e2e8f0;border-radius:14px;padding:10px 14px;font-size:13.5px;outline:none;resize:none;font-family:inherit;line-height:1.4;max-height:100px;overflow-y:auto;transition:border-color .2s,box-shadow .2s;}',
        '#mp-input:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(147,197,253,.2);}',
        '#mp-send{width:40px;height:40px;border-radius:12px;border:none;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .2s,opacity .2s,box-shadow .2s;box-shadow:0 2px 8px rgba(0,0,0,.18);}',
        '#mp-send:hover{transform:scale(1.08);box-shadow:0 4px 14px rgba(0,0,0,.22);}',
        '#mp-send:active{transform:scale(.94);}',
        '#mp-send:disabled{opacity:.35;cursor:default;transform:none;box-shadow:none;}',
        '#mp-send svg{width:18px;height:18px;fill:white;}',
        /* === TOOLTIP BUBBLE === */
        '#mp-bubble{position:fixed;background:white;border-radius:18px 18px 4px 18px;padding:10px 15px;font-size:13px;color:#1e293b;box-shadow:0 4px 20px rgba(0,0,0,.14);z-index:99997;white-space:nowrap;pointer-events:none;opacity:0;transform:translateY(6px) scale(.95);transition:opacity .3s ease,transform .3s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-weight:500;}',
        '#mp-bubble.mp-bubble-show{opacity:1;transform:translateY(0) scale(1);}',
        '#mp-bubble::after{content:"";position:absolute;bottom:-7px;right:14px;width:13px;height:13px;background:white;clip-path:polygon(0 0,100% 0,100% 100%);}',
        /* === MOBILE === */
        '@media(max-width:480px){',
        '#mp-panel{width:100vw!important;height:100vh!important;bottom:0!important;left:0!important;right:0!important;border-radius:0!important;max-height:100dvh;}',
        '#mp-btn{bottom:16px;width:56px;height:56px;}',
        '#mp-header{padding-top:calc(18px + env(safe-area-inset-top));}',
        '#mp-input-area{padding-bottom:calc(12px + env(safe-area-inset-bottom));}',
        '}',
      ].join('');
      document.head.appendChild(style);
    },

    _createWidget: function () {
      var self = this;
      var isLeft = this.config.position === 'bottom-left';
      var posStyle = isLeft ? 'left:24px' : 'right:24px';
      var color = this.config.buttonColor;

      // Panel
      var panel = document.createElement('div');
      panel.id = 'mp-panel';
      panel.style.cssText = isLeft ? 'left:16px' : 'right:16px';
      panel.innerHTML = [
        '<div id="mp-header" style="background:' + color + '">',
        '  <div class="mp-avatar">',
        '    <svg viewBox="0 0 32 32" fill="none">',
        '      <circle cx="16" cy="16" r="14" fill="rgba(255,255,255,0.15)"/>',
        '      <path d="M16 6 C16 6 17.5 11 22 12 C17.5 13 16 18 16 18 C16 18 14.5 13 10 12 C14.5 11 16 6 16 6Z" fill="white"/>',
        '      <path d="M23 18 C23 18 23.8 20.5 26 21 C23.8 21.5 23 24 23 24 C23 24 22.2 21.5 20 21 C22.2 20.5 23 18 23 18Z" fill="rgba(255,255,255,0.75)"/>',
        '      <path d="M9 19 C9 19 9.6 21 11 21.3 C9.6 21.6 9 23.5 9 23.5 C9 23.5 8.4 21.6 7 21.3 C8.4 21 9 19 9 19Z" fill="rgba(255,255,255,0.6)"/>',
        '    </svg>',
        '  </div>',
        '  <div class="mp-info">',
        '    <div class="mp-name">' + this._esc(this.config.botName) + '</div>',
        (this.config.onlineIndicator ? '    <div class="mp-status"><span class="mp-dot"></span>Çevrimiçi</div>' : ''),
        '  </div>',
        '  <button id="mp-close-btn" aria-label="Kapat">',
        '    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>',
        '  </button>',
        '</div>',
        '<div id="mp-messages"></div>',
        '<div id="mp-input-area">',
        '  <textarea id="mp-input" rows="1" placeholder="' + this._esc(this.config.placeholder) + '" aria-label="Mesaj yaz"></textarea>',
        '  <button id="mp-send" style="background:' + color + '" aria-label="Gönder">',
        '    <svg viewBox="0 0 24 24"><path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.51c0 .71.73 1.2 1.39.91z"/></svg>',
        '  </button>',
        '</div>',
      ].join('');
      document.body.appendChild(panel);

      // Button
      var btn = document.createElement('button');
      btn.id = 'mp-btn';
      btn.setAttribute('aria-label', 'Sohbeti aç');
      btn.style.cssText = posStyle + ';background:' + color + ';color:' + color;
      btn.innerHTML = [
        '<span id="mp-badge"></span>',
        '<span class="mp-icon-chat">',
        '  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">',
        '    <path d="M15 3 C15 3 17.5 10.5 23.5 12 C17.5 13.5 15 21 15 21 C15 21 12.5 13.5 6.5 12 C12.5 10.5 15 3 15 3Z" fill="white"/>',
        '    <path d="M24 21 C24 21 25.2 24.5 27.5 25 C25.2 25.5 24 29 24 29 C24 29 22.8 25.5 20.5 25 C22.8 24.5 24 21 24 21Z" fill="rgba(255,255,255,0.8)"/>',
        '    <path d="M6 20 C6 20 7 23 9 23.4 C7 23.8 6 26.5 6 26.5 C6 26.5 5 23.8 3 23.4 C5 23 6 20 6 20Z" fill="rgba(255,255,255,0.65)"/>',
        '  </svg>',
        '</span>',
        '<span class="mp-icon-close">',
        '  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 2l18 18M20 2L2 20" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>',
        '</span>',
      ].join('');
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

      this._loadHistory();
      this._startBubble();
    },

    _startBubble: function () {
      var self = this;
      var bubbleMessages = {
        tr: ['Merhaba! 👋 Size yardımcı olabilir miyim?', 'Bir sorunuz mu var? Buradayız!', 'Yardıma ihtiyacınız olursa yazın ✨', 'Nasıl yardımcı olabilirim?'],
        en: ['Hello! 👋 Can I help you?', 'Got a question? We\'re here!', 'Need help? Just write ✨', 'How can I assist you?'],
        de: ['Hallo! 👋 Kann ich helfen?', 'Haben Sie Fragen? Wir sind da!', 'Schreiben Sie uns ✨', 'Wie kann ich helfen?'],
        fr: ['Bonjour! 👋 Puis-je vous aider?', 'Une question? Nous sommes là!', 'Écrivez-nous ✨', 'Comment puis-je vous aider?'],
        es: ['¡Hola! 👋 ¿Puedo ayudarte?', '¿Tienes preguntas? ¡Aquí estamos!', 'Escríbenos ✨', '¿Cómo puedo ayudarte?'],
        ar: ['مرحباً! 👋 كيف يمكنني مساعدتك؟', 'هل لديك سؤال؟ نحن هنا!', 'اكتب لنا ✨', 'كيف أساعدك؟'],
        ru: ['Привет! 👋 Могу ли я помочь?', 'Есть вопросы? Мы здесь!', 'Напишите нам ✨', 'Как я могу помочь?'],
        nl: ['Hallo! 👋 Kan ik u helpen?', 'Heeft u vragen? Wij zijn er!', 'Schrijf ons ✨', 'Hoe kan ik helpen?'],
        it: ['Ciao! 👋 Posso aiutarti?', 'Hai domande? Siamo qui!', 'Scrivici ✨', 'Come posso aiutarti?'],
        pt: ['Olá! 👋 Posso ajudar?', 'Tem perguntas? Estamos aqui!', 'Escreva-nos ✨', 'Como posso ajudar?'],
      };
      var lang = self.config.language || 'tr';
      var messages = bubbleMessages[lang] || bubbleMessages['tr'];
      var isLeft = this.config.position === 'bottom-left';

      var bubble = document.createElement('div');
      bubble.id = 'mp-bubble';
      // ok yönü: sağda sağ köşede, solda sol köşede
      if (isLeft) bubble.style.cssText = 'left:16px;';
      else bubble.style.cssText = 'right:16px;';
      if (isLeft) bubble.style.setProperty('border-radius', '18px 18px 18px 4px');
      document.body.appendChild(bubble);

      // ok pozisyonu sola göre ayarla
      if (isLeft) {
        var s = document.getElementById('mp-styles');
        s.textContent += '#mp-bubble.mp-left::after{right:auto;left:14px;clip-path:polygon(0 0,100% 0,0 100%);}';
        bubble.classList.add('mp-left');
      }

      function showBubble() {
        if (self.isOpen) return;
        var btn = document.getElementById('mp-btn');
        if (!btn) return;
        var rect = btn.getBoundingClientRect();
        bubble.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
        bubble.textContent = messages[Math.floor(Math.random() * messages.length)];
        bubble.classList.add('mp-bubble-show');
        setTimeout(function () { bubble.classList.remove('mp-bubble-show'); }, 4000);
      }

      // İlk gösterim 4sn sonra, sonra her 25sn'de bir
      setTimeout(function () {
        showBubble();
        setInterval(showBubble, 25000);
      }, 4000);
    },

    _applyServerConfig: function (serverConfig) {
      if (!serverConfig) return;
      var color = serverConfig.buttonColor || this.config.buttonColor;
      if (serverConfig.buttonColor) this.config.buttonColor = serverConfig.buttonColor;
      if (serverConfig.botName) this.config.botName = serverConfig.botName;
      if (serverConfig.welcomeMessage) this.config.welcomeMessage = serverConfig.welcomeMessage;
      if (typeof serverConfig.typingIndicator !== 'undefined') this.config.typingIndicator = serverConfig.typingIndicator;
      if (typeof serverConfig.onlineIndicator !== 'undefined') this.config.onlineIndicator = serverConfig.onlineIndicator;

      var btn = document.getElementById('mp-btn');
      var header = document.getElementById('mp-header');
      var send = document.getElementById('mp-send');
      if (btn) { btn.style.background = color; btn.style.color = color; }
      if (header) header.style.background = color;
      if (send) send.style.background = color;

      var nameEl = document.querySelector('#mp-header .mp-name');
      if (nameEl && serverConfig.botName) nameEl.textContent = serverConfig.botName;

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
      var btn = document.getElementById('mp-btn');
      panel.classList.toggle('mp-open', this.isOpen);
      btn.classList.toggle('mp-active', this.isOpen);
      btn.setAttribute('aria-label', this.isOpen ? 'Sohbeti kapat' : 'Sohbeti aç');
      if (this.isOpen) {
        var input = document.getElementById('mp-input');
        if (input) setTimeout(function () { input.focus(); }, 150);
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
