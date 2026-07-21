import { useEffect, useRef } from 'react';
import { TOOLTIP_Z_INDEX } from './constants';

// Хук для создания портала
export const usePortal = (zIndex: number = TOOLTIP_Z_INDEX) => {
  const portalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'notify-tooltip-portal');
    el.style.cssText = `position:fixed;top:0;left:0;width:0;height:0;z-index:${zIndex};`;
    portalRef.current = el;
    document.body.appendChild(el);
    return () => {
      portalRef.current?.remove();
      portalRef.current = null;
    };
  }, [zIndex]);
  return portalRef;
};

// Утилита плавного скролла с поддержкой отмены
function smoothScrollTo(
  element: HTMLElement,
  target: number,
  duration: number,
  cancelRef: React.MutableRefObject<boolean>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = element.scrollTop;
    const change = target - start;
    if (Math.abs(change) < 0.5) {
      resolve();
      return;
    }
    const startTime = performance.now();
    const step = (now: number) => {
      if (cancelRef.current) {
        reject(new Error('cancelled'));
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      element.scrollTop = start + change * ease;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

// Хук автоскролла
export const useAutoScroll = (
  containerRef: React.RefObject<HTMLDivElement>,
  needsScroll: boolean,
  dataSourceNames: string[]
) => {
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoScrolling = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!needsScroll || !el || isAutoScrolling.current) {
      return;
    }

    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      return;
    }

    const startDelay = 10000;
    const scrollDownDuration = 1500;
    const pauseAtBottom = 5000;
    const scrollUpDuration = 800;

    const timeout = setTimeout(async () => {
      if (cancelRef.current || !containerRef.current || isAutoScrolling.current) {
        return;
      }
      isAutoScrolling.current = true;
      cancelRef.current = false;

      try {
        await smoothScrollTo(containerRef.current, maxScroll, scrollDownDuration, cancelRef);
        if (cancelRef.current) {
          throw new Error('cancelled');
        }
        await new Promise((resolve) => setTimeout(resolve, pauseAtBottom));
        if (cancelRef.current) {
          throw new Error('cancelled');
        }
        if (containerRef.current && !cancelRef.current) {
          await smoothScrollTo(containerRef.current, 0, scrollUpDuration, cancelRef);
        }
      } catch {
        // игнорируем отмену
      } finally {
        isAutoScrolling.current = false;
      }
    }, startDelay);

    autoScrollTimerRef.current = timeout;

    return () => {
      clearTimeout(timeout);
      cancelRef.current = true;
      isAutoScrolling.current = false;
    };
  }, [needsScroll, dataSourceNames, containerRef]);
};
