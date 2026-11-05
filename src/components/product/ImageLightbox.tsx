import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';

/** Full-screen photo preview with arrow-key / swipe-free navigation. */
export function ImageLightbox({ images, index, alt, onIndex, onClose }: {
  images: string[];
  index: number | null;
  alt: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const count = images.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && count > 1) onIndex(((index ?? 0) + 1) % count);
      if (e.key === 'ArrowLeft' && count > 1) onIndex(((index ?? 0) - 1 + count) % count);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, index, count, onIndex, onClose]);

  const step = (d: number) => onIndex(((index ?? 0) + d + count) % count);
  const navBtn = 'absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog" aria-modal="true" aria-label={`${alt} photos`}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/95 p-4 sm:p-12"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.img
            key={index}
            src={images[index!]}
            alt={`${alt} — photo ${index! + 1} of ${count}`}
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={onClose} aria-label="Close preview"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20">
            <Icon name="close" />
          </button>
          {count > 1 && (
            <>
              <button aria-label="Previous photo" className={`${navBtn} left-4`} onClick={(e) => { e.stopPropagation(); step(-1); }}>
                <Icon name="chevron_left" />
              </button>
              <button aria-label="Next photo" className={`${navBtn} right-4`} onClick={(e) => { e.stopPropagation(); step(1); }}>
                <Icon name="chevron_right" />
              </button>
              <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {index! + 1} / {count}
              </p>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
