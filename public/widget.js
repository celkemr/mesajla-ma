(function () {
  'use strict';

  var MesajPanel = window.MesajPanel || {};
  var config = {};
  var isOpen = false;

  MesajPanel.init = function (options) {
    config = options || {};
    if (!config.apiKey) { console.error('MesajPanel: apiKey zorunlu'); return; }
    config.panelUrl = config.panelUrl || (window.location.protocol + '//' + window.location.host);
    config.position = config.position || 'bottom-right';
    config.buttonColor = config.buttonColor || '#2563eb';
    config.title = config.title || 'Bize Yazın';
    createWidget();
  };

  function createWidget() {
    injectStyles();
    var btn = document.createElement('button');
    btn.id = 'mp-toggle-btn';
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    btn.setAttribute('aria-label', 'Mesaj gönder');
    document.body.appendChild(btn);

    var panel = document.createElement('div');
    panel.id = 'mp-panel';
    panel.innerHTML = [
      '<div class="mp-header">',
      '  <span class="mp-title">' + esc(config.title) + '</span>',
      '  <button class="mp-close" aria-label="Kapat">✕</button>',
      '</div>',
      '<div id="mp-body">',
      '  <form id="mp-form">',
      '    <div class="mp-field"><label>Adınız</label><input name="sender_name" type="text" placeholder="Adınız Soyadınız" /></div>',
      '    <div class="mp-field"><label>E-posta</label><input name="sender_email" type="email" placeholder="email@example.com" /></div>',
      '    <div class="mp-field"><label>Konu</label><input name="subject" type="text" placeholder="Konu" /></div>',
      '    <div class="mp-field"><label>Mesaj <span class="mp-req">*</span></label><textarea name="content" rows="4" placeholder="Mesajınızı yazın..." required></textarea></div>',
      '    <button class="mp-submit" type="submit">Gönder</button>',
      '  </form>',
      '</div>',
    ].join('');
    document.body.appendChild(panel);

    btn.addEventListener('click', togglePanel);
    panel.querySelector('.mp-close').addEventListener('click', closePanel);
    panel.querySelector('#mp-form').addEventListener('submit', submitForm);
  }

  function togglePanel() {
    isOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    isOpen = true;
    document.getElementById('mp-panel').classList.add('mp-open');
    document.getElementById('mp-toggle-btn').classList.add('mp-active');
  }

  function closePanel() {
    isOpen = false;
    document.getElementById('mp-panel').classList.remove('mp-open');
    document.getElementById('mp-toggle-btn').classList.remove('mp-active');
  }

  function submitForm(e) {
    e.preventDefault();
    var form = e.target;
    var submitBtn = form.querySelector('.mp-submit');
    var data = {
      sender_name: form.sender_name.value.trim() || undefined,
      sender_email: form.sender_email.value.trim() || undefined,
      subject: form.subject.value.trim() || undefined,
      content: form.content.value.trim(),
    };
    if (!data.content) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Gönderiliyor...';

    fetch(config.panelUrl + '/api/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
      body: JSON.stringify(data),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success) {
          document.getElementById('mp-body').innerHTML =
            '<div class="mp-success"><div class="mp-success-icon">✓</div><p>Mesajınız iletildi!</p><p class="mp-success-sub">En kısa sürede size geri döneceğiz.</p></div>';
          setTimeout(closePanel, 3000);
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Gönder';
          alert('Hata: ' + (res.error || 'Bilinmeyen hata'));
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Gönder';
        alert('Bağlantı hatası. Lütfen tekrar deneyin.');
      });
  }

  function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function injectStyles() {
    var pos = config.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;';
    var panelPos = config.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;';
    var color = config.buttonColor || '#2563eb';

    var css = [
      '#mp-toggle-btn {',
      '  position: fixed; bottom: 24px; ' + pos,
      '  width: 56px; height: 56px; border-radius: 50%;',
      '  background: ' + color + '; color: #fff; border: none;',
      '  cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,.2);',
      '  display: flex; align-items: center; justify-content: center;',
      '  z-index: 9999; transition: transform .2s, background .2s;',
      '}',
      '#mp-toggle-btn:hover { transform: scale(1.08); }',
      '#mp-toggle-btn.mp-active { background: #374151; }',

      '#mp-panel {',
      '  position: fixed; bottom: 96px; ' + panelPos,
      '  width: 360px; max-width: calc(100vw - 48px);',
      '  background: #fff; border-radius: 16px;',
      '  box-shadow: 0 8px 40px rgba(0,0,0,.15); z-index: 9998;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      '  opacity: 0; pointer-events: none; transform: translateY(12px);',
      '  transition: opacity .25s, transform .25s;',
      '}',
      '#mp-panel.mp-open { opacity: 1; pointer-events: all; transform: translateY(0); }',

      '.mp-header {',
      '  background: ' + color + '; color: #fff; padding: 16px 20px;',
      '  border-radius: 16px 16px 0 0; display: flex; align-items: center; justify-content: space-between;',
      '}',
      '.mp-title { font-weight: 600; font-size: 15px; }',
      '.mp-close { background: none; border: none; color: rgba(255,255,255,.8); cursor: pointer; font-size: 18px; line-height: 1; padding: 0; }',
      '.mp-close:hover { color: #fff; }',

      '#mp-body { padding: 20px; }',
      '.mp-field { margin-bottom: 14px; }',
      '.mp-field label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }',
      '.mp-req { color: #ef4444; }',
      '.mp-field input, .mp-field textarea {',
      '  width: 100%; box-sizing: border-box; padding: 9px 12px;',
      '  border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px;',
      '  font-family: inherit; color: #0f172a; outline: none; transition: border-color .15s;',
      '}',
      '.mp-field input:focus, .mp-field textarea:focus { border-color: ' + color + '; }',
      '.mp-field textarea { resize: vertical; min-height: 80px; }',

      '.mp-submit {',
      '  width: 100%; padding: 11px; background: ' + color + '; color: #fff;',
      '  border: none; border-radius: 8px; font-size: 14px; font-weight: 600;',
      '  cursor: pointer; transition: opacity .15s;',
      '}',
      '.mp-submit:hover { opacity: .9; }',
      '.mp-submit:disabled { opacity: .6; cursor: not-allowed; }',

      '.mp-success {',
      '  text-align: center; padding: 32px 20px; color: #374151;',
      '}',
      '.mp-success-icon {',
      '  width: 56px; height: 56px; background: #dcfce7; color: #16a34a;',
      '  border-radius: 50%; font-size: 24px; display: flex; align-items: center;',
      '  justify-content: center; margin: 0 auto 16px;',
      '}',
      '.mp-success p { margin: 0 0 6px; font-weight: 600; font-size: 16px; }',
      '.mp-success-sub { color: #6b7280; font-size: 13px; font-weight: 400 !important; }',
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  window.MesajPanel = MesajPanel;
})();
