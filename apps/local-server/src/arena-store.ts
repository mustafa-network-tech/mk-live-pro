import fs from 'node:fs';
import path from 'node:path';
import {
  arenaPointsForElapsed,
  arenaStats,
  matchArenaAnswer,
  rankArenaParticipants,
} from '../../../packages/shared/src/index.ts';
import type {
  ArenaAnswer,
  ArenaCommand,
  ArenaCommandResult,
  ArenaCommentEvent,
  ArenaCorrection,
  ArenaParticipant,
  ArenaPhase,
  ArenaPublicQuestion,
  ArenaPublicState,
  ArenaStudioState,
  ArenaTestId,
  ArenaTournamentStatus,
} from '../../../packages/shared/src/index.ts';
import type { ArenaQuestionStore } from './arena-question-store.ts';

interface ArenaPersistentState {
  rev: number;
  tournamentStatus: ArenaTournamentStatus;
  phase: ArenaPhase;
  pausedPhase: ArenaPhase | null;
  selectedTestId: ArenaTestId;
  questionIndex: number;
  questionVisible: boolean;
  autoOpenAnswers: boolean;
  phaseEndsAt: number;
  pausedRemainingMs: number;
  answerOpenedAt: number;
  answers: Record<string, ArenaAnswer[]>;
  participants: Record<string, ArenaParticipant>;
  corrections: ArenaCorrection[];
  completedQuestionIds: string[];
  processedEventIds: string[];
}

const DEFAULT_ARENA_STATE: ArenaPersistentState = {
  rev: 0,
  tournamentStatus: 'idle',
  phase: 'idle',
  pausedPhase: null,
  selectedTestId: 1,
  questionIndex: 0,
  questionVisible: false,
  autoOpenAnswers: true,
  phaseEndsAt: 0,
  pausedRemainingMs: 0,
  answerOpenedAt: 0,
  answers: {},
  participants: {},
  corrections: [],
  completedQuestionIds: [],
  processedEventIds: [],
};

const result = (ok: boolean, message: string): ArenaCommandResult => ({ ok, message });

export function createArenaStore(dataDir: string, questionStore: ArenaQuestionStore) {
  const file = path.join(dataDir, 'arena.json');
  let state = load();
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  function load(): ArenaPersistentState {
    try {
      if (!fs.existsSync(file)) return structuredClone(DEFAULT_ARENA_STATE);
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<ArenaPersistentState>;
      return {
        ...structuredClone(DEFAULT_ARENA_STATE),
        ...raw,
        answers: raw.answers && typeof raw.answers === 'object' ? raw.answers : {},
        participants: raw.participants && typeof raw.participants === 'object' ? raw.participants : {},
        corrections: Array.isArray(raw.corrections) ? raw.corrections.slice(-500) : [],
        completedQuestionIds: Array.isArray(raw.completedQuestionIds) ? raw.completedQuestionIds.filter((id): id is string => typeof id === 'string') : [],
        processedEventIds: Array.isArray(raw.processedEventIds) ? raw.processedEventIds.filter((id): id is string => typeof id === 'string').slice(-5000) : [],
      };
    } catch {
      try { fs.renameSync(file, `${file}.bozuk-${Date.now()}`); } catch { /* yedeklenemedi */ }
      return structuredClone(DEFAULT_ARENA_STATE);
    }
  }

  function scheduleSave() {
    saveTimer ??= setTimeout(flush, 150);
  }

  function flush() {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  }

  function touch() {
    state.rev++;
    scheduleSave();
  }

  function questions() {
    return questionStore.forTest(state.selectedTestId);
  }

  function currentQuestion() {
    return questions()[state.questionIndex] ?? null;
  }

  function currentAnswers(): ArenaAnswer[] {
    const question = currentQuestion();
    return question ? state.answers[question.id] ?? [] : [];
  }

  function participant(userId: string, displayName: string): ArenaParticipant {
    const existing = state.participants[userId];
    if (existing) {
      existing.displayName = displayName || existing.displayName;
      existing.stageCorrectCounts ??= [0, 0, 0];
      existing.stageCorrectTimeMs ??= [0, 0, 0];
      return existing;
    }
    const created: ArenaParticipant = {
      userId,
      displayName,
      stageScores: [0, 0, 0],
      totalScore: 0,
      correctCount: 0,
      correctTimeMs: 0,
      stageCorrectCounts: [0, 0, 0],
      stageCorrectTimeMs: [0, 0, 0],
    };
    state.participants[userId] = created;
    return created;
  }

  function rollbackCurrentQuestion() {
    const question = currentQuestion();
    if (!question) return;
    for (const answer of state.answers[question.id] ?? []) {
      const p = state.participants[answer.userId];
      if (!p || !answer.correct) continue;
      const stage = question.testId - 1;
      p.stageScores[stage] = Math.max(0, p.stageScores[stage] - answer.points);
      p.totalScore = p.stageScores[0] + p.stageScores[1] + p.stageScores[2];
      p.correctCount = Math.max(0, p.correctCount - 1);
      p.correctTimeMs = Math.max(0, p.correctTimeMs - answer.elapsedMs);
      p.stageCorrectCounts[stage] = Math.max(0, p.stageCorrectCounts[stage] - 1);
      p.stageCorrectTimeMs[stage] = Math.max(0, p.stageCorrectTimeMs[stage] - answer.elapsedMs);
    }
    delete state.answers[question.id];
    state.completedQuestionIds = state.completedQuestionIds.filter((id) => id !== question.id);
  }

  function openAnswers(now = Date.now()) {
    state.phase = 'answering';
    state.pausedPhase = null;
    state.answerOpenedAt = now;
    state.phaseEndsAt = now + 50_000;
    state.pausedRemainingMs = 0;
  }

  function lockAnswers() {
    state.phase = 'locked';
    state.phaseEndsAt = 0;
    state.pausedRemainingMs = 0;
  }

  function tick(now = Date.now()): boolean {
    if (!state.phaseEndsAt || now < state.phaseEndsAt) return false;
    if (state.phase === 'reading') {
      if (state.autoOpenAnswers) openAnswers(now);
      else state.phaseEndsAt = 0;
      touch();
      return true;
    }
    if (state.phase === 'answering') {
      lockAnswers();
      touch();
      return true;
    }
    return false;
  }

  function submitComment(event: ArenaCommentEvent): ArenaCommandResult {
    const question = currentQuestion();
    if (!question || state.phase !== 'answering') return result(false, 'Cevap süresi açık değil.');
    if (!event.userId.trim() || !event.displayName.trim()) return result(false, 'Kararlı kullanıcı kimliği ve görünen ad zorunludur.');
    if (state.processedEventIds.includes(event.eventId)) return result(false, 'Bu yorum olayı daha önce işlendi.');
    const elapsedMs = event.receivedAt - state.answerOpenedAt;
    if (elapsedMs < 0 || elapsedMs >= 50_000 || event.receivedAt >= state.phaseEndsAt) return result(false, 'Cevap süresi doldu.');
    const answers = state.answers[question.id] ?? [];
    if (answers.some((answer) => answer.userId === event.userId)) return result(false, 'Bu kullanıcı bu soruya daha önce cevap verdi.');
    const option = matchArenaAnswer(event.comment, question);
    if (!option) return result(false, 'Yorum tek ve açık bir şıkla eşleşmedi.');
    const correct = option === question.correctOption;
    const points = correct ? arenaPointsForElapsed(elapsedMs) : 0;
    const answer: ArenaAnswer = {
      userId: event.userId.trim().slice(0, 120),
      displayName: event.displayName.trim().slice(0, 80),
      option,
      receivedAt: event.receivedAt,
      elapsedMs,
      points,
      correct,
      source: event.source,
      eventId: event.eventId,
    };
    answers.push(answer);
    state.answers[question.id] = answers;
    state.processedEventIds.push(event.eventId);
    state.processedEventIds = state.processedEventIds.slice(-5000);
    const p = participant(answer.userId, answer.displayName);
    if (correct) {
      const stage = question.testId - 1;
      p.stageScores[stage] = Math.min(100, p.stageScores[stage] + points);
      p.totalScore = Math.min(300, p.stageScores[0] + p.stageScores[1] + p.stageScores[2]);
      p.correctCount++;
      p.correctTimeMs += elapsedMs;
      p.stageCorrectCounts[stage]++;
      p.stageCorrectTimeMs[stage] += elapsedMs;
    }
    touch();
    return result(true, `${answer.displayName}: ${option} kaydedildi (${points} puan).`);
  }

  function adjustScore(userId: string, deltaRaw: number, reasonRaw: string): ArenaCommandResult {
    const p = state.participants[userId];
    if (!p) return result(false, 'Katılımcı bulunamadı.');
    const requestedDelta = Math.max(-100, Math.min(100, Math.trunc(deltaRaw)));
    const reason = reasonRaw.trim().slice(0, 160);
    if (!requestedDelta || !reason) return result(false, 'Düzeltme miktarı ve gerekçe zorunludur.');
    const stage = state.selectedTestId - 1;
    const before = p.stageScores[stage];
    p.stageScores[stage] = Math.max(0, Math.min(100, before + requestedDelta));
    p.totalScore = Math.max(0, Math.min(300, p.stageScores[0] + p.stageScores[1] + p.stageScores[2]));
    const correction: ArenaCorrection = {
      id: crypto.randomUUID(),
      userId,
      testId: state.selectedTestId,
      requestedDelta,
      appliedDelta: p.stageScores[stage] - before,
      reason,
      createdAt: Date.now(),
    };
    state.corrections.push(correction);
    state.corrections = state.corrections.slice(-500);
    touch();
    return result(true, `${p.displayName} için ${correction.appliedDelta > 0 ? '+' : ''}${correction.appliedDelta} puan uygulandı.`);
  }

  function command(command: ArenaCommand): ArenaCommandResult {
    const now = Date.now();
    tick(now);
    switch (command.type) {
      case 'start-tournament':
        state = { ...structuredClone(DEFAULT_ARENA_STATE), rev: state.rev + 1, tournamentStatus: 'running', phase: 'hidden' };
        scheduleSave();
        return result(true, 'Bilgi Arenası başlatıldı.');
      case 'pause-tournament':
        if (state.tournamentStatus !== 'running') return result(false, 'Turnuva çalışmıyor.');
        state.tournamentStatus = 'paused';
        state.pausedPhase = state.phase;
        state.pausedRemainingMs = state.phaseEndsAt ? Math.max(0, state.phaseEndsAt - now) : 0;
        state.phaseEndsAt = 0;
        state.phase = 'paused';
        touch();
        return result(true, 'Turnuva duraklatıldı.');
      case 'finish-tournament':
        state.tournamentStatus = 'finished';
        state.phase = 'final-results';
        state.phaseEndsAt = 0;
        state.questionVisible = false;
        touch();
        return result(true, 'Turnuva final sonuçlarıyla tamamlandı.');
      case 'reset-tournament':
        state = { ...structuredClone(DEFAULT_ARENA_STATE), rev: state.rev + 1 };
        scheduleSave();
        return result(true, 'Turnuva sıfırlandı.');
      case 'select-test':
        state.selectedTestId = command.testId;
        state.questionIndex = 0;
        state.phase = 'hidden';
        state.questionVisible = false;
        state.phaseEndsAt = 0;
        state.tournamentStatus = state.tournamentStatus === 'idle' ? 'running' : state.tournamentStatus;
        touch();
        return result(true, `Test ${command.testId} seçildi.`);
      case 'set-auto-open':
        state.autoOpenAnswers = command.value;
        touch();
        return result(true, command.value ? 'Otomatik cevap açma etkin.' : 'Cevaplar yalnızca sunucu komutuyla açılacak.');
      case 'show-question':
        state.questionVisible = command.value;
        touch();
        return result(true, command.value ? 'Soru yayında gösteriliyor.' : 'Soru yayından gizlendi.');
      case 'start-reading': {
        const q = currentQuestion();
        if (!q) return result(false, 'Soru bulunamadı.');
        rollbackCurrentQuestion();
        state.tournamentStatus = 'running';
        state.phase = 'reading';
        state.questionVisible = true;
        state.phaseEndsAt = now + q.readingSeconds * 1000;
        state.answerOpenedAt = 0;
        touch();
        return result(true, 'Okuma süresi başladı; cevap kabul edilmiyor.');
      }
      case 'extend-reading':
        if (state.phase !== 'reading') return result(false, 'Okuma aşaması aktif değil.');
        state.phaseEndsAt = Math.max(now, state.phaseEndsAt) + Math.max(1, Math.min(60, Math.trunc(command.seconds))) * 1000;
        touch();
        return result(true, 'Okuma süresi uzatıldı.');
      case 'open-answers':
        if (state.phase !== 'reading' && state.phase !== 'locked') return result(false, 'Cevaplar bu aşamada açılamaz.');
        openAnswers(now);
        touch();
        return result(true, '50 saniyelik cevap süresi başladı.');
      case 'toggle-timer':
        if (state.phase === 'paused' && state.pausedPhase) {
          state.tournamentStatus = 'running';
          state.phase = state.pausedPhase;
          state.phaseEndsAt = state.pausedRemainingMs ? now + state.pausedRemainingMs : 0;
          state.pausedPhase = null;
          state.pausedRemainingMs = 0;
          touch();
          return result(true, 'Sayaç devam ediyor.');
        }
        if (state.phase !== 'reading' && state.phase !== 'answering') return result(false, 'Aktif sayaç yok.');
        state.pausedPhase = state.phase;
        state.pausedRemainingMs = Math.max(0, state.phaseEndsAt - now);
        state.phase = 'paused';
        state.phaseEndsAt = 0;
        touch();
        return result(true, 'Sayaç duraklatıldı.');
      case 'lock-answers':
        if (state.phase !== 'answering' && state.phase !== 'paused') return result(false, 'Cevap süresi aktif değil.');
        lockAnswers();
        touch();
        return result(true, 'Cevaplar kilitlendi.');
      case 'reveal-answer':
        if (!['locked', 'revealed', 'results'].includes(state.phase)) return result(false, 'Önce cevapları kilitleyin.');
        state.phase = 'revealed';
        state.phaseEndsAt = 0;
        touch();
        return result(true, 'Doğru cevap açıklandı.');
      case 'show-results': {
        if (!['locked', 'revealed', 'results'].includes(state.phase)) return result(false, 'Sonuçlar bu aşamada gösterilemez.');
        const q = currentQuestion();
        if (q && !state.completedQuestionIds.includes(q.id)) state.completedQuestionIds.push(q.id);
        state.phase = 'results';
        touch();
        return result(true, 'Cevap dağılımı ve sonuçlar gösteriliyor.');
      }
      case 'next-question':
        if (state.questionIndex < 9) {
          state.questionIndex++;
          state.phase = 'hidden';
          state.questionVisible = false;
        } else if (state.selectedTestId < 3) {
          state.phase = 'stage-results';
          state.questionVisible = false;
        } else {
          state.tournamentStatus = 'finished';
          state.phase = 'final-results';
          state.questionVisible = false;
        }
        state.phaseEndsAt = 0;
        touch();
        return result(true, state.phase === 'hidden' ? 'Sonraki soruya geçildi.' : 'Aşama sonuçları gösteriliyor.');
      case 'previous-question':
        if (state.questionIndex <= 0) return result(false, 'İlk sorudasınız.');
        state.questionIndex--;
        state.phase = 'hidden';
        state.questionVisible = false;
        state.phaseEndsAt = 0;
        touch();
        return result(true, 'Önceki soruya dönüldü.');
      case 'restart-question':
        rollbackCurrentQuestion();
        state.phase = 'hidden';
        state.questionVisible = true;
        state.phaseEndsAt = 0;
        state.answerOpenedAt = 0;
        touch();
        return result(true, 'Soru cevapları ve puanları geri alınarak yeniden hazırlandı.');
      case 'submit-comment':
        return submitComment({
          eventId: command.eventId?.trim().slice(0, 160) || crypto.randomUUID(),
          userId: command.userId,
          displayName: command.displayName,
          comment: command.comment,
          source: command.source,
          receivedAt: now,
        });
      case 'adjust-score':
        return adjustScore(command.userId, command.delta, command.reason);
    }
  }

  function remainingSeconds(now: number): number {
    if (state.phase === 'paused') return Math.ceil(state.pausedRemainingMs / 1000);
    return state.phaseEndsAt ? Math.max(0, Math.ceil((state.phaseEndsAt - now) / 1000)) : 0;
  }

  function getPublic(now = Date.now()): ArenaPublicState {
    const question = currentQuestion();
    const reveal = state.phase === 'revealed' || state.phase === 'results';
    let publicQuestion: ArenaPublicQuestion | null = null;
    if (question && state.questionVisible) {
      const { correctOption, acceptedAnswers: _acceptedAnswers, ...safe } = question;
      publicQuestion = reveal ? { ...safe, correctOption, correctAnswer: question.options[correctOption] } : safe;
    }
    const answers = currentAnswers();
    return {
      rev: state.rev,
      tournamentStatus: state.tournamentStatus,
      phase: state.phase,
      pausedPhase: state.pausedPhase,
      selectedTestId: state.selectedTestId,
      questionIndex: state.questionIndex,
      questionNumber: state.questionIndex + 1,
      questionVisible: state.questionVisible,
      autoOpenAnswers: state.autoOpenAnswers,
      remainingSeconds: remainingSeconds(now),
      serverNow: now,
      currentQuestion: publicQuestion,
      answerCount: answers.length,
      stats: reveal ? arenaStats(answers) : null,
      stageRanking: rankArenaParticipants(Object.values(state.participants), state.selectedTestId, 'stage'),
      overallRanking: rankArenaParticipants(Object.values(state.participants), state.selectedTestId, 'overall'),
      provider: {
        mode: 'manual-demo',
        realIntegration: false,
        label: 'Gerçek TikTok yorum entegrasyonu bağlı değil',
        timingNotice: 'Puan süresi, yorumun yerel sunucuya ulaştığı ana göre hesaplanır; yayın gecikmesi nedeniyle kesin adalet garantisi vermez.',
      },
    };
  }

  function getStudio(now = Date.now()): ArenaStudioState {
    return {
      ...getPublic(now),
      currentQuestionPrivate: currentQuestion(),
      answers: currentAnswers(),
      participants: Object.values(state.participants),
      corrections: state.corrections,
      completedQuestionIds: state.completedQuestionIds,
    };
  }

  return { command, submitComment, tick, getPublic, getStudio, flush };
}

export type ArenaStore = ReturnType<typeof createArenaStore>;
