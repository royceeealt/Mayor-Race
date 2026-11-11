// Line icons for the How to play cards. Stroke uses currentColor.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const CrownIcon = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" {...base} aria-hidden="true">
    <path d="M7 34 L5 14 L16 22 L24 8 L32 22 L43 14 L41 34 Z" />
    <path d="M7 40 H41" />
  </svg>
);
export const MegaphoneIcon = () => (
  <svg width="30" height="30" viewBox="0 0 48 48" {...base} aria-hidden="true">
    <path d="M6 20 H14 L34 8 V40 L14 28 H6 Z" />
    <path d="M14 28 L17 40 H24 L21 31" />
    <path d="M40 20 q4 4 0 8" />
  </svg>
);
export const ChatIcon = () => (
  <svg width="30" height="30" viewBox="0 0 48 48" {...base} aria-hidden="true">
    <path d="M6 8 H28 V24 H16 L10 30 V24 H6 Z" />
    <path d="M32 18 H42 V34 H38 V40 L32 34 H20 V28" />
  </svg>
);
export const MagnifierIcon = () => (
  <svg width="30" height="30" viewBox="0 0 48 48" {...base} aria-hidden="true">
    <circle cx="20" cy="20" r="12" />
    <path d="M29 29 L41 41" />
  </svg>
);
export const HeartHandsIcon = () => (
  <svg width="30" height="30" viewBox="0 0 48 48" {...base} aria-hidden="true">
    <path d="M24 40 C8 28 6 18 12 12 C17 8 22 11 24 15 C26 11 31 8 36 12 C42 18 40 28 24 40 Z" />
    <path d="M16 24 l6 5 l4 -3 l6 -2" />
  </svg>
);
export const StopwatchIcon = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" {...base} aria-hidden="true">
    <circle cx="24" cy="27" r="15" />
    <path d="M24 27 L31 20 M19 6 H29 M24 6 V12" />
  </svg>
);
export const BackArrowIcon = () => (
  <svg width="30" height="30" viewBox="0 0 48 48" {...base} strokeWidth="4.2" aria-hidden="true">
    <path d="M40 24 H10 M22 12 L10 24 L22 36" />
  </svg>
);
