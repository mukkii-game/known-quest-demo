"use strict";

const scanCards = [
  { rawId: "DR0040", word: "save", context: "SYSTEM MENU", depth: "UI", hook: "進行を残す", bridge: "データだけでなく、時間・お金・命を『失わないよう残す』時にも使えます。" },
  { rawId: "DR0001", word: "continue", context: "TITLE SCREEN", depth: "UI", hook: "途中から続ける", bridge: "ゲームの外では、話や作業を『続ける』にそのまま使えます。" },
  { rawId: "DR0002", word: "resume", context: "PAUSE MENU", depth: "UI", hook: "止めたところから再開する", bridge: "仕事、会議、会話などを中断後に再開する時にも使えます。" },
  { rawId: "DR0005", word: "retry", context: "FAILURE SCREEN", depth: "ACTION", hook: "同じ場面にもう一度挑む", bridge: "re- + try と見ると、通信や仕事の『再試行』にもつながります。" },
  { rawId: "DR0004", word: "quit", context: "SYSTEM MENU", depth: "ACTION", hook: "ゲームを終了する", bridge: "単に終わるだけでなく、本人の意思で仕事や習慣をやめる時にも使います。" },
  { rawId: "DR0008", word: "checkpoint", context: "STAGE", depth: "SYSTEM", hook: "戻ってこられる通過地点", bridge: "現実では、人や車を止めて確認する『検問所』にも使われます。" },
  { rawId: "DR0007", word: "restart", context: "FAILURE SCREEN", depth: "ACTION", hook: "最初からやり直す", bridge: "ゲームだけでなく、機械や計画をいったん止めて始め直す時にも使えます。" },
  { rawId: "DR0011", word: "life", context: "STATUS", depth: "SYSTEM", hook: "残り回数や命", bridge: "ゲームの残機から、生命・生活・人生という大きな意味へ戻れます。" },
  { rawId: "DR0012", word: "experience level", context: "STATUS", depth: "SYSTEM", hook: "経験値に応じた強さの段階", bridge: "experience は体験や経験、level は到達段階としてゲーム外でも頻出します。" },
  { rawId: "DR0010", word: "high score", context: "RESULT", depth: "SYSTEM", hook: "過去最高の得点", bridge: "score は試験・競技・評価の点数にも広がり、high が数値の大きさを示します。" },
  { rawId: "DR0015", word: "objective", context: "MAP", depth: "STORY", hook: "今回達成する目標", bridge: "仕事や計画でも、達成点をはっきり示す名詞として使えます。" },
  { rawId: "DR0014", word: "main mission", context: "QUEST LOG", depth: "STORY", hook: "物語の中心となる任務", bridge: "main は中心、mission は果たすべき任務や使命を表します。" },
  { rawId: "DR0016", word: "quest", context: "QUEST LOG", depth: "STORY", hook: "探し求めて進む課題", bridge: "ゲームの依頼だけでなく、答えや真実を探す長い追求にも使えます。" },
  { rawId: "DR0023", word: "achievement", context: "REWARD", depth: "STORY", hook: "条件達成で残る実績", bridge: "ゲーム外では、努力して成し遂げた成果や業績を表します。" },
  { rawId: "DR0024", word: "reward", context: "QUEST COMPLETE", depth: "STORY", hook: "達成後にもらう報酬", bridge: "努力や行動への見返りとして得るものを、日常や仕事でも表します。" }
];

const networks = [
  {
    core: "SAVE",
    title: "SAVEを伸ばす",
    depth: "UI → ACTION",
    nodes: [
      { word: "continue", label: "SESSION FLOW", title: "continue a game", copy: "保存した進行を、途中から続ける。日常では話や作業を続ける動詞です。" },
      { word: "resume", label: "SESSION FLOW", title: "resume from pause", copy: "一時停止した状態から再開する。仕事や会議の再開にも使えます。" },
      { word: "retry", label: "SESSION FLOW", title: "retry after failure", copy: "失敗した同じ試みをもう一度行う。通信や処理の再試行にも広がります。" },
      { word: "quit", label: "SESSION FLOW", title: "save and quit", copy: "進行を残して終了する。ゲーム外では仕事や習慣を自分の意思でやめる語です。" }
    ]
  },
  {
    core: "CHECKPOINT",
    title: "CHECKPOINTを伸ばす",
    depth: "ACTION → SYSTEM",
    nodes: [
      { word: "restart", label: "STATE CHANGE", title: "restart at a checkpoint", copy: "失敗後に、記録された地点から始め直す。機械や計画の再始動にも使えます。" },
      { word: "life", label: "PLAYER STATE", title: "remaining life", copy: "再挑戦できる残り回数や命。一般英語では生命・生活・人生へ広がります。" },
      { word: "experience level", label: "GROWTH STATE", title: "experience level", copy: "経験に応じた成長段階。experience と level を別々にも使えるようになります。" },
      { word: "high score", label: "RESULT STATE", title: "high score", copy: "過去最高の得点。score は試験や評価の点数にも使われます。" }
    ]
  },
  {
    core: "OBJECTIVE",
    title: "OBJECTIVEを伸ばす",
    depth: "SYSTEM → STORY",
    nodes: [
      { word: "main mission", label: "PRIORITY", title: "main mission", copy: "物語の中心として果たす任務。mission は組織や人の使命にも広がります。" },
      { word: "quest", label: "STORY", title: "quest objective", copy: "探し進む課題の中に、具体的な達成目標が置かれます。" },
      { word: "achievement", label: "RESULT", title: "unlock an achievement", copy: "条件を成し遂げた結果として残る実績。仕事や学習の成果にも使えます。" },
      { word: "reward", label: "PAYOFF", title: "mission reward", copy: "達成後に得る報酬。行動と見返りを一組の流れとして読めます。" }
    ]
  }
];

const state = {
  cardIndex: 0,
  currentAnswer: null,
  answers: [],
  networkIndex: 0,
  selectedNodes: new Set()
};

const screens = [...document.querySelectorAll(".screen")];
const $ = (id) => document.getElementById(id);

function showScreen(id) {
  screens.forEach((screen) => {
    const active = screen.id === id;
    screen.hidden = !active;
    screen.classList.toggle("is-active", active);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetState() {
  state.cardIndex = 0;
  state.currentAnswer = null;
  state.answers = [];
  state.networkIndex = 0;
  state.selectedNodes = new Set();
}

function startScan() {
  resetState();
  showScreen("screen-scan");
  renderCard();
}

function renderCard() {
  const card = scanCards[state.cardIndex];
  $("scan-current").textContent = String(state.cardIndex + 1);
  $("scan-progress").style.width = `${((state.cardIndex + 1) / scanCards.length) * 100}%`;
  $("card-depth").textContent = card.depth;
  $("card-raw-id").textContent = card.rawId;
  $("card-context").textContent = card.context;
  $("card-word").textContent = card.word;
  $("card-hook").textContent = card.hook;
  $("card-bridge").textContent = card.bridge;
  $("card-front").hidden = false;
  $("card-back").hidden = true;
  state.currentAnswer = null;
}

function answerCard(value) {
  if (state.currentAnswer !== null) return;
  state.currentAnswer = value;
  state.answers[state.cardIndex] = value;
  $("card-front").hidden = true;
  $("card-back").hidden = false;
  $("scan-card").dataset.answerState = String(value);
  $("card-back").querySelector("button").focus({ preventScroll: true });
}

function nextCard() {
  if (state.currentAnswer === null) return;
  if (state.cardIndex < scanCards.length - 1) {
    state.cardIndex += 1;
    renderCard();
    return;
  }
  renderResult();
}

function rankFor(known) {
  if (known >= 14) return ["LOREKEEPER", "ゲーム英語が、かなり深いところまで育っています。"];
  if (known >= 11) return ["STRATEGIST", "システムと物語の英語まで、すでに大きな資産です。"];
  if (known >= 7) return ["NAVIGATOR", "UIを読む力が、日常英語へ伸びる入口になっています。"];
  return ["SCOUT", "見つけた数が少なくても、知っている場所から安全に始められます。"];
}

function getScores() {
  const seen = state.answers.filter((value) => value >= 1).length;
  const understood = state.answers.filter((value) => value === 2).length;
  return { seen, understood, fresh: scanCards.length - seen };
}

function renderResult() {
  const { seen, understood, fresh } = getScores();
  const [rank, message] = rankFor(seen);
  $("result-known").textContent = String(seen);
  $("result-seen").textContent = String(seen);
  $("result-understood").textContent = String(understood);
  $("result-new").textContent = String(fresh);
  $("result-rank").textContent = `RANK: ${rank}`;
  $("result-message").textContent = message;
  showScreen("screen-result");
}

function startNetworks() {
  state.networkIndex = 0;
  state.selectedNodes = new Set();
  showScreen("screen-network");
  renderNetwork();
}

function renderNetwork() {
  const network = networks[state.networkIndex];
  $("network-step").textContent = `${state.networkIndex + 1} / ${networks.length}`;
  $("network-title").textContent = network.title;
  $("network-depth").textContent = network.depth;
  $("network-core").textContent = network.core;
  $("connection-label").textContent = "SELECT A NODE";
  $("connection-title").textContent = "枝を1つ選んでください";
  $("connection-copy").textContent = "ゲームの意味を出発点に、日常で使える意味までつなぎます。";
  $("network-next").querySelector("span").textContent = state.networkIndex === networks.length - 1 ? "結果を見る" : "次のマップ";

  const nodes = $("network-nodes");
  nodes.replaceChildren();
  network.nodes.forEach((node, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "network-node";
    button.textContent = node.word;
    button.dataset.nodeIndex = String(index);
    button.dataset.testid = `network-node-${index}`;
    button.setAttribute("aria-pressed", "false");
    nodes.append(button);
  });
}

function selectNetworkNode(index, button) {
  const network = networks[state.networkIndex];
  const node = network.nodes[index];
  state.selectedNodes.add(`${state.networkIndex}:${index}`);
  document.querySelectorAll(".network-node").forEach((item) => {
    const selected = item === button;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  $("connection-label").textContent = node.label;
  $("connection-title").textContent = node.title;
  $("connection-copy").textContent = node.copy;
}

function nextNetwork() {
  if (state.networkIndex < networks.length - 1) {
    state.networkIndex += 1;
    renderNetwork();
    return;
  }
  renderFinal();
}

function renderFinal() {
  const { seen, understood } = getScores();
  $("final-summary-text").textContent = `15語中${seen}語に見覚え、${understood}語は意味まで把握`;
  showScreen("screen-final");
}

document.addEventListener("click", (event) => {
  const answer = event.target.closest("[data-answer]");
  if (answer) {
    answerCard(Number(answer.dataset.answer));
    return;
  }

  const node = event.target.closest(".network-node");
  if (node) {
    selectNetworkNode(Number(node.dataset.nodeIndex), node);
    return;
  }

  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;
  event.preventDefault();
  const actions = {
    start: startScan,
    "next-card": nextCard,
    "start-networks": startNetworks,
    "next-network": nextNetwork,
    restart: startScan,
    home: () => { resetState(); showScreen("screen-home"); }
  };
  actions[actionTarget.dataset.action]?.();
});

document.addEventListener("keydown", (event) => {
  if (!$("screen-scan").hidden) {
    if (state.currentAnswer === null && ["1", "2", "3"].includes(event.key)) {
      answerCard(Number(event.key) - 1);
    } else if (state.currentAnswer !== null && event.key === "Enter") {
      nextCard();
    }
  }
});
