import type { CSSProperties, ReactNode } from 'react';
import { AVATAR_NAMES, type Avatar } from '@mayor-race/shared';
import { BoardDecor, BushMounds, Bunting, Cloud, Meadow, StringLights } from './art';

/** Sky, clouds, string lights and meadow. Every screen sits on this. */
export function Scene({ children, daisies = 24, seed = 7, lights = true, clouds = true }: { children?: ReactNode; daisies?: number; seed?: number; lights?: boolean; clouds?: boolean }) {
  return (
    <>
      <div className="scene-sky" />
      <div className="scene-grass" />
      {clouds && (
        <div className="layer" aria-hidden="true">
          <Cloud pale width={100} style={{ left: '-5%', top: '17%' }} />
          <Cloud width={118} style={{ left: '-4%', top: '19.5%' }} />
          <Cloud pale width={110} style={{ right: '-4%', top: '9%' }} />
          <Cloud width={112} style={{ right: '-4%', top: '10.5%' }} />
        </div>
      )}
      {lights && <StringLights />}
      <Meadow seed={seed} count={daisies} />
      {children}
    </>
  );
}

/** Slate panel with a cream frame, hung by two strings from a knob. `bottom` places it on the horizon. */
export function Chalkboard({ children, contentStyle }: { children: ReactNode; contentStyle?: CSSProperties }) {
  return (
    <div className="board" style={{ bottom: 'calc(100% - var(--horizon))' }}>
      <svg className="board__strings" style={{ top: '-19%', height: '19%' }} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
        <path d="M50 0 L24 20 M50 0 L76 20" stroke="var(--wire)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" fill="none" />
      </svg>
      <div style={{ position: 'absolute', left: '50%', top: '-19.6%', width: 10, height: 10, borderRadius: '50%', background: 'var(--frame)', transform: 'translateX(-50%)' }} />
      <Cloud width={64} style={{ position: 'absolute', left: '-6.5%', top: '18%', animation: 'none', zIndex: 2 }} />
      <Cloud width={64} style={{ position: 'absolute', right: '-6.5%', top: '18%', animation: 'none', zIndex: 2 }} />
      <div className="board__frame">
        <div className="board__slate">
          <Bunting />
          <BoardDecor />
          <div className="board__content" style={contentStyle}>{children}</div>
        </div>
      </div>
      <BushMounds />
    </div>
  );
}

export function Pill({ children, selected, host, onClick, ariaLabel }: { children: ReactNode; selected?: boolean; host?: boolean; onClick?: () => void; ariaLabel?: string }) {
  const cls = `pill${selected ? ' pill--selected' : ''}${host ? ' pill--host' : ''}`;
  if (!onClick) return <span className={cls}>{children}</span>;
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={selected} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export function Toggle<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="toggle" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" className="toggle__seg" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  // Matches the design: plus on the left, minus on the right.
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="round-btn" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}><span>+</span></button>
      <span className="stepper__n" aria-live="polite">{value}</span>
      <button type="button" className="round-btn" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}><span>−</span></button>
    </div>
  );
}

/** Home screen button: red plank with a dashed stitched border. */
export function SignButton({ children, onClick, style }: { children: ReactNode; onClick: () => void; style?: CSSProperties }) {
  return (
    <button type="button" className="btn-sign" style={style} onClick={onClick}>
      <div className="btn-sign__inner">{children}</div>
    </button>
  );
}

export function PillButton({ children, onClick, disabled, style }: { children: ReactNode; onClick: () => void; disabled?: boolean; style?: CSSProperties }) {
  return (
    <button type="button" className="btn-pill" onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

export function Character({ avatar, height, x, y, name, pop, style }: { avatar: Avatar; height: string; x: string; y: string; name?: string; pop?: boolean; style?: CSSProperties }) {
  return (
    <div className={`char${pop ? ' char--pop' : ''}`} style={{ left: x, top: y, ...style }}>
      <img src={`/characters/${avatar}.svg`} alt={name ? '' : AVATAR_NAMES[avatar]} style={{ height }} draggable={false} />
      {name && <span className="char__name">{name}</span>}
    </div>
  );
}

export function Overlay({ title, children, action }: { title: string; children: ReactNode; action: ReactNode }) {
  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="overlay__card">
        <h2>{title}</h2>
        <p>{children}</p>
        {action}
      </div>
    </div>
  );
}
