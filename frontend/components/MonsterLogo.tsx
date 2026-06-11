export default function MonsterLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Horns */}
      <polygon points="13,18 8,4 18,14" fill="#8B0057" />
      <polygon points="35,18 40,4 30,14" fill="#8B0057" />
      {/* Face */}
      <ellipse cx="24" cy="28" rx="16" ry="14" fill="#8B0057" />
      {/* Eye socket */}
      <ellipse cx="24" cy="25" rx="8" ry="7" fill="#0A0A0A" />
      {/* Iris */}
      <ellipse cx="24" cy="25" rx="5.5" ry="5.5" fill="#FFD600" />
      {/* Pupil */}
      <ellipse cx="24" cy="25" rx="3" ry="3" fill="#0A0A0A" />
      {/* Eye shine */}
      <circle cx="26" cy="23" r="1.2" fill="white" opacity="0.9" />
      {/* Teeth */}
      <path d="M14 38 L17 43 L20 38 L23 43 L26 38 L29 43 L32 38" stroke="#FFD600" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      {/* Brow */}
      <path d="M16 19 Q24 15 32 19" stroke="#620040" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
