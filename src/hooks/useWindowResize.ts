import { useEffect, useCallback, useRef } from "react";

export function useWindowResize(onResize: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedResize = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onResize();
    }, 50);
  }, [onResize]);

  useEffect(() => {
    window.addEventListener("resize", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [debouncedResize]);
}
