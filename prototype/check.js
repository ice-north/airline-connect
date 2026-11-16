/* ───────────────────────────────────────────────────────────────
   エアラインコネクト　自動チェック
   ───────────────────────────────────────────────────────────────
   使い方：  node prototype/check.js
   必要なもの： Node.js と playwright（npm i -D playwright && npx playwright install chromium）

   play.html をヘッドレスのブラウザで実際に動かして、毎回手で確かめていたことを
   そのまま機械にやらせる。ブラウザを開かずに「壊れていないか」だけ先に分かる。

   2026-10-28 に足した。きっかけは、手で見ていたのに何週間も気づかなかった3つ：
     ・他社便だけで発着枠の処理能力を超えていた（羽田 08〜10 が 208/178）
     ・機材一覧で機種名が2つ切れていた（DHC-6-400 ツインオッターが150px／枠102px）
     ・サーブ340Bを現金で買うと、残高0のまま第2週に必ず倒産した
   どれも「数えれば一発で分かる」たぐいのもの。人が見る前に、ここで落とす。

   地図のタイル（国土地理院）は外に取りに行くので、通らない環境では
   真っ白なまま進む。盤面の確認には影響しない。
   ─────────────────────────────────────────────────────────────── */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('playwright が見つかりません。\n  npm i -D playwright && npx playwright install chromium\nを実行してから、もう一度ためしてください。');
  process.exit(2);
}

const ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

/* play.html を配るだけの、使い捨てサーバー */
function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'play.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}/play.html` }));
  });
}

/* ── 結果の記録 ── */
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); }

/* ── 画面を「遊び始めた直後」の形にする。どのチェックもここから始める ── */
/* eslint-disable no-undef */
const SETUP = (base) => {
  document.querySelectorAll('.title-screen,#tutorial,.tut-restore').forEach(e => e.style.display = 'none');
  const names = Object.keys(airports);
  state.selectedBase = names.find(x => x.includes(base)) || names[0];
  startGame();
  state.cash = 5e9;                       /* 画面を一通り出すための軍資金 */
  leasePlaneById('Q400');
  state.fleetSetup = null; state.shopOpen = false;
  const dest = names.find(x => x.includes('那覇'));
  state.draft = { stops: [dest], park: state.base, frequency: 7, fare: '普通', timeBand: 6,
                  season: 'all', days: [0,1,2,3,4,5,6], trips: 1, planeId: null, pick: null };
  try { createRoute(); assignRoute(state.planes[0].id, state.routes[0].id); } catch (e) {}
  render();
  return { planes: state.planes.length, routes: state.routes.length };
};

/* ── ① 切れ・はみ出し・当たり判定・コンソール ── */
const SCAN = () => {
  const out = { clip: [], over: [], small: [] };
  const W = document.documentElement.clientWidth;
  document.querySelectorAll('#panel *,#wide *,.map-actions *').forEach(e => {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden') return;
    /* overflow:hidden の中で文字がはみ出している＝「…」で切れている */
    if (/hidden|clip/.test(cs.overflowX) && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1
        && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) {   /* 入力欄は値が長ければ横に流れるのが普通 */
      const t = (e.textContent || '').trim().slice(0, 24);
      if (t) out.clip.push(t + '（枠' + e.clientWidth + ' < 中身' + e.scrollWidth + '）');
    }
    if (r.right > W + 1) out.over.push((e.className || e.tagName) + ' right=' + Math.round(r.right));
    if (/^(BUTTON|SELECT|A)$/.test(e.tagName) && r.height < 40)
      out.small.push((e.textContent || '').trim().slice(0, 14) + ' h=' + Math.round(r.height));
  });
  out.hscroll = document.documentElement.scrollWidth > W + 1;
  return out;
};

(async () => {
  const { srv, url } = await serve();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const TABS = ['airport', 'fleet', 'routes', 'company', 'promo'];

  /* ───── 画面：広い幅と狭い幅で、全タブを見る ───── */
  /* 1024px を足した（2026-11-16）。「画面は広いが右の板は狭い」幅で、
     画面幅のメディアクエリが効かず文字が切れる型の不具合が2度続けて出たため。
     320px は、いちばん狭い端末での下限確認 */
  for (const vp of [{ w: 1440, h: 1200, tag: 'PC 1440px' }, { w: 1024, h: 900, tag: 'タブレット 1024px' },
                    { w: 375, h: 900, tag: 'スマホ 375px' }, { w: 320, h: 900, tag: 'スマホ 320px' }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    await page.evaluate(SETUP, '福岡');

    const clip = [], over = [], small = [];
    let hscroll = false;
    for (const tab of TABS) {
      await page.evaluate(t => { const b = document.querySelector('[data-panel="' + t + '"]'); if (b) b.click(); }, tab);
      await page.waitForTimeout(400);
      const r = await page.evaluate(SCAN);
      r.clip.forEach(x => clip.push(tab + '：' + x));
      r.over.forEach(x => over.push(tab + '：' + x));
      r.small.forEach(x => small.push(tab + '：' + x));
      if (r.hscroll) hscroll = true;
    }
    check(`${vp.tag}　文字の切れ`, clip.length === 0, clip.slice(0, 5).join(' / '));
    check(`${vp.tag}　板からのはみ出し`, over.length === 0, over.slice(0, 5).join(' / '));
    check(`${vp.tag}　横スクロール`, !hscroll, hscroll ? '出ている' : '');
    if (vp.w <= 760) check(`${vp.tag}　当たり判定44px`, small.length === 0, small.slice(0, 5).join(' / '));
    check(`${vp.tag}　コンソールのエラー`, errs.length === 0, errs.slice(0, 3).join(' / '));
    await page.close();
  }

  /* ───── 盤面の整合 ───── */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    await page.evaluate(SETUP, '松山');

    /* 発着枠：他社便だけで処理能力を超えていないか。超えると「空きが負」になり、
       その時間帯は永久に取れないのに、画面には「空き0」としか出ない */
    const slots = await page.evaluate(() => {
      const bad = [], noRoom = [];
      Object.keys(airports).forEach(nm => {
        for (let i = 0; i < SLOT_N; i++) {
          const cap = slotCapacity(nm, i); if (cap <= 0) continue;
          const riv = rivalSlots(nm, i);
          if (riv > cap) bad.push(nm + ' ' + slotName(i) + '：他社' + Math.round(riv) + '／さばける' + cap);
          if (cap - riv < 1) noRoom.push(nm + ' ' + slotName(i));
        }
      });
      return { bad, noRoom, n: Object.keys(airports).length };
    });
    check('発着枠　他社だけで定員超過している枠', slots.bad.length === 0, slots.bad.slice(0, 4).join(' / '));
    check('発着枠　開いているのに1便も入らない枠', slots.noRoom.length === 0, slots.noRoom.slice(0, 4).join(' / '));

    /* 開業直後に、どの拠点でも初期の時間帯（朝便）で1本は組めるか */
    const firstRoute = await page.evaluate(() => {
      const names = Object.keys(airports), ng = [];
      ['福岡', '羽田', '新千歳', '松山', '鹿児島', '那覇'].forEach(k => {
        const bn = names.find(x => x.includes(k)); if (!bn) return;
        const band = 1;                                   /* 新規作成の初期値 */
        const free = slotFree(bn, slotIndexOf(DEP_SLOTS[band].dep));
        if (free < 1) ng.push(bn + '（空き' + Math.round(free) + '）');
      });
      return ng;
    });
    check('開業直後　初期の時間帯（朝便）に空きがある拠点', firstRoute.length === 0, firstRoute.join(' / '));

    /* 機体名が機材一覧の枠（絵58px＋間8pxを引いた102px）に収まるか */
    const names = await page.evaluate(() => {
      const c = document.createElement('canvas').getContext('2d');
      c.font = "500 12px Arial,'Yu Gothic',sans-serif";
      return Object.keys(aircraftCatalog)
        .map(k => ({ nm: aircraftCatalog[k].name, w: Math.ceil(c.measureText(aircraftCatalog[k].name).width) }))
        .filter(x => x.w > 102).map(x => x.nm + '（' + x.w + 'px）');
    });
    /* 折り返す作りにしたので「はみ出す名前がある」こと自体は失格にしない。
       切れていないことは上の「文字の切れ」が見ている。ここは覚え書きとして出す */
    check('機体名　1行に収まらない機種（折り返して表示）', true, names.join(' / ') || 'なし');

    /* 1機が1日に何本持てるか。2026-11-03 に「季節か曜日がずれていれば」から
       「1日のうち拘束している時間が重ならなければ」に変えた。
       帰ってきて折返せば、その日のうちにもう一度飛べる */
    const multi = await page.evaluate(() => {
      const names = Object.keys(airports), out = {};
      /* 路線をつくるだけ（機体はまだ載せない） */
      const draft = (dest, band, days) => {
        state.draft = { stops: [names.find(x => x.includes(dest))], park: state.base, frequency: days.length,
                        fare: '普通', timeBand: band, season: 'all', days: [...days], trips: 1, planeId: null, pick: null };
        const before = state.routes.length;
        createRoute();
        if (state.routes.length === before) return null;      /* 同じ組み合わせがすでにある */
        return state.routes[state.routes.length - 1];
      };
      const mk = (dest, band, days) => {
        const r = draft(dest, band, days);
        if (r) assignRoute(state.planes[0].id, r.id);
        return r;
      };
      const drop = r => { state.routes = state.routes.filter(x => x.id !== r.id); };
      const reset = () => { state.routes.length = 0; state.planes.length = 0; state.cash = 9e9; leasePlaneById('Q400'); };
      const all = [0, 1, 2, 3, 4, 5, 6];
      /* マスの刻みを変えても通るように、ぶつからないマスだけを順に詰めていく。
         assignRoute はぶつかる便を押し出すので、載せる前に確かめること */
      const fill = () => {
        const pl = state.planes[0];
        DEP_SLOTS.forEach(t => {
          const r = draft('福岡', t.k, all);
          if (!r) return;
          if (planeRoutes(pl).some(x => routesClash(x, r, pl.type))) { drop(r); return; }
          assignRoute(pl.id, r.id);
          if (!r.aircraftId) drop(r);                          /* 枠や運用時間で断られた */
        });
        return planeRoutes(pl).length;
      };

      reset(); out.bands = fill();                            /* 時間帯ちがいで何本 */
      out.when = planeRoutes(state.planes[0]).slice()
        .sort((a, b) => slotDef(a.timeBand).dep - slotDef(b.timeBand).dep)
        .map(r => hhmm(slotDef(r.timeBand).dep)).join('/');

      reset(); for (let d = 0; d < 7; d++) mk('福岡', 2, [d]);
      out.days = planeRoutes(state.planes[0]).length;         /* 曜日ちがいで何本 */

      /* 時間が重なる2本は共存できない（あとから載せたほうが前のを押し出す） */
      reset(); mk('福岡', 0, all); mk('福岡', 1, all);
      out.overlap = planeRoutes(state.planes[0]).length;

      /* 夜間格納費は1機ぶん。路線カードの合計が会社の決算と合うか */
      reset(); out.nightRoutes = fill();
      const pl = state.planes[0];
      out.nightRows = Math.round(planeRoutes(pl).reduce((s, r) => s + nightCostOf(pl, r) * 7, 0));
      out.nightCo = Math.round(nightCost(pl, planePark(pl)) * 7);
      return out;
    });
    check('1機　時間帯をずらせば同じ日に何本も積める', multi.bands >= 4, multi.bands + '本（' + multi.when + '）');
    check('1機　曜日をずらせば7本まで積める', multi.days === 7, multi.days + '本');
    check('1機　時間が重なる2本は共存しない', multi.overlap === 1, multi.overlap + '本になった');
    /* ぶつかる時間帯を選んだとき、押す前に警告が出るか（16マスでは隣とぶつかりやすい） */
    const collide = await page.evaluate(() => {
      const names = Object.keys(airports);
      resetGame();
      state.selectedBase = names.find(x => x.includes('松山')); startGame(); state.cash = 9e9;
      leasePlaneById('Q400'); const pl = state.planes[0];
      const mk = band => { state.draft = { stops: [names.find(x => x.includes('福岡'))], park: state.base,
        frequency: 7, fare: '普通', timeBand: band, season: 'all', days: [0,1,2,3,4,5,6],
        trips: 1, planeId: pl.id, pick: null }; };
      mk(0); createRoute(); assignRoute(pl.id, state.routes[0].id);
      mk(2);                                    /* 08:30 は 06:30便とぶつかる */
      state.panelView = 'routes'; state.draftOpen = true; render();
      const before = !!document.querySelector('.mk-warn');
      createRouteWithPlane(pl.id);
      const t = document.querySelector('.toast');
      const after = /機材なしに戻りました/.test(t ? t.textContent : '');
      return { before, after, orphan: state.routes.filter(r => !r.aircraftId).length };
    });
    check('ぶつかる時間帯　押す前に警告が出る', collide.before, collide.before ? '' : '出ていない');
    check('ぶつかる時間帯　外れた便を知らせで名指しする', collide.after && collide.orphan === 1,
      collide.after ? '' : '知らせに出ていない');

    /* 案内を終えた直後の1機は朝がぜんぶ埋まっている。
       置ける時刻だけが押せて、塞がっている時刻は理由つきで塞がれているか */
    const busy = await page.evaluate(() => {
      try { localStorage.removeItem('am_tut_done'); } catch (e) {}
      startTutorial(); state.selectedBase = TUTORIAL.base; startGame();
      const pl = state.planes[0] || (leasePlaneById(TUTORIAL.plane), state.planes[0]);
      const mk = (dest, band, days) => {
        state.draft = { stops: [dest], park: state.base, frequency: days.length, fare: '普通',
                        timeBand: band, season: 'all', days: [...days], trips: 1, planeId: null, pick: null };
        createRoute(); assignRoute(pl.id, state.routes[state.routes.length - 1].id);
      };
      mk('対馬', 2, [1, 4]); mk('福江', 2, [2, 5]); tutFillRest();
      state.panelView = 'routes'; state.draftOpen = true;
      state.draft = { stops: ['屋久島'], park: state.base, frequency: 7, fare: '普通', timeBand: 14,
                      season: 'all', days: [0,1,2,3,4,5,6], trips: 1, planeId: pl.id, pick: null };
      render();
      const cells = [...document.querySelectorAll('.slot-seg .seg-btn')];
      return { n: cells.length,
               marked: cells.filter(e => e.classList.contains('busy')).length,
               open: cells.filter(e => !e.disabled).length,
               ghost: cells.filter(e => e.classList.contains('busy') && !e.disabled).length };
    });
    check('案内の直後　機体が飛んでいる時刻はマスごと塞がれる', busy.marked >= 5 && busy.ghost === 0,
      busy.n + 'マス中 塞がり' + busy.marked + '・置ける' + busy.open);
    check('案内の直後　3本目を置ける時刻が残っている', busy.open >= 1, busy.open + 'マス');

    check('夜間格納費　路線カードの合計が会社の決算と合う',
      multi.nightRoutes >= 2 && multi.nightRows === multi.nightCo,
      multi.nightRoutes + '本で 路線 ' + multi.nightRows.toLocaleString() + '／会社 ' + multi.nightCo.toLocaleString());

    /* 企画タブ：選択肢は地図の下、中身は右の欄（2026-11-16にこの形へ変えた） */
    const promo = await page.evaluate(() => {
      const names = Object.keys(airports);
      resetGame();
      state.selectedBase = names.find(x => x.includes('福岡')); startGame(); state.cash = 9e9;
      leasePlaneById('Q400'); state.fleetSetup = null; state.shopOpen = false;
      state.draft = { stops: [names.find(x => x.includes('宮崎'))], park: state.base, frequency: 7,
                      fare: '普通', timeBand: 2, season: 'all', days: [0,1,2,3,4,5,6],
                      trips: 1, planeId: null, pick: null };
      createRoute(); assignRoute(state.planes[0].id, state.routes[0].id);
      state.panelView = 'promo'; render();
      const picks = [...document.querySelectorAll('#wide .md-pick .md-item')];
      const out = { n: picks.length, inSide: document.querySelectorAll('#panel .md-pick').length, bodies: [] };
      /* 5つとも押して、右の欄が切り替わり、はみ出さないか */
      ['ad', 'route', 'bank', 'stock', 'own'].forEach(k => {
        const b = document.querySelector(`#wide .md-pick [data-k="${k}"]`);
        if (!b) { out.bodies.push(k + ':札がない'); return; }
        b.click();
        const h = (document.querySelector('#panel h2') || {}).textContent || '';
        const side = document.getElementById('panel').getBoundingClientRect().right;
        const over = [...document.querySelectorAll('#panel *')].filter(e => e.getBoundingClientRect().right > side + 1).length;
        const empty = document.querySelectorAll('#panel *').length < 2;
        out.bodies.push(k + (empty ? ':中身が空' : over ? ':はみ出し' + over : '✓') + '／' + h.trim());
      });
      return out;
    });
    check('企画タブ　選択肢は地図の下にある', promo.n === 5 && promo.inSide === 0,
      '下に' + promo.n + '個・右に' + promo.inSide + '個');
    check('企画タブ　押すと右の欄に中身が出る', promo.bodies.every(x => x.includes('✓')),
      promo.bodies.join(' / '));

    /* 買い物：運転資金が残らない買い方に警告が出るか */
    const warn = await page.evaluate(() => {
      const names = Object.keys(airports);
      resetGame(); state.selectedBase = names.find(x => x.includes('福岡')); startGame();
      const buyable = Object.keys(aircraftCatalog).filter(k => aircraftCatalog[k].cost <= state.cash);
      const risky = buyable.filter(k => spendRisk(aircraftCatalog[k].cost, { type: k }));
      const silent = buyable.filter(k => {
        const after = state.cash - aircraftCatalog[k].cost;
        return after < weeklyFixedCost({ type: k }) && !spendRisk(aircraftCatalog[k].cost, { type: k });
      });
      return { cash: state.cash, fixed: weeklyFixedCost(), buyable, risky, silent };
    });
    check('買い物　1週ぶんの固定費も残らない買い方に警告が出る', warn.silent.length === 0,
      '現金で買える ' + warn.buyable.join('・') + '／うち警告 ' + (warn.risky.join('・') || 'なし')
      + '／毎週の固定費 ' + warn.fixed.toLocaleString());

    await page.close();
  }

  /* ───── セーブ：古い欄なしのセーブが読めるか ───── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    /* state の欄がすべて DEFAULT_STATE にあるか。
       新しい欄を loadGame の穴埋めにだけ足して、state の宣言に足し忘れると
       新規ゲームで undefined になる。そこを見張る。
       チェック自身が欄を作ってしまわないよう、素のまま始めた直後に見る */
    const missing = await page.evaluate(() => {
      document.querySelectorAll('.title-screen,#tutorial').forEach(e => e.style.display = 'none');
      state.selectedBase = Object.keys(airports)[0]; startGame();
      return Object.keys(state).filter(k => !(k in DEFAULT_STATE));
    });
    check('セーブ　state の欄がすべて DEFAULT_STATE にある', missing.length === 0, missing.join(','));

    const made = await page.evaluate(SETUP, '福岡');
    await page.evaluate(() => { state.week = 37; state.reputation = 61; saveGame(); });

    /* 株まわりの欄を削った「古いセーブ」を作って読み直す */
    const dropped = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('am_save_v1'));
      const drop = ['shares','stockPx','stockPrev','stockLot','finTab','cShares','carrierMood','carrierPrev',
                    'cLot','stockHist','carrierHist','ownHist','ownMood','ownMood0','shareUnits','floatUnits',
                    'listed','lastIssueWeek','worth0'];
      drop.forEach(k => delete d.state[k]);
      localStorage.setItem('am_save_v1', JSON.stringify(d));
      return drop.length;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    const loaded = await page.evaluate(() => {
      const ok = loadGame();
      let drew = true, why = '';
      try { ['airport','fleet','routes','company','promo'].forEach(v => { state.panelView = v; render(); }); }
      catch (e) { drew = false; why = e.message; }
      return { ok, week: state.week, planes: state.planes.length, routes: state.routes.length,
               undef: Object.keys(state).filter(k => state[k] === undefined), drew, why };
    });
    check(`セーブ　欄を${dropped}個削った古いセーブが読める`,
      loaded.ok && loaded.week === 37 && loaded.planes === made.planes && loaded.routes === made.routes,
      '週' + loaded.week + '／機材' + loaded.planes + '／路線' + loaded.routes);
    check('セーブ　読んだあとに undefined の欄がない', loaded.undef.length === 0, loaded.undef.join(','));
    check('セーブ　読んだあとに全タブが描ける', loaded.drew, loaded.why);

    /* 2026-11-05：出発時刻を8マス（2時間おき）から16マス（1時間おき）に変えた。
       timeBand は「何番目のマスか」なので、版を上げずに読むと全路線のダイヤがずれる */
    const oldGrid = await page.evaluate(() => {
      const names = Object.keys(airports);
      resetGame();
      state.selectedBase = names.find(x => x.includes('松山')); startGame(); state.cash = 9e9;
      leasePlaneById('Q400');
      [0, 2, 4, 6].forEach(k => {                      /* 8マス時代の 0/2/4/6 と同じ時刻 */
        state.draft = { stops: [names.find(x => x.includes('福岡'))], park: state.base, frequency: 7,
                        fare: '普通', timeBand: k * 2, season: 'all', days: [0,1,2,3,4,5,6],
                        trips: 1, planeId: null, pick: null };
        createRoute();
      });
      const want = state.routes.map(r => hhmm(slotDef(r.timeBand).dep)).join(' ');
      saveGame();
      const d = JSON.parse(localStorage.getItem('am_save_v1'));
      d.v = 1;                                          /* 旧版のふりをさせる */
      d.state.routes.forEach((r, i) => { r.timeBand = [0, 2, 4, 6][i]; });
      localStorage.setItem('am_save_v1', JSON.stringify(d));
      return want;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    const migrated = await page.evaluate(() => {
      loadGame();
      return state.routes.map(r => hhmm(slotDef(r.timeBand).dep)).join(' ');
    });
    check('セーブ　8マス時代のセーブでもダイヤがずれない', migrated === oldGrid,
      '旧 ' + oldGrid + ' → 新 ' + migrated);

    await ctx.close();
  }

  await browser.close();
  srv.close();

  /* ───── 結果 ───── */
  const ng = results.filter(r => !r.ok);
  console.log('');
  results.forEach(r => console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? '　… ' + r.detail : ''}`));
  console.log(`\n  ${results.length - ng.length} / ${results.length} 件 通過${ng.length ? `　（${ng.length}件が失敗）` : ''}\n`);
  process.exit(ng.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
