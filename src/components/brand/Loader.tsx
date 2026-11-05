/** Sonico loading indicator: a spinning vinyl with an equalizer pulse in the label. */
export function Loader({ size = 56, label = 'Loading' }: { size?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="inline-flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 animate-spinslow rounded-full"
          style={{
            background:
              'repeating-radial-gradient(circle at center, #1A1A1C 0 2px, #2A2A2E 2px 3px)',
            animationDuration: '1.6s',
            boxShadow: '0 6px 20px -6px rgba(15,15,16,.45)',
          }}
        >
          <span className="absolute left-1/2 top-[14%] h-[10%] w-[3%] -translate-x-1/2 rounded-full bg-white/30" />
        </div>
        <div className="absolute inset-[30%] flex items-center justify-center gap-[6%] rounded-full bg-ember">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[12%] rounded-full bg-white"
              style={{ height: '46%', animation: `eq .8s ease-in-out ${i * 0.15}s infinite`, transformOrigin: 'center' }}
            />
          ))}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader />
    </div>
  );
}
