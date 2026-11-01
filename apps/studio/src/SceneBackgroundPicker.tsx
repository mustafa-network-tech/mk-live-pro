import { useEffect, useState } from 'react';
import { LIMITS } from '../../../packages/shared/src/index.ts';
import type { MediaItem, SceneBackgroundConcept } from '../../../packages/shared/src/index.ts';
import type { PageProps } from './App.tsx';

const LABELS: Record<SceneBackgroundConcept, string> = {
  yarisma: 'Yarışma sahnesi fotoğrafı',
  sohbet: 'Sohbet sahnesi fotoğrafı',
  turku: 'Türkü sahnesi fotoğrafı',
};

async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Fotoğraf hazırlanamadı.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Fotoğraf hazırlanamadı.')), 'image/webp', 0.86));
}
function imageMime(file: File): MediaItem['mime'] | null {
  const type = file.type.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp') return type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

export function SceneBackgroundPicker({ concept, s, update }: Pick<PageProps, 's' | 'update'> & { concept: SceneBackgroundConcept }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'uploading' | 'error'>('loading');
  const background = s.sceneBackgrounds[concept];
  const setBackground = (patch: Partial<typeof background>) => update({
    sceneBackgrounds: { ...s.sceneBackgrounds, [concept]: { ...background, ...patch } },
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/media')
      .then((response) => {
        if (!response.ok) throw new Error('Fotoğraflar alınamadı.');
        return response.json() as Promise<MediaItem[]>;
      })
      .then((media) => {
        if (!cancelled) {
          setItems(media.filter((item) => item.mime.startsWith('image/')));
          setStatus('ready');
        }
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  const upload = async (file: File | undefined) => {
    if (!file || !imageMime(file)) {
      setStatus('error');
      return;
    }
    setStatus('uploading');
    try {
      const blob = await prepareImage(file);
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': blob.type, 'X-MK-Filename': encodeURIComponent(file.name) },
        body: blob,
      });
      if (!response.ok) throw new Error('Fotoğraf yüklenemedi.');
      const item = await response.json() as MediaItem;
      setItems((current) => [item, ...current]);
      setBackground({ photoId: item.id });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  return <details className="card scene-background-picker">
    <summary>🖼 {LABELS[concept]} {background.photoId ? '— Açık' : '— Kapalı'}</summary>
    <div className="scene-background-content">
      <div className="media-header">
        <div><h2>Yerel fotoğraflar</h2><span className="hint">Fotoğraf yalnızca bu stüdyoda kullanılır; buluta yüklenmez.</span></div>
        <label className={`btn primary file-button${status === 'uploading' ? ' disabled' : ''}`}>{status === 'uploading' ? 'Hazırlanıyor…' : '+ Fotoğraf ekle'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={status === 'uploading'} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
      </div>
      {status === 'error' && <p className="form-error">JPG, PNG veya WebP fotoğraf ekleyin.</p>}
      <div className="media-grid scene-bg-grid">
        {items.map((item) => <div className={`media-item${background.photoId === item.id ? ' on' : ''}`} key={item.id}>
          <button className="media-select" onClick={() => setBackground({ photoId: item.id })}><img src={`/api/media/${item.id}`} alt="" /><span>{item.name}</span></button>
        </div>)}
      </div>
      {items.length === 0 && status === 'ready' && <p className="hint">Henüz fotoğraf yok. Buradan yeni bir fotoğraf ekleyebilirsiniz.</p>}
      <div className="arena-actions"><button className="btn" disabled={!background.photoId} onClick={() => setBackground({ photoId: '' })}>Fotoğrafı kapat</button></div>
      {background.photoId && <div className="scene-bg-sliders">
        <label>Fotoğraf görünürlüğü <small>%{background.opacity}</small><input type="range" min={LIMITS.backgroundOpacity[0]} max={LIMITS.backgroundOpacity[1]} value={background.opacity} onChange={(event) => setBackground({ opacity: Number(event.target.value) })} /></label>
        <label>Karartma <small>%{background.darkness}</small><input type="range" min={LIMITS.backgroundDarkness[0]} max={LIMITS.backgroundDarkness[1]} value={background.darkness} onChange={(event) => setBackground({ darkness: Number(event.target.value) })} /></label>
        <label>Bulanıklık <small>{background.blur}px</small><input type="range" min={LIMITS.backgroundBlur[0]} max={LIMITS.backgroundBlur[1]} value={background.blur} onChange={(event) => setBackground({ blur: Number(event.target.value) })} /></label>
      </div>}
    </div>
  </details>;
}
