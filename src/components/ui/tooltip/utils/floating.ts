import { Middleware } from '@floating-ui/react';

export const createAvoidOverlapMiddleware = (
  registry: { getOtherTooltipRects: (currentId: string) => DOMRect[] },
  currentId: string,
  gap = 8
): Middleware => ({
  name: 'avoidOverlap',
  async fn(state) {
    const { x, y, rects } = state;
    const floatingRect = rects.floating;
    if (!floatingRect) {
      return { x, y };
    }

    const otherRects = registry.getOtherTooltipRects(currentId);
    if (otherRects.length === 0) {
      return { x, y };
    }

    let newX = x;
    let newY = y;

    for (const otherRect of otherRects) {
      const overlapX = newX < otherRect.right + gap && newX + floatingRect.width > otherRect.left - gap;
      const overlapY = newY < otherRect.bottom + gap && newY + floatingRect.height > otherRect.top - gap;

      if (overlapX && overlapY) {
        const spaceAbove = otherRect.top - gap;
        const spaceBelow = window.innerHeight - (otherRect.bottom + gap);
        const canGoUp = newY - floatingRect.height - gap >= 0;
        const canGoDown = newY + floatingRect.height + gap <= window.innerHeight;

        if (canGoUp && (spaceAbove >= spaceBelow || !canGoDown)) {
          newY = otherRect.top - floatingRect.height - gap;
        } else if (canGoDown) {
          newY = otherRect.bottom + gap;
        }
        break;
      }
    }
    return { x: newX, y: newY };
  },
});

export const createVirtualElementFromMouse = (x: number, y: number) => ({
  getBoundingClientRect: () => new DOMRect(x, y, 0, 0),
});
