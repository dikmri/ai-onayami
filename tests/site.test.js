// 実行方法: プロジェクト直下で `node --test tests/site.test.js`（Node.js 18 以上。追加のインストールは不要）
// site.js の絞り込みロジックと、entries-data.js の記事データの整合性を確かめる。
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const site = require("../site.js");
const data = require("../entries-data.js");

const ROOT = path.join(__dirname, "..");

const categories = [
  { id: "pc-smartphone", label: "パソコン・スマホ" },
  { id: "work-relationships", label: "仕事・人間関係" },
  { id: "sleep-life", label: "睡眠・生活" },
  { id: "money", label: "お金" },
];

const entries = [
  {
    no: "001",
    title: "職場の人間関係に気を使い続けて、夜も眠れない",
    summary: "同僚や上司の顔色をうかがう毎日で、家に帰っても疲れが取れない。",
    categories: ["work-relationships", "sleep-life"],
    date: "2026-11-22",
    url: "entries/001.html",
  },
  {
    no: "002",
    title: "スマホの容量がすぐにいっぱいになる",
    summary: "写真を消しても、しばらくすると空き容量が足りなくなる。",
    categories: ["pc-smartphone"],
    date: "2026-11-23",
    url: "entries/002.html",
  },
  {
    no: "003",
    title: "Excel の関数が分からず、家計簿が続かない",
    summary: "毎月の出費を記録したいが、集計のやり方が分からない。",
    categories: ["pc-smartphone", "money"],
    date: "2026-11-23",
    url: "entries/003.html",
  },
];

const nos = (list) => list.map((e) => e.no);

test("normalizeText: 全角・半角、大文字・小文字、カタカナ・ひらがなの違いをそろえる", () => {
  assert.equal(site.normalizeText("ＥＸＣＥＬ"), "excel");
  assert.equal(site.normalizeText("ｽﾏﾎ"), site.normalizeText("スマホ"));
  assert.equal(site.normalizeText("スマホ"), site.normalizeText("すまほ"));
  assert.notEqual(site.normalizeText("スマホ"), site.normalizeText("パソコン"));
  assert.equal(site.normalizeText(undefined), "");
});

test("filterEntries: 条件が空なら全件を返す", () => {
  assert.deepEqual(nos(site.filterEntries(entries, { query: "", category: "" }, categories)), ["001", "002", "003"]);
  assert.deepEqual(nos(site.filterEntries(entries, { query: "  　 ", category: "" }, categories)), ["001", "002", "003"]);
});

test("filterEntries: タイトルとお悩みの要約の両方を検索する", () => {
  assert.deepEqual(nos(site.filterEntries(entries, { query: "眠れない", category: "" }, categories)), ["001"]);
  assert.deepEqual(nos(site.filterEntries(entries, { query: "顔色", category: "" }, categories)), ["001"]);
  assert.deepEqual(nos(site.filterEntries(entries, { query: "空き容量", category: "" }, categories)), ["002"]);
});

test("filterEntries: カテゴリ名でも検索できる", () => {
  assert.deepEqual(nos(site.filterEntries(entries, { query: "お金", category: "" }, categories)), ["003"]);
});

test("filterEntries: 表記ゆれを吸収する（ひらがな・半角・小文字）", () => {
  assert.deepEqual(nos(site.filterEntries(entries, { query: "すまほ", category: "" }, categories)), ["002", "003"]);
  assert.deepEqual(nos(site.filterEntries(entries, { query: "excel", category: "" }, categories)), ["003"]);
});

test("filterEntries: 空白（全角スペースを含む）で区切った語はすべてを含む記事だけを返す", () => {
  assert.deepEqual(nos(site.filterEntries(entries, { query: "スマホ　容量", category: "" }, categories)), ["002"]);
  assert.deepEqual(nos(site.filterEntries(entries, { query: "スマホ 眠れない", category: "" }, categories)), []);
});

test("filterEntries: カテゴリで絞り込む", () => {
  assert.deepEqual(nos(site.filterEntries(entries, { query: "", category: "pc-smartphone" }, categories)), ["002", "003"]);
  assert.deepEqual(nos(site.filterEntries(entries, { query: "", category: "sleep-life" }, categories)), ["001"]);
});

test("filterEntries: カテゴリとキーワードは両方を満たす記事だけを返す", () => {
  assert.deepEqual(nos(site.filterEntries(entries, { query: "家計簿", category: "pc-smartphone" }, categories)), ["003"]);
  assert.deepEqual(nos(site.filterEntries(entries, { query: "家計簿", category: "sleep-life" }, categories)), []);
});

test("sortEntries: 新しい日付が先、同じ日付なら番号の大きい順。元の配列は変えない", () => {
  const input = entries.slice();
  assert.deepEqual(nos(site.sortEntries(input)), ["003", "002", "001"]);
  assert.deepEqual(nos(input), ["001", "002", "003"]);
});

test("countByCategory: カテゴリごとの記事数を数える", () => {
  assert.deepEqual(site.countByCategory(entries, categories), {
    "pc-smartphone": 2,
    "work-relationships": 1,
    "sleep-life": 1,
    money: 1,
  });
});

test("formatDate: YYYY-MM-DD を日本語の日付にする", () => {
  assert.equal(site.formatDate("2026-11-22"), "2026年11月22日");
  assert.equal(site.formatDate("2027-01-05"), "2027年1月5日");
  assert.equal(site.formatDate("不正な値"), "不正な値");
});

test("findUnknownCategories: 定義にないカテゴリIDを記事ごとに見つける", () => {
  const broken = [{ no: "009", categories: ["money", "moeny"] }];
  assert.deepEqual(site.findUnknownCategories(broken, categories), [{ no: "009", id: "moeny" }]);
  assert.deepEqual(site.findUnknownCategories(entries, categories), []);
});

// ---------- 実データ（entries-data.js）の整合性 ----------

test("entries-data.js: 必須項目がそろい、番号が重複していない", () => {
  assert.ok(Array.isArray(data.categories) && data.categories.length > 0);
  assert.ok(Array.isArray(data.entries) && data.entries.length > 0);

  const seen = new Set();
  for (const entry of data.entries) {
    for (const key of ["no", "title", "summary", "date", "url"]) {
      assert.equal(typeof entry[key], "string", `No.${entry.no} の ${key} が文字列ではありません`);
      assert.notEqual(entry[key].trim(), "", `No.${entry.no} の ${key} が空です`);
    }
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, `No.${entry.no} の date は YYYY-MM-DD で書いてください`);
    assert.ok(Array.isArray(entry.categories) && entry.categories.length > 0, `No.${entry.no} にカテゴリがありません`);
    assert.ok(!seen.has(entry.no), `No.${entry.no} が重複しています`);
    seen.add(entry.no);
  }
});

test("entries-data.js: カテゴリIDがすべて定義済み", () => {
  assert.deepEqual(site.findUnknownCategories(data.entries, data.categories), []);
});

test("entries-data.js: 記事URLのファイルが存在し、記事側の data-entry-id が番号と一致する", () => {
  for (const entry of data.entries) {
    const file = path.join(ROOT, entry.url);
    assert.ok(fs.existsSync(file), `No.${entry.no} の記事ファイル ${entry.url} がありません`);
    const html = fs.readFileSync(file, "utf8");
    assert.ok(
      html.includes(`data-entry-id="${entry.no}"`),
      `${entry.url} に data-entry-id="${entry.no}" がありません`
    );
  }
});
