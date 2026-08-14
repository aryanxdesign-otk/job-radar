import { useEffect, useRef } from "react";

/**
 * A grid of monospace glyphs behind the hero. Every cell sits at a near-
 * invisible base opacity; the cursor pushes energy into nearby cells, which
 * brightens them and re-rolls their glyph, then decays back to rest.
 *
 * Only cells carrying energy are repainted each frame, and the loop parks
 * itself once everything has decayed, so an idle page costs nothing.
 */

const GLYPHS = "!<>-_\\/[]{}=+*^?#$%&()~|;:,.01";
const CELL_W = 11;
const CELL_H = 14;
const FONT_PX = 11;
const BASE_ALPHA = 0.055;
const PEAK_ALPHA = 0.5;
const RADIUS = 108;
const DECAY = 0.94;
const REST = 0.004; // below this a cell is considered back at rest

export function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cols = 0;
    let rows = 0;
    let glyphs: string[] = [];
    let energy: Float32Array = new Float32Array(0);
    const active = new Set<number>();
    let frame = 0;
    let inkColor = "#070707";

    const randomGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]!;

    function paintCell(index: number) {
      const col = index % cols;
      const row = (index / cols) | 0;
      const x = col * CELL_W;
      const y = row * CELL_H;

      ctx!.clearRect(x, y, CELL_W, CELL_H);
      const alpha = BASE_ALPHA + (energy[index] ?? 0) * (PEAK_ALPHA - BASE_ALPHA);
      ctx!.globalAlpha = alpha;
      ctx!.fillText(glyphs[index] ?? "", x, y + FONT_PX);
    }

    function paintAll() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.globalAlpha = BASE_ALPHA;
      for (let i = 0; i < glyphs.length; i++) {
        const col = i % cols;
        const row = (i / cols) | 0;
        ctx!.fillText(glyphs[i] ?? "", col * CELL_W, row * CELL_H + FONT_PX);
      }
      ctx!.globalAlpha = 1;
    }

    function build() {
      const rect = canvas!.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(rect.width * dpr);
      canvas!.height = Math.floor(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(rect.width / CELL_W);
      rows = Math.ceil(rect.height / CELL_H);

      glyphs = Array.from({ length: cols * rows }, randomGlyph);
      energy = new Float32Array(cols * rows);
      active.clear();

      inkColor = getComputedStyle(canvas!).color || "#070707";
      ctx!.font = `${FONT_PX}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
      ctx!.textBaseline = "alphabetic";
      ctx!.fillStyle = inkColor;

      paintAll();
    }

    function tick() {
      frame = 0;
      for (const index of Array.from(active)) {
        const next = (energy[index] ?? 0) * DECAY;
        if (next < REST) {
          energy[index] = 0;
          active.delete(index);
        } else {
          energy[index] = next;
        }
        paintCell(index);
      }
      ctx!.globalAlpha = 1;
      if (active.size > 0) frame = requestAnimationFrame(tick);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (px < -RADIUS || py < -RADIUS || px > rect.width + RADIUS || py > rect.height + RADIUS) return;

      const colSpan = Math.ceil(RADIUS / CELL_W);
      const rowSpan = Math.ceil(RADIUS / CELL_H);
      const centerCol = Math.round(px / CELL_W);
      const centerRow = Math.round(py / CELL_H);

      for (let row = centerRow - rowSpan; row <= centerRow + rowSpan; row++) {
        if (row < 0 || row >= rows) continue;
        for (let col = centerCol - colSpan; col <= centerCol + colSpan; col++) {
          if (col < 0 || col >= cols) continue;

          const dx = col * CELL_W - px;
          const dy = row * CELL_H - py;
          const distance = Math.hypot(dx, dy);
          if (distance > RADIUS) continue;

          const index = row * cols + col;
          // Smooth falloff, so the edge of the pool doesn't read as a circle.
          const falloff = (1 - distance / RADIUS) ** 2;
          if (falloff <= (energy[index] ?? 0)) continue;

          // Re-roll only the hottest cells, which reads as a scramble under
          // the cursor rather than constant noise.
          if (falloff > 0.55 && Math.random() < 0.12) glyphs[index] = randomGlyph();

          energy[index] = falloff;
          active.add(index);
        }
      }

      if (active.size > 0 && !frame) frame = requestAnimationFrame(tick);
    }

    build();

    const observer = new ResizeObserver(build);
    observer.observe(canvas);
    if (!reduceMotion) window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero__field" aria-hidden="true" />;
}
