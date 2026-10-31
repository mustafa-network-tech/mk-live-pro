export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="card placeholder">
      <h2>{title}</h2>
      <p>Bu bölüm henüz geliştirilmedi ({phase}). Şu an yalnızca çekirdek (Faz 1A) hazır: başlık, tema, katman ve canlı senkronizasyon.</p>
    </div>
  );
}
