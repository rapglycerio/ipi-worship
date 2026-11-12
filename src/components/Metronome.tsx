'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Square, Hand } from 'lucide-react';

export const TIME_SIGNATURES = ['4/4', '3/4', '2/4', '6/8', '12/8'] as const;

const MIN_BPM = 30;
const MAX_BPM = 240;
const LOOKAHEAD_MS = 25; // de quanto em quanto tempo o agendador acorda
const SCHEDULE_AHEAD_S = 0.12; // quanto áudio agenda à frente

/** Quantos cliques por compasso e quais são acentuados. */
function beatPattern(timeSignature: string): { beats: number; strong: Set<number> } {
  const [numStr, denStr] = timeSignature.split('/');
  const num = Math.max(1, parseInt(numStr, 10) || 4);
  const den = parseInt(denStr, 10) || 4;
  // Compassos compostos (6/8, 9/8, 12/8): acento leve a cada grupo de 3 colcheias.
  const strong = new Set<number>([0]);
  if (den === 8 && num % 3 === 0) for (let i = 3; i < num; i += 3) strong.add(i);
  return { beats: num, strong };
}

/**
 * Metrônomo do músico: clique no BPM da música, 1º tempo acentuado e luz
 * piscando no tempo (útil quando o celular está no silencioso).
 * O BPM pode ser ajustado aqui (ou pelo "Tap") sem alterar a música.
 */
export default function Metronome({ bpm: songBpm, timeSignature }: { bpm: number; timeSignature?: string }) {
  const ts = timeSignature || '4/4';
  const { beats, strong } = beatPattern(ts);

  const [bpm, setBpm] = useState(songBpm > 0 ? songBpm : 80);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);

  const ctxRef = useRef<AudioContext | null>(null);
  const nextTimeRef = useRef(0);
  const beatIdxRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const tapsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!running) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const secondsPerBeat = 60 / bpm;
    nextTimeRef.current = ctx.currentTime + 0.06;
    beatIdxRef.current = 0;

    const click = (time: number, idx: number) => {
      const accent = idx === 0 ? 2 : strong.has(idx) ? 1 : 0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = accent === 2 ? 1600 : accent === 1 ? 1200 : 900;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.5, time + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.06);
      // Luz sincronizada com o som agendado.
      const delay = Math.max(0, (time - ctx.currentTime) * 1000);
      timersRef.current.push(window.setTimeout(() => setBeat(idx), delay));
    };

    const scheduler = window.setInterval(() => {
      while (nextTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
        click(nextTimeRef.current, beatIdxRef.current);
        nextTimeRef.current += secondsPerBeat;
        beatIdxRef.current = (beatIdxRef.current + 1) % beats;
      }
    }, LOOKAHEAD_MS);

    const timers = timersRef.current;
    return () => {
      window.clearInterval(scheduler);
      timers.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
      setBeat(-1);
    };
    // `strong` é derivado de `ts`, que já está nas dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, bpm, beats, ts]);

  // Fecha o áudio ao sair da página.
  useEffect(() => () => { ctxRef.current?.close().catch(() => {}); }, []);

  const toggle = async () => {
    if (running) {
      setRunning(false);
      return;
    }
    // O AudioContext precisa nascer de um toque do usuário (iOS/Android).
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      ctxRef.current = new Ctx();
    }
    if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
    setRunning(true);
  };

  const changeBpm = (v: number) => setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v))));

  // Tap tempo: média dos intervalos entre os últimos toques.
  const tap = () => {
    const now = performance.now();
    const taps = tapsRef.current.filter((t) => now - t < 2500);
    taps.push(now);
    tapsRef.current = taps.slice(-6);
    if (tapsRef.current.length >= 2) {
      const t = tapsRef.current;
      const avg = (t[t.length - 1] - t[0]) / (t.length - 1);
      changeBpm(60000 / avg);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={toggle}
        className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-full cursor-pointer transition-colors ${
          running ? 'bg-accent text-white' : 'bg-accent/15 text-accent hover:bg-accent/25'
        }`}
        aria-label={running ? 'Parar metrônomo' : 'Iniciar metrônomo'}
      >
        {running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex items-center bg-card rounded-lg shrink-0">
        <button
          onClick={() => changeBpm(bpm - 1)}
          className="h-9 w-8 flex items-center justify-center text-sm font-bold text-muted cursor-pointer hover:bg-border rounded-l-lg"
          aria-label="Diminuir BPM"
        >−</button>
        <span className="text-xs font-mono font-bold text-foreground w-14 text-center select-none">
          {bpm} <span className="text-[9px] text-subtle">BPM</span>
        </span>
        <button
          onClick={() => changeBpm(bpm + 1)}
          className="h-9 w-8 flex items-center justify-center text-sm font-bold text-muted cursor-pointer hover:bg-border rounded-r-lg"
          aria-label="Aumentar BPM"
        >+</button>
      </div>

      <button
        onClick={tap}
        className="h-9 px-3 shrink-0 flex items-center gap-1 rounded-lg bg-card text-xs font-semibold text-muted hover:bg-border cursor-pointer"
        title="Toque no ritmo da música para descobrir o BPM"
      >
        <Hand className="w-3.5 h-3.5" /> Tap
      </button>

      <div className="flex items-center gap-1 ml-auto" aria-hidden="true">
        <span className="text-[10px] font-mono font-bold text-subtle mr-1">{ts}</span>
        {Array.from({ length: beats }, (_, i) => (
          <span
            key={i}
            className={`rounded-full transition-colors duration-75 ${strong.has(i) ? 'w-3 h-3' : 'w-2 h-2'} ${
              i === beat ? (i === 0 ? 'bg-warning' : 'bg-accent') : 'bg-border'
            }`}
          />
        ))}
      </div>

      {songBpm <= 0 && (
        <p className="w-full text-[10px] text-subtle">
          Esta música ainda não tem BPM cadastrado — use o Tap para achar o andamento.
        </p>
      )}
    </div>
  );
}
