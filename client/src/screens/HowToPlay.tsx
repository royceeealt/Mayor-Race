import { useRef, useState, type ReactNode } from 'react';
import { PodiumIllustration, Town } from '../components/art';
import { BackArrowIcon, ChatIcon, CrownIcon, HeartHandsIcon, MagnifierIcon, MegaphoneIcon, StopwatchIcon } from '../components/icons';
import { Scene } from '../components/ui';

// Copy for the cards comes from design/howtoplay*.png. Card 1 is not in the design files (the dots show five cards):
// it is placeholder copy built from the round flow in the brief, for Sreenidhi to replace.
const ROLE_CARDS = [
  { name: 'Booing Guy', color: 'var(--role-booing)', icon: <MegaphoneIcon />, text: 'Throw tomatoes at speakers. 3 per game, each cuts 5 seconds.' },
  { name: 'Rumour Spreader', color: 'var(--role-rumour)', icon: <ChatIcon />, text: 'Drop a rumour about a candidate before the vote.' },
  { name: 'Snitch', color: 'var(--role-snitch)', icon: <MagnifierIcon />, text: 'Accuse someone of being the Biased Guy or Rumour Spreader.' },
  { name: 'Biased Guy', color: 'var(--role-biased)', icon: <HeartHandsIcon />, text: 'Secretly back one candidate and always vote for them.' },
];

function Card({ children }: { children: ReactNode }) {
  return <div className="htp-card">{children}</div>;
}

const slides: ReactNode[] = [
  <Card key="round">
    <div className="htp-icon"><span style={{ color: 'var(--htp-amber)' }}><StopwatchIcon size={52} /></span></div>
    <span className="htp-tag">A round</span>
    <div className="htp-rule" />
    <p className="htp-text">The town picks a hot take.</p>
    <p className="htp-text">Each candidate gets a side and gives a speech.</p>
    <p className="htp-text">Chat it out, then vote in secret.</p>
  </Card>,
  <Card key="goal">
    <div className="htp-icon"><span style={{ color: 'var(--htp-amber)' }}><CrownIcon /></span></div>
    <span className="htp-tag">The goal</span>
    <div className="htp-rule" />
    <p className="htp-text">Two players run for mayor.<br />Everyone else is the town.</p>
    <p className="htp-text">Argue hot takes, win the votes, become mayor.</p>
    <p className="htp-text" style={{ marginTop: 18 }}>
      <span className="htp-marker" /> &nbsp;Mayor Race&nbsp; <span className="htp-marker" />
    </p>
  </Card>,
  <div key="roles">
    <div className="htp-grid">
      {ROLE_CARDS.map((r) => (
        <div className="htp-mini" key={r.name}>
          <div className="htp-mini__icon" style={{ background: r.color, color: 'var(--htp-linen)' }}>{r.icon}</div>
          <h3>{r.name}</h3>
          <p>{r.text}</p>
        </div>
      ))}
    </div>
    <div className="htp-note">Everyone else is a plain Townsperson who votes honestly.</div>
  </div>,
  <Card key="win">
    <div className="htp-icon"><span style={{ color: 'var(--htp-amber)' }}><CrownIcon /></span></div>
    <p className="htp-text">After 3 rounds, the candidate with the most round wins becomes mayor.</p>
    <div className="htp-rule" />
    <div className="htp-callout"><StopwatchIcon /><span>Ties go to a 30-second sudden-death speech.</span></div>
    <p className="htp-text" style={{ marginTop: 16, textAlign: 'left' }}>
      Roles score too: the Snitch for correct accusations, the Biased Guy if their favourite wins unnoticed.
    </p>
  </Card>,
  <Card key="final">
    <span className="htp-tag">Mayor Race</span>
    <div style={{ margin: '14px 0 6px' }}><PodiumIllustration /></div>
    <p className="htp-text" style={{ fontFamily: 'var(--font-sign)', fontWeight: 400, fontSize: 'clamp(22px, 6.4vw, 29px)' }}>Take the stage. Win the town.</p>
  </Card>,
];

interface Props { onBack: () => void; onStart: () => void }

export function HowToPlay({ onBack, onStart }: Props) {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const last = slides.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(last, n)));

  return (
    <div
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene daisies={0} lights={false} clouds={false}>
        {/* In the design the town only shows below the dots: the top quarter is plain sky. */}
        <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(24.6% 0 0 0)' }}><Town /></div>
        <button type="button" className="htp-back" onClick={onBack} aria-label="Back"><BackArrowIcon /></button>

        <div className="htp-dots" role="tablist" aria-label="How to play pages">
          {slides.map((_, k) => (
            <button key={k} type="button" className="htp-dotbtn" role="tab" aria-selected={k === i} aria-label={`Page ${k + 1} of ${slides.length}`} onClick={() => go(k)}>
              <span className={`htp-dot${k < i ? ' htp-dot--done' : ''}${k === i ? ' htp-dot--active' : ''}`} />
            </button>
          ))}
        </div>

        <div
          className="htp-viewport"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
          }}
        >
                  {i !== last && (
          <div className="htp-navigation">
            <button
              type="button"
              className="htp-navigation__button"
              onClick={() => go(i - 1)}
              disabled={i === 0}
            >
              ← Previous
            </button>

            <span className="htp-navigation__count">
              {i + 1} / {slides.length}
            </span>

            <button
              type="button"
              className="htp-navigation__button htp-navigation__next"
              onClick={() => go(i + 1)}
            >
              Next →
            </button>
          </div>
        )}
          <div className="htp-track" style={{ transform: `translateX(-${i * 100}%)` }}>
            {slides.map((s, k) => (
              <div className="htp-slide" key={k} aria-hidden={k !== i}>{s}</div>
            ))}
          </div>
        </div>

        {i === last && (
          <div className="htp-final-bar">
            <button type="button" className="btn-start" onClick={onStart}>START</button>
            <button type="button" className="btn-back" onClick={onBack}>Back to town</button>
          </div>
        )}
      </Scene>
    </div>
  );
}
