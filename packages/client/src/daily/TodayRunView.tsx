import { useEffect, useRef, useState } from 'react';
import { SIM_VERSION, TICK_MS, createRun, isTerminal, step, todayScore } from '@snake/sim';
import type { AppliedInput, Dir, GameState } from '@snake/sim';
import { signWalletMessage } from '../wallet/provider';

interface Props { wallet: { address: string } | null; onExit: () => void }
type Phase = 'loading' | 'ready' | 'playing' | 'signing' | 'submitting' | 'verified' | 'error';

function messageFor(id: string, day: string, seed: number, score: number) {
  return `snake-rink:today:${id}:${day}:${seed}:${score}`;
}

export function TodayRunView({ wallet, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [challenge, setChallenge] = useState<{ date: string; seed: number; simVersion: number } | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ score: number; rank?: number; rewardTier?: { rank: number; nim: number } } | null>(null);
  const inputs = useRef<AppliedInput[]>([]);
  const pending = useRef<AppliedInput>({ turn: null, boost: false });
  const runId = useRef(crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/run/today`)
      .then((response) => { if (!response.ok) throw new Error('Daily challenge unavailable'); return response.json(); })
      .then((data: { date: string; seed: number; simVersion: number }) => {
        if (cancelled) return;
        if (data.simVersion !== SIM_VERSION) throw new Error('Client simulation version is out of date');
        setChallenge(data);
        setState(createRun(data.seed, 'solo', data.simVersion));
        setPhase('ready');
      })
      .catch((reason: unknown) => { if (!cancelled) { setError(reason instanceof Error ? reason.message : 'Could not load Today\'s Run'); setPhase('error'); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (phase !== 'playing' || !state) return;
    const timer = window.setInterval(() => {
      const input = pending.current;
      inputs.current.push(input);
      const next = step(state, [input]);
      setState(next);
      pending.current = { turn: null, boost: input.boost };
      if (isTerminal(next)) window.clearInterval(timer);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [phase, state]);

  const finish = async () => {
    if (!challenge || !state || !wallet) { setError('Connect your Nimiq wallet before submitting Today\'s Run'); setPhase('error'); return; }
    const score = todayScore(challenge.seed, challenge.simVersion, [inputs.current]);
    setPhase('signing');
    try {
      const message = messageFor(runId.current, challenge.date, challenge.seed, score);
      const signed = await signWalletMessage(message);
      setPhase('submitting');
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/runs/verify`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: runId.current, day: challenge.date, seed: challenge.seed, simVersion: challenge.simVersion, wallet: wallet.address, inputs: [inputs.current], reportedScore: score, attestation: { message, ...signed } }),
      });
      const body = await response.json();
      if (!response.ok || !body.valid) throw new Error(body.error ?? body.reason ?? 'Run verification failed');
      setResult({ score: body.score, rank: body.rank, rewardTier: body.rewardTier });
      setPhase('verified');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit Today\'s Run');
      setPhase('error');
    }
  };

  const turn = (direction: Dir) => { pending.current = { ...pending.current, turn: direction }; };
  const snake = state?.snakes[0];
  const canStart = phase === 'ready' && Boolean(wallet);
  return <div className="fixed inset-0 flex items-center justify-center bg-cream p-4">
    <div className="flex w-full max-w-xl flex-col gap-3 rounded-xl bg-card p-5 text-center shadow-sm">
      <div className="flex items-center justify-between"><h2 className="m-0">Today&apos;s Run</h2><button onClick={onExit}>Lobby</button></div>
      {phase === 'loading' && <p>Loading today&apos;s challenge...</p>}
      {phase === 'error' && <><p className="text-coral">{error}</p><button onClick={onExit}>Return to lobby</button></>}
      {challenge && phase !== 'error' && <>
        <p className="m-0 text-muted">Seed {challenge.seed} · Tick {state?.tick ?? 0} · Score {snake?.score ?? 0}</p>
        <div className="mx-auto grid aspect-square w-full max-w-[360px] grid-cols-30 gap-px bg-[#5b9e4a] p-1">
          {Array.from({ length: 900 }, (_, index) => { const x = index % 30; const y = Math.floor(index / 30); const occupied = snake?.cells.some((cell) => cell.x === x && cell.y === y); return <span key={index} className={occupied ? 'rounded-xs bg-coral' : 'bg-[#8fd46a]'} />; })}
        </div>
        {phase === 'ready' && <button disabled={!canStart} onClick={() => setPhase('playing')}>{wallet ? 'Start run' : 'Connect wallet first'}</button>}
        {phase === 'playing' && <><div className="flex justify-center gap-2"><button onClick={() => turn('left')}>Left</button><button onClick={() => turn('up')}>Up</button><button onClick={() => turn('down')}>Down</button><button onClick={() => turn('right')}>Right</button><button onPointerDown={() => { pending.current = { ...pending.current, boost: true }; }} onPointerUp={() => { pending.current = { ...pending.current, boost: false }; }}>Boost</button></div>{state && isTerminal(state) && <button onClick={() => void finish()}>Sign and submit</button>}</>}
        {(phase === 'signing' || phase === 'submitting') && <p>{phase === 'signing' ? 'Waiting for wallet approval...' : 'Verifying replay...'}</p>}
        {phase === 'verified' && result && <><p>Verified score: {result.score}</p><p>Rank: {result.rank ?? 'unranked'}{result.rewardTier ? ` · ${result.rewardTier.nim} NIM` : ''}</p><button onClick={onExit}>Done</button></>}
      </>}
    </div>
  </div>;
}
