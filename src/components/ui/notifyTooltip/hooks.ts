import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const usePortal = () => {
  const portalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'notify-tooltip-portal');
    el.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:99999;';
    portalRef.current = el;
    document.body.appendChild(el);
    return () => {
      portalRef.current?.remove();
      portalRef.current = null;
    };
  }, []);
  return portalRef;
};

/** Считает число элементов, не влезающих в видимую область */
export const useHiddenCount = (
  containerRef: React.RefObject<HTMLDivElement>,
  dataSourceNames: string[],
  tooltipWidth: number
) => {
  const [hiddenCount, setHiddenCount] = useState(0);

  const updateHiddenCount = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setHiddenCount(0);
      return;
    }
    const children = Array.from(container.children);
    const containerRect = container.getBoundingClientRect();
    let hidden = 0;
    for (const child of children) {
      const rect = child.getBoundingClientRect();
      if (rect.top >= containerRect.bottom - 1) {
        hidden++;
      }
    }
    setHiddenCount(hidden);
  }, [containerRef]);

  useLayoutEffect(() => {
    updateHiddenCount();
    const observer = new ResizeObserver(updateHiddenCount);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateHiddenCount, containerRef, dataSourceNames, tooltipWidth]);

  return hiddenCount;
};

// ---------- Утилита плавного скролла ----------
function smoothScrollTo(element: HTMLElement, target: number, duration: number): Promise<void> {
  return new Promise((resolve) => {
    const start = element.scrollTop;
    const change = target - start;
    if (Math.abs(change) < 0.5) {
      resolve();
      return;
    }
    const startTime = performance.now();
    const step = (now: number) => {
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

// ---------- Хук автоскролла ----------
export const useAutoScroll = (
  containerRef: React.RefObject<HTMLDivElement>,
  needsScroll: boolean,
  dataSourceNames: string[]
) => {
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoScrolling = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!needsScroll || !el || isAutoScrolling.current) {
      return;
    }

    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      return;
    }

    const startDelay = 10000; // 10 секунд ожидания
    const scrollDownDuration = 1500; // 1.5 секунд вниз
    const pauseAtBottom = 5000; // 5 секунд стоим внизу
    const scrollUpDuration = 800; // 0.8 секунды вверх

    const timeout = setTimeout(async () => {
      if (!containerRef.current || isAutoScrolling.current) {
        return;
      }
      isAutoScrolling.current = true;

      await smoothScrollTo(containerRef.current, maxScroll, scrollDownDuration);
      await new Promise((resolve) => setTimeout(resolve, pauseAtBottom));

      if (containerRef.current && isAutoScrolling.current) {
        await smoothScrollTo(containerRef.current, 0, scrollUpDuration);
      }

      isAutoScrolling.current = false;
    }, startDelay);

    autoScrollTimerRef.current = timeout;

    return () => {
      clearTimeout(timeout);
      isAutoScrolling.current = false;
    };
  }, [needsScroll, dataSourceNames, containerRef]);
};
