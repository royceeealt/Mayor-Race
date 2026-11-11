import { AVATARS, AVATAR_NAMES, type Avatar } from '@mayor-race/shared';
import { Town } from '../components/art';
import { Character, Scene, SignButton } from '../components/ui';

interface Props {
  avatar: Avatar;
  name: string;
  onAvatar: (a: Avatar) => void;
  onName: (n: string) => void;
  onPlay: () => void;
  onHowTo: () => void;
}

export function Home({ avatar, name, onAvatar, onName, onPlay, onHowTo }: Props) {
  const i = AVATARS.indexOf(avatar);
  const step = (d: number) => onAvatar(AVATARS[(i + d + AVATARS.length) % AVATARS.length]);
  return (
    <>
      <Scene daisies={25} seed={11}>
        <Town />
        <div className="sign">
          <div className="sign__rope" style={{ left: '14%' }} />
          <div className="sign__rope" style={{ right: '14%' }} />
          <div className="sign__plank"><div className="sign__inner">Mayor Game</div></div>
        </div>

        <div className="layer" style={{ top: 'var(--horizon)' }}>
          <div style={{ position: 'absolute', left: '6.7%', width: '41%', top: '33%' }}>
            <SignButton onClick={onPlay}>Play</SignButton>
          </div>
          <button type="button" className="link-text" style={{ position: 'absolute', left: '6.7%', width: '41%', top: '56%', justifyContent: 'center' }} onClick={onHowTo}>
            How to play
          </button>

          <button type="button" className="picker-arrow" style={{ left: '58%', top: 'calc(43% - 22px)' }} aria-label="Previous character" onClick={() => step(-1)}>&lt;</button>
          <button type="button" className="picker-arrow" style={{ right: '0%', top: 'calc(43% - 22px)' }} aria-label="Next character" onClick={() => step(1)}>&gt;</button>
          <Character key={avatar} avatar={avatar} height="20dvh" x="79%" y="68%" pop style={{ maxHeight: 170 }} />

          <div style={{ position: 'absolute', left: '18%', width: '64%', top: '82%' }}>
            <input
              className="name-input"
              value={name}
              maxLength={16}
              onChange={(e) => onName(e.target.value)}
              placeholder="Your name"
              aria-label={`Your name (playing as ${AVATAR_NAMES[avatar]})`}
              autoComplete="off"
              autoCapitalize="words"
            />
          </div>
        </div>
      </Scene>
    </>
  );
}
