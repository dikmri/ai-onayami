/*
 * AIお悩み解決ドットコム 共通スクリプト
 *
 * - トップページ（#entry-list がある）: entries-data.js から一覧・検索・カテゴリ絞り込みを描画する
 * - 記事ページ（[data-entry-id] がある）: entries-data.js からその記事のカテゴリを描画する
 *
 * 前半の関数は DOM に触れない純粋な処理で、tests/site.test.js から Node.js でも読み込む。
 */
(function (root) {
  "use strict";

  // ---------- 純粋な処理（テスト対象） ----------

  /** 検索用に文字をそろえる: 全角/半角（NFKC）、大文字/小文字、カタカナ/ひらがな */
  function normalizeText(text) {
    if (text === undefined || text === null) return "";
    return String(text)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }

  /** 検索語を空白（全角スペースを含む）で区切る */
  function tokenize(query) {
    return normalizeText(query).split(/\s+/).filter(Boolean);
  }

  function categoryLabelMap(categories) {
    const map = new Map();
    for (const category of categories || []) map.set(category.id, category.label);
    return map;
  }

  /**
   * 条件に合う記事だけを、元の順番のまま返す。
   * - query: 番号・タイトル・お悩みの要約・カテゴリ名を対象に、空白区切りの全語を含むものに絞る
   * - category: カテゴリID。空文字なら絞り込まない
   */
  function filterEntries(entries, conditions, categories) {
    const query = (conditions && conditions.query) || "";
    const category = (conditions && conditions.category) || "";
    const tokens = tokenize(query);
    const labels = categoryLabelMap(categories);

    return (entries || []).filter((entry) => {
      const entryCategories = entry.categories || [];
      if (category && !entryCategories.includes(category)) return false;
      if (tokens.length === 0) return true;

      const haystack = normalizeText(
        [entry.no, entry.title, entry.summary]
          .concat(entryCategories.map((id) => labels.get(id) || ""))
          .join("\n")
      );
      return tokens.every((token) => haystack.includes(token));
    });
  }

  /** 新しい日付が先、同じ日付なら番号の大きい順に並べた新しい配列を返す */
  function sortEntries(entries) {
    return (entries || []).slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return Number(b.no) - Number(a.no);
    });
  }

  /** カテゴリIDごとの記事数（定義済みのカテゴリだけ） */
  function countByCategory(entries, categories) {
    const counts = {};
    for (const category of categories || []) counts[category.id] = 0;
    for (const entry of entries || []) {
      for (const id of entry.categories || []) {
        if (Object.prototype.hasOwnProperty.call(counts, id)) counts[id] += 1;
      }
    }
    return counts;
  }

  /** "2026-11-22" → "2026年11月22日"。形式が違うときはそのまま返す */
  function formatDate(isoDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate));
    if (!match) return String(isoDate);
    return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
  }

  /** categories に定義されていないカテゴリIDを [{ no, id }] で返す（データの書き間違いの検出用） */
  function findUnknownCategories(entries, categories) {
    const known = categoryLabelMap(categories);
    const unknown = [];
    for (const entry of entries || []) {
      for (const id of entry.categories || []) {
        if (!known.has(id)) unknown.push({ no: entry.no, id });
      }
    }
    return unknown;
  }

  const api = {
    normalizeText,
    tokenize,
    filterEntries,
    sortEntries,
    countByCategory,
    formatDate,
    findUnknownCategories,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  root.OnayamiSite = api;

  // ---------- ここから下はブラウザでの画面処理 ----------

  // このスクリプトの置き場所＝サイトのトップ。記事ページ（entries/）からトップへのリンクに使う。
  const siteRoot = document.currentScript
    ? new URL(".", document.currentScript.src)
    : new URL(".", location.href);

  const data = root.ONAYAMI_DATA;
  if (!data || !Array.isArray(data.entries) || !Array.isArray(data.categories)) {
    console.error("[AIお悩み解決ドットコム] entries-data.js を読み込めませんでした。");
    const errorBox = document.getElementById("entry-load-error");
    if (errorBox) errorBox.hidden = false;
    return;
  }

  const unknown = findUnknownCategories(data.entries, data.categories);
  for (const item of unknown) {
    console.warn(`[AIお悩み解決ドットコム] No.${item.no} のカテゴリ "${item.id}" は entries-data.js の categories にありません。`);
  }

  const labels = categoryLabelMap(data.categories);

  initListPage();
  initEntryPage();

  // ---------- トップページ ----------

  function initListPage() {
    const list = document.getElementById("entry-list");
    const template = document.getElementById("entry-card-template");
    const form = document.getElementById("finder-form");
    const input = document.getElementById("finder-q");
    const chipList = document.getElementById("category-chips");
    const status = document.getElementById("result-status");
    const noResults = document.getElementById("no-results");
    const resetButton = document.getElementById("finder-reset");
    if (!list || !template || !form || !input || !chipList || !status || !noResults) return;

    const entries = sortEntries(data.entries);
    const total = entries.length;

    // URL（?q=...&cat=...）から初期条件を読む。未定義のカテゴリは無視する。
    const params = new URLSearchParams(location.search);
    const initialCategory = params.get("cat") || "";
    const state = {
      query: params.get("q") || "",
      category: labels.has(initialCategory) ? initialCategory : "",
    };

    // カード（一覧）は一度だけ作り、絞り込みでは hidden を切り替える。
    const items = entries.map((entry) => {
      const item = renderCard(template, entry);
      list.append(item);
      return { no: entry.no, element: item };
    });

    renderChips(chipList, entries);
    input.value = state.query;
    const checked = chipList.querySelector(`input[value="${CSS.escape(state.category)}"]`);
    if (checked) checked.checked = true;

    let statusTimer = 0;

    function apply(options) {
      const announceDelay = (options && options.announceDelay) || 0;
      const matched = new Set(filterEntries(entries, state, data.categories).map((e) => e.no));
      for (const item of items) item.element.hidden = !matched.has(item.no);
      noResults.hidden = matched.size > 0;
      syncUrl();

      // 件数の表示は読み上げ対象（role="status"）。入力中は打鍵ごとに読み上げないよう少し待つ。
      clearTimeout(statusTimer);
      const message = describeResult(matched.size);
      if (announceDelay > 0) {
        statusTimer = setTimeout(() => (status.textContent = message), announceDelay);
      } else {
        status.textContent = message;
      }
    }

    function describeResult(count) {
      const conditions = [];
      if (state.category) conditions.push(`カテゴリ「${labels.get(state.category)}」`);
      if (state.query.trim()) conditions.push(`キーワード「${state.query.trim()}」`);
      if (conditions.length === 0) return `全${total}件のお悩みを表示しています。`;
      return `${conditions.join("、")}に合うお悩み：${count}件（全${total}件中）`;
    }

    function syncUrl() {
      const next = new URLSearchParams();
      if (state.query.trim()) next.set("q", state.query.trim());
      if (state.category) next.set("cat", state.category);
      const search = next.toString();
      const url = location.pathname + (search ? `?${search}` : "") + location.hash;
      try {
        history.replaceState(history.state, "", url);
      } catch (error) {
        // file:// で開いたときなど、URL を書き換えられない環境では絞り込みだけ行う。
        console.warn("[AIお悩み解決ドットコム] URL に検索条件を反映できませんでした。", error);
      }
    }

    // 日本語入力の変換中は絞り込まず、確定したときに反映する。
    input.addEventListener("input", (event) => {
      if (event.isComposing) return;
      state.query = input.value;
      apply({ announceDelay: 600 });
    });
    input.addEventListener("compositionend", () => {
      state.query = input.value;
      apply({ announceDelay: 600 });
    });

    form.addEventListener("change", (event) => {
      if (event.target.name !== "cat") return;
      state.category = event.target.value;
      apply();
    });

    // Enter（実装上はフォーム送信）ではページを移動せず、その場で反映する。
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      state.query = input.value;
      apply();
    });

    if (resetButton) {
      resetButton.addEventListener("click", () => {
        input.value = "";
        const all = chipList.querySelector('input[value=""]');
        if (all) all.checked = true;
        state.query = "";
        state.category = "";
        apply();
        // リセットボタンは非表示になるので、フォーカスを検索欄へ移す。
        input.focus();
      });
    }

    apply();
  }

  function renderCard(template, entry) {
    const fragment = template.content.cloneNode(true);
    const item = fragment.firstElementChild;
    const field = (name) => item.querySelector(`[data-field="${name}"]`);

    field("no").textContent = entry.no;
    const time = field("date");
    time.dateTime = entry.date;
    time.textContent = formatDate(entry.date);

    const link = field("title");
    link.href = entry.url;
    link.textContent = entry.title;

    field("summary").textContent = entry.summary;

    const verdictRow = field("verdict-row");
    if (entry.verdict) {
      field("verdict").textContent = entry.verdict;
    } else {
      verdictRow.remove();
    }

    const tags = field("categories");
    for (const id of entry.categories || []) {
      if (!labels.has(id)) continue;
      const li = document.createElement("li");
      li.textContent = labels.get(id);
      tags.append(li);
    }
    return item;
  }

  function renderChips(container, entries) {
    const counts = countByCategory(entries, data.categories);
    const options = [{ id: "", label: "すべて", count: entries.length }].concat(
      data.categories.map((c) => ({ id: c.id, label: c.label, count: counts[c.id] }))
    );

    for (const option of options) {
      const wrapper = document.createElement("div");
      wrapper.className = "chip" + (option.count === 0 ? " chip--empty" : "");

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "cat";
      radio.value = option.id;
      radio.id = `cat-${option.id || "all"}`;
      if (option.id === "") radio.checked = true;

      const label = document.createElement("label");
      label.htmlFor = radio.id;
      label.append(option.label);

      const count = document.createElement("span");
      count.className = "chip-count";
      count.append(String(option.count));
      const unit = document.createElement("span");
      unit.className = "visually-hidden";
      unit.textContent = "件";
      count.append(unit);
      label.append(count);

      wrapper.append(radio, label);
      container.append(wrapper);
    }
  }

  // ---------- 記事ページ ----------

  function initEntryPage() {
    for (const list of document.querySelectorAll("[data-entry-id]")) {
      const no = list.getAttribute("data-entry-id");
      const entry = data.entries.find((e) => e.no === no);
      if (!entry) {
        console.warn(`[AIお悩み解決ドットコム] No.${no} が entries-data.js にありません。`);
        continue;
      }
      for (const id of entry.categories || []) {
        if (!labels.has(id)) continue;
        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = new URL(`index.html?cat=${encodeURIComponent(id)}`, siteRoot).href;
        link.textContent = labels.get(id);
        li.append(link);
        list.append(li);
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
