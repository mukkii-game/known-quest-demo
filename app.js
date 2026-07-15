"use strict";

const scanCards = [
  { entryId: "JE001", difficulty: "standard", katakana: "セーブ", english: "save", context: "システムメニュー", depth: "入口", hook: "進行を残す", bridge: "save はデータだけでなく、人を救う・時間やお金を節約する時にも使えます。" },
  { entryId: "JE002", difficulty: "standard", katakana: "ロード", english: "load", context: "セーブデータの読込", depth: "入口", hook: "保存したデータを読み込む", bridge: "ここでは load。カタカナだけなら road や lord の可能性もあります。load は荷物を積む・負荷をかける意味にも広がります。" },
  { entryId: "JE003", difficulty: "standard", katakana: "スタート", english: "start", context: "タイトル画面", depth: "入口", hook: "ゲームを始める", bridge: "日本のゲームで見かける push start。自然な英語でボタン操作を案内するなら press start が基本です。" },
  { entryId: "JE004", difficulty: "standard", katakana: "コンティニュー", english: "continue", context: "ゲームオーバー後", depth: "入口", hook: "途中から続ける", bridge: "continue はゲームの外でも、話や作業を『続ける』時にそのまま使えます。" },
  { entryId: "JE005", difficulty: "standard", katakana: "ゲームオーバー", english: "game over", context: "失敗画面", depth: "入口", hook: "プレイの区切りになる", bridge: "game over の over は『終わって』の感覚。over には『越えて』など別の使い方もあります。" },
  { entryId: "JE006", difficulty: "standard", katakana: "レベル", english: "level", context: "ステータス", depth: "成長", hook: "強さや進行の段階", bridge: "level はゲームの強さだけでなく、水準・段階・平らという意味にも広がります。" },
  { entryId: "JE007", difficulty: "standard", katakana: "ステージ", english: "stage", context: "進行マップ", depth: "成長", hook: "区切られた面や場面", bridge: "stage はゲームの面だけでなく、舞台や物事の段階にも使えます。" },
  { entryId: "JE008", difficulty: "standard", katakana: "アイテム", english: "item", context: "持ちもの", depth: "成長", hook: "取得・使用する道具", bridge: "item は道具だけでなく、リストの品目や話題の項目にも使えます。" },
  { entryId: "JE009", difficulty: "standard", katakana: "スキル", english: "skill", context: "能力画面", depth: "成長", hook: "習得・装備する能力や技", bridge: "skill はゲーム外では、練習や経験で身につけた技能を表します。" },
  { entryId: "JE010", difficulty: "standard", katakana: "コマンド", english: "command", context: "バトルメニュー", depth: "成長", hook: "次の行動を選ぶ", bridge: "command はゲームの選択肢だけでなく、命令や指揮という意味にもつながります。" },
  { entryId: "JE011", difficulty: "standard", katakana: "クエスト", english: "quest", context: "依頼リスト", depth: "物語", hook: "依頼を受けて達成する課題", bridge: "quest は、答えや何かを探し求める長い追求という意味にも使えます。" },
  { entryId: "JE012", difficulty: "standard", katakana: "ミッション", english: "mission", context: "任務画面", depth: "物語", hook: "達成すべき任務", bridge: "mission はゲームの任務から、組織や人が果たす使命へ広がります。" },
  { entryId: "JE013", difficulty: "standard", katakana: "バトル", english: "battle", context: "戦闘画面", depth: "物語", hook: "敵との戦闘", bridge: "battle は戦闘だけでなく、困難や病気との『闘い』にも使えます。" },
  { entryId: "JE014", difficulty: "standard", katakana: "ボーナス", english: "bonus", context: "結果画面", depth: "物語", hook: "追加の得点・報酬・特典", bridge: "bonus は、通常の分に追加でもらえるものを表します。" },
  { entryId: "JE015", difficulty: "standard", katakana: "ラスボス", english: "final boss", context: "物語の終盤", depth: "発見", hook: "最後に立ちはだかる主要ボス", bridge: "日本語では『ラスボス』。自然な英語では last boss より final boss が普通です。" },
  { entryId: "JE016", difficulty: "hard", katakana: "ビルド", english: "build", context: "スキル・装備構成", depth: "高難度", hook: "戦い方に合わせた構成", bridge: "build は『作る』だけでなく、ゲームでは選んだスキルや装備の組み合わせ全体も指します。" },
  { entryId: "JE017", difficulty: "hard", katakana: "デバフ", english: "debuff", context: "状態効果", depth: "高難度", hook: "能力を下げる不利な効果", bridge: "debuff はプレイ中の不利な状態効果。ゲーム自体の性能を調整する nerf とは別です。" },
  { entryId: "JE018", difficulty: "hard", katakana: "スポーン", english: "spawn", context: "敵・アイテムの出現", depth: "高難度", hook: "マップ上に出現する", bridge: "spawn は敵やアイテムが出現すること。もう一度現れるなら re- を足した respawn へつながります。" },
  { entryId: "JE019", difficulty: "hard", katakana: "ローグライク", english: "roguelike", context: "ゲームジャンル", depth: "高難度", hook: "再挑戦ごとに展開が変わる", bridge: "roguelike は Rogue に『〜のような』の -like が付いた語。ジャンルの境界は作品や説明元で揺れます。" },
  { entryId: "JE020", difficulty: "hard", katakana: "ハクスラ", english: "hack and slash", context: "アクション・RPG系ジャンル", depth: "高難度", hook: "敵を次々と倒して進む", bridge: "ハクスラは hack and slash の日本語での略し方。英語句だけでは、装備収集や周回まで必ず含むとは限りません。" }
];

const networks = [
  {
    coreKatakana: "セーブ",
    coreEnglish: "save",
    title: "セーブから広げる",
    depth: "入口 → 操作",
    nodes: [
      { katakana: "ロード", english: "load", relation: "保存 ↔ 読み込み", label: "セーブデータ", title: "ロード / load", copy: "保存した進行を読み込む。load は荷物を積む・負荷をかける意味にも広がります。" },
      { katakana: "スタート", english: "start", relation: "進行を開始", label: "タイトル画面", title: "スタート / start", copy: "push start で知っていた start から、自然な操作指示 press start へ進めます。" },
      { katakana: "コンティニュー", english: "continue", relation: "進行を継続", label: "プレイ継続", title: "コンティニュー / continue", copy: "保存した進行を途中から続ける。会話や作業を続ける時にも使えます。" },
      { katakana: "ゲームオーバー", english: "game over", relation: "進行が終了", label: "プレイ終了", title: "ゲームオーバー / game over", copy: "プレイの区切りを示す句から、over の『終わって』という感覚を発見します。" }
    ]
  },
  {
    coreKatakana: "レベル",
    coreEnglish: "level",
    title: "レベルから広げる",
    depth: "成長 → システム",
    nodes: [
      { katakana: "ステージ", english: "stage", relation: "進行の区切り", label: "進行", title: "ステージ / stage", copy: "区切られた面から、舞台や物事の段階という意味へ広がります。" },
      { katakana: "アイテム", english: "item", relation: "成長を支える", label: "持ちもの", title: "アイテム / item", copy: "道具から、リストの品目や話題の項目へ広がります。" },
      { katakana: "スキル", english: "skill", relation: "能力を伸ばす", label: "能力", title: "スキル / skill", copy: "習得した技から、練習や経験で身につけた技能へ広がります。" },
      { katakana: "コマンド", english: "command", relation: "行動を選ぶ", label: "行動選択", title: "コマンド / command", copy: "行動メニューから、命令や指揮という意味へ広がります。" }
    ]
  },
  {
    coreKatakana: "クエスト",
    coreEnglish: "quest",
    title: "クエストから広げる",
    depth: "物語 → 発見",
    nodes: [
      { katakana: "ミッション", english: "mission", relation: "任務の種類", label: "任務", title: "ミッション / mission", copy: "ゲームの任務から、組織や人が果たす使命へ広がります。" },
      { katakana: "バトル", english: "battle", relation: "達成の過程", label: "戦闘", title: "バトル / battle", copy: "敵との戦闘から、困難との闘いという比喩へ広がります。" },
      { katakana: "ボーナス", english: "bonus", relation: "追加の報酬", label: "追加報酬", title: "ボーナス / bonus", copy: "通常の報酬に追加されるものとして、ゲーム外でもそのまま使えます。" },
      { katakana: "ラスボス", english: "final boss", relation: "終盤の目標", label: "日英のずれ", title: "ラスボス / final boss", copy: "日本語では『ラスト＋ボス』ですが、自然な英語では final boss と表すのが普通です。" }
    ]
  }
];

const state = {
  cardIndex: 0,
  currentAnswer: null,
  answers: [],
  networkIndex: 0,
  selectedNodes: new Set(),
  selectedNodeIndex: null
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
  state.selectedNodeIndex = null;
}

function startScan() {
  resetState();
  showScreen("screen-scan");
  renderCard();
}

function renderCard() {
  const card = scanCards[state.cardIndex];
  const isHard = card.difficulty === "hard";
  $("scan-current").textContent = String(state.cardIndex + 1);
  $("scan-progress").style.width = `${((state.cardIndex + 1) / scanCards.length) * 100}%`;
  $("card-depth").textContent = card.depth;
  $("card-entry-id").textContent = card.entryId;
  $("card-context").textContent = card.context;
  $("card-katakana").textContent = card.katakana;
  $("card-english").textContent = card.english;
  $("card-hook").textContent = card.hook;
  $("card-bridge").textContent = card.bridge;
  $("card-hard-badge").hidden = !isHard;
  $("scan-card").classList.toggle("is-hard", isHard);
  $("scan-eyebrow").classList.toggle("is-hard", isHard);
  $("scan-eyebrow").textContent = isHard ? "HARD CHALLENGE" : "QUICK SCAN";
  $("scan-title").textContent = isHard ? "ここまで知ってる？" : "見たことある？";
  $("card-prompt").textContent = isHard ? "SteamやPCゲームで、この言葉を見たことがありますか？" : "日本のゲームで、この言葉をどのくらい知っていますか？";
  $("reveal-label").textContent = isHard ? "HARD WORD FOUND" : "FOUND IN YOUR INVENTORY";
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
  const standardAnswers = state.answers.filter((_, index) => scanCards[index]?.difficulty === "standard");
  const hardAnswers = state.answers.filter((_, index) => scanCards[index]?.difficulty === "hard");
  const seen = standardAnswers.filter((value) => value >= 1).length;
  const understood = standardAnswers.filter((value) => value === 2).length;
  const hardSeen = hardAnswers.filter((value) => value >= 1).length;
  const hardUnderstood = hardAnswers.filter((value) => value === 2).length;
  return { seen, understood, fresh: standardAnswers.length - seen, hardSeen, hardUnderstood };
}

function renderResult() {
  const { seen, understood, fresh, hardSeen, hardUnderstood } = getScores();
  const [rank, message] = rankFor(seen);
  $("result-known").textContent = String(seen);
  $("result-seen").textContent = String(seen);
  $("result-understood").textContent = String(understood);
  $("result-new").textContent = String(fresh);
  $("result-hard").textContent = `${hardSeen} / 5 発見`;
  $("result-hard-detail").textContent = `${hardUnderstood}語は意味まで把握（基本ランクの採点外）`;
  $("result-rank").textContent = `RANK: ${rank}`;
  $("result-message").textContent = message;
  showScreen("screen-result");
}

function startNetworks() {
  state.networkIndex = 0;
  state.selectedNodes = new Set();
  state.selectedNodeIndex = null;
  showScreen("screen-network");
  renderNetwork();
}

function renderNetwork() {
  const network = networks[state.networkIndex];
  $("network-step").textContent = `${state.networkIndex + 1} / ${networks.length}`;
  $("network-title").textContent = network.title;
  $("network-depth").textContent = network.depth;
  $("network-core-katakana").textContent = network.coreKatakana;
  $("network-core-english").textContent = network.coreEnglish;
  $("connection-label").textContent = "SELECT A NODE";
  $("connection-title").textContent = "枝を1つ選んでください";
  $("connection-copy").textContent = "ゲームの意味を出発点に、日常で使える意味までつなぎます。";
  $("network-link-layer").replaceChildren();
  state.selectedNodeIndex = null;
  $("network-next").querySelector("span").textContent = state.networkIndex === networks.length - 1 ? "結果を見る" : "次のマップ";

  const nodes = $("network-nodes");
  nodes.replaceChildren();
  network.nodes.forEach((node, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "network-node";
    const katakana = document.createElement("span");
    katakana.textContent = node.katakana;
    const english = document.createElement("small");
    english.textContent = node.english;
    button.append(katakana, english);
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
  state.selectedNodeIndex = index;
  document.querySelectorAll(".network-node").forEach((item) => {
    const selected = item === button;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  $("connection-label").textContent = `${node.label} · ${node.relation}`;
  $("connection-title").textContent = node.title;
  $("connection-copy").textContent = node.copy;
  renderNetworkLink(button, node, true);
}

function renderNetworkLink(button, node, animate = false) {
  const stage = document.querySelector(".network-stage");
  const core = $("network-core");
  const layer = $("network-link-layer");
  if (!stage || !core || !button || !node) return;

  const stageRect = stage.getBoundingClientRect();
  const coreRect = core.getBoundingClientRect();
  const nodeRect = button.getBoundingClientRect();
  const startX = coreRect.left + (coreRect.width / 2) - stageRect.left;
  const startY = coreRect.top + (coreRect.height / 2) - stageRect.top;
  const endX = nodeRect.left + (nodeRect.width / 2) - stageRect.left;
  const endY = nodeRect.top + (nodeRect.height / 2) - stageRect.top;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const length = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

  const beam = document.createElement("div");
  beam.className = `network-link-beam${animate ? " is-animated" : " is-visible"}`;
  beam.style.left = `${startX}px`;
  beam.style.top = `${startY}px`;
  beam.style.width = `${length}px`;
  beam.style.setProperty("--link-angle", `${angle}deg`);

  const spark = document.createElement("span");
  spark.className = "network-link-spark";
  beam.append(spark);

  const relation = document.createElement("span");
  relation.className = `network-link-relation${animate ? " is-animated" : " is-visible"}`;
  relation.textContent = node.relation;
  relation.style.left = `${startX + (deltaX * .5)}px`;
  relation.style.top = `${startY + (deltaY * .5)}px`;

  layer.replaceChildren(beam, relation);
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
  const { seen, understood, hardSeen } = getScores();
  $("final-summary-text").textContent = `基本15語中${seen}語に見覚え、HARD 5語中${hardSeen}語を発見`;
  $("final-summary-detail").textContent = `基本語のうち${understood}語は意味まで把握。HARDはランクの採点外。結果はこの端末内だけで処理し、送信していません。`;
  showScreen("screen-final");
}

window.addEventListener("resize", () => {
  if ($("screen-network").hidden || state.selectedNodeIndex === null) return;
  const button = document.querySelector(`.network-node[data-node-index="${state.selectedNodeIndex}"]`);
  renderNetworkLink(button, networks[state.networkIndex].nodes[state.selectedNodeIndex]);
});

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
