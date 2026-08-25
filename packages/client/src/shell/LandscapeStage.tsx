import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface StageGeometry {
  rotated: boolean;
  width: number;
  height: number;
  viewportWidth: number;
}

const FALLBACK: StageGeometry = { rotated: false, width: 0, height: 0, viewportWidth: 0 };
const StageContext = createContext<StageGeometry>(FALLBACK);

export function useStage(): StageGeometry {
  return useContext(StageContext);
}

export function toStagePoint(clientX: number, clientY: number, geometry: StageGeometry): { x: number; y: number } {
  if (!geometry.rotated) return { x: clientX, y: clientY };
  return { x: clientY, y: geometry.viewportWidth - clientX };
}

export function toStageDelta(dx: number, dy: number, geometry: StageGeometry): { dx: number; dy: number } {
  if (!geometry.rotated) return { dx, dy };
  return { dx: dy, dy: -dx };
}

function measure(): StageGeometry {
  if (typeof window === 'undefined') return FALLBACK;
  const rotated = window.matchMedia('(orientation: portrait) and (pointer: coarse)').matches;
  return {
    rotated,
    width: rotated ? window.innerHeight : window.innerWidth,
    height: rotated ? window.innerWidth : window.innerHeight,
    viewportWidth: window.innerWidth,
  };
}

export function LandscapeStage({ children }: { children: ReactNode }) {
  const [geometry, setGeometry] = useState<StageGeometry>(measure);

  useEffect(() => {
    const update = () => setGeometry(measure());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const style = geometry.width > 0 ? { width: geometry.width, height: geometry.height } : undefined;
  return (
    <StageContext.Provider value={geometry}>
      <div className={`landscape-stage${geometry.rotated ? ' landscape-stage-rotated' : ''}`} style={style}>
        {children}
      </div>
    </StageContext.Provider>
  );
}
