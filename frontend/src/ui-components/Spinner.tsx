interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "w-5 h-5",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

const dotsCount = 8;

export default function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      role="status"
      className={`relative flex items-center justify-start ${sizes[size]} ${className}`}
      style={{
        ["--uib-speed" as string]: "0.9s",
        ["--uib-color" as string]: "#1E40AF",
      }}
    >
      <style>{`
        @keyframes dot-pulse {
          0%, 100% { transform: scale(0); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
        .dot-spinner__dot::before {
          content: "";
          height: 20%;
          width: 20%;
          border-radius: 50%;
          background-color: var(--uib-color);
          display: block;
          transform: scale(0);
          opacity: 0.5;
          animation: dot-pulse calc(var(--uib-speed) * 1.111) ease-in-out infinite;
          animation-delay: var(--dot-delay);
          box-shadow: 0 0 20px rgba(30, 64, 175, 0.3);
        }
      `}</style>
      {Array.from({ length: dotsCount }, (_, i) => (
        <div
          key={i}
          className="dot-spinner__dot absolute top-0 left-0 flex size-full items-center justify-start"
          style={{
            transform: `rotate(${i * 45}deg)`,
            ["--dot-delay" as string]: i === 0 ? "0s" : `calc(var(--uib-speed) * ${-0.125 * (dotsCount - i)})`,
          }}
        />
      ))}
    </div>
  );
}
