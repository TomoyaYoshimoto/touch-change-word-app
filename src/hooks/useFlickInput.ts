import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  BASE_CHARACTERS,
  DIRECTION_ARROWS,
  HIRAGANA_ROWS,
  INITIAL_DISPLAY,
  TEMPLATE_CATEGORIES,
  TEMPLATE_DETAILS,
  TEMPLATE_INITIAL_DISPLAY,
} from "../constants/flickConstants";

interface TouchPosition {
  x: number;
  y: number;
}

export interface FlickInputState {
  inputText: string;
  currentDisplay: string[];
  isFlicking: boolean;
  flickDirection: number | null;
  isDetailView: boolean;
  isTemplateCategoryView: boolean;
  isTemplateDetailView: boolean;
  inputMode: "free" | "template";
  showTutorial: boolean;
}

export interface FlickInputHandlers {
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: (e: React.MouseEvent) => void;
  handleDismissTutorial: () => void;
  calculateFontSize: (text: string) => string;
  getDirectionArrow: (direction: number) => string;
}

export interface UseFlickInputReturn {
  state: FlickInputState;
  handlers: FlickInputHandlers;
  gridRef: RefObject<HTMLDivElement | null>;
}

export const useFlickInput = (): UseFlickInputReturn => {
  const [inputText, setInputText] = useState<string>("");
  const [currentDisplay, setCurrentDisplay] = useState<string[]>(INITIAL_DISPLAY);
  const [isFlicking, setIsFlicking] = useState(false);
  const [flickDirection, setFlickDirection] = useState<number | null>(null);
  const [history, setHistory] = useState<string[][]>([]);
  const [isDetailView, setIsDetailView] = useState(false);
  const [isTemplateCategoryView, setIsTemplateCategoryView] = useState(false);
  const [isTemplateDetailView, setIsTemplateDetailView] = useState(false);
  const [inputMode, setInputMode] = useState<"free" | "template">("free");
  const [showTutorial, setShowTutorial] = useState<boolean>(true);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [doubleTapExecuted, setDoubleTapExecuted] = useState<boolean>(false);

  const touchStartPos = useRef<TouchPosition>({ x: 0, y: 0 });
  const singleTapTimeoutId = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // フリック方向を判定
  const getFlickDirection = (startPos: TouchPosition, endPos: TouchPosition): number => {
    const deltaX = endPos.x - startPos.x;
    const deltaY = endPos.y - startPos.y;
    const threshold = 30;

    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
      return 4; // 中央（タップ）
    }

    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

    if (angle >= -22.5 && angle < 22.5) return 5;   // 右
    if (angle >= 22.5 && angle < 67.5) return 8;    // 右下
    if (angle >= 67.5 && angle < 112.5) return 7;   // 下
    if (angle >= 112.5 && angle < 157.5) return 6;  // 左下
    if (angle >= 157.5 || angle < -157.5) return 3; // 左
    if (angle >= -157.5 && angle < -112.5) return 0;// 左上
    if (angle >= -112.5 && angle < -67.5) return 1; // 上
    if (angle >= -67.5 && angle < -22.5) return 2;  // 右上

    return 4;
  };

  // 矢印の取得
  const getDirectionArrow = (direction: number): string => {
    return DIRECTION_ARROWS[direction] || "";
  };

  // 文字数に基づくフォントサイズの計算
  const calculateFontSize = useCallback((text: string): string => {
    const length = text.length;
    if (length <= 10) return "2rem";
    if (length <= 20) return "1.8rem";
    if (length <= 30) return "1.6rem";
    if (length <= 40) return "1.4rem";
    if (length <= 50) return "1.2rem";
    return "1rem";
  }, []);

  // 文字選択
  const selectCharacter = useCallback(
    (char: string) => {
      if (char && char.trim() !== "") {
        setInputText((prev) => prev + char);
        if (inputMode === "template") {
          setCurrentDisplay(TEMPLATE_INITIAL_DISPLAY);
          setIsTemplateCategoryView(true);
          setIsTemplateDetailView(false);
        } else {
          setCurrentDisplay(INITIAL_DISPLAY);
          setIsTemplateCategoryView(false);
          setIsTemplateDetailView(false);
        }
        setHistory([]);
        setIsDetailView(false);
      }
    },
    [inputMode]
  );

  // 文字削除
  const deleteLastCharacter = useCallback(() => {
    setInputText((prev) => prev.slice(0, -1));
  }, []);

  // 全削除
  const clearAllText = useCallback(() => {
    setInputText("");
  }, []);

  // 戻る処理
  const handleBack = useCallback(() => {
    if (isTemplateDetailView) {
      setIsTemplateDetailView(false);
      setIsTemplateCategoryView(true);
      setCurrentDisplay(TEMPLATE_INITIAL_DISPLAY);
    } else if (isTemplateCategoryView) {
      return;
    } else if (history.length > 0) {
      const previousDisplay = history[history.length - 1];
      setCurrentDisplay(previousDisplay);
      setHistory((prev) => prev.slice(0, -1));
      setIsDetailView(false);
    }
  }, [isTemplateDetailView, isTemplateCategoryView, history]);

  // 定型文モードへ切り替え
  const handleTemplateButtonClick = useCallback(() => {
    setInputMode("template");
    setIsTemplateCategoryView(true);
    setIsDetailView(false);
    setIsTemplateDetailView(false);
    setCurrentDisplay(TEMPLATE_INITIAL_DISPLAY);
    setHistory([]);
  }, []);

  // 定型文カテゴリ選択
  const handleTemplateCategorySelect = useCallback((category: string) => {
    if (category === "自由入力") {
      setInputMode("free");
      setIsTemplateCategoryView(false);
      setIsTemplateDetailView(false);
      setIsDetailView(false);
      setCurrentDisplay(INITIAL_DISPLAY);
      setHistory([]);
    } else if (category && category.trim() !== "" && TEMPLATE_DETAILS[category]) {
      setIsTemplateCategoryView(false);
      setIsTemplateDetailView(true);
      setCurrentDisplay(TEMPLATE_DETAILS[category]);
    }
  }, []);

  // ダブルタップ判定
  const checkAndExecuteDoubleTap = useCallback(() => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastTapTime;
    const isDouble = timeDiff < 300;

    if (isDouble) {
      setDoubleTapExecuted(true);
      deleteLastCharacter();

      if (singleTapTimeoutId.current) {
        clearTimeout(singleTapTimeoutId.current);
        singleTapTimeoutId.current = null;
      }

      setTimeout(() => setDoubleTapExecuted(false), 50);
    }

    setLastTapTime(currentTime);
    return isDouble;
  }, [lastTapTime, deleteLastCharacter]);

  // シングルタップの遅延実行
  const executeSingleTap = useCallback(
    (callback: () => void) => {
      if (singleTapTimeoutId.current) {
        clearTimeout(singleTapTimeoutId.current);
      }

      singleTapTimeoutId.current = setTimeout(() => {
        if (!doubleTapExecuted) {
          callback();
        }
        singleTapTimeoutId.current = null;
      }, 320);
    },
    [doubleTapExecuted]
  );

  // タップ・フリックの共通処理
  const processGesture = useCallback(
    (endPos: TouchPosition) => {
      const direction = getFlickDirection(touchStartPos.current, endPos);
      const deltaX = endPos.x - touchStartPos.current.x;
      const deltaY = endPos.y - touchStartPos.current.y;
      const isTap = Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30;

      if (isTap) {
        if (!checkAndExecuteDoubleTap()) {
          if (isTemplateCategoryView) {
            executeSingleTap(() => handleTemplateCategorySelect(TEMPLATE_CATEGORIES[4]));
          } else if (isTemplateDetailView || isDetailView) {
            executeSingleTap(() => selectCharacter(currentDisplay[4]));
          } else {
            const selectedBaseChar = BASE_CHARACTERS[4];
            if (selectedBaseChar && HIRAGANA_ROWS[selectedBaseChar]) {
              executeSingleTap(() => {
                setHistory((prev) => [...prev, currentDisplay]);
                setCurrentDisplay(HIRAGANA_ROWS[selectedBaseChar]);
                setIsDetailView(true);
              });
            }
          }
        }
      } else {
        // フリック処理
        if (direction === 0 && (isDetailView || isTemplateDetailView)) {
          handleBack();
        } else if (direction === 2 && (isDetailView || isTemplateDetailView)) {
          deleteLastCharacter();
        } else if (direction === 6 && isDetailView && inputMode === "free") {
          handleTemplateButtonClick();
        } else if (direction === 8 && isTemplateCategoryView) {
          clearAllText();
        } else if (isTemplateCategoryView) {
          handleTemplateCategorySelect(TEMPLATE_CATEGORIES[direction]);
        } else if (isTemplateDetailView || isDetailView) {
          const selectedChar = currentDisplay[direction];
          if (selectedChar && selectedChar.trim() !== "") {
            selectCharacter(selectedChar);
          }
        } else {
          const selectedBaseChar = BASE_CHARACTERS[direction];
          if (selectedBaseChar && HIRAGANA_ROWS[selectedBaseChar]) {
            setHistory((prev) => [...prev, currentDisplay]);
            setCurrentDisplay(HIRAGANA_ROWS[selectedBaseChar]);
            setIsDetailView(true);
          }
        }
      }
    },
    [
      isDetailView,
      isTemplateCategoryView,
      isTemplateDetailView,
      inputMode,
      currentDisplay,
      handleBack,
      handleTemplateButtonClick,
      handleTemplateCategorySelect,
      selectCharacter,
      deleteLastCharacter,
      clearAllText,
      checkAndExecuteDoubleTap,
      executeSingleTap,
    ]
  );

  // タッチ開始
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (showTutorial) return;
      e.preventDefault();
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      setIsFlicking(true);
      setFlickDirection(4);
    },
    [showTutorial]
  );

  // タッチ移動
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!isFlicking) return;
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      setFlickDirection(getFlickDirection(touchStartPos.current, currentPos));
    },
    [isFlicking]
  );

  // タッチ終了
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!isFlicking) return;
      const touch = e.changedTouches[0];
      processGesture({ x: touch.clientX, y: touch.clientY });
      setIsFlicking(false);
      setFlickDirection(null);
    },
    [isFlicking, processGesture]
  );

  // マウス開始
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (showTutorial) return;
      touchStartPos.current = { x: e.clientX, y: e.clientY };
      setIsFlicking(true);
      setFlickDirection(4);
    },
    [showTutorial]
  );

  // マウス移動
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isFlicking) return;
      const currentPos = { x: e.clientX, y: e.clientY };
      setFlickDirection(getFlickDirection(touchStartPos.current, currentPos));
    },
    [isFlicking]
  );

  // マウス終了
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isFlicking) return;
      processGesture({ x: e.clientX, y: e.clientY });
      setIsFlicking(false);
      setFlickDirection(null);
    },
    [isFlicking, processGesture]
  );

  // チュートリアル非表示
  const handleDismissTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (singleTapTimeoutId.current) {
        clearTimeout(singleTapTimeoutId.current);
      }
    };
  }, []);

  return {
    state: {
      inputText,
      currentDisplay,
      isFlicking,
      flickDirection,
      isDetailView,
      isTemplateCategoryView,
      isTemplateDetailView,
      inputMode,
      showTutorial,
    },
    handlers: {
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleDismissTutorial,
      calculateFontSize,
      getDirectionArrow,
    },
    gridRef,
  };
};
