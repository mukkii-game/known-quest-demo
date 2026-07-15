"use strict";

const scanCards = [
  { entryId: "JE001", katakana: "セーブ", english: "save", context: "システムメニュー", depth: "入口", hook: "進行を残す", bridge: "save はデータだけでなく、人を救う・時間やお金を節約する時にも使えます。" },
  { entryId: "JE002", katakana: "ロード", english: "load", context: "セーブデータの読込", depth: "入口", hook: "保存したデータを読み込む", bridge: "ここでは load。カタカナだけなら road や lord の可能性もあります。load は荷物を積む・負荷をかける意味にも広がります。" },
  { entryId: "JE003", katakana: "スタート", english: "start", context: "タイトル画面", depth: "入口", hook: "ゲームを始める", bridge: "日本のゲームで見かける push start。自然な英語でボタン操作を案内するなら press start が基本です。" },
  { entryId: "JE004", katakana: "コンティニュー", english: "continue", context: "ゲームオーバー後", depth: "入口", hook: "途中から続ける", bridge: "continue はゲームの外でも、話や作業を『続ける』時にそのまま使えます。" },
  { entryId: "JE005", katakana: "ゲームオーバー", english: "game over", context: "失敗画面", depth: "入口", hook: "プレイの区切りになる", bridge: "game over の over は『終わって』の感覚。over には『越えて』など別の使い方もあります。" },
  { entryId: "JE006", katakana: "レベル", english: "level", context: "ステータス", depth: "成長", hook: "強さや進行の段階", bridge: "level はゲームの強さだけでなく、水準・段階・平らという意味にも広がります。" },
  { entryId: "JE007", katakana: "ステージ", english: "stage", context: "進行マップ", depth: "成長", hook: "区切られた面や場面", bridge: "stage はゲームの面だけでなく、舞台や物事の段階にも使えます。" },
  { entryId: "JE008", katakana: "アイテム", english: "item", context: "持ちもの", depth: "成長", hook: "取得・使用する道具", bridge: "item は道具だけでなく、リストの品目や話題の項目にも使えます。" },
  { entryId: "JE009", katakana: "スキル", english: "skill", context: "能力画面", depth: "成長", hook: "習得・装備する能力や技", bridge: "skill はゲーム外では、練習や経験で身につけた技能を表します。" },
  { entryId: "JE010", katakana: "コマンド", english: "command", context: "バトルメニュー", depth: "成長", hook: "次の行動を選ぶ", bridge: "command はゲームの選択肢だけでなく、命令や指揮という意味にもつながります。" },
  { entryId: "JE011", katakana: "クエスト", english: "quest", context: "依頼リスト", depth: "物語", hook: "依頼を受けて達成する課題", bridge: "quest は、答えや何かを探し求める長い追求という意味にも使えます。" },
  { entryId: "JE012", katakana: "ミッション", english: "mission", context: "任務画面", depth: "物語", hook: "達成すべき任務", bridge: "mission はゲームの任務から、組織や人が果たす使命へ広がります。" },
  { entryId: "JE013", katakana: "バトル", english: "battle", context: "戦闘画面", depth: "物語", hook: "敵との戦闘", bridge: "battle は戦闘だけでなく、困難や病気との『闘い』にも使えます。" },
  { entryId: "JE014", katakana: "ボーナス", english: "bonus", context: "結果画面", depth: "物語", hook: "追加の得点・報酬・特典", bridge: "bonus は、通常の分に追加でもらえるものを表します。" },
  { entryId: "JE015", katakana: "ラスボス", english: "final boss", context: "物語の終盤", depth: "発見", hook: "最後に立ちはだかる主要ボス", bridge: "日本語では『ラスボス』。自然な英語では last boss より final boss が普通です。" }
];

const networks = [
  {
    coreKatakana: "セーブ",
    coreEnglish: "save",
    title: "セーブから広げる",
    depth: "入口 → 操作",
    nodes: [
      { katakana: "ロード", english: "load", label: "セーブデータ", title: "ロード / load", copy: "保存した進行を読み込む。load は荷物を積む・負荷をかける意味にも広がります。" },
      { katakana: "スタート", english: "start", label: "タイトル画面", title: "スタート / start", copy: "push start で知っていた start から、自然な操作指示 press start へ進めます。" },
      { katakana: "コンティニュー", english: "continue", label: "プレイ継続", title: "コンティニュー / continue", copy: "保存した進行を途中から続ける。会話や作業を続ける時にも使えます。" },
      { katakana: "ゲームオーバー", english: "game over", label: "プレイ終了", title: "ゲームオーバー / game over", copy: "プレイの区切りを示す句から、over の『終わって』という感覚を発見します。" }
    ]
  },
  {
    coreKatakana: "レベル",
    coreEnglish: "level",
    title: "レベルから広げる",
    depth: "成長 → システム",
    nodes: [
      { katakana: "ステージ", english: "stage", label: "進行", title: "ステージ / stage", copy: "区切られた面から、舞台や物事の段階という意味へ広がります。" },
      { katakana: "アイテム", english: "item", label: "持ちもの", title: "アイテム / item", copy: "道具から、リストの品目や話題の項目へ広がります。" },
      { katakana: "スキル", english: "skill", label: "能力", title: "スキル / skill", copy: "習得した技から、練習や経験で身につけた技能へ広がります。" },
      { katakana: "コマンド", english: "command", label: "行動選択", title: "コマンド / command", copy: "行動メニューから、命令や指揮という意味へ広がります。" }
    ]
  },
  {
    coreKatakana: "クエスト",
    coreEnglish: "quest",
    title: "クエストから広げる",
    depth: "物語 → 発見",
    nodes: [
      { katakana: "ミッション", english: "mission", label: "任務", title: "ミッション / mission", copy: "ゲームの任務から、組織や人が果たす使命へ広がります。" },
      { katakana: "バトル", english: "battle", label: "戦闘", title: "バトル / battle", copy: "敵との戦闘から、困難との闘いという比喩へ広がります。" },
      { katakana: "ボーナス", english: "bonus", label: "追加報酬", title: "ボーナス / bonus", copy: "通常の報酬に追加されるものとして、ゲーム外でもそのまま使えます。" },
      { katakana: "ラスボス", english: "final boss", label: "日英のずれ", title: "ラスボス / final boss", copy: "日本語では『ラスト＋ボス』ですが、自然な英語では final boss と表すのが普通です。" }
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
  $("card-entry-id").textContent = card.entryId;
  $("card-context").textContent = card.context;
  $("card-katakana").textContent = card.katakana;
  $("card-english").textContent = card.english;
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
  $("network-core-katakana").textContent = network.coreKatakana;
  $("network-core-english").textContent = network.coreEnglish;
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
