import { useEffect, useEffectEvent, useRef } from "react";

type UseInfiniteScrollOptions = {
  enabled: boolean;
  onLoadMore: () => void;
};

export function useInfiniteScroll({
  enabled,
  onLoadMore,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useEffectEvent(onLoadMore);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!enabled || !node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return sentinelRef;
}
