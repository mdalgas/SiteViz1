import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayback } from '../stores/playbackStore';
import type { SiteEvent } from '../types';

const TOAST_DURATION_MS = 5000;

function Toast({ event }: { event: SiteEvent }) {
  const { dismissToast } = usePlayback();
  const isArrive = event.type === 'arrive';

  // Auto-dismiss after TOAST_DURATION_MS
  useEffect(() => {
    const id = setTimeout(() => dismissToast(event.t, event.assetId), TOAST_DURATION_MS);
    return () => clearTimeout(id);
  }, [event.t, event.assetId, dismissToast]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer select-none"
      style={{
        background: 'rgba(10,14,20,0.88)',
        border: `1px solid ${event.color}66`,
        boxShadow: `0 0 12px ${event.color}33`,
        minWidth: 220,
        maxWidth: 280,
      }}
      onClick={() => dismissToast(event.t, event.assetId)}
    >
      {/* Color dot */}
      <div
        className="mt-0.5 shrink-0 w-2.5 h-2.5 rounded-full"
        style={{ background: event.color, boxShadow: `0 0 6px ${event.color}` }}
      />

      <div className="flex-1 min-w-0">
        <div className="font-bold text-white truncate" style={{ fontFamily: 'monospace' }}>
          {isArrive ? '▶ ARRIVED' : '◀ DEPARTED'}
        </div>
        <div className="text-xs mt-0.5 truncate" style={{ color: event.color }}>
          {event.label}
        </div>
        {!isArrive && event.durationHours !== undefined && (
          <div className="text-xs mt-1 text-gray-400">
            On site {event.durationHours}h · {event.activeWorkPercent}% active
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function EventToastContainer() {
  const { activeToasts } = usePlayback();

  return (
    <div className="fixed right-4 bottom-24 flex flex-col gap-2 z-20 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activeToasts.map(e => (
          <div key={`${e.assetId}-${e.type}-${e.t}`} className="pointer-events-auto">
            <Toast event={e} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
