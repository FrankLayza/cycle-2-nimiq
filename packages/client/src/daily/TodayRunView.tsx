import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { SIM_VERSION, TICK_MS, createRun, isTerminal, step, todayScore } from '@snake/sim';
import type { AppliedInput, Dir, GameState } from '@snake/sim';
import { signWalletMessage } from '../wallet/provider';
import { MatchScene } from '../game/MatchScene';
import { snapshotFromGame } from '../game/renderState';
import { useKeyboardControls } from '../game/useKeyboard';
import { GameControls } from '../components/GameControls';

interface Props { wallet: { address: string } | null; onExit: () => void }
type Phase = 'loading' | 'ready' | 'playing' | 'signing' | 'submitting' | 'verified' | 'error';

function messageFor(id: string, day: string, seed: number, score: number) {
  return `snake-rink:today:${id}:${day}:${seed}:${score}`;
}

function displayDate(day: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${day}T00:00:00Z`));
}

export function TodayRunView({ wallet, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [challenge, setChallenge] = useState<{ date: string; seed: number; simVersion: number } | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ score: number; rank?: number; rewardTier?: { rank: number; nim: number } } | null>(null);
  const [tiers, setTiers] = useState<Array<{ rank: number; nim: number }> | null>(null);
  const [personal, setPersonal] = useState<{ rank: number; score: number } | null>(null);
  const inputs = useRef<AppliedInput[]>([]);
  const pending = useRef<AppliedInput>({ turn: null, boost: false });
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const runId = useRef(crypto.randomUUID());
  const fieldHost = useRef<HTMLDivElement | null>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/run/today`)
      .then((response) => { if (!response.ok) throw new Error('Today\'s field is unavailable right now.'); return response.json(); })
      .then((data: { date: string; seed: number; simVersion: number }) => {
        if (cancelled) return;
        if (data.simVersion !== SIM_VERSION) throw new Error('Refresh the app to load the latest field.');
        setChallenge(data);
        setState(createRun(data.seed, 'solo', data.simVersion));
        setPhase('ready');
      })
      .catch((reason: unknown) => { if (!cancelled) { setError(reason instanceof Error ? reason.message : 'Could not prepare today\'s field.'); setPhase('error'); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const api = import.meta.env.VITE_API_URL ?? '/api/v1';
    void (async () => {
      try {
        const response = await fetch(`${api}/rewards/schedule`);
        if (response.ok) {
          const body = (await response.json()) as { daily?: Array<{ rank: number; nim: number }> };
          if (!cancelled && body.daily?.length) setTiers(body.daily);
        }
      } catch {
        /* schedule unavailable: hide the tier row rather than inventing amounts */
      }
      if (!wallet) return;
      try {
        const response = await fetch(`${api}/leaderboard/today?wallet=${encodeURIComponent(wallet.address)}`);
        if (response.ok) {
          const body = (await response.json()) as { personal: { rank: number; score: number } | null };
          if (!cancelled && body.personal) setPersonal({ rank: body.personal.rank, score: body.personal.score });
        }
      } catch {
        /* leaderboard unavailable: keep the honest "no score yet" state */
      }
    })();
    return () => { cancelled = true; };
  }, [wallet]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      setState((current) => {
        if (!current || isTerminal(current)) return current;
        const input = pending.current;
        inputs.current.push(input);
        pending.current = { turn: null, boost: input.boost };
        return step(current, [input]);
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing' || !fieldHost.current || phaserGame.current) return;
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: fieldHost.current, width: 1280, height: 720, backgroundColor: '#8fd46a', scene: [MatchScene] });
    phaserGame.current = game;
    return () => { game.destroy(true); phaserGame.current = null; };
  }, [phase]);

  useEffect(() => {
    const game = phaserGame.current;
    if (!game || !state) return;
    const submit = () => (game.scene.getScene('Match') as MatchScene).submitSnapshot(snapshotFromGame(state));
    if (game.scene.isActive('Match')) submit();
    else window.setTimeout(submit, 0);
  }, [state]);

  const finish = async () => {
    if (!challenge || !state || !wallet) { setError('Connect your Nimiq wallet to verify this run.'); setPhase('error'); return; }
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
      if (!response.ok || !body.valid) throw new Error(body.error ?? body.reason ?? 'We could not verify this run.');
      setResult({ score: body.score, rank: body.rank, rewardTier: body.rewardTier });
      setPhase('verified');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit Today\'s Run.');
      setPhase('error');
    }
  };

  const turn = (direction: Dir) => { pending.current = { ...pending.current, turn: direction }; };
  const boost = (value: boolean) => { pending.current = { ...pending.current, boost: value }; };
  useKeyboardControls(phase === 'playing', turn, boost);
  const finishSwipe = (x: number, y: number) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.abs(dx) + Math.abs(dy) < 24) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  const snake = state?.snakes[0];
  const terminal = Boolean(state && isTerminal(state));

  if (phase === 'playing' && challenge && state) {
    return <main className="daily-match-shell fixed inset-0 overflow-hidden p-[max(12px,env(safe-area-inset-top))]">
      <div className="mx-auto flex h-full max-w-2xl flex-col gap-3">
        <header className="relative z-[2] flex shrink-0 items-center justify-between rounded-2xl border border-white/15 bg-ink/70 px-4 py-3 text-white shadow-xs backdrop-blur-xs">
          <div><p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-teal-soft">Today&apos;s Run</p><p className="m-0 text-sm font-bold">{displayDate(challenge.date)}</p></div>
          <div className="text-center"><p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-white/60">Score</p><p className="m-0 text-2xl font-black tabular-nums">{snake?.score ?? 0}</p></div>
          <button className="min-h-11 rounded-full border border-white/25 bg-white/10 px-3 text-xs font-black text-white" onClick={onExit}>Exit</button>
        </header>

        <section className="daily-field relative z-[2] min-h-0 flex-1 overflow-hidden rounded-[1.35rem] border-4 border-white/25 bg-grass" onPointerDown={(event) => { swipeStart.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={(event) => finishSwipe(event.clientX, event.clientY)} onPointerCancel={() => { swipeStart.current = null; }}>
          <div ref={fieldHost} id="world" className="h-full w-full" />
          {!terminal && <div className="run-hint pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-ink shadow-xs">Swipe or use the controls</div>}
        </section>

        <div className="mobile-control-dock relative z-[2] flex shrink-0 items-end justify-between gap-4 pb-[max(0px,env(safe-area-inset-bottom))]">
          <GameControls
            variant="dark"
            onTurn={turn}
            onBoostChange={boost}
            trailing={terminal ? <button className="button-primary min-h-14 flex-1 rounded-2xl bg-lemon px-5 font-black text-ink shadow-xs" onClick={() => void finish()}>VERIFY MY SCORE</button> : undefined}
          />
        </div>
      </div>
    </main>;
  }

  return <main className="min-h-full overflow-y-auto bg-cream px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
    <div className="screen-enter mx-auto flex min-h-full w-full max-w-lg flex-col">
      <header className="flex items-center justify-between"><button className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-bold" onClick={onExit}>Lobby</button></header>

      {phase === 'loading' && <section className="grid flex-1 place-items-center text-center"><div><div className="loading-snake mx-auto mb-5 h-8 w-24 rounded-full bg-teal" /><h1 className="text-2xl font-black">Preparing today&apos;s field…</h1></div></section>}

      {phase === 'ready' && challenge && <>
        <section className="daily-hero mt-8 text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-coral-deep">{displayDate(challenge.date)}</p><h1 className="mt-2 text-4xl font-black tracking-tight">Today&apos;s Run</h1><p className="mx-auto mt-3 max-w-sm text-base font-bold leading-6 text-muted">Same field. Same conditions. Pure skill.</p></section>
        <section className="mt-7 rounded-2xl border border-line bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div><p className="m-0 text-xs font-black uppercase tracking-[0.14em] text-muted">Your best</p><p className="m-0 mt-1 text-2xl font-black tabular-nums">{personal ? personal.score.toLocaleString() : 'No score yet'}</p></div>
            <span className={`rounded-xl px-3 py-2 text-xs font-black ${personal ? 'bg-teal-soft text-grass' : 'bg-grass-soft text-grass'}`}>{personal ? `Rank #${personal.rank} today` : 'Fresh field'}</span>
          </div>
          {tiers && <div className="grid grid-cols-3 gap-2 pt-4 text-center">{tiers.map((tier) => <div key={tier.rank}><b className="block text-lg tabular-nums">{tier.nim}</b><span className="text-xs text-muted">{['1st', '2nd', '3rd'][tier.rank - 1] ?? `${tier.rank}th`} NIM</span></div>)}</div>}
        </section>
        {!wallet && <p className="mt-4 rounded-2xl border border-[#eadb7a] bg-lemon-soft p-4 text-center text-sm font-bold text-ink">Connect your wallet from the lobby to enter the verified leaderboard.</p>}
        <button disabled={!wallet} onClick={() => setPhase('playing')} className="button-primary mt-5 min-h-14 w-full rounded-2xl bg-coral px-6 text-xl font-black text-ink disabled:bg-muted disabled:shadow-none">{wallet ? 'PLAY TODAY\'S RUN' : 'WALLET REQUIRED'}</button>
      </>}

      {(phase === 'signing' || phase === 'submitting') && <section className="grid flex-1 place-items-center text-center"><div className="status-pop"><div className="loading-snake mx-auto mb-5 h-8 w-24 rounded-full bg-teal" /><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{phase === 'signing' ? 'Wallet approval' : 'Replay verification'}</p><h1 className="mt-2 text-3xl font-black">{phase === 'signing' ? 'Confirm your score' : 'Checking your run…'}</h1><p className="mt-3 text-sm text-muted">{phase === 'signing' ? 'One signature proves this run belongs to you.' : 'Replaying every move against today\'s field.'}</p></div></section>}

      {phase === 'verified' && result && <section className="status-pop grid flex-1 place-items-center py-8 text-center"><div className="w-full"><p className="text-sm font-bold uppercase tracking-[0.2em] text-grass-deep">Score verified</p><h1 className="mt-2 text-5xl font-black tabular-nums">{result.score.toLocaleString()}</h1><p className="mt-2 text-lg font-bold">{result.rank ? `Rank #${result.rank}` : 'Rank pending'}</p>{result.rewardTier && <div className="mx-auto mt-6 max-w-xs rounded-2xl bg-lemon-soft p-5"><p className="m-0 text-xs font-bold uppercase text-muted">Reward position</p><p className="m-0 mt-1 text-2xl font-black">+{result.rewardTier.nim} NIM</p></div>}<button className="button-primary mt-8 min-h-14 w-full rounded-2xl bg-coral font-black text-ink" onClick={onExit}>DONE</button></div></section>}

      {phase === 'error' && <section className="grid flex-1 place-items-center text-center"><div className="status-pop"><p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-deep">Run paused</p><h1 className="mt-2 text-3xl font-black">Something went wrong</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">{error}</p><button className="mt-6 min-h-12 rounded-2xl bg-ink px-6 font-bold text-white" onClick={onExit}>Return to lobby</button></div></section>}
    </div>
  </main>;
}
