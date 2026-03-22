'use client';
import { useEffect, useRef, useState } from 'react';

// Panelin herhangi bir sekmesinde çalışır
export default function GlobalNotifier({ onNewCount }: { onNewCount: (n: number) => void }) {
  const knownMsgTotal = useRef<number | null>(null);
  const knownConvCount = useRef<number | null>(null);
  const soundTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRender] = useState(0);

  function playNotification5s() {
    // Önceki ses varsa iptal et
    if (soundTimeout.current) clearTimeout(soundTimeout.current);

    let beepCount = 0;
    function beep() {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();
        o1.connect(g); o2.connect(g); g.connect(ctx.destination);
        o1.frequency.value = 660; o2.frequency.value = 880;
        o1.type = 'sine'; o2.type = 'sine';
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        o1.start(ctx.currentTime); o2.start(ctx.currentTime + 0.08);
        o1.stop(ctx.currentTime + 0.45); o2.stop(ctx.currentTime + 0.5);
      } catch { /* ses izni yoksa sessiz geç */ }

      beepCount++;
      if (beepCount < 5) {
        soundTimeout.current = setTimeout(beep, 1000);
      }
    }
    beep();
  }

  useEffect(() => {
    let newMsgAccum = 0; // Birikmiş yeni mesaj sayısı
    let tabBlinkInterval: ReturnType<typeof setInterval> | null = null;
    const originalTitle = document.title;

    function startTabBlink(count: number) {
      if (tabBlinkInterval) clearInterval(tabBlinkInterval);
      let show = true;
      tabBlinkInterval = setInterval(() => {
        document.title = show ? `(${count} yeni) 🔔 Panel` : originalTitle;
        show = !show;
      }, 1200);
    }

    function stopTabBlink() {
      if (tabBlinkInterval) clearInterval(tabBlinkInterval);
      document.title = originalTitle;
    }

    async function poll() {
      try {
        const res = await fetch('/api/conversations');
        const convs: { message_count: number }[] = await res.json();

        const msgTotal = convs.reduce((s, c) => s + Number(c.message_count), 0);
        const convCount = convs.length;

        // İlk yüklemede sadece referans al
        if (knownMsgTotal.current === null) {
          knownMsgTotal.current = msgTotal;
          knownConvCount.current = convCount;
          return;
        }

        const msgDiff = msgTotal - knownMsgTotal.current;
        const convDiff = convCount - (knownConvCount.current ?? convCount);

        if (msgDiff > 0 || convDiff > 0) {
          newMsgAccum += msgDiff + convDiff;
          knownMsgTotal.current = msgTotal;
          knownConvCount.current = convCount;

          playNotification5s();
          onNewCount(newMsgAccum);
          startTabBlink(newMsgAccum);
        }
      } catch { /* ağ hatası - sessiz geç */ }
    }

    // Sekme odaklanınca sayacı sıfırla
    function onFocus() {
      newMsgAccum = 0;
      onNewCount(0);
      stopTabBlink();
    }
    window.addEventListener('focus', onFocus);

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      clearInterval(interval);
      if (soundTimeout.current) clearTimeout(soundTimeout.current);
      if (tabBlinkInterval) clearInterval(tabBlinkInterval);
      window.removeEventListener('focus', onFocus);
      document.title = originalTitle;
    };
  }, [onNewCount]);

  return null;
}
