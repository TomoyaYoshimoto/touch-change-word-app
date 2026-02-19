import React from "react";
import "./FlickInput.css";
import TutorialOverlay from "./TutorialOverlay";
import { useFlickInput } from "../hooks/useFlickInput";

const FlickInput: React.FC = () => {
  const { state, handlers, gridRef } = useFlickInput();
  const {
    inputText,
    currentDisplay,
    isFlicking,
    flickDirection,
    isDetailView,
    isTemplateCategoryView,
    isTemplateDetailView,
    inputMode,
    showTutorial,
  } = state;
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDismissTutorial,
    calculateFontSize,
    getDirectionArrow,
  } = handlers;

  // セルのクラス名を生成するヘルパー
  const cellClass = (index: number, extraClass: string) =>
    `grid-cell ${extraClass} ${isFlicking && flickDirection === index ? "pointer-hover" : ""}`.trim();

  // セル0（左上）: 戻る or 通常
  const renderCell0 = () => (
    <div className={cellClass(0, isDetailView || isTemplateDetailView ? "back-cell" : "")}>
      {isDetailView || isTemplateDetailView ? (
        <span className="return-icon">↩︎</span>
      ) : isTemplateCategoryView ? (
        <span className="hiragana-main">{currentDisplay[0] || ""}</span>
      ) : (
        <span>
          <span className="hiragana-main">{currentDisplay[0] || ""}</span>
          <span className="gyou-suffix">行</span>
        </span>
      )}
    </div>
  );

  // セル2（右上）: 削除 or 通常
  const renderCell2 = () => (
    <div className={cellClass(2, isDetailView || isTemplateDetailView ? "back-cell" : "")}>
      {isDetailView || isTemplateDetailView ? (
        <span className="delete-icon">🗑️</span>
      ) : isTemplateCategoryView ? (
        <span className="hiragana-main">{currentDisplay[2] || ""}</span>
      ) : (
        <span>
          <span className="hiragana-main">{currentDisplay[2] || ""}</span>
          <span className="gyou-suffix">行</span>
        </span>
      )}
    </div>
  );

  // セル6（左下）: 定型文ボタン or 通常
  const renderCell6 = () => {
    const isTemplateButton = isDetailView && inputMode === "free";
    const isFreeInputButton = isTemplateCategoryView && currentDisplay[6] === "自由入力";
    return (
      <div className={cellClass(6, isTemplateButton || isFreeInputButton ? "template-cell" : "")}>
        {isTemplateButton ? (
          <span className="template-text">定型文</span>
        ) : isFreeInputButton ? (
          <span className="template-text">自由入力</span>
        ) : isDetailView || isTemplateCategoryView || isTemplateDetailView ? (
          <span className="hiragana-main">{currentDisplay[6] || ""}</span>
        ) : (
          <span>
            <span className="hiragana-main">{currentDisplay[6] || ""}</span>
            <span className="gyou-suffix">行</span>
          </span>
        )}
      </div>
    );
  };

  // セル8（右下）: 全削除 or 通常
  const renderCell8 = () => (
    <div
      className={cellClass(
        8,
        isTemplateCategoryView
          ? "clear-all-cell"
          : isDetailView || isTemplateDetailView
          ? "detail-cell"
          : ""
      )}
    >
      {isTemplateCategoryView ? (
        <span className="clear-all-text">全削除</span>
      ) : isDetailView || isTemplateDetailView ? (
        <span className="hiragana-main">{currentDisplay[8] || ""}</span>
      ) : (
        <span>
          <span className="hiragana-main">{currentDisplay[8] || ""}</span>
          <span className="gyou-suffix">行</span>
        </span>
      )}
    </div>
  );

  // 通常セル（1,3,4,5,7）の共通レンダリング
  const renderNormalCell = (index: number, extraClass = "") => (
    <div className={cellClass(index, isDetailView || isTemplateDetailView ? `detail-cell ${extraClass}` : extraClass)}>
      {isDetailView || isTemplateCategoryView || isTemplateDetailView ? (
        <span className="hiragana-main">{currentDisplay[index] || ""}</span>
      ) : (
        <span>
          <span className="hiragana-main">{currentDisplay[index] || ""}</span>
          <span className="gyou-suffix">行</span>
        </span>
      )}
    </div>
  );

  // フリック中のポインター表示
  const renderFlickIndicator = () => {
    if (!isFlicking || flickDirection === null) return null;
    const cellEls = gridRef.current?.querySelectorAll<HTMLElement>(".grid-cell");
    const cell = cellEls?.[flickDirection];
    if (!cell || !gridRef.current) return null;
    const cellRect = cell.getBoundingClientRect();
    const gridRect = gridRef.current.getBoundingClientRect();
    const cx = cellRect.left - gridRect.left + cellRect.width / 2;
    const cy = cellRect.top - gridRect.top + cellRect.height / 2;
    return (
      <div className="flick-indicator" style={{ left: cx, top: cy }}>
        {getDirectionArrow(flickDirection)}
      </div>
    );
  };

  return (
    <div
      className="flick-input-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 入力テキスト表示 */}
      <div className="input-text-display">
        <span
          className={inputText ? "" : "placeholder-text"}
          style={{ fontSize: calculateFontSize(inputText || "入力した文字がここに表示されます") }}
        >
          {inputText || "入力した文字がここに表示されます"}
        </span>
      </div>

      {/* モードインジケーター */}
      <div className="mode-indicator">
        <span className={`mode-text ${inputMode === "template" ? "template-mode" : "free-mode"}`}>
          {inputMode === "template" ? "定型文モード" : "自由入力モード"}
        </span>
      </div>

      {/* グリッド */}
      <div className={`flick-grid-wrapper${showTutorial ? " tutorial-active" : ""}`}>
        {showTutorial && (
          <TutorialOverlay gridRef={gridRef} onDismiss={handleDismissTutorial} />
        )}
        <div className="flick-grid" ref={gridRef}>
          {renderCell0()}
          {renderNormalCell(1)}
          {renderCell2()}
          {renderNormalCell(3)}
          {renderNormalCell(4, "center")}
          {renderNormalCell(5)}
          {renderCell6()}
          {renderNormalCell(7)}
          {renderCell8()}
          {renderFlickIndicator()}
        </div>
      </div>
    </div>
  );
};

export default FlickInput;
