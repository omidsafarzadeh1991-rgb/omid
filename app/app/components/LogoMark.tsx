export default function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(180deg, #2dd4bf, #0d9488)",
        boxShadow: "0 3px 0 #0f766e, 0 10px 18px -6px rgba(13, 148, 136, 0.5)",
      }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="17" rx="2.5" />
        <path d="M3 9h18" />
        <path d="M8 2v4M16 2v4" />
        <path d="M8.5 14.5l2 2 4-4" />
      </svg>
    </div>
  );
}
