"use strict";

const TOTAL_CARDS = 100;
const NETWORK_LIMIT = 10;
const DEFAULT_ANSWER_REVEAL_MS = 1000;
const ANSWER_REVEAL_MS = Number.isFinite(window.__KQ_TEST_REVEAL_MS)
  ? Math.max(80, Number(window.__KQ_TEST_REVEAL_MS))
  : DEFAULT_ANSWER_REVEAL_MS;
const BAND_META = Object.freeze({
  beginner: { quota: 4, weight: 1 },
  intermediate: { quota: 3, weight: 2 },
  advanced: { quota: 3, weight: 3 }
});

if (!Array.isArray(otherCards) || otherCards.length !== TOTAL_CARDS || !Array.isArray(segaCards) || segaCards.length !== TOTAL_CARDS) {
  throw new Error("Both game-English routes require exactly 100 cards.");
}

const $ = (id) => document.getElementById(id);
const state = {
  route: null,
  cardIndex: 0,
  answers: Array(TOTAL_CARDS).fill(null),
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
  routeDrag: null
};

function activeCards() {
  return state.route === "sega" ? segaCards : otherCards;
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

function speakAnswerFeedback(answer) {
  speakText(answer === "known" ? "セーガー" : "ガーセー", "ja-JP", 0.78, answer === "known" ? 1.08 : 0.9);
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
  if (state.soundEnabled && !$("screen-scan").hidden && !state.isAnimating) speakEnglish(activeCards()[state.cardIndex].english);
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
  state.answers = Array(TOTAL_CARDS).fill(null);
  state.networkQueue = [];
  state.networkIndex = 0;
  state.networkChoices = [];
  state.networkLinks = new Map();
  state.selectedSide = null;
  state.canAdvanceNetwork = false;
  state.isAnimating = false;
  state.drag = null;
  state.routeDrag = null;
}

function setRouteVisuals() {
  if (state.route) document.body.dataset.route = state.route;
  else document.body.removeAttribute("data-route");
  const sega = state.route === "sega";
  document.querySelectorAll("[data-route-avatar]").forEach((avatar) => {
    avatar.src = sega ? "sega-guide-avatar.png" : "guide-avatar-v2.png";
    avatar.alt = sega ? "AI生成のセガ派用オリジナル仮ガイドキャラクター" : "AI生成の仮ガイドキャラクター";
  });
  const label = sega ? "SEGA ENGLISH" : "GAME ENGLISH";
  $("result-title").textContent = label;
  $("final-title").textContent = label;
}

function chooseRoute(route) {
  if (!["sega", "other"].includes(route)) return;
  state.route = route;
  setRouteVisuals();
  startScan();
}

function startScan() {
  if (!state.route) return;
  resetState();
  showScreen("screen-scan");
  renderCard();
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
  const currentBlock = Math.floor(state.cardIndex / 10);
  $("progress-pips").querySelectorAll("i").forEach((pip, index) => {
    pip.classList.toggle("is-done", index < currentBlock);
    pip.classList.toggle("is-now", index === currentBlock);
  });
}

function renderCard() {
  const card = activeCards()[state.cardIndex];
  clearSwipeVisuals();
  $("screen-scan").classList.remove("is-revealing");
  $("scan-card").classList.remove("is-answer-known", "is-answer-unknown");
  document.querySelectorAll("[data-answer]").forEach((button) => { button.disabled = false; });
  $("scan-current").textContent = String(state.cardIndex + 1).padStart(2, "0");
  $("card-katakana").textContent = card.titleDisplay || card.katakana;
  $("card-english").textContent = card.english.toLowerCase();
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
  $("scan-card").classList.toggle("is-title", ["game_title", "sega_title", "sega_language_gap"].includes(card.hookType));
  $("scan-card").classList.toggle("is-house-term", card.hookType === "sega_house_term");
  $("scan-card").setAttribute("aria-label", `${card.titleDisplay || card.katakana}、${card.english}`);
  $("undo-answer").disabled = state.cardIndex === 0;
  renderProgress();
  state.isAnimating = false;
  state.drag = null;
  speakEnglish(card.english);
}

function answerCard(answer) {
  if (state.isAnimating || !["known", "unknown"].includes(answer)) return;
  state.isAnimating = true;
  state.answers[state.cardIndex] = answer;
  const cardData = activeCards()[state.cardIndex];
  const card = $("scan-card");
  const isKnown = answer === "known";
  clearSwipeVisuals();
  card.classList.add(isKnown ? "is-answer-known" : "is-answer-unknown");
  $(isKnown ? "swipe-stamp-known" : "swipe-stamp-unknown").style.opacity = "1";
  $("card-answer").textContent = cardData.answerJa;
  $("card-answer").hidden = false;
  $("screen-scan").classList.add("is-revealing");
  document.querySelectorAll("[data-answer]").forEach((button) => { button.disabled = true; });
  speakAnswerFeedback(answer);
  state.answerTimer = window.setTimeout(() => {
    state.answerTimer = null;
    if (state.cardIndex < TOTAL_CARDS - 1) {
      state.cardIndex += 1;
      renderCard();
    } else {
      state.isAnimating = false;
      renderResult();
    }
  }, ANSWER_REVEAL_MS);
}

function undoAnswer() {
  if (state.isAnimating || state.cardIndex === 0) return;
  state.answers[state.cardIndex - 1] = null;
  state.cardIndex -= 1;
  renderCard();
}

function getScores() {
  let weightedKnown = 0;
  let weightedTotal = 0;
  let known = 0;
  activeCards().forEach((card, index) => {
    const weight = BAND_META[card.difficulty]?.weight || 1;
    weightedTotal += weight;
    if (state.answers[index] === "known") {
      known += 1;
      weightedKnown += weight;
    }
  });
  return {
    known,
    unknown: state.answers.filter((answer) => answer === "unknown").length,
    score: Math.round((weightedKnown / weightedTotal) * 100)
  };
}

function rankFor(score) {
  if (score >= 90) return "LORE MASTER";
  if (score >= 70) return "STRATEGIST";
  if (score >= 45) return "NAVIGATOR";
  return "SCOUT";
}

function renderResult() {
  const scores = getScores();
  $("result-score").textContent = String(scores.score);
  $("result-rank").textContent = rankFor(scores.score);
  showScreen("screen-result");
}

function buildNetworkQueue() {
  const knownCards = activeCards().filter((_, index) => state.answers[index] === "known");
  const parentQueue = [];
  Object.entries(BAND_META).forEach(([band, meta]) => {
    parentQueue.push(...knownCards.filter((card) => card.difficulty === band).slice(0, meta.quota));
  });
  knownCards.forEach((card) => {
    if (parentQueue.length < NETWORK_LIMIT && !parentQueue.includes(card)) parentQueue.push(card);
  });
  const queue = [];
  parentQueue.forEach((card) => {
    const terms = Array.isArray(card.networkTerms) && card.networkTerms.length > 0 ? card.networkTerms : [card];
    terms.forEach((term, index) => {
      if (queue.length >= NETWORK_LIMIT) return;
      queue.push(terms.length === 1 ? card : {
        ...card,
        entryId: `${card.entryId}-W${index + 1}`,
        questionId: `${card.questionId}-W${index + 1}`,
        katakana: term.katakana,
        english: term.english,
        sourceTitle: term.sourceTitle || card.sourceTitle,
        left: term.left,
        right: term.right,
        networkTerms: []
      });
    });
  });
  return queue.slice(0, NETWORK_LIMIT);
}

function startNetworks() {
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
    button.innerHTML = `<strong></strong><span></span>`;
    button.querySelector("strong").textContent = related.katakana;
    button.querySelector("span").textContent = related.english.toLowerCase();
    button.setAttribute("aria-label", `${related.katakana}、${related.relation}`);
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
    relation: related.relation
  });
  $("network-nodes").querySelectorAll(".network-node").forEach((node) => {
    node.disabled = true;
    if (node === button) node.classList.add("is-selected");
    else if (!node.classList.contains("is-locked")) node.classList.add("is-muted");
  });
  setNetworkReady();
  renderNetworkLinks(side);
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
  $("final-rank").textContent = rankFor(scores.score);
  showScreen("screen-final");
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

function resetRouteDragVisuals() {
  const card = $("route-card");
  card.classList.remove("is-dragging");
  card.style.setProperty("--route-x", "0px");
  card.style.setProperty("--route-rotation", "0deg");
}

function onRoutePointerDown(event) {
  if (event.button > 0) return;
  state.routeDrag = { pointerId: event.pointerId, startX: event.clientX, currentX: event.clientX };
  $("route-card").classList.add("is-dragging");
  $("route-card").setPointerCapture?.(event.pointerId);
}

function onRoutePointerMove(event) {
  if (!state.routeDrag || state.routeDrag.pointerId !== event.pointerId) return;
  state.routeDrag.currentX = event.clientX;
  const delta = event.clientX - state.routeDrag.startX;
  $("route-card").style.setProperty("--route-x", `${delta}px`);
  $("route-card").style.setProperty("--route-rotation", `${delta / 24}deg`);
}

function onRoutePointerEnd(event) {
  if (!state.routeDrag || state.routeDrag.pointerId !== event.pointerId) return;
  const delta = state.routeDrag.currentX - state.routeDrag.startX;
  state.routeDrag = null;
  if (Math.abs(delta) >= 72) chooseRoute(delta < 0 ? "sega" : "other");
  else resetRouteDragVisuals();
}

function initializeProgressPips() {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 10; index += 1) fragment.append(document.createElement("i"));
  $("progress-pips").append(fragment);
}

$("scan-card").addEventListener("pointerdown", onPointerDown);
$("scan-card").addEventListener("pointermove", onPointerMove);
$("scan-card").addEventListener("pointerup", onPointerEnd);
$("scan-card").addEventListener("pointercancel", onPointerEnd);

$("route-card").addEventListener("pointerdown", onRoutePointerDown);
$("route-card").addEventListener("pointermove", onRoutePointerMove);
$("route-card").addEventListener("pointerup", onRoutePointerEnd);
$("route-card").addEventListener("pointercancel", onRoutePointerEnd);

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
    undo: undoAnswer,
    "toggle-sound": toggleSound,
    "start-networks": startNetworks,
    restart: startScan,
    home: () => {
      resetState();
      state.route = null;
      setRouteVisuals();
      resetRouteDragVisuals();
      showScreen("screen-home");
    }
  };
  actions[actionTarget.dataset.action]?.();
});

document.addEventListener("keydown", (event) => {
  if (!$("screen-home").hidden) {
    if (event.key === "ArrowLeft") chooseRoute("sega");
    if (event.key === "ArrowRight") chooseRoute("other");
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
showScreen("screen-home");
