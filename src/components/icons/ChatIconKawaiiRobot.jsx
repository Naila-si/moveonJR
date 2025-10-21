export function ChatIconKawaiiRobot({ size=24, title="Chatbot" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      role="img" aria-label={title}>
      <rect x="4" y="7" width="16" height="12" rx="5" />
      <path d="M12 3v2" />
      <circle cx="12" cy="2.8" r="1" fill="currentColor" />
      <circle cx="9" cy="13" r="1.6" fill="currentColor" />
      <circle cx="15" cy="13" r="1.6" fill="currentColor" />
      <path d="M9 16c2 1.2 4 1.2 6 0" />
      <circle cx="7.3" cy="14.2" r="0.9" fill="currentColor" opacity=".2" />
      <circle cx="16.7" cy="14.2" r="0.9" fill="currentColor" opacity=".2" />
    </svg>
  );
}
