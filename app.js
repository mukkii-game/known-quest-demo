"use strict";

const ROUTE_CARD_COUNT = 30;
const NETWORK_LIMIT = 30;
const DEFAULT_ANSWER_REVEAL_MS = 2000;
const ANSWER_REVEAL_MS = Number.isFinite(window.__KQ_TEST_REVEAL_MS)
  ? Math.max(80, Number(window.__KQ_TEST_REVEAL_MS))
  : DEFAULT_ANSWER_REVEAL_MS;
const STORAGE_VERSION = 1;
const STORAGE_KEY = "known-quest-demo:v1";
const ACTIVE_ROUTES = Object.freeze(["sega", "nintendo", "sony", "xbox", "mycom"]);
const STORAGE_MODE_KEYS = ["sega", "other", "nintendo", "sony", "xbox", "mycom"];
const MODE_LABELS = Object.freeze({
  sega: "セガ派",
  other: "旧・その他派",
  nintendo: "任天堂派",
  sony: "PS派",
  xbox: "Xbox派",
  mycom: "マイコン族"
});
const BASE_ROUTE_LABELS = Object.freeze({
  sega: "SEGA ENGLISH",
  nintendo: "NINTENDO ENGLISH",
  sony: "PLAYSTATION ENGLISH",
  xbox: "XBOX ENGLISH",
  mycom: "RETRO PC ENGLISH"
});
const ROUTE_RANK_LABELS = Object.freeze({
  sega: "セガ",
  nintendo: "任天堂",
  sony: "ソニー",
  xbox: "Xbox",
  mycom: "マイコン"
});
const BAND_META = Object.freeze({
  beginner: { quota: 4, weight: 1 },
  intermediate: { quota: 3, weight: 2 },
  advanced: { quota: 3, weight: 3 }
});

const ROUTE_CARDS = Object.freeze({ sega: segaCards, nintendo: nintendoCards, sony: sonyCards, xbox: xboxCards, mycom: mycomCards });
if (ACTIVE_ROUTES.some((route) => !Array.isArray(ROUTE_CARDS[route]) || ROUTE_CARDS[route].length !== ROUTE_CARD_COUNT)) {
  throw new Error("Each Gamer Word Quest route requires exactly 30 title cards.");
}

const $ = (id) => document.getElementById(id);
const state = {
  route: null,
  pendingRoute: null,
  playCards: null,
  cardIndex: 0,
  answers: [],
  networkQueue: [],
  networkIndex: 0,
  networkChoices: [],
  networkLinks: new Map(),
  selectedSide: null,
  canAdvanceNetwork: false,
  isAnimating: false,
  soundEnabled: true,
  answerTimer: null,
  drag: null,
  routeDrag: null,
  newlyKnownKeys: new Set(),
  progress: loadProgress()
};
let answerAudioContext = null;

function normalizeEnglish(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function baseCardsForRoute(route) {
  return ROUTE_CARDS[route] || [];
}

function activeCards() {
  if (Array.isArray(state.playCards)) return state.playCards;
  return state.route ? baseCardsForRoute(state.route) : [];
}

function routeTotal() {
  return activeCards().length;
}

function routeLabel(route = state.route) {
  return MODE_LABELS[route] || "ゲーム";
}

function routeCardLabel(route = state.route) {
  return BASE_ROUTE_LABELS[route] || "GAMER ENGLISH";
}

function cardKey(card) {
  return wordKey(learningWordsForCard(card)[0]) || normalizeEnglish(card?.english) || String(card?.questionId || card?.entryId || "");
}

function titleKey(card, route = state.route) {
  return `${route || card?.mode || "game"}|${String(card?.entryId || card?.questionId || "")}`;
}

function learningWordsForCard(card) {
  if (Array.isArray(card?.learningWords) && card.learningWords.length) return card.learningWords;
  return card ? [{ display: card.english, lemma: card.english, senseId: "", meaningJa: card.meaningJa || card.answerJa || "" }] : [];
}

function nonlearningTokensForCard(card) {
  return Array.isArray(card?.nonlearningTokens) ? card.nonlearningTokens : [];
}

function displayWordsForCard(card) {
  return [
    ...learningWordsForCard(card).map((word) => ({ ...word, isLearningTarget: true })),
    ...nonlearningTokensForCard(card).map((word) => ({ ...word, meaningJa: word.labelJa, isLearningTarget: false }))
  ].sort((a, b) => Number(a.order) - Number(b.order));
}

function allLearningWordsKnown(card) {
  return learningWordsForCard(card).every(isWordKnown);
}

function wordKey(word) {
  const sense = String(word?.senseId || "").trim().toLowerCase();
  return sense || normalizeEnglish(word?.lemma || word?.display || word?.english);
}

function migratedWordKey(legacyKey, value = {}) {
  const surface = normalizeEnglish(legacyKey);
  const matches = [];
  Object.entries(ROUTE_CARDS).forEach(([route, cards]) => {
    cards.forEach((card) => {
      learningWordsForCard(card).forEach((word) => {
        if (normalizeEnglish(word.display) === surface) matches.push({ route, card, key: wordKey(word) });
      });
    });
  });
  if (!matches.length) return String(legacyKey);
  const sourceTitle = String(value.sourceTitle || "");
  const firstMode = String(value.firstMode || "");
  const preferred = matches.filter(({ route, card }) => (sourceTitle && [card.sourceTitle, card.titleDisplay].includes(sourceTitle)) || (firstMode && route === firstMode));
  const preferredKeys = [...new Set((preferred.length ? preferred : matches).map((match) => match.key))];
  return preferredKeys.length === 1 ? preferredKeys[0] : String(legacyKey);
}

function isWordKnown(word) {
  return state.progress.entries[wordKey(word)]?.status === "known";
}

function isTitleKnown(card, route = state.route) {
  return state.progress.titles[titleKey(card, route)]?.status === "known";
}

function createEmptyProgress() {
  const modePlays = {};
  STORAGE_MODE_KEYS.forEach((key) => { modePlays[key] = 0; });
  return { version: STORAGE_VERSION, entries: {}, titles: {}, modePlays };
}

function sanitizeProgress(raw) {
  const seed = createEmptyProgress();
  if (!raw || typeof raw !== "object") return seed;
  const progress = createEmptyProgress();
  if (raw.entries && typeof raw.entries === "object") {
    Object.entries(raw.entries).forEach(([key, value]) => {
      if (!key || !value || typeof value !== "object") return;
      const safeKey = migratedWordKey(String(key), value);
      progress.entries[safeKey] = {
        key: safeKey,
        english: String(value.english || ""),
        meaningJa: String(value.meaningJa || ""),
        sourceTitle: String(value.sourceTitle || ""),
        sourceTitles: Array.isArray(value.sourceTitles) ? [...new Set(value.sourceTitles.map(String).filter(Boolean))] : String(value.sourceTitle || "") ? [String(value.sourceTitle)] : [],
        lemma: String(value.lemma || value.english || safeKey),
        senseId: String(value.senseId || ""),
        firstMode: String(value.firstMode || ""),
        firstQuestionId: String(value.firstQuestionId || ""),
        firstSeenAt: String(value.firstSeenAt || ""),
        lastSeenAt: String(value.lastSeenAt || ""),
        status: value.status === "known" ? "known" : "unknown",
        seenCount: Number(value.seenCount) || 0,
        correctCount: Number(value.correctCount) || 0,
        incorrectCount: Number(value.incorrectCount) || 0,
        modes: value.modes && typeof value.modes === "object" ? { ...value.modes } : {}
      };
    });
  } else if (Array.isArray(raw.seenWords) || Array.isArray(raw.knownWords) || Array.isArray(raw.unknownWords)) {
    const seenWords = Array.isArray(raw.seenWords) ? raw.seenWords : [];
    const knownWords = new Set(Array.isArray(raw.knownWords) ? raw.knownWords.map((item) => String(item)) : []);
    const unknownWords = new Set(Array.isArray(raw.unknownWords) ? raw.unknownWords.map((item) => String(item)) : []);
    seenWords.forEach((key) => {
      const safeKey = migratedWordKey(String(key));
      progress.entries[safeKey] = {
        key: safeKey,
        english: safeKey,
        meaningJa: "",
        sourceTitle: "",
        sourceTitles: [],
        lemma: safeKey,
        senseId: "",
        firstMode: "",
        firstQuestionId: "",
        firstSeenAt: "",
        lastSeenAt: "",
        status: knownWords.has(safeKey) ? "known" : unknownWords.has(safeKey) ? "unknown" : "unknown",
        seenCount: 1,
        correctCount: knownWords.has(safeKey) ? 1 : 0,
        incorrectCount: unknownWords.has(safeKey) ? 1 : 0,
        modes: {}
      };
    });
  }
  if (raw.titles && typeof raw.titles === "object") {
    Object.entries(raw.titles).forEach(([key, value]) => {
      if (!key || !value || typeof value !== "object") return;
      progress.titles[key] = {
        key,
        route: String(value.route || key.split("|")[0] || ""),
        entryId: String(value.entryId || key.split("|")[1] || ""),
        titleDisplay: String(value.titleDisplay || ""),
        status: value.status === "known" ? "known" : "seen",
        seenCount: Number(value.seenCount) || 0,
        firstSeenAt: String(value.firstSeenAt || ""),
        lastSeenAt: String(value.lastSeenAt || ""),
        masteredShown: Boolean(value.masteredShown)
      };
    });
  }
  if (raw.modePlays && typeof raw.modePlays === "object") {
    STORAGE_MODE_KEYS.forEach((key) => {
      progress.modePlays[key] = Number(raw.modePlays[key]) || 0;
    });
  }
  return progress;
}

function loadProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProgress();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION) return sanitizeProgress(parsed);
    return sanitizeProgress(parsed);
  } catch {
    return createEmptyProgress();
  }
}

function saveProgress() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  } catch {}
}

function resetVocabularyProgress() {
  state.progress = createEmptyProgress();
  saveProgress();
  renderTitleStats();
  renderHistoryScreen();
}

function resetAllMemoryFromUi() {
  if (!window.confirm("覚えた単語とプレイ記録をすべて消します。よろしいですか？")) return;
  resetState();
  resetVocabularyProgress();
  state.route = null;
  state.pendingRoute = null;
  setRouteVisuals();
  showScreen("screen-home");
  playToneSequence([
    { frequency: 392, offset: 0, duration: 0.07 },
    { frequency: 293.66, offset: 0.07, duration: 0.07 },
    { frequency: 196, offset: 0.14, duration: 0.12 }
  ], 0.012, "triangle");
}

window.__resetVocabularyProgress = resetVocabularyProgress;

function vocabularyCount() {
  return Object.values(state.progress.entries).filter((entry) => entry.status === "known").length;
}

function seenEntries() {
  return Object.values(state.progress.entries).filter((entry) => entry.seenCount > 0);
}

function knownEntries() {
  return seenEntries().filter((entry) => entry.status === "known").sort((a, b) => (a.firstSeenAt || "").localeCompare(b.firstSeenAt || "") || a.english.localeCompare(b.english));
}

function unknownEntries() {
  return seenEntries().filter((entry) => entry.status === "unknown").sort((a, b) => (a.firstSeenAt || "").localeCompare(b.firstSeenAt || "") || a.english.localeCompare(b.english));
}

function listItemPayload(entry) {
  return {
    english: entry.english || "",
    meaningJa: entry.meaningJa || "",
    sourceTitles: Array.isArray(entry.sourceTitles) && entry.sourceTitles.length ? entry.sourceTitles : entry.sourceTitle ? [entry.sourceTitle] : []
  };
}

function createWordRow(item) {
  const row = document.createElement("article");
  row.className = "word-row";
  const main = document.createElement("div");
  main.className = "word-row-main";
  const word = document.createElement("strong");
  word.textContent = item.english || "";
  const meaning = document.createElement("span");
  meaning.textContent = item.meaningJa || "";
  main.append(word, meaning);
  const meta = document.createElement("div");
  meta.className = "word-row-meta";
  item.sourceTitles.forEach((sourceTitle) => {
    const title = document.createElement("span");
    title.className = "word-row-source";
    title.textContent = sourceTitle;
    meta.append(title);
  });
  row.append(main, meta);
  return row;
}

function renderWordList(container, entries, emptyMessage) {
  container.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = emptyMessage;
    container.append(empty);
    return;
  }
  entries.forEach((entry) => {
    container.append(createWordRow(listItemPayload(entry)));
  });
}

function renderTitleStats() {
  const count = vocabularyCount();
  $("title-vocab-count").textContent = String(count);
  $("history-vocab-count").textContent = String(count);
  $("history-known-count").textContent = String(knownEntries().length);
  $("history-unknown-count").textContent = String(unknownEntries().length);
}

function cancelSpeech() {
  try { window.speechSynthesis?.cancel(); } catch {}
}

function speakText(text, lang, rate = 0.86, pitch = 1) {
  if (!state.soundEnabled || !text || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  try {
    cancelSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    const languageRoot = lang.toLowerCase().split("-")[0];
    const voice = window.speechSynthesis.getVoices?.().find((item) => item.lang?.toLowerCase().startsWith(languageRoot));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {}
}

function speakEnglish(text) {
  speakText(text, "en-US", 0.82, 1);
}

function getAnswerAudioContext() {
  if (answerAudioContext) return answerAudioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  try { answerAudioContext = new AudioContextClass(); } catch { return null; }
  return answerAudioContext;
}

function playToneSequence(notes, volume, defaultType = "square") {
  if (!state.soundEnabled) return;
  const context = getAnswerAudioContext();
  if (!context) return;
  try {
    if (context.state === "suspended") context.resume?.();
    const startAt = context.currentTime + 0.012;
    notes.forEach(({ frequency, offset, duration, type }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type || defaultType;
      oscillator.frequency.setValueAtTime(frequency, startAt + offset);
      gain.gain.setValueAtTime(0.0001, startAt + offset);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + offset + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + duration + 0.01);
    });
  } catch {}
}

function playAnswerFeedback(answer) {
  if (answer === "known") {
    playToneSequence([
      { frequency: 523.25, offset: 0, duration: 0.07 },
      { frequency: 659.25, offset: 0.055, duration: 0.07 },
      { frequency: 783.99, offset: 0.11, duration: 0.08 },
      { frequency: 1046.5, offset: 0.17, duration: 0.1 },
      { frequency: 1318.51, offset: 0.25, duration: 0.15 }
    ], 0.026);
  } else {
    playToneSequence([
      { frequency: 246.94, offset: 0, duration: 0.08 },
      { frequency: 196, offset: 0.075, duration: 0.12 }
    ], 0.012, "triangle");
  }
}

function playMasteredFeedback() {
  playToneSequence([
    { frequency: 523.25, offset: 0, duration: 0.08 },
    { frequency: 659.25, offset: 0.06, duration: 0.08 },
    { frequency: 783.99, offset: 0.12, duration: 0.08 },
    { frequency: 1046.5, offset: 0.18, duration: 0.1 },
    { frequency: 1318.51, offset: 0.26, duration: 0.1 },
    { frequency: 1567.98, offset: 0.34, duration: 0.2 }
  ], 0.025);
}

function playClearFanfare() {
  playToneSequence([
    { frequency: 261.63, offset: 0, duration: 0.1 },
    { frequency: 329.63, offset: 0.08, duration: 0.1 },
    { frequency: 392, offset: 0.16, duration: 0.1 },
    { frequency: 523.25, offset: 0.24, duration: 0.12 },
    { frequency: 659.25, offset: 0.34, duration: 0.12 },
    { frequency: 783.99, offset: 0.44, duration: 0.12 },
    { frequency: 1046.5, offset: 0.54, duration: 0.16 },
    { frequency: 783.99, offset: 0.68, duration: 0.1 },
    { frequency: 987.77, offset: 0.76, duration: 0.1 },
    { frequency: 1318.51, offset: 0.84, duration: 0.3 }
  ], 0.028);
}

function playDecisionFeedback() {
  playToneSequence([
    { frequency: 392, offset: 0, duration: 0.1 },
    { frequency: 523.25, offset: 0.075, duration: 0.12 },
    { frequency: 659.25, offset: 0.15, duration: 0.18 }
  ], 0.04);
}

function updateSoundToggle() {
  const button = $("sound-toggle");
  button.textContent = state.soundEnabled ? "🔊" : "🔇";
  button.setAttribute("aria-pressed", String(state.soundEnabled));
  button.setAttribute("aria-label", state.soundEnabled ? "音声をオフにする" : "音声をオンにする");
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  updateSoundToggle();
  cancelSpeech();
  if (state.soundEnabled && !$("screen-scan").hidden && !state.isAnimating && activeCards()[state.cardIndex]) speakEnglish(displayWordsForCard(activeCards()[state.cardIndex]).map((word) => word.display).join(" "));
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    const active = screen.id === id;
    screen.hidden = !active;
    screen.classList.toggle("is-active", active);
  });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function resetState() {
  if (state.answerTimer) window.clearTimeout(state.answerTimer);
  state.answerTimer = null;
  cancelSpeech();
  state.cardIndex = 0;
  state.answers = [];
  state.playCards = null;
  state.networkQueue = [];
  state.networkIndex = 0;
  state.networkChoices = [];
  state.networkLinks = new Map();
  state.selectedSide = null;
  state.canAdvanceNetwork = false;
  state.isAnimating = false;
  state.drag = null;
  state.routeDrag = null;
  state.newlyKnownKeys = new Set();
}

function setRouteVisuals() {
  if (state.route) document.body.dataset.route = state.route;
  else document.body.removeAttribute("data-route");
  document.querySelectorAll("[data-route-avatar]").forEach((avatar) => {
    avatar.dataset.mode = state.route || "sega";
    avatar.setAttribute("aria-label", `${routeLabel(state.route)}のオリジナル仮マスコット`);
  });
  const label = routeCardLabel();
  $("result-title").textContent = label;
  $("final-title").textContent = label;
}

function renderHistoryScreen() {
  renderTitleStats();
  renderWordList($("history-known-list"), knownEntries(), "まだクイズで見た単語はありません");
  renderWordList($("history-unknown-list"), unknownEntries(), "まだクイズで見た単語はありません");
}

function chooseRoute(route) {
  if (!ACTIVE_ROUTES.includes(route)) return;
  playDecisionFeedback();
  state.route = route;
  setRouteVisuals();
  if (state.progress.modePlays[route] > 0) {
    state.pendingRoute = route;
    $("replay-mode-label").textContent = `${routeLabel(route)} を続けて遊びます。`;
    showScreen("screen-replay");
    return;
  }
  beginRoutePlay(route, false);
}

function beginRoutePlay(route, skipKnown) {
  if (!ACTIVE_ROUTES.includes(route)) return;
  state.route = route;
  setRouteVisuals();
  resetState();
  state.route = route;
  state.playCards = filterCardsForRoute(route, skipKnown);
  state.answers = Array(state.playCards.length).fill(null);
  state.progress.modePlays[route] = (state.progress.modePlays[route] || 0) + 1;
  saveProgress();
  renderTitleStats();
  if (state.playCards.length === 0) {
    renderResult();
    return;
  }
  showScreen("screen-scan");
  renderCard();
}

function filterCardsForRoute(route, skipKnown) {
  const cards = baseCardsForRoute(route);
  if (!skipKnown) return shuffled(cards).slice(0, ROUTE_CARD_COUNT);
  const learning = [];
  const unseen = [];
  cards.filter((card) => !allLearningWordsKnown(card)).forEach((card) => {
    const entry = state.progress.titles[titleKey(card, route)];
    if (entry?.seenCount > 0) learning.push(card);
    else unseen.push(card);
  });
  return [...shuffled(learning), ...shuffled(unseen)].slice(0, ROUTE_CARD_COUNT);
}

function shuffled(cards) {
  const result = cards.slice();
  if (window.__KQ_TEST_DISABLE_SHUFFLE) return result;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function startScan() {
  if (!state.route) return;
  beginRoutePlay(state.route, false);
}

function clearSwipeVisuals() {
  const card = $("scan-card");
  card.classList.add("is-resetting");
  card.classList.remove("is-dragging", "is-exit-left", "is-exit-right");
  card.style.removeProperty("--drag-x");
  card.style.removeProperty("--drag-rotation");
  $("swipe-stamp-known").style.removeProperty("opacity");
  $("swipe-stamp-unknown").style.removeProperty("opacity");
  void card.offsetWidth;
  card.classList.remove("is-resetting");
}

function renderProgress() {
  const total = routeTotal();
  const currentBlock = total > 0 ? Math.min(9, Math.floor((state.cardIndex / total) * 10)) : 0;
  $("progress-pips").querySelectorAll("i").forEach((pip, index) => {
    pip.classList.toggle("is-done", index < currentBlock);
    pip.classList.toggle("is-now", index === currentBlock);
  });
}

function recordTitleSeen(card) {
  const key = titleKey(card);
  const now = nowIso();
  const existing = state.progress.titles[key] || {
    key,
    route: state.route || "",
    entryId: card.entryId || "",
    titleDisplay: card.titleDisplay || "",
    status: "seen",
    seenCount: 0,
    firstSeenAt: now,
    lastSeenAt: now,
    masteredShown: false
  };
  existing.titleDisplay ||= card.titleDisplay || "";
  existing.firstSeenAt ||= now;
  existing.lastSeenAt = now;
  existing.seenCount = Number(existing.seenCount) + 1;
  state.progress.titles[key] = existing;
  return existing;
}

function recordWordSeen(word, card) {
  const key = wordKey(word);
  if (!key) return;
  const now = nowIso();
  const sourceTitle = card.sourceTitle || card.titleDisplay || "";
  const existing = state.progress.entries[key] || {
    key,
    english: String(word.display || word.lemma || "").toLowerCase(),
    lemma: String(word.lemma || word.display || "").toLowerCase(),
    senseId: String(word.senseId || ""),
    meaningJa: word.meaningJa || "",
    sourceTitle,
    sourceTitles: sourceTitle ? [sourceTitle] : [],
    firstMode: state.route || "",
    firstQuestionId: card.questionId || "",
    firstSeenAt: now,
    lastSeenAt: now,
    status: "unknown",
    seenCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    modes: {}
  };
  existing.english ||= String(word.display || word.lemma || "").toLowerCase();
  existing.lemma ||= String(word.lemma || word.display || "").toLowerCase();
  existing.senseId ||= String(word.senseId || "");
  existing.meaningJa ||= word.meaningJa || "";
  existing.sourceTitle ||= sourceTitle;
  existing.sourceTitles = Array.isArray(existing.sourceTitles) ? existing.sourceTitles : existing.sourceTitle ? [existing.sourceTitle] : [];
  if (sourceTitle && !existing.sourceTitles.includes(sourceTitle)) existing.sourceTitles.push(sourceTitle);
  existing.firstMode ||= state.route || "";
  existing.firstQuestionId ||= card.questionId || "";
  existing.firstSeenAt ||= now;
  existing.lastSeenAt = now;
  existing.seenCount = Number(existing.seenCount) + 1;
  existing.modes = existing.modes && typeof existing.modes === "object" ? existing.modes : {};
  if (state.route) existing.modes[state.route] = true;
  if (existing.status !== "known") existing.status = "unknown";
  state.progress.entries[key] = existing;
  return existing;
}

function recordSeen(card) {
  recordTitleSeen(card);
  learningWordsForCard(card).forEach((word) => recordWordSeen(word, card));
}

function learnWord(word, card) {
  const entry = state.progress.entries[wordKey(word)] || recordWordSeen(word, card);
  if (!entry) return;
  const key = wordKey(word);
  if (entry.status !== "known") state.newlyKnownKeys.add(key);
  entry.status = "known";
  entry.correctCount = Number(entry.correctCount) + 1;
  entry.lastSeenAt = nowIso();
}

function markTitleKnown(card, masteredShown = false) {
  const title = state.progress.titles[titleKey(card)] || recordTitleSeen(card);
  title.status = "known";
  if (masteredShown) title.masteredShown = true;
  title.lastSeenAt = nowIso();
}

function recordAnswer(card, answer) {
  learningWordsForCard(card).forEach((word) => {
    const entry = state.progress.entries[wordKey(word)] || recordWordSeen(word, card);
    if (answer === "known") learnWord(word, card);
    else if (entry?.status !== "known") {
      entry.status = "unknown";
      entry.incorrectCount = Number(entry.incorrectCount) + 1;
      entry.lastSeenAt = nowIso();
    }
  });
  if (answer === "known") markTitleKnown(card);
}

function renderEnglishWords(card) {
  const container = $("card-english");
  container.replaceChildren();
  displayWordsForCard(card).forEach((word) => {
    const token = document.createElement("span");
    const known = !word.isLearningTarget || isWordKnown(word);
    token.className = `card-word${known ? " is-known" : ""}${word.isLearningTarget ? "" : " is-proper"}`;
    const english = document.createElement("strong");
    english.textContent = word.display;
    token.append(english);
    if (known) {
      const meaning = document.createElement("small");
      meaning.textContent = word.meaningJa;
      token.append(meaning);
    }
    container.append(token);
  });
}

function renderAnswerWords(words, statusMessage = "") {
  const answer = $("card-answer");
  answer.replaceChildren();
  if (statusMessage) {
    const master = document.createElement("strong");
    master.className = "mastered-message";
    master.textContent = statusMessage;
    answer.append(master);
  } else {
    words.forEach((word) => {
      const row = document.createElement("span");
      row.className = "answer-word";
      row.innerHTML = "<strong></strong><small></small>";
      row.querySelector("strong").textContent = word.display;
      row.querySelector("small").textContent = word.meaningJa;
      answer.append(row);
    });
  }
  answer.hidden = false;
}

function advanceAfterReveal() {
  state.answerTimer = window.setTimeout(() => {
    state.answerTimer = null;
    if (state.cardIndex < routeTotal() - 1) {
      state.cardIndex += 1;
      renderCard();
    } else {
      state.isAnimating = false;
      renderResult();
    }
  }, ANSWER_REVEAL_MS);
}

function renderCard() {
  const card = activeCards()[state.cardIndex];
  if (!card) {
    renderResult();
    return;
  }
  recordSeen(card);
  saveProgress();
  clearSwipeVisuals();
  $("screen-scan").classList.remove("is-revealing");
  $("screen-scan").classList.remove("is-mastered");
  $("screen-scan").classList.remove("is-auto-review");
  $("scan-card").classList.remove("is-answer-known", "is-answer-unknown");
  document.querySelectorAll("[data-answer]").forEach((button) => { button.disabled = false; });
  $("scan-current").textContent = String(state.cardIndex + 1).padStart(2, "0");
  $("scan-total").textContent = String(routeTotal());
  $("scan-title").textContent = `ゲーム英語${routeTotal()}問`;
  $("card-katakana").textContent = card.titleDisplay || card.katakana;
  renderEnglishWords(card);
  const answer = $("card-answer");
  answer.hidden = true;
  answer.textContent = "";
  const badge = $("card-badge");
  badge.hidden = !card.platformLabel;
  badge.textContent = card.platformLabel || "";
  const compare = $("card-compare");
  compare.replaceChildren();
  const comparisons = Array.isArray(card.compare) ? card.compare : [];
  comparisons.forEach((item) => {
    const row = document.createElement("div");
    row.innerHTML = "<strong></strong><span></span>";
    row.querySelector("strong").textContent = item.label;
    row.querySelector("span").textContent = item.text;
    compare.append(row);
  });
  compare.hidden = comparisons.length === 0;
  $("scan-card").dataset.difficulty = card.difficulty;
  $("scan-card").classList.toggle("is-title", card.hookType === "sega_language_gap" || String(card.hookType).endsWith("_title"));
  $("scan-card").classList.toggle("is-house-term", card.hookType === "sega_house_term");
  $("scan-card").setAttribute("aria-label", `${card.titleDisplay || card.katakana}、${card.english}`);
  renderProgress();
  renderTitleStats();
  state.isAnimating = false;
  state.drag = null;
  const allWordsKnown = allLearningWordsKnown(card);
  const titleWasKnown = isTitleKnown(card);
  speakEnglish(displayWordsForCard(card).map((word) => word.display).join(" "));
  if (allWordsKnown) {
    state.isAnimating = true;
    state.answers[state.cardIndex] = titleWasKnown ? "reviewed" : "mastered";
    if (!titleWasKnown) markTitleKnown(card, true);
    saveProgress();
    renderAnswerWords([], titleWasKnown ? "もう覚え済み" : "全単語マスター済み！");
    $("screen-scan").classList.add("is-revealing", "is-mastered", "is-auto-review");
    document.querySelectorAll("[data-answer]").forEach((button) => { button.disabled = true; });
    playMasteredFeedback();
    advanceAfterReveal();
  }
}

function renderSessionWordLists(scores) {
  $("result-known-count").textContent = String(scores.known.length);
  $("result-unknown-count").textContent = String(scores.unknown.length);
  renderWordList($("result-known-list"), scores.known, "今回のプレイではまだ正解した単語がありません");
  renderWordList($("result-unknown-list"), scores.unknown, "今回のプレイではまだ不正解の単語がありません");
}

function answerCard(answer) {
  if (state.isAnimating || !["known", "unknown"].includes(answer)) return;
  state.isAnimating = true;
  state.answers[state.cardIndex] = answer;
  const cardData = activeCards()[state.cardIndex];
  const unlearnedWords = learningWordsForCard(cardData).filter((word) => !isWordKnown(word));
  const card = $("scan-card");
  const isKnown = answer === "known";
  clearSwipeVisuals();
  card.classList.add(isKnown ? "is-answer-known" : "is-answer-unknown");
  $(isKnown ? "swipe-stamp-known" : "swipe-stamp-unknown").style.opacity = "1";
  renderAnswerWords(unlearnedWords);
  $("screen-scan").classList.add("is-revealing");
  document.querySelectorAll("[data-answer]").forEach((button) => { button.disabled = true; });
  cancelSpeech();
  recordAnswer(cardData, answer);
  saveProgress();
  renderTitleStats();
  playAnswerFeedback(answer);
  advanceAfterReveal();
}

function getScores() {
  let weightedKnown = 0;
  let weightedTotal = 0;
  let known = 0;
  const cards = activeCards();
  cards.forEach((card, index) => {
    const weight = BAND_META[card.difficulty]?.weight || 1;
    weightedTotal += weight;
    if (["known", "mastered", "reviewed"].includes(state.answers[index])) {
      known += 1;
      weightedKnown += weight;
    }
  });
  return {
    known: cards.filter((_, index) => ["known", "mastered", "reviewed"].includes(state.answers[index])),
    unknown: cards.filter((_, index) => state.answers[index] === "unknown"),
    score: weightedTotal === 0 ? 0 : Math.round((weightedKnown / weightedTotal) * 100)
  };
}

function rankFor(score, route = state.route) {
  const label = ROUTE_RANK_LABELS[route] || "ゲーム";
  if (score >= 80) return `あなたは${label}マニア！`;
  if (score >= 50) return `あなたは${label}ファン！`;
  return `あなたは${label}好き！`;
}

function resultTier(score) {
  if (score >= 80) return "high";
  if (score >= 50) return "mid";
  return "low";
}

function celebrateResult(screenId, score) {
  const screen = $(screenId);
  screen.dataset.tier = resultTier(score);
  screen.classList.remove("is-celebrating");
  void screen.offsetWidth;
  screen.classList.add("is-celebrating");
  if (screenId === "screen-result") playClearFanfare();
}

function buildSessionEntries(scores) {
  const cards = activeCards();
  const entries = [];
  const seen = new Set();
  cards.forEach((card, cardIndex) => {
    learningWordsForCard(card).forEach((word, wordIndex) => {
      const key = wordKey(word);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const progress = state.progress.entries[key];
      entries.push({
        key,
        english: word.display.toLowerCase(),
        meaningJa: word.meaningJa,
        sourceTitles: progress?.sourceTitles || [card.sourceTitle || card.titleDisplay || ""],
        status: progress?.status === "known" ? "known" : "unknown",
        order: cardIndex * 10 + wordIndex
      });
    });
  });
  const known = entries.filter((entry) => entry.status === "known").sort((a, b) => a.order - b.order);
  const unknown = entries.filter((entry) => entry.status === "unknown").sort((a, b) => a.order - b.order);
  return { known, unknown };
}

function renderResult() {
  const scores = getScores();
  const sessionEntries = buildSessionEntries(scores);
  $("result-score").textContent = String(scores.score);
  $("result-rank").textContent = activeCards().length === 0 ? "このモードの登録単語はすべて覚えています！" : rankFor(scores.score, state.route);
  $("result-correct-count").textContent = String(scores.known.length);
  $("result-new-count").textContent = String(state.newlyKnownKeys.size);
  $("result-vocab-count").textContent = String(vocabularyCount());
  renderSessionWordLists(sessionEntries);
  showScreen("screen-result");
  celebrateResult("screen-result", scores.score);
}

function buildNetworkQueue() {
  const answeredCards = activeCards().map((card, index) => ({ card, answer: state.answers[index] }))
    .filter((item) => item.answer === "known" || item.answer === "unknown");
  const parentQueue = [
    ...answeredCards.filter((item) => item.answer === "known"),
    ...answeredCards.filter((item) => item.answer === "unknown")
  ].map((item) => item.card);
  const queue = [];
  const queuedKeys = new Set();
  parentQueue.forEach((card) => {
    const terms = Array.isArray(card.networkTerms) && card.networkTerms.length > 0 ? card.networkTerms : [card];
    terms.forEach((term, index) => {
      if (queue.length >= NETWORK_LIMIT) return;
      const networkCard = terms.length === 1 ? card : {
        ...card,
        entryId: `${card.entryId}-W${index + 1}`,
        questionId: `${card.questionId}-W${index + 1}`,
        katakana: term.katakana,
        english: term.english,
        meaningJa: term.meaningJa,
        sourceTitle: term.sourceTitle || card.sourceTitle,
        left: term.left,
        right: term.right,
        networkTerms: []
      };
      const key = cardKey(networkCard);
      if (!key || queuedKeys.has(key)) return;
      queuedKeys.add(key);
      queue.push(networkCard);
    });
  });
  return queue;
}

function startNetworks() {
  playDecisionFeedback();
  state.networkQueue = buildNetworkQueue();
  state.networkIndex = 0;
  state.networkChoices = Array(state.networkQueue.length).fill(null);
  state.networkLinks = new Map();
  state.selectedSide = null;
  state.canAdvanceNetwork = false;
  if (state.networkQueue.length === 0) {
    renderFinal();
    return;
  }
  showScreen("screen-network");
  renderNetwork();
}

function renderNetwork() {
  const card = state.networkQueue[state.networkIndex];
  state.selectedSide = state.networkChoices[state.networkIndex];
  state.canAdvanceNetwork = false;
  $("screen-network").classList.remove("is-ready");
  $("network-tap-next").hidden = true;
  $("network-step").textContent = `${state.networkIndex + 1}/${state.networkQueue.length}`;
  $("network-title").textContent = card.katakana;
  $("network-source-title").textContent = card.sourceTitle ? `${card.sourceTitle} から` : "";
  $("network-source-title").hidden = !card.sourceTitle;
  $("network-core-katakana").textContent = card.katakana;
  $("network-core-english").textContent = card.english.toLowerCase();
  const coreMeaning = $("network-core-meaning");
  coreMeaning.textContent = card.meaningJa || "";
  coreMeaning.hidden = !card.meaningJa;
  hideNetworkComparison();

  const container = $("network-nodes");
  container.replaceChildren();
  let openChoices = 0;
  ["left", "right"].forEach((side) => {
    const related = card[side];
    const existingLink = getNetworkLink(card, side);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "network-node";
    button.dataset.side = side;
    button.dataset.testid = `network-${side}`;
    button.innerHTML = `<strong></strong><span></span><b class="network-meaning" hidden></b>`;
    button.querySelector("strong").textContent = related.katakana;
    button.querySelector("span").textContent = related.english.toLowerCase();
    const relatedMeaning = button.querySelector("b");
    relatedMeaning.textContent = related.meaningJa || "";
    relatedMeaning.hidden = !related.meaningJa;
    button.setAttribute("aria-label", `${related.katakana}、${related.meaningJa || related.relation || "関連語"}`);
    if (existingLink) {
      button.disabled = true;
      button.classList.add("is-locked");
    } else {
      openChoices += 1;
    }
    container.append(button);
  });

  if (openChoices === 0) setNetworkReady();
  window.requestAnimationFrame(() => renderNetworkLinks());
}

function selectNetworkSide(side, button) {
  if (state.canAdvanceNetwork || !["left", "right"].includes(side) || button.disabled) return;
  const card = state.networkQueue[state.networkIndex];
  const related = card[side];
  state.selectedSide = side;
  state.networkChoices[state.networkIndex] = side;
  state.networkLinks.set(networkLinkKey(card.english, related.english), {
    first: card.english,
    second: related.english,
    relation: relationFor(card, related),
    mainMeaning: card.meaningJa || "",
    relatedMeaning: related.meaningJa || ""
  });
  $("network-nodes").querySelectorAll(".network-node").forEach((node) => {
    node.disabled = true;
    if (node === button) node.classList.add("is-selected");
    else if (!node.classList.contains("is-locked")) node.classList.add("is-muted");
  });
  showNetworkComparison(card, related);
  setNetworkReady();
  renderNetworkLinks(side);
}

function relationFor(card, related) {
  if (card.meaningJa && related.meaningJa) return `${card.meaningJa} ↔ ${related.meaningJa}`;
  return related.relation || "関連語";
}

function hideNetworkComparison() {
  $("network-comparison").hidden = true;
}

function showNetworkComparison(card, related) {
  if (!card.meaningJa || !related.meaningJa) return;
  $("comparison-main-katakana").textContent = card.katakana;
  $("comparison-main-english").textContent = card.english.toLowerCase();
  $("comparison-main-meaning").textContent = card.meaningJa;
  $("comparison-related-katakana").textContent = related.katakana;
  $("comparison-related-english").textContent = related.english.toLowerCase();
  $("comparison-related-meaning").textContent = related.meaningJa;
  $("network-comparison").hidden = false;
}

function setNetworkReady() {
  state.canAdvanceNetwork = true;
  $("screen-network").classList.add("is-ready");
  $("network-tap-next").hidden = false;
}

function networkLinkKey(first, second) {
  return [first.trim().toLowerCase(), second.trim().toLowerCase()].sort().join("::");
}

function getNetworkLink(card, side) {
  return state.networkLinks.get(networkLinkKey(card.english, card[side].english));
}

function renderNetworkLinks(animateSide = null) {
  const stage = document.querySelector(".network-stage");
  const layer = $("network-link-layer");
  if (!stage || !layer || $("screen-network").hidden) return;
  layer.replaceChildren();
  const card = state.networkQueue[state.networkIndex];
  ["left", "right"].forEach((side) => {
    const link = getNetworkLink(card, side);
    const button = containerButton(side);
    if (link && button) renderNetworkLink(stage, layer, button, link.relation, side === animateSide);
  });
}

function containerButton(side) {
  return $("network-nodes").querySelector(`[data-side="${side}"]`);
}

function renderNetworkLink(stage, layer, button, relationText, animate) {
  const stageRect = stage.getBoundingClientRect();
  const coreRect = $("network-core").getBoundingClientRect();
  const nodeRect = button.getBoundingClientRect();
  const startX = coreRect.left + coreRect.width / 2 - stageRect.left;
  const startY = coreRect.bottom - stageRect.top;
  const endX = nodeRect.left + nodeRect.width / 2 - stageRect.left;
  const endY = nodeRect.top - stageRect.top;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  const beam = document.createElement("span");
  beam.className = `network-link-beam${animate ? " is-animate" : ""}`;
  beam.style.left = `${startX}px`;
  beam.style.top = `${startY}px`;
  beam.style.width = `${length}px`;
  beam.style.transform = `rotate(${angle}deg)`;
  layer.append(beam);

  const label = document.createElement("span");
  label.className = `network-link-relation${animate ? " is-animate" : ""}`;
  label.textContent = relationText;
  const labelWidth = 170;
  const middleX = (startX + endX) / 2;
  const middleY = (startY + endY) / 2;
  label.style.left = `${Math.max(8, Math.min(stageRect.width - labelWidth - 8, middleX - labelWidth / 2))}px`;
  label.style.top = `${middleY - 18}px`;
  layer.append(label);
}

function nextNetwork() {
  if (!state.canAdvanceNetwork) return;
  if (state.networkIndex < state.networkQueue.length - 1) {
    state.networkIndex += 1;
    renderNetwork();
  } else {
    renderFinal();
  }
}

function renderFinal() {
  const scores = getScores();
  $("final-score").textContent = String(scores.score);
  $("final-rank").textContent = rankFor(scores.score, state.route);
  showScreen("screen-final");
  celebrateResult("screen-final", scores.score);
}

function resetDragVisuals() {
  const card = $("scan-card");
  card.classList.remove("is-dragging");
  card.style.setProperty("--drag-x", "0px");
  card.style.setProperty("--drag-rotation", "0deg");
  $("swipe-stamp-known").style.opacity = "0";
  $("swipe-stamp-unknown").style.opacity = "0";
}

function onPointerDown(event) {
  if (state.isAnimating || event.button > 0) return;
  state.drag = { pointerId: event.pointerId, startX: event.clientX, currentX: event.clientX };
  $("scan-card").classList.add("is-dragging");
  $("scan-card").setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  state.drag.currentX = event.clientX;
  const delta = event.clientX - state.drag.startX;
  const intensity = Math.min(Math.abs(delta) / 110, 1);
  $("scan-card").style.setProperty("--drag-x", `${delta}px`);
  $("scan-card").style.setProperty("--drag-rotation", `${delta / 18}deg`);
  $("swipe-stamp-known").style.opacity = delta > 0 ? String(intensity) : "0";
  $("swipe-stamp-unknown").style.opacity = delta < 0 ? String(intensity) : "0";
}

function onPointerEnd(event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  const delta = state.drag.currentX - state.drag.startX;
  state.drag = null;
  if (Math.abs(delta) >= 88) answerCard(delta > 0 ? "known" : "unknown");
  else resetDragVisuals();
}

function initializeProgressPips() {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 10; index += 1) fragment.append(document.createElement("i"));
  $("progress-pips").append(fragment);
}

function openHistory() {
  renderHistoryScreen();
  showScreen("screen-history");
}

function openReplayPrompt(route) {
  state.pendingRoute = route;
  $("replay-mode-label").textContent = `${routeLabel(route)} を続けて遊びます。`;
  showScreen("screen-replay");
}

function replayChoice(skipKnown) {
  if (!state.pendingRoute) return;
  const route = state.pendingRoute;
  state.pendingRoute = null;
  beginRoutePlay(route, skipKnown);
}

$("scan-card").addEventListener("pointerdown", onPointerDown);
$("scan-card").addEventListener("pointermove", onPointerMove);
$("scan-card").addEventListener("pointerup", onPointerEnd);
$("scan-card").addEventListener("pointercancel", onPointerEnd);

$("screen-network").addEventListener("click", (event) => {
  const node = event.target.closest(".network-node");
  if (node) {
    selectNetworkSide(node.dataset.side, node);
    return;
  }
  if (state.canAdvanceNetwork) nextNetwork();
});

document.addEventListener("click", (event) => {
  const route = event.target.closest("button[data-route]");
  if (route) {
    chooseRoute(route.dataset.route);
    return;
  }
  const answer = event.target.closest("[data-answer]");
  if (answer) {
    answerCard(answer.dataset.answer);
    return;
  }
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;
  const actions = {
    "toggle-sound": toggleSound,
    "start-networks": startNetworks,
    "open-history": openHistory,
    "reset-memory": resetAllMemoryFromUi,
    "replay-skip-yes": () => replayChoice(true),
    "replay-skip-no": () => replayChoice(false),
    restart: () => {
      if (state.route) openReplayPrompt(state.route);
    },
    home: () => {
      resetState();
      state.route = null;
      state.pendingRoute = null;
      setRouteVisuals();
      renderTitleStats();
      showScreen("screen-home");
    }
  };
  actions[actionTarget.dataset.action]?.();
});

document.addEventListener("keydown", (event) => {
  if (!$("screen-home").hidden) {
    const route = ({ "1": "sega", "2": "nintendo", "3": "sony", "4": "xbox", "5": "mycom" })[event.key];
    if (route) chooseRoute(route);
    return;
  }
  if (event.key === "Escape") {
    resetState();
    state.route = null;
    setRouteVisuals();
    renderTitleStats();
    showScreen("screen-home");
    return;
  }
  if (!$("screen-scan").hidden && !state.isAnimating) {
    if (event.key === "ArrowLeft") answerCard("unknown");
    if (event.key === "ArrowRight") answerCard("known");
    return;
  }
  if (!$("screen-network").hidden) {
    if (state.canAdvanceNetwork && ["Enter", " ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      nextNetwork();
      return;
    }
    const side = event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : null;
    if (side) selectNetworkSide(side, containerButton(side));
  }
});

window.addEventListener("resize", () => {
  if (!$("screen-network").hidden) window.requestAnimationFrame(() => renderNetworkLinks());
});

initializeProgressPips();
updateSoundToggle();
setRouteVisuals();
renderTitleStats();
renderHistoryScreen();
showScreen("screen-home");
