'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const range = (length: number) => Array.from({ length }, (_, i) => i);

type HexagonBackgroundProps = React.ComponentProps<'div'> & {
  hexagonProps?: React.ComponentProps<'div'>;
  hexagonSize?: number;
  hexagonMargin?: number;
  theme?: 'dark-blue' | 'default';
};

function HexagonBackground({
  ref,
  className,
  children,
  hexagonProps,
  hexagonSize = 65,
  hexagonMargin = 2,
  theme = 'dark-blue',
  ...props
}: HexagonBackgroundProps) {
  const hexagonWidth = hexagonSize;
  const hexagonHeight = hexagonSize * 1.12;
  // Rows a slanted side apart, so every border is hexagonMargin thick.
  const corner = hexagonHeight / 4;
  const side = Math.hypot(corner, hexagonWidth / 2);
  const rowSpacing =
    hexagonHeight -
    corner +
    (hexagonMargin * (2 * side - corner)) / hexagonWidth;
  const computedMarginTop = rowSpacing - hexagonHeight;
  const oddRowMarginLeft = -(hexagonSize / 2);
  const evenRowMarginLeft = hexagonMargin / 2;

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref) return;
    if (typeof ref === 'function') ref(containerRef.current);
    else if ('current' in ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = containerRef.current;
  }, [ref]);

  const [gridDimensions, setGridDimensions] = React.useState({
    rows: 0,
    columns: 0,
  });

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const { width, height } = container.getBoundingClientRect();
      const rows = Math.ceil(height / rowSpacing) + 1;
      const columns = Math.ceil(width / hexagonWidth) + 1;
      setGridDimensions((prev) =>
        prev.rows === rows && prev.columns === columns
          ? prev
          : { rows, columns },
      );
    };
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [rowSpacing, hexagonWidth]);

  // Dark-blue theme classes tailored specifically for CampusAxis dark footer
  const isDarkBlue = theme === 'dark-blue';

  const defaultClasses = isDarkBlue
    ? cn(
        'relative pointer-events-auto',
        '[clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]',
        // Outer border (before): dark navy outline, transitions out slowly over 1s
        "before:content-[''] before:absolute before:inset-0 before:bg-[rgba(30,58,102,0.45)] before:transition-colors before:duration-1000",
        // Inner cell (after): deep midnight blue matching footer (#0a1628)
        "after:content-[''] after:absolute after:inset-[var(--hexagon-margin)] after:bg-[#0a1628] after:transition-colors after:duration-1000",
        'after:[clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]',
        // Hover state: electric CampusAxis blue border and luminous inner glow immediately
        'hover:before:bg-[#0071e3] hover:before:transition-none hover:before:duration-0',
        'hover:after:bg-[#132c54] hover:after:transition-none hover:after:duration-0',
      )
    : cn(
        'relative',
        '[clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]',
        "before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full dark:before:bg-neutral-950 before:bg-white before:opacity-100 before:transition-colors before:duration-1000",
        "after:content-[''] after:absolute after:inset-[var(--hexagon-margin)] dark:after:bg-neutral-950 after:bg-white",
        'after:[clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]',
        'hover:before:bg-neutral-200 dark:hover:before:bg-neutral-800 hover:before:opacity-100 hover:before:duration-0 dark:hover:after:bg-neutral-900 hover:after:bg-neutral-100 hover:after:opacity-100 hover:after:duration-0',
      );

  return (
    <div
      ref={containerRef}
      data-slot="hexagon-background"
      className={cn(
        'relative isolate size-full overflow-hidden',
        isDarkBlue ? 'bg-[#0a1628]' : 'dark:bg-neutral-900 bg-neutral-100',
        className,
      )}
      {...props}
      style={
        {
          '--hexagon-margin': `${hexagonMargin}px`,
          ...props.style,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute top-0 left-0 size-full overflow-hidden text-base leading-6 pointer-events-none',
          children ? '-z-10' : 'z-0',
        )}
      >
        {range(gridDimensions.rows).map((rowIndex) => (
          <div
            key={rowIndex}
            style={{
              marginTop: computedMarginTop,
              marginLeft:
                ((rowIndex + 1) % 2 === 0
                  ? evenRowMarginLeft
                  : oddRowMarginLeft) - 10,
            }}
            className="flex w-max pointer-events-none"
          >
            {range(gridDimensions.columns).map((colIndex) => (
              <div
                key={colIndex}
                {...hexagonProps}
                style={{
                  width: hexagonWidth,
                  height: hexagonHeight,
                  marginLeft: hexagonMargin,
                  ...hexagonProps?.style,
                }}
                className={cn('pointer-events-auto', defaultClasses, hexagonProps?.className)}
              />
            ))}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

export { HexagonBackground, type HexagonBackgroundProps };
export default HexagonBackground;
