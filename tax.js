// 会社員の年収から、所得・課税所得・住民税の所得割額を見積もる（2026年分＝令和8年度税制改正の内容）
// 目安の計算。社会保険料は年収の約15%として見積もる（入力で変更可）
const TAX = (() => {
  // 給与所得控除（2026年分：最低保障額69万円。所得税は2026・2027年分の特例でさらに5万円上乗せの74万円）
  function kyuyoShotoku(s, juminzei = false) {
    if (s <= 0) return 0;
    const min = juminzei ? 690000 : 740000;
    let k;
    if (s <= 1900000) k = min;
    else if (s <= 3600000) k = Math.max(min, s * 0.3 + 80000);
    else if (s <= 6600000) k = s * 0.2 + 440000;
    else if (s <= 8500000) k = s * 0.1 + 1100000;
    else k = 1950000;
    return Math.max(0, Math.floor(s - k));
  }
  // 所得税の基礎控除（2026・2027年分：本則62万円＋特例）
  function kisoShotokuzei(g) {
    if (g <= 4890000) return 1040000;
    if (g <= 6550000) return 670000;
    if (g <= 23500000) return 620000;
    if (g <= 24000000) return 480000;
    if (g <= 24500000) return 320000;
    if (g <= 25000000) return 160000;
    return 0;
  }
  function kisoJuminzei(g) {
    if (g <= 24000000) return 430000;
    if (g <= 24500000) return 290000;
    if (g <= 25000000) return 150000;
    return 0;
  }
  // 配偶者控除（配偶者の給与年収136万円以下）。本人の所得で減る
  function haigusha(g, has) {
    if (!has) return [0, 0];
    if (g <= 9000000) return [380000, 330000];
    if (g <= 9500000) return [260000, 220000];
    if (g <= 10000000) return [130000, 110000];
    return [0, 0];
  }
  function rateOf(k) {
    if (k <= 1949000) return 0.05;
    if (k <= 3299000) return 0.10;
    if (k <= 6949000) return 0.20;
    if (k <= 8999000) return 0.23;
    if (k <= 17999000) return 0.33;
    if (k <= 39999000) return 0.40;
    return 0.45;
  }
  // salary: 年収（円）, spouse: 配偶者を扶養, ippan: 16〜18歳・23歳以上の扶養人数, tokutei: 19〜22歳の扶養人数, shaho: 社会保険料（円・省略で年収×15%）
  function estimate({ salary, spouse = false, ippan = 0, tokutei = 0, shaho }) {
    const g = kyuyoShotoku(salary), gj = kyuyoShotoku(salary, true);
    const sh = shaho == null || shaho === "" ? Math.round(salary * 0.15) : Number(shaho);
    const [hs, hj] = haigusha(g, spouse);
    const fuyoS = ippan * 380000 + tokutei * 630000, fuyoJ = ippan * 330000 + tokutei * 450000;
    const kazeiS = Math.max(0, Math.floor((g - sh - kisoShotokuzei(g) - hs - fuyoS) / 1000) * 1000);
    const kazeiJ = Math.max(0, Math.floor((gj - sh - kisoJuminzei(gj) - hj - fuyoJ) / 1000) * 1000);
    // 調整控除（人的控除の差）
    const sa = 50000 + (hj ? 50000 : 0) + ippan * 50000 + tokutei * 180000;
    const chosei = kazeiJ <= 2000000 ? Math.min(sa, kazeiJ) * 0.05 : Math.max((sa - (kazeiJ - 2000000)) * 0.05, 2500);
    const shotokuwari = Math.max(0, Math.floor(kazeiJ * 0.1 - (kazeiJ > 0 ? chosei : 0)));
    return { kyuyoShotoku: g, shaho: sh, kazeiShotoku: kazeiS, kazeiJumin: kazeiJ, shotokuwari, rate: rateOf(kazeiS) };
  }
  // 所得税（復興特別所得税を含む）。速算表
  function shotokuzei(k) {
    const T = [[1949000, 0.05, 0], [3299000, 0.10, 97500], [6949000, 0.20, 427500], [8999000, 0.23, 636000], [17999000, 0.33, 1536000], [39999000, 0.40, 2796000], [Infinity, 0.45, 4796000]];
    const [, r, d] = T.find(t => k <= t[0]);
    return Math.max(0, Math.floor((k * r - d) * 1.021 / 100) * 100);
  }
  // 年収から手取りの目安
  function tedori(o) {
    const e = estimate(o);
    const it = shotokuzei(e.kazeiShotoku);
    const rt = e.kazeiJumin > 0 ? e.shotokuwari + 5000 : 0; // 均等割（森林環境税を含む）5,000円
    return { ...e, shotokuzei: it, juminzei: rt, tedori: o.salary - e.shaho - it - rt };
  }
  return { estimate, rateOf, kyuyoShotoku, shotokuzei, tedori };
})();
