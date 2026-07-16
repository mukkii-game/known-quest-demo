"use strict";

const TOTAL_CARDS = 100;
const NETWORK_LIMIT = 10;
const BAND_META = Object.freeze({
  beginner: { label: "初級", className: "band-beginner", quota: 4 },
  intermediate: { label: "中級", className: "band-intermediate", quota: 3 },
  advanced: { label: "上級", className: "band-advanced", quota: 3 }
});

if (!Array.isArray(scanCards) || scanCards.length !== TOTAL_CARDS) {
  throw new Error("The Tinder prototype requires exactly 100 cards.");
}

const $ = (id) => document.getElementById(id);
const state = {
  cardIndex: 0,
  answers: Array(TOTAL_CARDS).fill(null),
  networkQueue: [],
  networkIndex: 0,
  networkChoices: [],
  networkLinks: new Map(),
  selectedSide: null,
  canAdvanceNetwork: false,
  isAnimating: false,
  drag: null
};

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    const active = screen.id === id;
    screen.hidden = !active;
    screen.classList.toggle("is-active", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetState() {
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
}

function startScan() {
  resetState();
  showScreen("screen-scan");
  renderCard();
}

function bandMeta(card) {
  return BAND_META[card.difficulty] || BAND_META.beginner;
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

function renderCard() {
  const card = scanCards[state.cardIndex];
  const meta = bandMeta(card);
  clearSwipeVisuals();
  $("scan-current").textContent = String(state.cardIndex + 1);
  $("scan-progress").style.width = `${((state.cardIndex + 1) / TOTAL_CARDS) * 100}%`;
  $("card-entry-id").textContent = card.entryId;
  $("card-context").textContent = card.context;
  $("card-katakana").textContent = card.katakana;
  $("card-english").textContent = card.english.toLowerCase();
  const badge = $("card-band");
  badge.textContent = meta.label;
  badge.className = `band-badge ${meta.className}`;
  const platformBadge = $("card-platform");
  platformBadge.textContent = card.platformLabel || "";
  platformBadge.hidden = !card.platformLabel;
  $("scan-card").dataset.difficulty = card.difficulty;
  $("undo-answer").disabled = state.cardIndex === 0;
  state.isAnimating = false;
  state.drag = null;
}

function answerCard(answer) {
  if (state.isAnimating || !["known", "unknown"].includes(answer)) return;
  state.isAnimating = true;
  state.answers[state.cardIndex] = answer;
  const card = $("scan-card");
  const isKnown = answer === "known";
  card.classList.add(isKnown ? "is-exit-right" : "is-exit-left");
  $(isKnown ? "swipe-stamp-known" : "swipe-stamp-unknown").style.opacity = "1";
  window.setTimeout(() => {
    if (state.cardIndex < TOTAL_CARDS - 1) {
      state.cardIndex += 1;
      renderCard();
    } else {
      state.isAnimating = false;
      renderResult();
    }
  }, 190);
}

function undoAnswer() {
  if (state.isAnimating || state.cardIndex === 0) return;
  state.answers[state.cardIndex - 1] = null;
  state.cardIndex -= 1;
  renderCard();
}

function rankFor(known) {
  if (known >= 85) return ["LOREKEEPER", "ゲームで育った見覚えが、かなり深いところまで広がっています。"];
  if (known >= 65) return ["STRATEGIST", "基本語からシステム語まで、大きな英語資産が見つかりました。"];
  if (known >= 40) return ["NAVIGATOR", "ゲームUIを読む経験が、英語へ伸びる入口になっています。"];
  return ["SCOUT", "数の多さは能力判定ではありません。知っている場所から始められます。"];
}

function getScores() {
  const scores = {
    known: state.answers.filter((answer) => answer === "known").length,
    unknown: state.answers.filter((answer) => answer === "unknown").length,
    bands: {}
  };
  Object.keys(BAND_META).forEach((band) => {
    const indices = scanCards.map((card, index) => card.difficulty === band ? index : -1).filter((index) => index >= 0);
    scores.bands[band] = {
      total: indices.length,
      known: indices.filter((index) => state.answers[index] === "known").length
    };
  });
  return scores;
}

function renderResult() {
  const scores = getScores();
  const [rank, message] = rankFor(scores.known);
  $("result-known").textContent = String(scores.known);
  $("result-known-count").textContent = String(scores.known);
  $("result-unknown-count").textContent = String(scores.unknown);
  $("result-beginner").textContent = `${scores.bands.beginner.known} / ${scores.bands.beginner.total}`;
  $("result-intermediate").textContent = `${scores.bands.intermediate.known} / ${scores.bands.intermediate.total}`;
  $("result-advanced").textContent = `${scores.bands.advanced.known} / ${scores.bands.advanced.total}`;
  $("result-rank").textContent = `SELF-REPORT: ${rank}`;
  $("result-message").textContent = message;
  showScreen("screen-result");
}

function buildNetworkQueue() {
  const queue = [];
  Object.entries(BAND_META).forEach(([band, meta]) => {
    const candidates = scanCards
      .map((card, index) => ({ card, index, known: state.answers[index] === "known" }))
      .filter((item) => item.card.difficulty === band && item.known)
      .sort((a, b) => Number(b.known) - Number(a.known) || a.card.order - b.card.order);
    queue.push(...candidates.slice(0, meta.quota).map((item) => item.card));
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
  const meta = bandMeta(card);
  state.selectedSide = null;
  state.canAdvanceNetwork = false;
  $("network-step").textContent = `${state.networkIndex + 1} / ${state.networkQueue.length}`;
  $("network-title").textContent = `${card.katakana}から広げる`;
  $("network-depth").textContent = card.platformLabel ? `${meta.label} · ${card.platformLabel}` : meta.label;
  $("network-depth").className = `depth-chip ${meta.className}`;
  $("network-core-katakana").textContent = card.katakana;
  $("network-core-english").textContent = card.english.toLowerCase();
  $("connection-label").textContent = "CHOOSE LEFT OR RIGHT";
  $("connection-title").textContent = "つなぎたい方向を1つ選んでください";
  $("connection-copy").textContent = "正解・不正解はありません。気になる関連語を選びます。";
  $("network-link-layer").replaceChildren();
  $("network-next").disabled = true;
  $("network-next").querySelector("span").textContent = state.networkIndex === state.networkQueue.length - 1 ? "結果を見る" : "次のマップ";

  const nodes = $("network-nodes");
  nodes.replaceChildren();
  let lockedCount = 0;
  ["left", "right"].forEach((side) => {
    const related = card[side];
    const existingLink = getNetworkLink(card, side);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `network-node network-node-${side}`;
    button.dataset.side = side;
    button.dataset.testid = `network-${side}`;
    button.setAttribute("aria-pressed", "false");
    if (existingLink) {
      lockedCount += 1;
      button.disabled = true;
      button.classList.add("is-locked");
      button.dataset.linked = "true";
      button.setAttribute("aria-label", `${related.katakana} ${related.english} 接続済み`);
    }
    const direction = document.createElement("span");
    direction.className = "node-direction";
    direction.textContent = side === "left" ? "← LEFT" : "RIGHT →";
    const katakana = document.createElement("strong");
    katakana.textContent = related.katakana;
    const english = document.createElement("small");
    english.textContent = related.english.toLowerCase();
    button.append(direction, katakana, english);
    if (existingLink) {
      const linked = document.createElement("span");
      linked.className = "node-linked";
      linked.textContent = "接続済み";
      button.append(linked);
    }
    nodes.append(button);
  });
  if (lockedCount === 1) {
    $("connection-label").textContent = "ONE LINK ALREADY ACTIVE";
    $("connection-title").textContent = "接続済みの枝は選べません";
    $("connection-copy").textContent = "もう一方の関連語を選んで、ネットワークを広げてください。";
  } else if (lockedCount === 2) {
    state.canAdvanceNetwork = true;
    $("network-next").disabled = false;
    $("connection-label").textContent = "LINKS ALREADY ACTIVE";
    $("connection-title").textContent = "2本とも接続済みです";
    $("connection-copy").textContent = "この語のネットワークはすでに作られています。";
  }
  window.requestAnimationFrame(() => renderNetworkLinks());
}

function selectNetworkSide(side, button) {
  if (!["left", "right"].includes(side) || button.disabled) return;
  const card = state.networkQueue[state.networkIndex];
  const related = card[side];
  state.selectedSide = side;
  state.canAdvanceNetwork = true;
  state.networkChoices[state.networkIndex] = side;
  state.networkLinks.set(networkLinkKey(card.english, related.english), {
    main: card.english.toLowerCase(),
    related: related.english.toLowerCase(),
    relation: related.relation
  });
  document.querySelectorAll(".network-node").forEach((item) => {
    const selected = item === button;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  button.disabled = true;
  $("connection-label").textContent = related.relation;
  $("connection-title").textContent = `${card.katakana} → ${related.katakana}`;
  $("connection-copy").textContent = `${card.english.toLowerCase()} から ${related.english.toLowerCase()} へ接続しました。`;
  $("network-next").disabled = false;
  renderNetworkLinks(side);
}

function networkLinkKey(first, second) {
  return [first.trim().toLowerCase(), second.trim().toLowerCase()].sort().join("::");
}

function getNetworkLink(card, side) {
  return state.networkLinks.get(networkLinkKey(card.english, card[side].english));
}

function renderNetworkLinks(animateSide = null) {
  const card = state.networkQueue[state.networkIndex];
  const layer = $("network-link-layer");
  layer.replaceChildren();
  ["left", "right"].forEach((side) => {
    const link = getNetworkLink(card, side);
    const button = document.querySelector(`.network-node[data-side="${side}"]`);
    if (link && button) renderNetworkLink(button, link.relation, side, side === animateSide);
  });
}

function renderNetworkLink(button, relationText, side, animate = false) {
  const stage = document.querySelector(".network-stage");
  const core = $("network-core");
  const layer = $("network-link-layer");
  if (!stage || !core || !button || !relationText) return;
  const stageRect = stage.getBoundingClientRect();
  const coreRect = core.getBoundingClientRect();
  const nodeRect = button.getBoundingClientRect();
  const startX = coreRect.left + coreRect.width / 2 - stageRect.left;
  const startY = coreRect.top + coreRect.height / 2 - stageRect.top;
  const endX = nodeRect.left + nodeRect.width / 2 - stageRect.left;
  const endY = nodeRect.top + nodeRect.height / 2 - stageRect.top;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const length = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
  const beam = document.createElement("div");
  beam.className = `network-link-beam${animate ? " is-animated" : " is-visible"}`;
  beam.dataset.side = side;
  beam.style.left = `${startX}px`;
  beam.style.top = `${startY}px`;
  beam.style.width = `${length}px`;
  beam.style.setProperty("--link-angle", `${angle}deg`);
  const spark = document.createElement("span");
  spark.className = "network-link-spark";
  beam.append(spark);
  const relation = document.createElement("span");
  relation.className = `network-link-relation${animate ? " is-animated" : " is-visible"}`;
  relation.dataset.side = side;
  relation.textContent = relationText;
  relation.style.left = `${startX + deltaX * .5}px`;
  relation.style.top = `${startY + deltaY * .5 - 25}px`;
  layer.append(beam, relation);
}

function nextNetwork() {
  if (!state.canAdvanceNetwork) return;
  if (state.networkIndex < state.networkQueue.length - 1) {
    state.networkIndex += 1;
    renderNetwork();
    return;
  }
  renderFinal();
}

function renderFinal() {
  const scores = getScores();
  const connected = state.networkLinks.size;
  $("final-summary-text").textContent = `100語中${scores.known}語を「知ってる」と回答`;
  $("final-summary-detail").textContent = `${connected}語から左右の知識ルートを選択。結果は端末内だけで処理し、送信していません。`;
  showScreen("screen-final");
}

function resetDragVisuals() {
  state.drag = null;
  $("scan-card").classList.remove("is-dragging");
  $("scan-card").style.setProperty("--drag-x", "0px");
  $("scan-card").style.setProperty("--drag-rotation", "0deg");
  $("swipe-stamp-known").style.opacity = "0";
  $("swipe-stamp-unknown").style.opacity = "0";
}

function onPointerDown(event) {
  if (state.isAnimating || event.button > 0) return;
  state.drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, deltaX: 0 };
  $("scan-card").setPointerCapture?.(event.pointerId);
  $("scan-card").classList.add("is-dragging");
}

function onPointerMove(event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - state.drag.startX;
  const deltaY = event.clientY - state.drag.startY;
  state.drag.deltaX = deltaX;
  if (Math.abs(deltaX) > Math.abs(deltaY)) event.preventDefault();
  $("scan-card").style.setProperty("--drag-x", `${deltaX}px`);
  $("scan-card").style.setProperty("--drag-rotation", `${Math.max(-12, Math.min(12, deltaX / 22))}deg`);
  $("swipe-stamp-known").style.opacity = String(Math.min(1, Math.max(0, deltaX / 100)));
  $("swipe-stamp-unknown").style.opacity = String(Math.min(1, Math.max(0, -deltaX / 100)));
}

function onPointerEnd(event) {
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  const deltaX = state.drag.deltaX;
  const threshold = Math.min(120, Math.max(72, $("scan-card").clientWidth * .22));
  state.drag = null;
  if (Math.abs(deltaX) >= threshold) {
    answerCard(deltaX > 0 ? "known" : "unknown");
  } else {
    resetDragVisuals();
  }
}

const scanCardElement = $("scan-card");
scanCardElement.addEventListener("pointerdown", onPointerDown);
scanCardElement.addEventListener("pointermove", onPointerMove);
scanCardElement.addEventListener("pointerup", onPointerEnd);
scanCardElement.addEventListener("pointercancel", resetDragVisuals);

window.addEventListener("resize", () => {
  if ($("screen-network").hidden) return;
  renderNetworkLinks();
});

document.addEventListener("click", (event) => {
  const answer = event.target.closest("[data-answer]");
  if (answer) {
    answerCard(answer.dataset.answer);
    return;
  }
  const node = event.target.closest(".network-node");
  if (node) {
    selectNetworkSide(node.dataset.side, node);
    return;
  }
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;
  event.preventDefault();
  const actions = {
    start: startScan,
    "start-networks": startNetworks,
    "next-network": nextNetwork,
    undo: undoAnswer,
    restart: startScan,
    home: () => { resetState(); showScreen("screen-home"); }
  };
  actions[actionTarget.dataset.action]?.();
});

document.addEventListener("keydown", (event) => {
  if (!$("screen-scan").hidden && !state.isAnimating && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    answerCard(event.key === "ArrowRight" ? "known" : "unknown");
    return;
  }
  if (!$("screen-network").hidden && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    const side = event.key === "ArrowLeft" ? "left" : "right";
    const button = document.querySelector(`.network-node[data-side="${side}"]`);
    if (button) selectNetworkSide(side, button);
  }
});
