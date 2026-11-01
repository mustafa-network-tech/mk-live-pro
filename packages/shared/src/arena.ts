export const ARENA_TEST_IDS = [1, 2, 3] as const;
export type ArenaTestId = (typeof ARENA_TEST_IDS)[number];

export const ARENA_OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
export type ArenaOptionKey = (typeof ARENA_OPTION_KEYS)[number];

export const ARENA_PHASES = ['idle', 'hidden', 'reading', 'answering', 'paused', 'locked', 'revealed', 'results', 'stage-results', 'final-results'] as const;
export type ArenaPhase = (typeof ARENA_PHASES)[number];

export type ArenaTournamentStatus = 'idle' | 'running' | 'paused' | 'finished';
export type ArenaAnswerSource = 'manual' | 'demo';

export interface ArenaQuestion {
  id: string;
  testId: ArenaTestId;
  order: number;
  category: string;
  difficulty: 'kolay-orta' | 'orta' | 'orta-zor';
  question: string;
  options: Record<ArenaOptionKey, string>;
  correctOption: ArenaOptionKey;
  acceptedAnswers: string[];
  readingSeconds: number;
  answeringSeconds: 50;
  maximumPoints: 10;
}
export type ArenaPublicQuestion = Omit<ArenaQuestion, 'correctOption' | 'acceptedAnswers'> & {
  correctOption?: ArenaOptionKey;
  correctAnswer?: string;
};

export interface ArenaAnswer {
  userId: string;
  displayName: string;
  option: ArenaOptionKey;
  receivedAt: number;
  elapsedMs: number;
  points: number;
  correct: boolean;
  source: ArenaAnswerSource;
  eventId: string;
}

export interface ArenaParticipant {
  userId: string;
  displayName: string;
  stageScores: [number, number, number];
  totalScore: number;
  correctCount: number;
  correctTimeMs: number;
  stageCorrectCounts: [number, number, number];
  stageCorrectTimeMs: [number, number, number];
}

export interface ArenaCorrection {
  id: string;
  userId: string;
  testId: ArenaTestId;
  requestedDelta: number;
  appliedDelta: number;
  reason: string;
  createdAt: number;
}

export interface ArenaStats {
  validParticipants: number;
  options: Record<ArenaOptionKey, number>;
  correctCount: number;
  wrongCount: number;
  correctPercent: number;
  averageAnswerSeconds: number;
  fastestCorrect: Array<{ userId: string; displayName: string; elapsedMs: number; points: number }>;
}

export interface ArenaRankingRow extends ArenaParticipant {
  rank: number;
  tied: boolean;
  stageScore: number;
}

export interface ArenaPublicState {
  rev: number;
  tournamentStatus: ArenaTournamentStatus;
  phase: ArenaPhase;
  pausedPhase: ArenaPhase | null;
  selectedTestId: ArenaTestId;
  questionIndex: number;
  questionNumber: number;
  questionVisible: boolean;
  autoOpenAnswers: boolean;
  remainingSeconds: number;
  serverNow: number;
  currentQuestion: ArenaPublicQuestion | null;
  answerCount: number;
  stats: ArenaStats | null;
  stageRanking: ArenaRankingRow[];
  overallRanking: ArenaRankingRow[];
  provider: {
    mode: 'manual-demo';
    realIntegration: false;
    label: string;
    timingNotice: string;
  };
}

export interface ArenaStudioState extends ArenaPublicState {
  currentQuestionPrivate: ArenaQuestion | null;
  answers: ArenaAnswer[];
  participants: ArenaParticipant[];
  corrections: ArenaCorrection[];
  completedQuestionIds: string[];
}

export type ArenaCommand =
  | { type: 'start-tournament' }
  | { type: 'pause-tournament' }
  | { type: 'finish-tournament' }
  | { type: 'reset-tournament' }
  | { type: 'select-test'; testId: ArenaTestId }
  | { type: 'set-auto-open'; value: boolean }
  | { type: 'show-question'; value: boolean }
  | { type: 'start-reading' }
  | { type: 'extend-reading'; seconds: number }
  | { type: 'open-answers' }
  | { type: 'toggle-timer' }
  | { type: 'lock-answers' }
  | { type: 'reveal-answer' }
  | { type: 'show-results' }
  | { type: 'next-question' }
  | { type: 'previous-question' }
  | { type: 'restart-question' }
  | { type: 'submit-comment'; userId: string; displayName: string; comment: string; source: ArenaAnswerSource; eventId?: string }
  | { type: 'adjust-score'; userId: string; delta: number; reason: string };

export interface ArenaCommandResult {
  ok: boolean;
  message: string;
}

export interface ArenaCommentEvent {
  eventId: string;
  userId: string;
  displayName: string;
  comment: string;
  source: ArenaAnswerSource;
  receivedAt: number;
}

export function arenaPointsForElapsed(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs >= 50_000) return 0;
  return 10 - Math.floor(elapsedMs / 5_000);
}

export function normalizeArenaText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/[’'`´]/g, '')
    .replace(/[^a-zçğıöşü0-9]+/giu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchArenaAnswer(comment: string, question: Pick<ArenaQuestion, 'options' | 'acceptedAnswers' | 'correctOption'>): ArenaOptionKey | null {
  const normalized = normalizeArenaText(comment);
  if (!normalized) return null;

  const candidates = new Set<ArenaOptionKey>();
  for (const key of ARENA_OPTION_KEYS) {
    const lowerKey = key.toLocaleLowerCase('tr-TR');
    const option = normalizeArenaText(question.options[key]);
    const accepted = question.acceptedAnswers.map(normalizeArenaText);
    if (
      normalized === lowerKey
      || normalized === `${lowerKey} şıkkı`
      || normalized === `${lowerKey} sikki`
      || normalized === `cevabım ${lowerKey}`
      || normalized === `cevabim ${lowerKey}`
      || normalized === `${lowerKey} ${option}`
      || normalized === option
      || (question.correctOption === key && accepted.includes(normalized))
    ) candidates.add(key);
  }
  return candidates.size === 1 ? [...candidates][0] : null;
}

export function arenaStats(answers: ArenaAnswer[]): ArenaStats {
  const options: Record<ArenaOptionKey, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const answer of answers) options[answer.option]++;
  const correct = answers.filter((answer) => answer.correct);
  const totalMs = answers.reduce((sum, answer) => sum + answer.elapsedMs, 0);
  return {
    validParticipants: answers.length,
    options,
    correctCount: correct.length,
    wrongCount: answers.length - correct.length,
    correctPercent: answers.length ? Math.round((correct.length / answers.length) * 1000) / 10 : 0,
    averageAnswerSeconds: answers.length ? Math.round((totalMs / answers.length) / 100) / 10 : 0,
    fastestCorrect: [...correct]
      .sort((a, b) => a.elapsedMs - b.elapsedMs)
      .slice(0, 5)
      .map(({ userId, displayName, elapsedMs, points }) => ({ userId, displayName, elapsedMs, points })),
  };
}

export function rankArenaParticipants(participants: ArenaParticipant[], testId: ArenaTestId, scope: 'stage' | 'overall' = 'overall'): ArenaRankingRow[] {
  const rows = [...participants].sort((a, b) =>
    (scope === 'stage' ? b.stageScores[testId - 1] - a.stageScores[testId - 1] : b.totalScore - a.totalScore)
    || (scope === 'stage' ? b.stageCorrectCounts[testId - 1] - a.stageCorrectCounts[testId - 1] : b.correctCount - a.correctCount)
    || (scope === 'stage' ? a.stageCorrectTimeMs[testId - 1] - b.stageCorrectTimeMs[testId - 1] : a.correctTimeMs - b.correctTimeMs)
    || a.displayName.localeCompare(b.displayName, 'tr'),
  );
  let previous: ArenaParticipant | null = null;
  let rank = 0;
  return rows.map((participant, index) => {
    const tied = previous !== null && (scope === 'stage'
      ? participant.stageScores[testId - 1] === previous.stageScores[testId - 1]
        && participant.stageCorrectCounts[testId - 1] === previous.stageCorrectCounts[testId - 1]
        && participant.stageCorrectTimeMs[testId - 1] === previous.stageCorrectTimeMs[testId - 1]
      : participant.totalScore === previous.totalScore
        && participant.correctCount === previous.correctCount
        && participant.correctTimeMs === previous.correctTimeMs);
    if (!tied) rank = index + 1;
    previous = participant;
    return { ...participant, rank, tied, stageScore: participant.stageScores[testId - 1] };
  });
}
