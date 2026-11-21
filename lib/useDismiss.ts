import { useEffect } from "react";

/** While `open`, close on Escape or on a click outside any element with the class `menuWrap`. */
export function useDismiss(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    const click = (e: MouseEvent) => {
      if (!(e.target as Element | null)?.closest?.(".menuWrap")) close();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", click);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("mousedown", click);
    };
  }, [open, close]);
}
