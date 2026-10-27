'use client';

import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, CloudSun, Crosshair, Fuel, Gauge, GripVertical, Plane, Plus, RotateCcw, Users, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type Airport = '新潟' | '羽田';
type Flight = { id: number; from: Airport; to: Airport; start: number; duration: number; number: string; fare: number; load: number };

const initialFlights: Flight[] = [
  { id: 1, from: '新潟', to: '羽田', start: 405, duration: 70, number: 'AM101', fare: 12100, load: 78 },
  { id: 2, from: '羽田', to: '新潟', start: 515, duration: 70, number: 'AM102', fare: 11800, load: 84 },
  { id: 3, from: '新潟', to: '羽田', start: 1035, duration: 70, number: 'AM103', fare: 13600, load: 91 },
  { id: 4, from: '羽田', to: '新潟', start: 1150, duration: 70, number: 'AM104', fare: 12900, load: 88 },
];
const startOfDay = 360;
const endOfDay = 1320;
const runwayHours = Array.from({ length: 17 }, (_, index) => index + 6);
const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const position = (minutes: number) => ((minutes - startOfDay) / (endOfDay - startOfDay)) * 100;

export default function Home() {
  const [flights, setFlights] = useState(initialFlights);
  const [selectedId, setSelectedId] = useState(3);
  const orderedFlights = useMemo(() => [...flights].sort((a, b) => a.start - b.start), [flights]);
  const issues = useMemo(() => {
    const results: { id: number; type: string; detail: string }[] = [];
    orderedFlights.forEach((flight, index) => {
      const arrival = flight.start + flight.duration;
      if (flight.start < 420 || arrival > 1320) results.push({ id: flight.id, type: '空港運用時間外', detail: `${flight.number} は新潟空港の運用時間（07:00–22:00）外です。` });
      if (index > 0) {
        const previous = orderedFlights[index - 1];
        const turnaround = flight.start - (previous.start + previous.duration);
        if (turnaround < 35) results.push({ id: flight.id, type: 'ターンアラウンド不足', detail: `${flight.number} の機体整備時間が ${turnaround} 分です（最低35分）。` });
        if (previous.to !== flight.from) results.push({ id: flight.id, type: '機体位置不整合', detail: `${flight.number} は ${flight.from} 発ですが、機体は ${previous.to} にあります。` });
      }
    });
    const dutyStart = orderedFlights[0]?.start ?? 0;
    const last = orderedFlights.at(-1);
    const dutyEnd = (last?.start ?? 0) + (last?.duration ?? 0) + 30;
    if (dutyEnd - dutyStart > 780) results.push({ id: 0, type: 'FDP超過', detail: `乗務時間は ${Math.floor((dutyEnd - dutyStart) / 60)}時間${(dutyEnd - dutyStart) % 60}分です（上限13時間）。` });
    return results;
  }, [orderedFlights]);
  const selectedFlight = flights.find((flight) => flight.id === selectedId) ?? flights[0];
  const totalRevenue = flights.reduce((sum, flight) => sum + Math.round((flight.fare * 74 * flight.load) / 100), 0);
  const operatingCost = flights.length * 488000;
  const profit = totalRevenue - operatingCost;
  const last = orderedFlights.at(-1);
  const dutyMinutes = ((last?.start ?? 0) + (last?.duration ?? 0) + 30) - (orderedFlights[0]?.start ?? 0);
  const moveSelected = (delta: number) => setFlights((current) => current.map((flight) => flight.id === selectedId ? { ...flight, start: Math.max(360, Math.min(1320 - flight.duration, flight.start + delta)) } : flight));
  const addChallengeFlight = () => {
    const id = Math.max(...flights.map((flight) => flight.id)) + 1;
    setFlights((current) => [...current, { id, from: '新潟', to: '羽田', start: 590, duration: 70, number: `AM${100 + id}`, fare: 12200, load: 75 }]);
    setSelectedId(id);
  };
  const resetSchedule = () => { setFlights(initialFlights); setSelectedId(3); };

  return <main className="min-h-screen overflow-x-hidden bg-[#061725] text-slate-100 selection:bg-cyan-300/30">
    <div className="sky-glow fixed inset-0 pointer-events-none" />
    <header className="relative border-b border-white/10 bg-[#071d2d]/90 backdrop-blur-xl"><div className="mx-auto flex max-w-[1540px] items-center justify-between px-5 py-4 lg:px-8">
      <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 shadow-lg shadow-cyan-500/20"><Plane className="size-5 -rotate-45 text-[#062033]" /></div><div><p className="text-lg font-black tracking-[0.18em] text-white">AIRLINE<span className="text-cyan-300"> MGMT</span></p><p className="text-[10px] font-semibold tracking-[0.22em] text-slate-400">JAPAN NETWORK / ALPHA</p></div></div>
      <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-400 lg:flex"><span className="text-white">ダイヤ運航</span><span>路線ネットワーク</span><span>フリート</span><span>クルー</span><span>決算レポート</span></nav><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"><CloudSun className="size-4 text-amber-300" /><span className="hidden sm:inline">新潟：晴れ 22°C</span></div>
    </div></header>
    <section className="relative mx-auto max-w-[1540px] px-5 pb-12 pt-7 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="mb-2 text-xs font-bold tracking-[0.22em] text-cyan-300">OPERATIONS CONTROL CENTER</p><h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">ダイヤ運航 <span className="font-light text-slate-500">/ Day 01</span></h1><p className="mt-2 text-sm text-slate-400">新潟ベースから、限られた一機で日本の空をつなぐ。</p></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"><CalendarDays /> 2026年8月31日</Button><Button onClick={resetSchedule} variant="ghost" className="text-slate-300 hover:bg-white/10"><RotateCcw /> リセット</Button><Button onClick={addChallengeFlight} className="bg-cyan-300 font-bold text-[#062033] hover:bg-cyan-200"><Plus /> チャレンジ便を追加</Button></div></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<WalletCards />} label="運航予想利益" value={`¥${Math.max(0, profit).toLocaleString()}`} sub={`収入 ¥${totalRevenue.toLocaleString()} / 支出 ¥${operatingCost.toLocaleString()}`} tone="cyan" /><Metric icon={<Users />} label="平均搭乗率" value={`${Math.round(flights.reduce((total, flight) => total + flight.load, 0) / flights.length)}%`} sub="目標搭乗率 75% を達成" tone="violet" /><Metric icon={<Clock3 />} label="乗務員FDP" value={`${Math.floor(dutyMinutes / 60)}h ${dutyMinutes % 60}m`} sub="上限 13h / 残り 2h 50m" tone={issues.some((issue) => issue.type === 'FDP超過') ? 'red' : 'green'} /><Metric icon={<Fuel />} label="機体稼働率" value="68%" sub={`${flights.length}便 / ATR 72-600 (JA01AM)`} tone="amber" /></div>
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_330px]"><section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b2638]/85 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-cyan-300/10 text-cyan-300"><Gauge className="size-5" /></div><div><h2 className="font-bold text-white">機体ダイヤグラム</h2><p className="text-xs text-slate-400">横軸：時刻　|　便を選択して出発時刻を調整</p></div></div><div className="flex gap-2"><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">1 機体</span><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">最低TA 35分</span></div></div>
        <div className="overflow-x-auto p-5"><div className="min-w-[850px]"><div className="ml-[138px] grid grid-cols-[repeat(17,minmax(0,1fr))] border-b border-white/10">{runwayHours.map((hour) => <div key={hour} className="border-l border-white/10 pb-2 pl-2 text-[11px] font-semibold text-slate-500">{String(hour).padStart(2, '0')}:00</div>)}</div><div className="relative mt-3 grid min-h-[260px] grid-cols-[138px_1fr]"><div className="border-r border-white/10 pr-4"><div className="mt-8 flex items-center gap-2"><div className="grid size-8 place-items-center rounded-lg bg-white/10"><Plane className="size-4 -rotate-45 text-cyan-300" /></div><div><p className="text-sm font-bold">JA01AM</p><p className="text-[11px] text-slate-500">ATR 72-600</p></div></div><div className="mt-12 rounded-lg border border-white/10 bg-[#061b2a] p-3"><p className="text-[10px] font-bold tracking-wider text-slate-500">CREW BASE</p><p className="mt-1 text-xs font-semibold text-slate-200">新潟 / Team A</p></div></div><div className="gantt-area relative min-h-[260px] overflow-hidden rounded-r-xl">{runwayHours.map((hour) => <div key={hour} className="absolute inset-y-0 border-l border-white/10" style={{ left: `${((hour - 6) / 16) * 100}%` }} />)}<div className="absolute inset-y-0 left-[32.5%] w-px bg-amber-300/60"><span className="absolute -top-1 -translate-x-1/2 rounded bg-amber-300 px-1.5 py-0.5 text-[9px] font-bold text-[#082033]">NOW 11:12</span></div>{orderedFlights.map((flight, index) => { const isSelected = flight.id === selectedId; const flightIssues = issues.filter((issue) => issue.id === flight.id); return <button key={flight.id} onClick={() => setSelectedId(flight.id)} className={`flight-block absolute flex h-[74px] flex-col justify-between rounded-xl px-3 py-2 text-left transition ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0b2638]' : ''} ${flightIssues.length ? 'bg-rose-500/90 hover:bg-rose-400' : flight.from === '新潟' ? 'bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-300' : 'bg-gradient-to-br from-violet-400 to-indigo-500 hover:from-violet-300'}`} style={{ left: `${position(flight.start)}%`, top: `${22 + (index % 2) * 105}px`, width: `${Math.max(8.5, (flight.duration / (endOfDay - startOfDay)) * 100)}%` }}><span className="flex items-center justify-between gap-2 text-[10px] font-black text-white/80"><span>{flight.number}</span><GripVertical className="size-3" /></span><span className="whitespace-nowrap text-sm font-black text-white">{flight.from} <span className="mx-1 opacity-60">→</span> {flight.to}</span><span className="text-[10px] font-semibold text-white/80">{formatTime(flight.start)} – {formatTime(flight.start + flight.duration)}</span></button>; })}</div></div></div></div>
        <div className="flex flex-col gap-3 border-t border-white/10 bg-[#071f30] px-5 py-4 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><span className="text-xs text-slate-400">選択中</span><span className="rounded-md bg-white/10 px-2 py-1 text-sm font-bold text-white">{selectedFlight.number} {selectedFlight.from} → {selectedFlight.to}</span><span className="text-xs text-cyan-200">出発 {formatTime(selectedFlight.start)}</span></div><div className="flex gap-2"><Button onClick={() => moveSelected(-15)} variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"><ChevronLeft /> 15分早く</Button><Button onClick={() => moveSelected(15)} size="sm" className="bg-cyan-300 text-[#062033] hover:bg-cyan-200">15分遅く <ChevronRight /></Button></div></div>
      </section>
      <aside className="space-y-5"><section className={`rounded-2xl border p-5 ${issues.length ? 'border-rose-400/30 bg-rose-500/10' : 'border-emerald-400/25 bg-emerald-400/10'}`}><div className="flex items-center gap-3">{issues.length ? <div className="grid size-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300"><AlertTriangle /></div> : <div className="grid size-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><CheckCircle2 /></div>}<div><p className="text-sm font-bold text-white">運航バリデーション</p><p className={`text-xs ${issues.length ? 'text-rose-200' : 'text-emerald-200'}`}>{issues.length ? `${issues.length}件の要確認事項があります` : 'すべての制約をクリアしています'}</p></div></div>{issues.length ? <div className="mt-4 space-y-2">{issues.map((issue, index) => <button key={`${issue.id}-${index}`} onClick={() => issue.id && setSelectedId(issue.id)} className="w-full rounded-xl border border-rose-300/15 bg-[#291c2a]/70 p-3 text-left transition hover:bg-[#382133]"><p className="text-xs font-bold text-rose-200">{issue.type}</p><p className="mt-1 text-[11px] leading-relaxed text-rose-100/70">{issue.detail}</p></button>)}</div> : <p className="mt-4 rounded-xl bg-[#092b2e]/60 p-3 text-xs leading-relaxed text-emerald-100/80">翌朝の位置整合、機体ターンアラウンド、空港カーフュー、乗務員FDPを自動で監視中です。</p>}</section><section className="rounded-2xl border border-white/10 bg-[#0b2638]/85 p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-[0.16em] text-slate-500">ROUTE DEMAND</p><h2 className="mt-1 font-bold text-white">新潟 <span className="text-cyan-300">↔</span> 羽田</h2></div><Crosshair className="size-5 text-cyan-300" /></div><div className="mt-5 space-y-4"><Demand label="朝のビジネス需要" value="92%" color="bg-cyan-300" /><Demand label="昼の観光需要" value="58%" color="bg-violet-400" /><Demand label="夕方のビジネス需要" value="87%" color="bg-amber-300" /></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-[10px] font-bold text-slate-500">推奨運賃</p><p className="mt-1 text-sm font-bold text-white">¥12,400〜</p></div><div><p className="text-[10px] font-bold text-slate-500">競合便</p><p className="mt-1 text-sm font-bold text-white">2 社 / 4 便</p></div></div></section></aside></div><p className="mt-5 text-center text-xs text-slate-500">PROTOTYPE v0.1 — 便を追加して、運航上の問題が即時に検出される感覚を確かめてください。</p>
    </section></main>;
}

function Metric({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: 'cyan' | 'violet' | 'green' | 'amber' | 'red' }) { const tones = { cyan: 'text-cyan-300 bg-cyan-300/10', violet: 'text-violet-300 bg-violet-300/10', green: 'text-emerald-300 bg-emerald-300/10', amber: 'text-amber-300 bg-amber-300/10', red: 'text-rose-300 bg-rose-300/10' }; return <article className="rounded-2xl border border-white/10 bg-[#0b2638]/85 p-4"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black tracking-tight text-white">{value}</p></div><div className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div></div><p className="mt-3 text-[11px] text-slate-500">{sub}</p></article>; }
function Demand({ label, value, color }: { label: string; value: string; color: string }) { return <div><div className="mb-1.5 flex justify-between text-xs"><span className="text-slate-300">{label}</span><span className="font-bold text-white">{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${color}`} style={{ width: value }} /></div></div>; }
