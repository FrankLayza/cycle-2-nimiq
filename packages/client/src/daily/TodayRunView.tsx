import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { SIM_VERSION, TICK_MS, createRun, isTerminal, step, todayScore } from '@snake/sim';
import type { AppliedInput, Dir, GameState } from '@snake/sim';
import { signWalletMessage } from '../wallet/provider';
import { MatchScene } from '../game/MatchScene';
import { snapshotFromGame } from '../game/renderState';
import { useKeyboardControls } from '../game/useKeyboard';
import { GameControls } from '../components/GameControls';

interface Props {
  wallet: { address: string } | null;
  onExit: () => void;
}

type Phase = 'loading' | 'ready' | 'playing' | 'signing' | 'submitting' | 'verified' | 'error';

function messageFor(id: string, day: string, seed: number, score: number) {
  return `snake-rink:today:${id}:${day}:${seed}:${score}`;
}

function displayDate(day: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
    new Date(`${day}T00:00:00Z`)
  );
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
      .then((response) => {
        if (!response.ok) throw new Error('Today\'s field is unavailable right now.');
        return response.json();
      })
      .then((data: { date: string; seed: number; simVersion: number }) => {
        if (cancelled) return;
        if (data.simVersion !== SIM_VERSION) throw new Error('Refresh the app to load the latest field.');
        setChallenge(data);
        setState(createRun(data.seed, 'solo', data.simVersion));
        setPhase('ready');
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Could not prepare today\'s field.');
          setPhase('error');
        }
      });
    return () => {
      cancelled = true;
    };
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
    return () => {
      cancelled = true;
    };
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
    const portrait = window.innerHeight > window.innerWidth;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: fieldHost.current,
      width: portrait ? 720 : 1280,
      height: portrait ? 1280 : 720,
      backgroundColor: '#8fd46a',
      scene: [MatchScene],
    });
    phaserGame.current = game;
    return () => {
      game.destroy(true);
      phaserGame.current = null;
    };
  }, [phase]);

  useEffect(() => {
    const game = phaserGame.current;
    if (!game || !state) return;
    const submit = () => (game.scene.getScene('Match') as MatchScene).submitSnapshot(snapshotFromGame(state));
    if (game.scene.isActive('Match')) submit();
    else window.setTimeout(submit, 0);
  }, [state]);

  const finish = async () => {
    if (!challenge || !state || !wallet) {
      setError('Connect your Nimiq wallet to verify this run.');
      setPhase('error');
      return;
    }
    const score = todayScore(challenge.seed, challenge.simVersion, [inputs.current]);
    setPhase('signing');
    try {
      const message = messageFor(runId.current, challenge.date, challenge.seed, score);
      const signed = await signWalletMessage(message);
      setPhase('submitting');
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}/runs/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: runId.current,
          day: challenge.date,
          seed: challenge.seed,
          simVersion: challenge.simVersion,
          wallet: wallet.address,
          inputs: [inputs.current],
          reportedScore: score,
          attestation: { message, ...signed },
        }),
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

  const turn = (direction: Dir) => {
    pending.current = { ...pending.current, turn: direction };
  };
  const boost = (value: boolean) => {
    pending.current = { ...pending.current, boost: value };
  };
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
    return (
      <main className="daily-match-shell fixed inset-0 overflow-hidden p-[max(12px,env(safe-area-inset-top))]">
        <div className="mx-auto flex h-full max-w-2xl flex-col gap-3">
          {/* Top 2.5D In-Game Header */}
          <header className="relative z-10 flex shrink-0 items-center justify-between rounded-2xl border border-white/20 bg-ink/80 px-4 py-3 text-white shadow-lg backdrop-blur-md">
            <div>
              <p className="m-0 text-[10px] font-black uppercase tracking-[0.2em] text-teal-soft">Today&apos;s Run</p>
              <p className="m-0 text-sm font-black text-white">{displayDate(challenge.date)}</p>
            </div>
            <div className="text-center">
              <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-white/60">Score</p>
              <p className="m-0 text-2xl sm:text-3xl font-black tabular-nums text-lemon drop-shadow-xs">{snake?.score ?? 0}</p>
            </div>
            <button
              type="button"
              className="btn-3d btn-3d-white rounded-full px-3.5 py-1 text-xs font-black"
              onClick={onExit}
            >
              Exit
            </button>
          </header>

          {/* Arena Field */}
          <section
            className="daily-field relative z-10 min-h-0 flex-1 overflow-hidden rounded-3xl border-4 border-white/30 bg-grass shadow-2xl"
            onPointerDown={(event) => {
              swipeStart.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={(event) => finishSwipe(event.clientX, event.clientY)}
            onPointerCancel={() => {
              swipeStart.current = null;
            }}
          >
            <div ref={fieldHost} id="world" className="h-full w-full" />
            {!terminal && (
              <div className="run-hint pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/95 border border-line px-4 py-1.5 text-xs font-black text-ink shadow-md">
                👉 Swipe or use the D-Pad
              </div>
            )}
          </section>

          {/* Controls Dock */}
          <div className="mobile-control-dock relative z-10 flex shrink-0 items-end justify-between gap-4 pb-[max(0px,env(safe-area-inset-bottom))]">
            <GameControls
              variant="dark"
              onTurn={turn}
              onBoostChange={boost}
              trailing={
                terminal ? (
                  <button
                    type="button"
                    className="btn-3d btn-3d-lemon min-h-16 flex-1 rounded-2xl text-base sm:text-lg font-black tracking-wide"
                    onClick={() => void finish()}
                  >
                    VERIFY MY SCORE 🚀
                  </button>
                ) : undefined
              }
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full overflow-y-auto bg-cream px-5 pb-16 pt-[max(24px,env(safe-area-inset-top))]">
      <div className="screen-enter mx-auto flex min-h-full w-full max-w-lg flex-col">
        <header className="flex items-center justify-between">
          <button
            type="button"
            className="btn-3d btn-3d-white rounded-full px-4 py-2 text-xs font-black"
            onClick={onExit}
          >
            ← Lobby
          </button>
        </header>

        {phase === 'loading' && (
          <section className="grid flex-1 place-items-center text-center py-16">
            <div className="status-pop">
              <div className="loading-snake mx-auto mb-5 h-8 w-28 rounded-full bg-teal" />
              <h1 className="text-2xl font-black text-ink">Preparing Today&apos;s Field…</h1>
            </div>
          </section>
        )}

        {phase === 'ready' && challenge && (
          <>
            <section className="daily-hero mt-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-lemon-soft border border-lemon-dark/20 px-4 py-1 text-xs font-black uppercase tracking-widest text-gold-deep">
                ★ {displayDate(challenge.date)} Seeded Field ★
              </div>
              <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight text-ink">Today&apos;s Run</h1>
              <p className="mx-auto mt-2 max-w-sm text-base font-semibold leading-relaxed text-muted">
                Identical arena. Zero bots. Prove your skill on the verified daily leaderboard.
              </p>
            </section>

            {/* 2.5D Daily Best & Reward Podiums */}
            <section className="card-2d mt-6 p-5">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <p className="m-0 text-[10px] font-black uppercase tracking-widest text-muted">Your Best Run</p>
                  <p className="m-0 mt-0.5 text-3xl font-black tabular-nums text-ink">
                    {personal ? personal.score.toLocaleString() : 'No score yet'}
                  </p>
                </div>
                <span
                  className={`rounded-xl px-3.5 py-2 text-xs font-black ${
                    personal ? 'bg-teal-soft text-grass-deep border border-teal-dark/30' : 'bg-cream text-muted border border-line'
                  }`}
                >
                  {personal ? `Rank #${personal.rank} Today` : 'Fresh field'}
                </span>
              </div>

              {tiers && (
                <div className="grid grid-cols-3 gap-2.5 pt-4 text-center">
                  {tiers.map((tier) => (
                    <div
                      key={tier.rank}
                      className="rounded-xl border border-line bg-cream/70 p-2.5 shadow-inner"
                    >
                      <b className="block text-xl font-black text-gold-deep tabular-nums">+{tier.nim} NIM</b>
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                        {['1st Place', '2nd Place', '3rd Place'][tier.rank - 1] ?? `${tier.rank}th Place`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {!wallet && (
              <div className="mt-4 rounded-2xl border-2 border-lemon-dark/30 bg-lemon-soft p-4 text-center text-xs font-bold text-ink">
                Connect your Nimiq wallet from the lobby to claim your daily rank and earn NIM rewards.
              </div>
            )}

            <button
              type="button"
              disabled={!wallet}
              onClick={() => setPhase('playing')}
              className="btn-3d btn-3d-coral mt-5 min-h-16 w-full rounded-2xl text-xl font-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {wallet ? 'START TODAY\'S RUN' : 'WALLET REQUIRED TO PLAY'}
            </button>
          </>
        )}

        {(phase === 'signing' || phase === 'submitting') && (
          <section className="grid flex-1 place-items-center text-center py-12">
            <div className="status-pop">
              <div className="loading-snake mx-auto mb-5 h-8 w-28 rounded-full bg-teal" />
              <p className="text-xs font-black uppercase tracking-widest text-grass-deep">
                {phase === 'signing' ? 'Wallet Signature' : 'Replay Verification'}
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black text-ink">
                {phase === 'signing' ? 'Confirm Your Score' : 'Verifying Every Tick…'}
              </h1>
              <p className="mt-3 text-xs sm:text-sm font-semibold text-muted leading-relaxed">
                {phase === 'signing'
                  ? 'Sign with your Nimiq wallet to bind this score to your on-chain identity.'
                  : 'Server simulation is replaying your exact inputs to verify fair play.'}
              </p>
            </div>
          </section>
        )}

        {phase === 'verified' && result && (
          <section className="status-pop grid flex-1 place-items-center py-8 text-center my-auto">
            <div className="w-full">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-soft text-3xl shadow-inner">
                ✨
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-grass-deep">Score Verified on Replay</p>
              <h1 className="mt-2 text-5xl font-black tabular-nums text-ink">{result.score.toLocaleString()}</h1>
              <p className="mt-2 text-lg font-black text-ink">
                {result.rank ? `Rank #${result.rank} on Daily Board` : 'Rank pending settlement'}
              </p>

              {result.rewardTier && (
                <div className="mx-auto mt-5 max-w-xs rounded-2xl bg-lemon-soft border border-lemon-dark/30 p-4 shadow-xs">
                  <p className="m-0 text-[10px] font-black uppercase tracking-wider text-muted">Estimated Reward</p>
                  <p className="m-0 mt-1 text-2xl font-black text-gold-deep">+{result.rewardTier.nim} NIM</p>
                </div>
              )}

              <button
                type="button"
                className="btn-3d btn-3d-coral mt-7 min-h-14 w-full rounded-2xl text-lg font-black"
                onClick={onExit}
              >
                RETURN TO LOBBY
              </button>
            </div>
          </section>
        )}

        {phase === 'error' && (
          <section className="grid flex-1 place-items-center text-center py-12">
            <div className="status-pop">
              <p className="text-xs font-black uppercase tracking-widest text-coral-deep">Run Stopped</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black text-ink">Something went wrong</h1>
              <p className="mx-auto mt-3 max-w-sm text-xs sm:text-sm font-semibold leading-relaxed text-muted">{error}</p>
              <button
                type="button"
                className="btn-3d btn-3d-white mt-6 min-h-12 w-full rounded-2xl text-xs font-black"
                onClick={onExit}
              >
                Return to Lobby
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
