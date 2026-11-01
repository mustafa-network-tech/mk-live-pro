import fs from 'node:fs';
import path from 'node:path';
import { ARENA_OPTION_KEYS, ARENA_TEST_IDS } from '../../../packages/shared/src/index.ts';
import type { ArenaOptionKey, ArenaQuestion, ArenaTestId } from '../../../packages/shared/src/index.ts';
import { DEFAULT_ARENA_QUESTIONS } from './arena-questions.ts';

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function sanitizeQuestion(value: unknown): ArenaQuestion | null {
  if (!value || typeof value !== 'object') return null;
  const q = value as Record<string, unknown>;
  const testId = Number(q.testId) as ArenaTestId;
  const correctOption = q.correctOption as ArenaOptionKey;
  const rawOptions = q.options && typeof q.options === 'object' ? q.options as Record<string, unknown> : {};
  const options = Object.fromEntries(ARENA_OPTION_KEYS.map((key) => [key, text(rawOptions[key], 160)])) as Record<ArenaOptionKey, string>;
  if (!ARENA_TEST_IDS.includes(testId) || !ARENA_OPTION_KEYS.includes(correctOption) || Object.values(options).some((option) => !option)) return null;
  const difficulty = testId === 1 ? 'kolay-orta' : testId === 2 ? 'orta' : 'orta-zor';
  const accepted = Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.map((item) => text(item, 160)).filter(Boolean).slice(0, 10) : [];
  return {
    id: text(q.id, 80),
    testId,
    order: Math.trunc(Number(q.order)),
    category: text(q.category, 80),
    difficulty,
    question: text(q.question, 500),
    options,
    correctOption,
    acceptedAnswers: accepted.length ? accepted : [options[correctOption]],
    readingSeconds: Math.min(60, Math.max(5, Math.trunc(Number(q.readingSeconds) || 10))),
    answeringSeconds: 50,
    maximumPoints: 10,
  };
}

function sanitizePackage(input: unknown): ArenaQuestion[] | null {
  if (!Array.isArray(input) || input.length !== 30) return null;
  const questions = input.map(sanitizeQuestion);
  if (questions.some((question) => question === null)) return null;
  const safe = questions as ArenaQuestion[];
  if (new Set(safe.map((question) => question.id)).size !== 30) return null;
  for (const testId of ARENA_TEST_IDS) {
    const test = safe.filter((question) => question.testId === testId).sort((a, b) => a.order - b.order);
    if (test.length !== 10 || test.some((question, index) => question.order !== index + 1)) return null;
  }
  return safe;
}

export function createArenaQuestionStore(dataDir: string) {
  const file = path.join(dataDir, 'arena-questions.json');
  let questions = load();

  function load(): ArenaQuestion[] {
    try {
      if (!fs.existsSync(file)) return structuredClone(DEFAULT_ARENA_QUESTIONS);
      return sanitizePackage(JSON.parse(fs.readFileSync(file, 'utf8'))) ?? structuredClone(DEFAULT_ARENA_QUESTIONS);
    } catch {
      return structuredClone(DEFAULT_ARENA_QUESTIONS);
    }
  }

  function write() {
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(questions, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  }

  return {
    get: () => structuredClone(questions),
    forTest: (testId: ArenaTestId) => questions.filter((question) => question.testId === testId).sort((a, b) => a.order - b.order),
    replace(input: unknown) {
      const next = sanitizePackage(input);
      if (!next) throw new Error('Paket tam olarak 3 test ve her testte 10 geçerli soru içermelidir.');
      questions = next;
      write();
      return structuredClone(questions);
    },
    reset() {
      questions = structuredClone(DEFAULT_ARENA_QUESTIONS);
      write();
      return structuredClone(questions);
    },
  };
}

export type ArenaQuestionStore = ReturnType<typeof createArenaQuestionStore>;
