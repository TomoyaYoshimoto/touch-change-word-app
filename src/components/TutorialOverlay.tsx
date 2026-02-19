import React, { useEffect, useRef, useState } from "react";
import "./TutorialOverlay.css";

interface TutorialOverlayProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  onDismiss: () => void;
}

const STEPS: { step: string; highlightCell: number | null; label: string; duration: number }[] = [
  { step: "step-center", highlightCell: 4,    label: "●", duration: 600  },
  { step: "step-up",     highlightCell: 1,    label: "↑", duration: 700  },
  { step: "step-hide",   highlightCell: null, label: "",  duration: 500  },
  { step: "step-center", highlightCell: 4,    label: "●", duration: 600  },
  { step: "step-right",  highlightCell: 5,    label: "→", duration: 700  },
  { step: "step-hide",   highlightCell: null, label: "",  duration: 500  },
  { step: "step-center", highlightCell: 4,    label: "●", duration: 600  },
  { step: "step-down",   highlightCell: 7,    label: "↓", duration: 700  },
  { step: "step-hide",   highlightCell: null, label: "",  duration: 500  },
  { step: "step-center", highlightCell: 4,    label: "●", duration: 600  },
  { step: "step-left",   highlightCell: 3,    label: "←", duration: 700  },
  { step: "step-hide",   highlightCell: null, label: "",  duration: 800  },
];

const STEP_TO_CELL: Record<string, number> = {
  "step-center": 4,
  "step-up":     1,
  "step-right":  5,
  "step-down":   7,
  "step-left":   3,
};

interface GridMetrics {
  gridW: number;
  gridH: number;
  cells: { left: number; top: number; width: number; height: number }[];
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ gridRef, onDismiss }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [metrics, setMetrics] = useState<GridMetrics | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // 各セルの実際の位置・サイズをDOMから直接取得
  useEffect(() => {
    const update = () => {
      if (!gridRef.current) return;
      const gridEl = gridRef.current;
      const gridRect = gridEl.getBoundingClientRect();
      const cellEls = gridEl.querySelectorAll<HTMLElement>(".grid-cell");
      const cells = Array.from(cellEls).map((cell) => {
        const r = cell.getBoundingClientRect();
        return {
          left:   r.left   - gridRect.left,
          top:    r.top    - gridRect.top,
          width:  r.width,
          height: r.height,
        };
      });
      setMetrics({ gridW: gridRect.width, gridH: gridRect.height, cells });
    };
    const tid = setTimeout(update, 50);
    window.addEventListener("resize", update);
    return () => { clearTimeout(tid); window.removeEventListener("resize", update); };
  }, [gridRef]);

  // 領域外を含むどこでもクリック/タップで消える
  useEffect(() => {
    const handleGlobalMouseUp = () => onDismiss();
    const handleGlobalTouchEnd = () => onDismiss();
    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("touchend", handleGlobalTouchEnd);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("touchend", handleGlobalTouchEnd);
    };
  }, [onDismiss]);

  // アニメーションステップを進める
  useEffect(() => {
    const timerId = setTimeout(() => {
      setStepIndex((prev) => (prev + 1) % STEPS.length);
    }, STEPS[stepIndex].duration);
    return () => clearTimeout(timerId);
  }, [stepIndex]);

  const current = STEPS[stepIndex];
  if (!metrics) return null;

  const { gridW, gridH, cells } = metrics;

  // ハイライト対象セルの位置
  const highlightCell = current.highlightCell !== null ? cells[current.highlightCell] : null;

  // カーソル位置：対象セルの中心
  const cursorCell = cells[STEP_TO_CELL[current.step] ?? 4];
  const cursorX = cursorCell.left + cursorCell.width  / 2;
  const cursorY = cursorCell.top  + cursorCell.height / 2;

  return (
    <div
      ref={overlayRef}
      className="tutorial-overlay"
      style={{ width: gridW, height: gridH }}
    >
      {/* ハイライトセル */}
      {highlightCell && (
        <div
          className="tutorial-cell-highlight"
          style={{
            left:   highlightCell.left,
            top:    highlightCell.top,
            width:  highlightCell.width,
            height: highlightCell.height,
          }}
        />
      )}

      {/* 指カーソル */}
      <div
        className={`tutorial-cursor${current.step === "step-hide" ? " step-hide" : ""}`}
        style={{ left: cursorX, top: cursorY }}
      >
        {current.label}
      </div>

      {/* メッセージ：グリッド内部の下端に配置 */}
      <div className="tutorial-message">
        <span className="tutorial-message-main">
          画面をフリックして文字を選択します
        </span>
        <span className="tutorial-message-sub">
          タップして操作を始める
        </span>
      </div>
    </div>
  );
};

export default TutorialOverlay;
