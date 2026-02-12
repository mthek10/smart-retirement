import { useRef, useEffect, useCallback, useState } from "react";

interface CustomScrollbarProps {
  scrollRef: React.RefObject<HTMLElement>;
  orientation: "vertical" | "horizontal";
  className?: string;
}

export function CustomScrollbar({ scrollRef, orientation, className = "" }: CustomScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef(0);
  const scrollStart = useRef(0);
  const [thumbSize, setThumbSize] = useState(0);
  const [thumbPos, setThumbPos] = useState(0);
  const [visible, setVisible] = useState(false);

  const isVertical = orientation === "vertical";

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollSize = isVertical ? el.scrollHeight : el.scrollWidth;
    const clientSize = isVertical ? el.clientHeight : el.clientWidth;

    if (scrollSize <= clientSize) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const trackSize = isVertical
      ? (trackRef.current?.clientHeight ?? clientSize)
      : (trackRef.current?.clientWidth ?? clientSize);

    const ratio = clientSize / scrollSize;
    const newThumbSize = Math.max(ratio * trackSize, 30);
    const scrollPos = isVertical ? el.scrollTop : el.scrollLeft;
    const maxScroll = scrollSize - clientSize;
    const newThumbPos = maxScroll > 0 ? (scrollPos / maxScroll) * (trackSize - newThumbSize) : 0;

    setThumbSize(newThumbSize);
    setThumbPos(newThumbPos);
  }, [scrollRef, isVertical]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateThumb();
    el.addEventListener("scroll", updateThumb, { passive: true });

    const ro = new ResizeObserver(updateThumb);
    ro.observe(el);
    // Also observe first child for content size changes
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild);
    }

    return () => {
      el.removeEventListener("scroll", updateThumb);
      ro.disconnect();
    };
  }, [scrollRef, updateThumb]);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === thumbRef.current) return;
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) return;

      const rect = track.getBoundingClientRect();
      const clickPos = isVertical ? e.clientY - rect.top : e.clientX - rect.left;
      const trackSize = isVertical ? rect.height : rect.width;
      const scrollSize = isVertical ? el.scrollHeight : el.scrollWidth;
      const clientSize = isVertical ? el.clientHeight : el.clientWidth;
      const maxScroll = scrollSize - clientSize;

      const ratio = clickPos / trackSize;
      const newScroll = ratio * maxScroll - (isVertical ? el.clientHeight : el.clientWidth) / 2;
      el.scrollTo({
        [isVertical ? "top" : "left"]: Math.max(0, Math.min(newScroll, maxScroll)),
        behavior: "smooth",
      });
    },
    [scrollRef, isVertical]
  );

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      dragStart.current = isVertical ? e.clientY : e.clientX;
      const el = scrollRef.current;
      scrollStart.current = el ? (isVertical ? el.scrollTop : el.scrollLeft) : 0;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const el = scrollRef.current;
        const track = trackRef.current;
        if (!el || !track) return;

        const delta = (isVertical ? ev.clientY : ev.clientX) - dragStart.current;
        const trackSize = isVertical ? track.clientHeight : track.clientWidth;
        const scrollSize = isVertical ? el.scrollHeight : el.scrollWidth;
        const clientSize = isVertical ? el.clientHeight : el.clientWidth;
        const maxScroll = scrollSize - clientSize;
        const scrollRatio = maxScroll / (trackSize - thumbSize);

        el.scrollTo({
          [isVertical ? "top" : "left"]: scrollStart.current + delta * scrollRatio,
        });
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [scrollRef, isVertical, thumbSize]
  );

  if (!visible) return null;

  return (
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      className={`custom-scrollbar-track ${
        isVertical ? "w-3 h-full" : "h-3 w-full"
      } ${className}`}
      style={{ position: "relative", flexShrink: 0 }}
    >
      <div
        ref={thumbRef}
        onMouseDown={handleThumbMouseDown}
        className="custom-scrollbar-thumb absolute"
        style={
          isVertical
            ? { width: "100%", height: thumbSize, top: thumbPos, left: 0 }
            : { height: "100%", width: thumbSize, left: thumbPos, top: 0 }
        }
      />
    </div>
  );
}
