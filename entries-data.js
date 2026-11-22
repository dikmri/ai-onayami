/*
 * AIお悩み解決ドットコム 記事データ
 *
 * トップページの一覧、検索、カテゴリ絞り込み、記事ページのカテゴリ表示は、
 * すべてこのファイルの内容から描画する。
 *
 * ■ 記事を1件追加する手順
 *   1. entries/ に記事HTMLを作る（例: entries/001.html を複製して entries/002.html にする）。
 *      見出しの下のカテゴリ欄は、data-entry-id を新しい番号に書き換える。カテゴリ名は書かない。
 *        <div class="entry-categories">
 *          <p class="entry-categories-label">カテゴリ</p>
 *          <ul class="tags" role="list" data-entry-id="002"></ul>
 *        </div>
 *   2. 下の entries に1件足す（並び順はどこでもよい。表示は日付の新しい順になる）。
 *        no         記事番号（3桁の文字列。entries/ のファイル名と data-entry-id にそろえる）
 *        title      記事タイトル
 *        summary    お悩みの要約（一覧と検索に使う。1〜2文）
 *        categories カテゴリID の配列（下の categories にある id から1つ以上）
 *        date       公開日（"YYYY-MM-DD"）
 *        url        記事のパス（サイトのトップからの相対パス）
 *        verdict    AIの見立て（任意。一覧カードに表示する）
 *   3. `node --test tests/site.test.js` を実行すると、項目の抜け、未定義のカテゴリ、
 *      記事ファイルの有無と data-entry-id の一致を確かめられる。
 *
 * ■ カテゴリを増やすとき
 *   categories に { id, label } を1件足す。id は URL（?cat=...）にも使うので、半角英小文字とハイフンで書く。
 */
var ONAYAMI_DATA = {
  categories: [
    { id: "pc-smartphone", label: "パソコン・スマホ" },
    { id: "apps-web", label: "アプリ・Webサービス" },
    { id: "online-procedures", label: "ネット手続き" },
    { id: "programming", label: "プログラミング・開発" },
    { id: "work-relationships", label: "仕事・人間関係" },
    { id: "sleep-life", label: "睡眠・生活" },
    { id: "money", label: "お金" },
  ],

  entries: [
    {
      no: "001",
      title: "職場の人間関係に気を使い続けて、夜も眠れない",
      summary:
        "同僚や上司の顔色をうかがう毎日で、家に帰っても疲れが取れない。夜中に目が覚めると、仕事や将来の不安で眠れない。",
      categories: ["work-relationships", "sleep-life"],
      date: "2026-11-22",
      url: "entries/001.html",
      verdict: "軽減できる見込みあり",
    },
    {
      no: "002",
      title: "パソコンが遅くて容量もいっぱい、買い替える前にできること",
      summary:
        "パソコンの動作が遅く、Cドライブの空き容量も残りわずか。写真や動画の編集アプリも重い。買い替える前に自分でできることを試したい。",
      categories: ["pc-smartphone"],
      date: "2026-11-22",
      url: "entries/002.html",
      verdict: "改善できる見込みあり",
    },
    {
      no: "003",
      title: "奥の部屋だけ Wi-Fi が届かない、家中快適にするには",
      summary:
        "リビングでは快適なのに、奥の部屋や2階では Wi-Fi が弱くてつながりにくい。仕事用の机がある部屋が使えず、ルーターの買い替えか中継器かも分からない。",
      categories: ["pc-smartphone"],
      date: "2026-11-22",
      url: "entries/003.html",
      verdict: "改善できる見込みあり",
    },
    {
      no: "004",
      title: "パスワードが覚えられない、使い回しも不安。安全にラクに管理するには",
      summary:
        "サービスごとに違うパスワードが覚えられず、確認コードの入力中に期限が切れてロックされることも。使い回しの不安と二段階認証の手間を、安全にラクにする方法。",
      categories: ["pc-smartphone"],
      date: "2026-11-22",
      url: "entries/004.html",
      verdict: "改善できる見込みあり",
    },
  ],
};

// テスト（Node.js）から読み込むときだけ使う。ブラウザでは何もしない。
if (typeof module === "object" && module.exports) {
  module.exports = ONAYAMI_DATA;
}
