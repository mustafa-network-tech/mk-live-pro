import { useEffect, useRef, useState } from 'react';
import type { AudioItem } from '../../../packages/shared/src/index.ts';

const SLOTS = [
  { id: 'applause', label: 'Alkış', icon: '👏', builtin: 'applause' },
  { id: 'congrats', label: 'Tebrikler', icon: '🎉', builtin: 'congrats' },
  { id: 'welcome', label: 'Hoş geldiniz', icon: '👋', builtin: 'welcome' },
  { id: 'wow', label: 'Wow', icon: '✨', builtin: 'wow' },
  { id: 'dingdong', label: 'Ding Dong', icon: '🔔', builtin: 'dingdong' },
  { id: 'laugh', label: 'Kahkaha', icon: '😄', builtin: 'laugh' },
] as const;

type SlotId = (typeof SLOTS)[number]['id'];
type Assignments = Partial<Record<SlotId, string>>;

function loadAssignments(): Assignments {
  try { return JSON.parse(localStorage.getItem('mk-live-pro:soundboard') ?? '{}') as Assignments; } catch { return {}; }
}

function mimeFor(file: File): AudioItem['mime'] | null {
  const type = file.type.toLowerCase();
  if (type === 'audio/mpeg' || type === 'audio/wav' || type === 'audio/ogg' || type === 'audio/mp4' || type === 'audio/webm') return type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'm4a') return 'audio/mp4';
  if (ext === 'webm') return 'audio/webm';
  return null;
}

function playBuiltInDing(volume: number) {
  const AudioContextCtor = window.AudioContext;
  const context = new AudioContextCtor();
  const master = context.createGain();
  master.gain.setValueAtTime(Math.max(0.02, volume), context.currentTime);
  master.connect(context.destination);
  const tone = (frequency: number, start: number) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.7, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.52);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.55);
  };
  tone(659.25, context.currentTime);
  tone(523.25, context.currentTime + 0.34);
  window.setTimeout(() => { void context.close(); }, 1100);
}

function playBuiltInApplause(volume: number) {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.setValueAtTime(Math.max(0.02, volume) * 0.32, context.currentTime);
  master.connect(context.destination);
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.round(sampleRate * 0.16), sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
  for (let i = 0; i < 34; i++) {
    const start = context.currentTime + Math.random() * 1.65;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = 0.75 + Math.random() * 1.3;
    filter.type = 'bandpass';
    filter.frequency.value = 900 + Math.random() * 1900;
    filter.Q.value = 0.6;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35 + Math.random() * 0.5, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
    source.stop(start + 0.16);
  }
  window.setTimeout(() => { void context.close(); }, 2300);
}

function speakEffect(text: string, volume: number, pitch = 1, rate = 1) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'tr-TR';
  utterance.volume = Math.min(1, Math.max(0, volume));
  utterance.pitch = pitch;
  utterance.rate = rate;
  const turkishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('tr'));
  if (turkishVoice) utterance.voice = turkishVoice;
  window.speechSynthesis.speak(utterance);
}

function playBuiltIn(kind: (typeof SLOTS)[number]['builtin'], volume: number) {
  if (kind === 'dingdong') return playBuiltInDing(volume);
  if (kind === 'applause') return playBuiltInApplause(volume);
  if (kind === 'congrats') return speakEffect('Tebrikler!', volume, 1.08, 0.92);
  if (kind === 'welcome') return speakEffect('Hoş geldiniz!', volume, 1, 0.9);
  if (kind === 'wow') return speakEffect('Vay canına!', volume, 1.18, 0.86);
  speakEffect('Ha ha ha ha!', volume, 1.25, 1.08);
}

export function AudioDock() {
  const [open, setOpen] = useState(() => new URLSearchParams(location.search).get('soundboard') === '1');
  const [items, setItems] = useState<AudioItem[]>([]);
  const [assignments, setAssignments] = useState<Assignments>(loadAssignments);
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('mk-live-pro:effects-volume') ?? '70'));
  const [status, setStatus] = useState('Hazır');
  const [uploading, setUploading] = useState(false);
  const players = useRef(new Set<HTMLAudioElement>());

  const load = () => {
    fetch('/api/audio')
      .then((response) => {
        if (!response.ok) throw new Error('Ses kütüphanesi alınamadı');
        return response.json() as Promise<AudioItem[]>;
      })
      .then((audioItems) => {
        setItems(audioItems);
        setStatus('Hazır');
      })
      .catch(() => setStatus('Ses kütüphanesine ulaşılamadı'));
  };

  useEffect(() => {
    load();
    const changed = () => load();
    window.addEventListener('mk-live-pro:audio-changed', changed);
    return () => {
      window.removeEventListener('mk-live-pro:audio-changed', changed);
      for (const player of players.current) player.pause();
      players.current.clear();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('mk-live-pro:soundboard', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('mk-live-pro:effects-volume', String(volume));
  }, [volume]);

  const play = (slot: (typeof SLOTS)[number]) => {
    const audioId = assignments[slot.id];
    if (!audioId) {
      playBuiltIn(slot.builtin, volume / 100);
      setStatus(`${slot.label} çalındı`);
      return;
    }
    if (!audioId || !items.some((item) => item.id === audioId)) {
      setStatus(`${slot.label} için ses seçin`);
      return;
    }
    const player = new Audio(`/api/audio/${audioId}`);
    player.volume = Math.min(1, Math.max(0, volume / 100));
    players.current.add(player);
    const cleanup = () => players.current.delete(player);
    player.addEventListener('ended', cleanup, { once: true });
    player.addEventListener('error', cleanup, { once: true });
    void player.play().then(() => setStatus(`${slot.label} çalıyor`)).catch(() => setStatus('Ses çalınamadı'));
  };

  const stopAll = () => {
    for (const player of players.current) {
      player.pause();
      player.currentTime = 0;
    }
    players.current.clear();
    window.speechSynthesis.cancel();
    setStatus('Tüm efektler durduruldu');
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const mime = mimeFor(file);
    if (!mime) {
      setStatus('Desteklenmeyen ses dosyası');
      return;
    }
    setUploading(true);
    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': mime, 'X-MK-Filename': encodeURIComponent(file.name) },
        body: file,
      });
      if (!response.ok) throw new Error('Yüklenemedi');
      const item = await response.json() as AudioItem;
      setItems((current) => [item, ...current]);
      setStatus(`${item.name} eklendi`);
      window.dispatchEvent(new Event('mk-live-pro:audio-changed'));
    } catch {
      setStatus('Ses dosyası eklenemedi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`audio-dock${open ? ' open' : ''}`}>
      {open && (
        <div className="soundboard-panel">
          <div className="soundboard-head">
            <div><strong>Ses Efektleri</strong><small>Tüm stüdyolarda kullanılabilir</small></div>
            <button className="btn ghost square" title="Kapat" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="sound-grid">
            {SLOTS.map((slot) => (
              <div className="sound-slot" key={slot.id}>
                <button className="sound-play" onClick={() => play(slot)}><span>{slot.icon}</span><strong>{slot.label}</strong></button>
                <select
                  aria-label={`${slot.label} sesi`}
                  value={assignments[slot.id] ?? ''}
                  onChange={(event) => setAssignments((current) => ({ ...current, [slot.id]: event.target.value || undefined }))}
                >
                  <option value="">Dahili efekt</option>
                  {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <label className="effects-volume">Efekt sesi <small>%{volume}</small><input type="range" min={0} max={100} value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
          <div className="soundboard-actions">
            <label className={`btn file-button${uploading ? ' disabled' : ''}`}>+ Efekt sesi ekle<input type="file" accept=".mp3,.wav,.m4a,.ogg,.webm,audio/*" disabled={uploading} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
            <button className="btn danger" onClick={stopAll}>Efektleri durdur</button>
          </div>
          <div className="soundboard-status">{status}</div>
          <p className="hint">Yalnızca yayın hakkınız bulunan sesleri ekleyin. LIVE Studio sistem/uygulama sesini yakalamalıdır.</p>
        </div>
      )}
      <button className="soundboard-toggle" onClick={() => setOpen((value) => !value)}><span>🔊</span> Ses Efektleri</button>
    </div>
  );
}
