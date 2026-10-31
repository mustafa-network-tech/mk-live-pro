import { useEffect, useMemo, useRef, useState } from 'react';
import { LIMITS, MEDIA_LIMITS, POEM_LIBRARY_LIMITS, POEM_PHOTO_MODES } from '../../../../packages/shared/src/index.ts';
import type { AudioItem, MediaItem, PoemEntry, PoemState } from '../../../../packages/shared/src/index.ts';
import { POEM_THEMES } from '../../../../packages/themes/src/index.ts';
import type { PageProps } from '../App.tsx';
import { Preview } from '../Preview.tsx';

const EMPTY_POEM: PoemEntry = { id: '', title: '', poet: '', body: '', notes: '', createdAt: '', updatedAt: '' };
const STATUS_LABELS: Record<PoemState['status'], string> = { waiting: 'Hazırlanıyor', live: 'Yayında', finished: 'Tamamlandı' };
const PHOTO_MODE_LABELS: Record<PoemState['photoMode'], string> = { off: 'Fotoğraf kapalı', background: 'Arka plan', card: 'Çerçeveli görsel' };

async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1920;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Görsel hazırlanamadı');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Görsel hazırlanamadı')), 'image/webp', 0.86));
}

function visualMime(file: File): MediaItem['mime'] | null {
  const type = file.type.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp' || type === 'video/mp4' || type === 'video/webm') return type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  return null;
}

function audioMime(file: File): AudioItem['mime'] | null {
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

export function PoemStudio({ s, update, ui }: PageProps) {
  const [poems, setPoems] = useState<PoemEntry[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<PoemEntry>(EMPTY_POEM);
  const [libraryStatus, setLibraryStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [newParticipant, setNewParticipant] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaStatus, setMediaStatus] = useState<'loading' | 'ready' | 'uploading' | 'error'>('loading');
  const [audioItems, setAudioItems] = useState<AudioItem[]>([]);
  const [audioStatus, setAudioStatus] = useState<'loading' | 'ready' | 'uploading' | 'error'>('loading');
  const [selectedAudioId, setSelectedAudioId] = useState(() => localStorage.getItem('mk-live-pro:selected-audio') ?? '');
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('mk-live-pro:audio-volume') ?? '28'));
  const [loopAudio, setLoopAudio] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeFrame = useRef<number | null>(null);

  const setPoemScene = (patch: Partial<PoemState>) => update({ poem: { ...s.poem, ...patch } });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/poems')
      .then((response) => {
        if (!response.ok) throw new Error('Şiir kütüphanesi alınamadı');
        return response.json() as Promise<PoemEntry[]>;
      })
      .then((items) => {
        if (cancelled) return;
        setPoems(items);
        setLibraryStatus('ready');
      })
      .catch(() => { if (!cancelled) setLibraryStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/audio')
        .then((response) => {
          if (!response.ok) throw new Error('Müzikler alınamadı');
          return response.json() as Promise<AudioItem[]>;
        })
        .then((items) => {
          if (!cancelled) {
            setAudioItems(items);
            setAudioStatus('ready');
            setSelectedAudioId((current) => current && !items.some((item) => item.id === current) ? '' : current);
          }
        })
        .catch(() => { if (!cancelled) setAudioStatus('error'); });
    };
    load();
    window.addEventListener('mk-live-pro:audio-changed', load);
    return () => {
      cancelled = true;
      window.removeEventListener('mk-live-pro:audio-changed', load);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('mk-live-pro:selected-audio', selectedAudioId);
  }, [selectedAudioId]);

  useEffect(() => {
    const safeVolume = Math.min(100, Math.max(0, Number.isFinite(volume) ? volume : 28));
    localStorage.setItem('mk-live-pro:audio-volume', String(safeVolume));
    if (audioRef.current && playing) audioRef.current.volume = safeVolume / 100;
  }, [volume, playing]);

  useEffect(() => () => {
    if (fadeFrame.current !== null) cancelAnimationFrame(fadeFrame.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/media')
      .then((response) => {
        if (!response.ok) throw new Error('Görseller alınamadı');
        return response.json() as Promise<MediaItem[]>;
      })
      .then((items) => {
        if (!cancelled) {
          setMedia(items);
          setMediaStatus('ready');
        }
      })
      .catch(() => { if (!cancelled) setMediaStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  const filteredPoems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return poems;
    return poems.filter((item) => `${item.title} ${item.poet} ${item.body}`.toLocaleLowerCase('tr-TR').includes(needle));
  }, [poems, query]);

  const selectPoem = (item: PoemEntry) => {
    setSelectedId(item.id);
    setDraft({ ...item });
  };

  const newPoem = () => {
    const now = new Date().toISOString();
    const item: PoemEntry = { ...EMPTY_POEM, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    setSelectedId(item.id);
    setDraft(item);
  };

  const persist = async (next: PoemEntry[]) => {
    setLibraryStatus('saving');
    try {
      const response = await fetch('/api/poems', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error('Kaydedilemedi');
      const saved = await response.json() as PoemEntry[];
      setPoems(saved);
      setLibraryStatus('saved');
      window.setTimeout(() => setLibraryStatus((value) => value === 'saved' ? 'ready' : value), 1400);
      return saved;
    } catch {
      setLibraryStatus('error');
      return null;
    }
  };

  const saveDraft = async () => {
    if (!draft.id || !draft.title.trim()) return;
    const nextDraft = { ...draft, title: draft.title.trim(), poet: draft.poet.trim(), updatedAt: new Date().toISOString() };
    const exists = poems.some((item) => item.id === nextDraft.id);
    const saved = await persist(exists ? poems.map((item) => item.id === nextDraft.id ? nextDraft : item) : [nextDraft, ...poems]);
    const item = saved?.find((entry) => entry.id === nextDraft.id);
    if (item) setDraft(item);
  };

  const deleteDraft = async () => {
    if (!selectedId || !poems.some((item) => item.id === selectedId)) {
      setSelectedId('');
      setDraft(EMPTY_POEM);
      return;
    }
    const saved = await persist(poems.filter((item) => item.id !== selectedId));
    if (saved) {
      setSelectedId('');
      setDraft(EMPTY_POEM);
    }
  };

  const addParticipant = () => {
    const name = newParticipant.trim();
    if (!name || s.poem.queue.length >= LIMITS.poemQueue) return;
    setPoemScene({ queue: [...s.poem.queue, name] });
    setNewParticipant('');
  };

  const takeReader = (index: number) => {
    const reader = s.poem.queue[index];
    if (!reader) return;
    setPoemScene({ reader, queue: s.poem.queue.filter((_, i) => i !== index), status: 'waiting' });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= s.poem.queue.length) return;
    const queue = [...s.poem.queue];
    [queue[index], queue[target]] = [queue[target], queue[index]];
    setPoemScene({ queue });
  };

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    const mime = visualMime(file);
    if (!mime || file.size > MEDIA_LIMITS.bytes) {
      setMediaStatus('error');
      return;
    }
    setMediaStatus('uploading');
    try {
      const blob = mime.startsWith('video/') ? file : await prepareImage(file);
      const uploadMime = mime.startsWith('video/') ? mime : blob.type;
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': uploadMime, 'X-MK-Filename': encodeURIComponent(file.name) },
        body: blob,
      });
      if (!response.ok) throw new Error('Yüklenemedi');
      const item = await response.json() as MediaItem;
      setMedia((items) => [item, ...items]);
      setPoemScene({ photoId: item.id, photoMode: 'card' });
      setMediaStatus('ready');
    } catch {
      setMediaStatus('error');
    }
  };

  const deletePhoto = async (item: MediaItem) => {
    if (!window.confirm(`“${item.name}” görseli bu bilgisayardan silinsin mi?`)) return;
    try {
      const response = await fetch(`/api/media/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Silinemedi');
      setMedia((items) => items.filter((value) => value.id !== item.id));
      if (s.poem.photoId === item.id) setPoemScene({ photoId: '', photoMode: 'off' });
    } catch {
      setMediaStatus('error');
    }
  };

  const fadeAudio = (target: number, done?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeFrame.current !== null) cancelAnimationFrame(fadeFrame.current);
    const from = audio.volume;
    const started = performance.now();
    const duration = 1200;
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      audio.volume = from + (target - from) * progress;
      if (progress < 1) fadeFrame.current = requestAnimationFrame(step);
      else {
        fadeFrame.current = null;
        done?.();
      }
    };
    fadeFrame.current = requestAnimationFrame(step);
  };

  const playAudio = async () => {
    const audio = audioRef.current;
    if (!audio || !selectedAudioId) return;
    try {
      audio.volume = 0;
      await audio.play();
      setPlaying(true);
      fadeAudio(Math.min(1, Math.max(0, volume / 100)));
    } catch {
      setAudioStatus('error');
    }
  };

  const pauseAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    fadeAudio(0, () => {
      audio.pause();
      audio.volume = Math.min(1, Math.max(0, volume / 100));
      setPlaying(false);
    });
  };

  const selectAudio = (id: string) => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPlaying(false);
    setSelectedAudioId(id);
  };

  const uploadAudio = async (file: File | undefined) => {
    if (!file) return;
    const mime = audioMime(file);
    if (!mime) {
      setAudioStatus('error');
      return;
    }
    setAudioStatus('uploading');
    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': mime, 'X-MK-Filename': encodeURIComponent(file.name) },
        body: file,
      });
      if (!response.ok) throw new Error('Yüklenemedi');
      const item = await response.json() as AudioItem;
      setAudioItems((items) => [item, ...items]);
      selectAudio(item.id);
      setAudioStatus('ready');
      window.dispatchEvent(new Event('mk-live-pro:audio-changed'));
    } catch {
      setAudioStatus('error');
    }
  };

  const deleteAudio = async (item: AudioItem) => {
    if (!window.confirm(`“${item.name}” fon müziği bu bilgisayardan silinsin mi?`)) return;
    try {
      if (selectedAudioId === item.id) selectAudio('');
      const response = await fetch(`/api/audio/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Silinemedi');
      setAudioItems((items) => items.filter((value) => value.id !== item.id));
      window.dispatchEvent(new Event('mk-live-pro:audio-changed'));
    } catch {
      setAudioStatus('error');
    }
  };

  const selectedAudio = audioItems.find((item) => item.id === selectedAudioId) ?? null;

  return (
    <div className="grid-2 poem-layout">
      <section className="col">
        <div className="card private-card">
          <div className="status-strip">
            <div><h2>Özel şiir kütüphanem</h2><strong>{poems.length} kayıt</strong></div>
            <span className="private-pill">Yalnızca bu panelde</span>
          </div>
          <p className="hint">Şiir metinleri data/poems.json içinde bu bilgisayarda saklanır. Overlay'e, TikTok'a veya Vercel'e gönderilmez.</p>
          <div className="library-toolbar">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Şiirlerde ara…" />
            <button className="btn primary" disabled={libraryStatus === 'loading'} onClick={newPoem}>+ Yeni şiir</button>
          </div>
          {libraryStatus === 'loading' && <p className="hint">Kütüphane yükleniyor…</p>}
          {libraryStatus === 'error' && <p className="form-error">Kütüphaneye erişilemedi. Yerel sunucuyu yeniden başlatmayı deneyin.</p>}
          <div className="library-layout">
            <div className="poem-list">
              {filteredPoems.length === 0 && libraryStatus !== 'loading' && <p className="hint">Kayıt bulunamadı.</p>}
              {filteredPoems.map((item) => (
                <button key={item.id} className={`poem-list-item${selectedId === item.id ? ' on' : ''}`} onClick={() => selectPoem(item)}>
                  <strong>{item.title || 'Adsız şiir'}</strong><span>{item.poet || 'Şair belirtilmedi'}</span>
                </button>
              ))}
            </div>
            <div className="poem-editor">
              {!selectedId ? <div className="editor-empty">Okumak için bir şiir seçin veya yeni şiir oluşturun.</div> : (
                <>
                  <label>Şiirin adı <small>{draft.title.length}/{POEM_LIBRARY_LIMITS.title}</small><input value={draft.title} maxLength={POEM_LIBRARY_LIMITS.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
                  <label>Şair <small>{draft.poet.length}/{POEM_LIBRARY_LIMITS.poet}</small><input value={draft.poet} maxLength={POEM_LIBRARY_LIMITS.poet} onChange={(e) => setDraft({ ...draft, poet: e.target.value })} /></label>
                  <label>Şiir metni <small>{draft.body.length}/{POEM_LIBRARY_LIMITS.body}</small><textarea className="poem-body" value={draft.body} maxLength={POEM_LIBRARY_LIMITS.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Şiir metni yalnızca burada görünür…" /></label>
                  <label>Özel notlar <small>{draft.notes.length}/{POEM_LIBRARY_LIMITS.notes}</small><textarea value={draft.notes} maxLength={POEM_LIBRARY_LIMITS.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Okuma sırası, vurgu veya kişisel notlar…" /></label>
                  <div className="editor-actions">
                    <button className="btn primary" disabled={!draft.title.trim() || libraryStatus === 'saving'} onClick={saveDraft}>{libraryStatus === 'saving' ? 'Kaydediliyor…' : libraryStatus === 'saved' ? 'Kaydedildi ✓' : 'Şiiri kaydet'}</button>
                    <button className="btn danger" disabled={libraryStatus === 'saving'} onClick={deleteDraft}>Sil</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="status-strip">
            <div><h2>Yayın sahnesi</h2><strong>{s.poem.reader || 'Okuyan kişi seçilmedi'}</strong></div>
            <span className={`status-pill ${s.poem.status}`}>{STATUS_LABELS[s.poem.status]}</span>
          </div>
          <div className="quick-queue">
            <label>Katılımcıyı sıraya ekle <small>{s.poem.queue.length} kişi bekliyor</small></label>
            <div className="row queue-add">
              <input value={newParticipant} maxLength={LIMITS.poemReader} onChange={(e) => setNewParticipant(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addParticipant(); }} placeholder="Katılımcının adı" />
              <button className="btn" disabled={!newParticipant.trim() || s.poem.queue.length >= LIMITS.poemQueue} onClick={addParticipant}>Sıraya ekle</button>
            </div>
            {s.poem.queue.length > 0 && (
              <div className="quick-next"><span>Sıradaki: <strong>{s.poem.queue[0]}</strong></span><button className="btn primary" onClick={() => takeReader(0)}>Sıradakini okuyan yap</button></div>
            )}
          </div>
          <label>Okuyan kişi <small>Şiir metninden bağımsızdır</small><input value={s.poem.reader} maxLength={LIMITS.poemReader} onChange={(e) => setPoemScene({ reader: e.target.value })} placeholder="Sahnedeki kişi" /></label>
          <div className="poem-actions">
            <button className="btn primary" disabled={!s.poem.reader.trim() || s.poem.status === 'live'} onClick={() => update({ concept: 'siir', poem: { ...s.poem, status: 'live' } })}>Sahneyi başlat</button>
            <button className="btn danger" disabled={s.poem.status !== 'live'} onClick={() => setPoemScene({ status: 'finished' })}>Sahneyi bitir</button>
            <button className="btn" disabled={s.poem.status === 'waiting'} onClick={() => setPoemScene({ status: 'waiting' })}>Hazırlığa dön</button>
          </div>
          <p className="hint">Bu düğmeler canlı yayını başlatmaz; yalnızca şiir sahnesinin görünümünü değiştirir.</p>
        </div>

        <div className="card">
          <h2>Görsel atmosfer</h2>
          <p className="hint">Şiir metni yerine yayında bir tema, yerel fotoğraf veya kısa döngü videosu gösterilir. Dosyalar yalnızca bu bilgisayarda saklanır.</p>
          <div className="themes poem-themes">
            {POEM_THEMES.map((theme) => (
              <button key={theme.id} className={`theme-card${s.poem.theme === theme.id ? ' on' : ''}`} onClick={() => setPoemScene({ theme: theme.id })}>
                <div className="swatch">{theme.swatch.map((color) => <span key={color} style={{ background: color }} />)}</div><strong>{theme.name}</strong><small>{theme.description}</small>
              </button>
            ))}
          </div>
          <div className="media-header">
            <h2>Yerel fotoğraf ve videolar</h2>
            <label className={`btn primary file-button${mediaStatus === 'uploading' ? ' disabled' : ''}`}>
              {mediaStatus === 'uploading' ? 'Hazırlanıyor…' : '+ Görsel / video ekle'}
              <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={mediaStatus === 'uploading'} onChange={(e) => { void uploadPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }} />
            </label>
          </div>
          {mediaStatus === 'error' && <p className="form-error">Dosya eklenemedi. 30 MB'den küçük JPG, PNG, WebP, MP4 veya WebM deneyin.</p>}
          {media.length === 0 && mediaStatus !== 'loading' && <p className="hint">Henüz yerel fotoğraf veya video eklenmedi.</p>}
          <div className="media-grid">
            {media.map((item) => (
              <div className={`media-item${s.poem.photoId === item.id ? ' on' : ''}`} key={item.id}>
                <button className="media-select" onClick={() => setPoemScene({ photoId: item.id, photoMode: s.poem.photoMode === 'off' ? 'card' : s.poem.photoMode })}>
                  {item.mime.startsWith('video/') ? <video src={`/api/media/${item.id}`} muted loop playsInline preload="metadata" /> : <img src={`/api/media/${item.id}`} alt="" />}
                  <span title={item.name}>{item.name}</span>
                </button>
                <button className="media-delete" title="Görseli sil" onClick={() => { void deletePhoto(item); }}>✕</button>
              </div>
            ))}
          </div>
          <div className="chips photo-modes">
            {POEM_PHOTO_MODES.map((mode) => (
              <button key={mode} className={`chip${s.poem.photoMode === mode ? ' on' : ''}`} disabled={mode !== 'off' && !s.poem.photoId} onClick={() => setPoemScene({ photoMode: mode })}>{PHOTO_MODE_LABELS[mode]}</button>
            ))}
          </div>
          {s.poem.photoMode !== 'off' && s.poem.photoId && (
            <label className="photo-opacity">Fotoğraf görünürlüğü <small>%{s.poem.photoOpacity}</small><input type="range" min={LIMITS.photoOpacity[0]} max={LIMITS.photoOpacity[1]} value={s.poem.photoOpacity} onChange={(e) => setPoemScene({ photoOpacity: Number(e.target.value) })} /></label>
          )}
        </div>

        <div className="card audio-card">
          <div className="status-strip">
            <div>
              <h2>Fon müziği</h2>
              <strong>{selectedAudio?.name ?? 'Müzik seçilmedi'}</strong>
            </div>
            <span className="private-pill">Yerel ses</span>
          </div>
          <p className="hint">Yalnızca yayın hakkınız bulunan MP3, WAV, M4A, OGG veya WebM dosyalarını kullanın. Müzik bu panelde çalar; TikTok LIVE Studio'da sistem/uygulama sesi açık olmalıdır.</p>
          <div className="audio-toolbar">
            <label className={`btn primary file-button${audioStatus === 'uploading' ? ' disabled' : ''}`}>
              {audioStatus === 'uploading' ? 'Yükleniyor…' : '+ Müzik ekle'}
              <input type="file" accept=".mp3,.wav,.m4a,.ogg,.webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm" disabled={audioStatus === 'uploading'} onChange={(e) => { void uploadAudio(e.target.files?.[0]); e.currentTarget.value = ''; }} />
            </label>
            <button className="btn primary" disabled={!selectedAudio || playing} onClick={() => { void playAudio(); }}>▶ Yumuşak başlat</button>
            <button className="btn" disabled={!selectedAudio || !playing} onClick={pauseAudio}>Ⅱ Yumuşak duraklat</button>
            <button className="btn" disabled={!selectedAudio} onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; }}>Başa al</button>
          </div>
          {audioStatus === 'error' && <p className="form-error">Müzik işlemi tamamlanamadı. Desteklenen ve 25 MB'den küçük bir ses dosyası deneyin.</p>}
          <div className="audio-list">
            {audioItems.length === 0 && audioStatus !== 'loading' && <p className="hint">Henüz fon müziği eklenmedi.</p>}
            {audioItems.map((item) => (
              <div className={`audio-row${selectedAudioId === item.id ? ' on' : ''}`} key={item.id}>
                <button className="audio-select" onClick={() => selectAudio(item.id)}><span className="audio-icon">♫</span><span title={item.name}>{item.name}</span></button>
                <button className="btn ghost square" title="Müziği sil" onClick={() => { void deleteAudio(item); }}>✕</button>
              </div>
            ))}
          </div>
          <div className="audio-settings">
            <label className="grow">Fon sesi <small>%{volume}</small><input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></label>
            <label className="check compact"><input type="checkbox" checked={loopAudio} onChange={(e) => setLoopAudio(e.target.checked)} />Döngüde çal</label>
          </div>
          {selectedAudio && (
            <audio
              ref={audioRef}
              key={selectedAudio.id}
              src={`/api/audio/${selectedAudio.id}`}
              loop={loopAudio}
              preload="metadata"
              onEnded={() => setPlaying(false)}
              onError={() => setAudioStatus('error')}
            />
          )}
          <div className={`audio-state${playing ? ' playing' : ''}`}><span className="dot" />{playing ? 'Fon müziği çalıyor' : 'Fon müziği duraklatıldı'}</div>
        </div>

        <div className="card">
          <div className="status-strip">
            <div><h2>Katılımcı sırası</h2><span className="hint">{s.poem.queue.length ? `Sıradaki: ${s.poem.queue[0]}` : 'Sıra boş'}</span></div>
            <label className="check compact"><input type="checkbox" checked={s.poem.showNext} onChange={(e) => setPoemScene({ showNext: e.target.checked })} />Sıradakini göster</label>
          </div>
          <div className="row queue-add">
            <input value={newParticipant} maxLength={LIMITS.poemReader} onChange={(e) => setNewParticipant(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addParticipant(); }} placeholder="Katılımcı adı" />
            <button className="btn" disabled={!newParticipant.trim() || s.poem.queue.length >= LIMITS.poemQueue} onClick={addParticipant}>Sıraya ekle</button>
          </div>
          {s.poem.queue.length === 0 && <p className="hint">Henüz sırada katılımcı yok.</p>}
          <div className="queue-list">
            {s.poem.queue.map((name, index) => (
              <div className="queue-row" key={`${index}:${name}`}>
                <span className="queue-index">{index + 1}</span>
                <input value={name} maxLength={LIMITS.poemReader} onChange={(e) => setPoemScene({ queue: s.poem.queue.map((item, i) => i === index ? e.target.value : item) })} />
                <button className="btn" onClick={() => takeReader(index)}>Okuyan yap</button>
                <button className="btn ghost square" disabled={index === 0} title="Yukarı taşı" onClick={() => move(index, -1)}>↑</button>
                <button className="btn ghost square" disabled={index === s.poem.queue.length - 1} title="Aşağı taşı" onClick={() => move(index, 1)}>↓</button>
                <button className="btn ghost square" title="Sil" onClick={() => setPoemScene({ queue: s.poem.queue.filter((_, i) => i !== index) })}>✕</button>
              </div>
            ))}
          </div>
          {s.poem.queue.length > 0 && <div className="actions"><button className="btn primary" onClick={() => takeReader(0)}>Sıradakini sahneye al</button></div>}
        </div>
      </section>

      <section className="col sticky">
        <div className="card center"><h2>Canlı önizleme</h2><Preview s={s} ui={ui} /></div>
      </section>
    </div>
  );
}
