export default function BatonMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="bm" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5C6B82" />
          <stop offset="0.45" stopColor="#5C6B82" />
          <stop offset="0.55" stopColor="#E9B152" />
          <stop offset="1" stopColor="#C4862B" />
        </linearGradient>
      </defs>
      <g transform="rotate(-15 20 20)">
        <rect x="4" y="14.5" width="32" height="11" rx="5.5" fill="url(#bm)" />
        <rect x="4" y="14.5" width="32" height="4" rx="2" fill="#fff" opacity="0.18" />
      </g>
    </svg>
  );
}
