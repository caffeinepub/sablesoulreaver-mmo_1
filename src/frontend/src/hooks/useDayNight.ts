import { useEffect, useState } from "react";

const CYCLE_MS = 40 * 60 * 1000; // 40 minutes total (20 day + 20 night)
const DAY_MS = 20 * 60 * 1000; // 20 minutes day

export function useDayNight() {
  const [phase, setPhase] = useState<"day" | "night">("day");
  const [progress, setProgress] = useState(0); // 0-1 within current phase

  useEffect(() => {
    const update = () => {
      const t = Date.now() % CYCLE_MS;
      if (t < DAY_MS) {
        setPhase("day");
        setProgress(t / DAY_MS);
      } else {
        setPhase("night");
        setProgress((t - DAY_MS) / DAY_MS);
      }
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, []);

  return { phase, progress };
}
