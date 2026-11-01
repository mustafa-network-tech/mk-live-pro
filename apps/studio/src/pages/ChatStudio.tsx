import { useState } from 'react';
import { LIMITS } from '../../../../packages/shared/src/index.ts';
import type { ChatState } from '../../../../packages/shared/src/index.ts';
import type { PageProps } from '../App.tsx';
import { Preview } from '../Preview.tsx';
import { SceneBackgroundPicker } from '../SceneBackgroundPicker.tsx';

export function ChatStudio({ s, update, ui }: PageProps) {
  const [newQuestion, setNewQuestion] = useState('');
  const setChat = (patch: Partial<ChatState>) => update({ chat: { ...s.chat, ...patch } });

  const addQuestion = () => {
    const question = newQuestion.trim();
    if (!question || s.chat.questions.length >= LIMITS.chatQuestions) return;
    setChat({ questions: [...s.chat.questions, question] });
    setNewQuestion('');
  };

  const pickRandom = () => {
    if (!s.chat.questions.length) return;
    const choices = s.chat.questions.length > 1 ? s.chat.questions.filter((question) => question !== s.chat.question) : s.chat.questions;
    const question = choices[Math.floor(Math.random() * choices.length)] ?? s.chat.questions[0];
    update({ concept: 'sohbet', chat: { ...s.chat, question, showQuestion: true } });
  };

  return (
    <div className="grid-2">
      <section className="col">
        <SceneBackgroundPicker concept="sohbet" s={s} update={update} />
        <div className="card">
          <div className="status-strip">
            <div><h2>Günün konusu</h2><strong>{s.chat.topic || 'Konu belirlenmedi'}</strong></div>
            <label className="check compact"><input type="checkbox" checked={s.chat.showTopic} onChange={(event) => setChat({ showTopic: event.target.checked })} />Yayında göster</label>
          </div>
          <label>Konu <small>{s.chat.topic.length}/{LIMITS.chatTopic}</small><input value={s.chat.topic} maxLength={LIMITS.chatTopic} onChange={(event) => setChat({ topic: event.target.value })} placeholder="Örn. İnsan hayatında dostluk" /></label>
          <button className="btn primary" disabled={!s.chat.topic.trim()} onClick={() => update({ concept: 'sohbet', chat: { ...s.chat, showTopic: true } })}>Konuyu sahneye gönder</button>
        </div>

        <div className="card">
          <div className="status-strip">
            <div><h2>Aktif soru kartı</h2><span className="hint">Sohbeti yönlendiren tek soru</span></div>
            <label className="check compact"><input type="checkbox" checked={s.chat.showQuestion} onChange={(event) => setChat({ showQuestion: event.target.checked })} />Yayında göster</label>
          </div>
          <label>Soru <small>{s.chat.question.length}/{LIMITS.chatQuestion}</small><textarea value={s.chat.question} maxLength={LIMITS.chatQuestion} onChange={(event) => setChat({ question: event.target.value })} placeholder="İzleyicilere sorulacak soru…" /></label>
          <div className="poem-actions">
            <button className="btn primary" disabled={!s.chat.question.trim()} onClick={() => update({ concept: 'sohbet', chat: { ...s.chat, showQuestion: true } })}>Soruyu göster</button>
            <button className="btn" disabled={!s.chat.questions.length} onClick={pickRandom}>Rastgele soru seç</button>
            <button className="btn" onClick={() => setChat({ showQuestion: false })}>Kartı gizle</button>
          </div>
        </div>

        <div className="card">
          <h2>Soru kartı havuzu</h2>
          <div className="row queue-add">
            <input value={newQuestion} maxLength={LIMITS.chatQuestion} onChange={(event) => setNewQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addQuestion(); }} placeholder="Yeni sohbet sorusu" />
            <button className="btn" disabled={!newQuestion.trim()} onClick={addQuestion}>Havuza ekle</button>
          </div>
          {s.chat.questions.length === 0 && <p className="hint">Henüz soru kartı yok.</p>}
          <div className="question-list">
            {s.chat.questions.map((question, index) => (
              <div className="question-row" key={`${index}:${question}`}>
                <span>{index + 1}</span>
                <button className="question-pick" onClick={() => update({ concept: 'sohbet', chat: { ...s.chat, question, showQuestion: true } })}>{question}</button>
                <button className="btn ghost square" onClick={() => setChat({ questions: s.chat.questions.filter((_, itemIndex) => itemIndex !== index) })}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="col sticky"><div className="card center"><h2>Canlı önizleme</h2><Preview s={s} ui={ui} /></div></section>
    </div>
  );
}
