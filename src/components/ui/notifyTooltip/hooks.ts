import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { COUNTDOWN_START, SCROLL_STEP_DELAY, ANIMATION_DURATION } from './constants';

// ---------- usePortal ----------
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

// ---------- useHiddenCount ----------
export const useHiddenCount = (containerRef: React.RefObject<HTMLDivElement>, deps: any[]) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateHiddenCount, containerRef, ...deps]);

  return hiddenCount;
};

// ---------- useScrollAnimation ----------
export const useScrollAnimation = (containerRef: React.RefObject<HTMLDivElement>, dataSourceNames: string[]) => {
  const [isActive, setIsActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(COUNTDOWN_START);
  const animationFrame = useRef<number>();
  const timers = useRef<{
    start?: NodeJS.Timeout;
    step?: NodeJS.Timeout;
    countdown?: NodeJS.Timeout;
  }>({});
  const directionRef = useRef<'down' | 'up'>('down');

  const animateScroll = useCallback(
    (target: number, duration = ANIMATION_DURATION) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const start = container.scrollTop;
      const change = target - start;
      if (Math.abs(change) < 0.5) {
        return;
      }

      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }

      const startTime = performance.now();
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        container.scrollTop = start + change * ease;
        if (progress < 1) {
          animationFrame.current = requestAnimationFrame(step);
        } else {
          animationFrame.current = undefined;
        }
      };
      animationFrame.current = requestAnimationFrame(step);
    },
    [containerRef]
  );

  const stopAnimation = useCallback(() => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = undefined;
    }
    if (timers.current.step) {
      clearTimeout(timers.current.step);
    }
    if (timers.current.start) {
      clearTimeout(timers.current.start);
    }
    if (timers.current.countdown) {
      clearInterval(timers.current.countdown);
    }
    timers.current = {};
  }, []);

  useEffect(() => {
    if (!dataSourceNames.length) {
      stopAnimation();
      setIsActive(false);
      setRemainingSeconds(COUNTDOWN_START);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    stopAnimation();
    container.scrollTop = 0;
    directionRef.current = 'down';
    setIsActive(false);
    setRemainingSeconds(COUNTDOWN_START);

    const getElementHeight = () => (container.children[0] as HTMLElement)?.offsetHeight || 0;
    const getMaxScroll = () => container.scrollHeight - container.clientHeight;

    const stepToNext = () => {
      if (!dataSourceNames.length) {
        return;
      }

      const maxScroll = getMaxScroll();
      const elementHeight = getElementHeight();

      if (directionRef.current === 'down') {
        const next = Math.min(container.scrollTop + elementHeight, maxScroll);
        animateScroll(next);
        if (next >= maxScroll - 1) {
          if (timers.current.step) {
            clearTimeout(timers.current.step);
          }
          timers.current.step = setTimeout(() => {
            if (!dataSourceNames.length) {
              return;
            }
            directionRef.current = 'up';
            stepToNext();
          }, SCROLL_STEP_DELAY);
        } else {
          timers.current.step = setTimeout(stepToNext, SCROLL_STEP_DELAY);
        }
      } else {
        const next = Math.max(container.scrollTop - elementHeight, 0);
        if (next <= 0) {
          animateScroll(0);
          setIsActive(false);
          return;
        }
        animateScroll(next);
        timers.current.step = setTimeout(stepToNext, SCROLL_STEP_DELAY);
      }
    };

    const startAnimation = () => {
      if (container.scrollHeight <= container.clientHeight) {
        setIsActive(false);
        return;
      }
      setIsActive(true);
      stepToNext();
    };

    setRemainingSeconds(COUNTDOWN_START);
    timers.current.countdown = setInterval(() => {
      setRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    timers.current.start = setTimeout(() => {
      if (timers.current.countdown) {
        clearInterval(timers.current.countdown);
      }
      startAnimation();
    }, COUNTDOWN_START * 1000);

    return () => {
      stopAnimation();
    };
  }, [dataSourceNames, containerRef, animateScroll, stopAnimation]);

  return { isActive, remainingSeconds };
};
