import React, { useCallback, useEffect, useRef, useState } from "react";
import "./FlickInput.css";

interface TouchPosition {
  x: number;
  y: number;
}

const FlickInput: React.FC = () => {
  const [inputText, setInputText] = useState<string>("");
  const [currentDisplay, setCurrentDisplay] = useState<string[]>([
    "あ",
    "か",
    "さ",
    "た",
    "な",
    "は",
    "ま",
    "やわ",
    "ら",
  ]);
  const [isFlicking, setIsFlicking] = useState(false);
  const [flickPosition, setFlickPosition] = useState<TouchPosition>({
    x: 0,
    y: 0,
  });
  const [flickDirection, setFlickDirection] = useState<number | null>(null);
  const [history, setHistory] = useState<string[][]>([]);
  const [isDetailView, setIsDetailView] = useState(false);
  const [isTemplateCategoryView, setIsTemplateCategoryView] = useState(false);
  const [isTemplateDetailView, setIsTemplateDetailView] = useState(false);
  const [inputMode, setInputMode] = useState<"free" | "template">("free"); // 'free': 自由入力モード, 'template': 定型文モード
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [doubleTapExecuted, setDoubleTapExecuted] = useState<boolean>(false);
  const touchStartPos = useRef<TouchPosition>({ x: 0, y: 0 });
  const singleTapTimeoutId = useRef<number | null>(null);

  // 基本の9文字
  const baseCharacters = ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら"];

  // ひらがな行の定義（3x3グリッド用: 真ん中、左、上、右、下の順）
  // グリッド位置: [0:空, 1:上, 2:空, 3:左, 4:真ん中, 5:右, 6:空, 7:下, 8:空]
  const hiraganaRows = {
    あ: ["", "う", "", "い", "あ", "え", "", "お", ""],
    か: ["", "く", "", "き", "か", "け", "", "こ", ""],
    さ: ["", "す", "", "し", "さ", "せ", "", "そ", ""],
    た: ["", "つ", "", "ち", "た", "て", "", "と", ""],
    な: ["", "ぬ", "", "に", "な", "ね", "", "の", ""],
    は: ["", "ふ", "", "ひ", "は", "へ", "", "ほ", ""],
    ま: ["", "む", "", "み", "ま", "め", "", "も", ""],
    や: ["", "よ", "", "ゆ", "や", "わ", "", "ん", "を"],
    ら: ["", "る", "", "り", "ら", "れ", "", "ろ", ""],
  };

  // 定型文カテゴリの定義
  const templateCategories = [
    "お礼",
    "清潔",
    "飲食",
    "痛み",
    "緊急",
    "依頼",
    "自由入力",
    "",
    "",
  ];

  // 定型文詳細の定義
  const templateDetails = {
    お礼: ["", "助かる", "ありがとう", "嬉しい", "", "", "", "", ""],
    清潔: ["", "掃除", "", "", "", "", "", "", ""], // 仮の内容
    飲食: ["", "水が欲しい", "", "お腹空いた", "", "", "", "", ""],
    痛み: ["", "頭", "腹", "手", "足", "背中", "", "", ""],
    緊急: ["", "痰が苦しい", "呼吸が苦しい", "", "", "", "", "", ""],
    依頼: [
      "",
      "痰をとって欲しい",
      "向きを変えて欲しい",
      "掻いて欲しい",
      "",
      "",
      "",
      "",
      "",
    ],
  };

  // 定型文ボタンの処理（モード切り替え）
  const handleTemplateButtonClick = useCallback(() => {
    setInputMode("template");
    setIsTemplateCategoryView(true);
    setIsDetailView(false);
    setIsTemplateDetailView(false);
    setCurrentDisplay(templateInitialDisplay);
    setHistory([]);
  }, []);

  // 定型文カテゴリ選択の処理
  const handleTemplateCategorySelect = useCallback((category: string) => {
    if (category === "自由入力") {
      // 自由入力モードに切り替え
      setInputMode("free");
      setIsTemplateCategoryView(false);
      setIsTemplateDetailView(false);
      setIsDetailView(false);
      setCurrentDisplay(initialDisplay);
      setHistory([]);
    } else if (
      category &&
      category.trim() !== "" &&
      templateDetails[category as keyof typeof templateDetails]
    ) {
      setIsTemplateCategoryView(false);
      setIsTemplateDetailView(true);
      setCurrentDisplay(
        templateDetails[category as keyof typeof templateDetails]
      );
    }
  }, []);

  // 戻る処理（モード対応）
  const handleBack = useCallback(() => {
    if (isTemplateDetailView) {
      // 定型文詳細から定型文カテゴリ（初期表示）へ戻る
      setIsTemplateDetailView(false);
      setIsTemplateCategoryView(true);
      setCurrentDisplay(templateInitialDisplay);
    } else if (isTemplateCategoryView) {
      // 定型文モードでは戻る先がないため何もしない（定型文カテゴリが初期表示のため）
      return;
    } else if (history.length > 0) {
      // 自由入力モードでの通常の戻る処理
      const previousDisplay = history[history.length - 1];
      setCurrentDisplay(previousDisplay);
      setHistory((prev) => prev.slice(0, -1));
      setIsDetailView(false);
    }
  }, [isTemplateDetailView, isTemplateCategoryView, history]);

  // 矢印の定義
  const getDirectionArrow = (direction: number): string => {
    const arrows = ["↖", "↑", "↗", "←", "●", "→", "↙", "↓", "↘"];
    return arrows[direction] || "";
  };

  // フリック方向を判定
  const getFlickDirection = (
    startPos: TouchPosition,
    endPos: TouchPosition
  ): number => {
    const deltaX = endPos.x - startPos.x;
    const deltaY = endPos.y - startPos.y;
    const threshold = 30; // フリック判定の最小距離

    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
      return 4; // 中央（タップ）
    }

    const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

    // 9方向の判定（3x3グリッドに対応）
    // 1 2 3
    // 4 5 6
    // 7 8 9
    if (angle >= -22.5 && angle < 22.5) return 5; // 右 (6)
    if (angle >= 22.5 && angle < 67.5) return 8; // 右下 (9)
    if (angle >= 67.5 && angle < 112.5) return 7; // 下 (8)
    if (angle >= 112.5 && angle < 157.5) return 6; // 左下 (7)
    if (angle >= 157.5 || angle < -157.5) return 3; // 左 (4)
    if (angle >= -157.5 && angle < -112.5) return 0; // 左上 (1)
    if (angle >= -112.5 && angle < -67.5) return 1; // 上 (2)
    if (angle >= -67.5 && angle < -22.5) return 2; // 右上 (3)

    return 4; // デフォルト（中央）
  };

  // タッチ開始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setFlickPosition({ x: touch.clientX, y: touch.clientY });
    setIsFlicking(true);
    setFlickDirection(4); // 初期状態で中央をハイライト
  }, []);

  // タッチ移動
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!isFlicking) return;

      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      setFlickPosition(currentPos);

      // リアルタイムで方向を判定
      const direction = getFlickDirection(touchStartPos.current, currentPos);
      setFlickDirection(direction);
    },
    [isFlicking]
  );

  // 初期表示データ
  const initialDisplay = [
    "あ",
    "か",
    "さ",
    "た",
    "な",
    "は",
    "ま",
    "やわ",
    "ら",
  ];
  const templateInitialDisplay = [
    "お礼",
    "清潔",
    "飲食",
    "痛み",
    "緊急",
    "依頼",
    "自由入力",
    "",
    "",
  ];

  // 文字選択機能
  const selectCharacter = useCallback(
    (char: string) => {
      if (char && char.trim() !== "") {
        setInputText((prev) => prev + char);
        // 文字選択後、現在のモードの初期表示画面に戻る
        if (inputMode === "template") {
          setCurrentDisplay(templateInitialDisplay);
          setIsTemplateCategoryView(true);
          setIsTemplateDetailView(false);
        } else {
          setCurrentDisplay(initialDisplay);
          setIsTemplateCategoryView(false);
          setIsTemplateDetailView(false);
        }
        setHistory([]);
        setIsDetailView(false);
      }
    },
    [inputMode]
  );

  // 文字削除機能
  const deleteLastCharacter = useCallback(() => {
    setInputText((prev) => prev.slice(0, -1));
  }, []);

  // 入力内容一括削除機能
  const clearAllText = useCallback(() => {
    setInputText("");
  }, []);

  // ダブルタップ判定と実行
  const checkAndExecuteDoubleTap = useCallback(() => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastTapTime;
    const isDouble = timeDiff < 300; // 300ms以内のタップをダブルタップと判定

    if (isDouble) {
      // ダブルタップ実行
      setDoubleTapExecuted(true);
      deleteLastCharacter();

      // 保留中のワンタップ処理をキャンセル
      if (singleTapTimeoutId.current) {
        clearTimeout(singleTapTimeoutId.current);
        singleTapTimeoutId.current = null;
      }

      // フラグをリセット（次のタップのために）
      setTimeout(() => setDoubleTapExecuted(false), 50);
    }

    setLastTapTime(currentTime);
    return isDouble;
  }, [lastTapTime, deleteLastCharacter]);

  // ワンタップの遅延実行
  const executeSingleTap = useCallback(
    (callback: () => void) => {
      // 既存のタイマーをクリア
      if (singleTapTimeoutId.current) {
        clearTimeout(singleTapTimeoutId.current);
      }

      // ワンタップ処理を遅延実行
      singleTapTimeoutId.current = setTimeout(() => {
        // ダブルタップが実行されていない場合のみワンタップを実行
        if (!doubleTapExecuted) {
          callback();
        }
        singleTapTimeoutId.current = null;
      }, 320); // ダブルタップ判定時間より少し長く
    },
    [doubleTapExecuted]
  );

  // タッチ終了
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!isFlicking) return;

      const touch = e.changedTouches[0];
      const endPos = { x: touch.clientX, y: touch.clientY };
      const direction = getFlickDirection(touchStartPos.current, endPos);

      // タップ判定（フリックしていない場合）
      const deltaX = endPos.x - touchStartPos.current.x;
      const deltaY = endPos.y - touchStartPos.current.y;
      const isTab = Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30;

      if (isTab) {
        // ダブルタップ判定と実行
        if (checkAndExecuteDoubleTap()) {
          // ダブルタップが実行された場合、何もしない（既にdeleteLastCharacterが実行済み）
        } else {
          // ワンタップ：遅延実行でダブルタップでないことを確認してから実行
          if (isTemplateCategoryView) {
            // 定型文カテゴリでのワンタップ：中央のカテゴリを選択
            const centerCategory = templateCategories[4];
            executeSingleTap(() =>
              handleTemplateCategorySelect(centerCategory)
            );
          } else if (isTemplateDetailView) {
            // 定型文詳細でのワンタップ：中央の文字を選択
            const centerChar = currentDisplay[4];
            executeSingleTap(() => selectCharacter(centerChar));
          } else if (isDetailView) {
            // 詳細表示でのワンタップ：中央の文字を選択
            const centerChar = currentDisplay[4];
            executeSingleTap(() => selectCharacter(centerChar));
          } else {
            // 基本表示でのワンタップ：中央の行を選択
            const selectedBaseChar = baseCharacters[4]; // 'な'
            if (
              selectedBaseChar &&
              hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows]
            ) {
              executeSingleTap(() => {
                setHistory((prev) => [...prev, currentDisplay]);
                const row =
                  hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows];
                setCurrentDisplay(row);
                setIsDetailView(true);
              });
            }
          }
        }
      } else {
        // フリック処理
        if (
          direction === 0 &&
          (isDetailView || isTemplateDetailView)
        ) {
          // 戻る機能
          handleBack();
        } else if (direction === 2 && (isDetailView || isTemplateDetailView)) {
          // ゴミ箱機能（右斜め上）
          deleteLastCharacter();
        } else if (direction === 6 && isDetailView && inputMode === "free") {
          // 定型文ボタン（左下）- 自由入力モードでのみ表示
          handleTemplateButtonClick();
        } else if (direction === 8 && isTemplateCategoryView) {
          // 入力内容一括削除（右斜め下）- 定型文モードの初期表示でのみ
          clearAllText();
        } else if (isTemplateCategoryView) {
          // 定型文カテゴリ選択
          const selectedCategory = templateCategories[direction];
          handleTemplateCategorySelect(selectedCategory);
        } else if (isTemplateDetailView) {
          // 定型文詳細から文字選択
          const selectedChar = currentDisplay[direction];
          if (selectedChar && selectedChar.trim() !== "") {
            selectCharacter(selectedChar);
          }
        } else if (isDetailView) {
          // 詳細表示でのフリック：現在の表示から文字を選択
          const selectedChar = currentDisplay[direction];
          if (selectedChar && selectedChar.trim() !== "") {
            selectCharacter(selectedChar);
          }
        } else {
          // 基本表示でのフリック：行を切り替え
          const selectedBaseChar = baseCharacters[direction];

          if (
            selectedBaseChar &&
            hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows]
          ) {
            // 履歴を保存
            setHistory((prev) => [...prev, currentDisplay]);

            const row =
              hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows];
            setCurrentDisplay(row);
            setIsDetailView(true);
          }
        }
      }

      setIsFlicking(false);
      setFlickDirection(null);
    },
    [
      isFlicking,
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
      baseCharacters,
      hiraganaRows,
      templateCategories,
    ]
  );

  // マウスイベント（開発用）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    setFlickPosition({ x: e.clientX, y: e.clientY });
    setIsFlicking(true);
    setFlickDirection(4); // 初期状態で中央をハイライト
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isFlicking) return;
      const currentPos = { x: e.clientX, y: e.clientY };
      setFlickPosition(currentPos);

      // リアルタイムで方向を判定
      const direction = getFlickDirection(touchStartPos.current, currentPos);
      setFlickDirection(direction);
    },
    [isFlicking]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isFlicking) return;

      const endPos = { x: e.clientX, y: e.clientY };
      const direction = getFlickDirection(touchStartPos.current, endPos);

      // タップ判定（フリックしていない場合）
      const deltaX = endPos.x - touchStartPos.current.x;
      const deltaY = endPos.y - touchStartPos.current.y;
      const isTab = Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30;

      if (isTab) {
        // ダブルタップ判定と実行
        if (checkAndExecuteDoubleTap()) {
          // ダブルタップが実行された場合、何もしない（既にdeleteLastCharacterが実行済み）
        } else {
          // ワンタップ：遅延実行でダブルタップでないことを確認してから実行
          if (isTemplateCategoryView) {
            // 定型文カテゴリでのワンタップ：中央のカテゴリを選択
            const centerCategory = templateCategories[4];
            executeSingleTap(() =>
              handleTemplateCategorySelect(centerCategory)
            );
          } else if (isTemplateDetailView) {
            // 定型文詳細でのワンタップ：中央の文字を選択
            const centerChar = currentDisplay[4];
            executeSingleTap(() => selectCharacter(centerChar));
          } else if (isDetailView) {
            // 詳細表示でのワンタップ：中央の文字を選択
            const centerChar = currentDisplay[4];
            executeSingleTap(() => selectCharacter(centerChar));
          } else {
            // 基本表示でのワンタップ：中央の行を選択
            const selectedBaseChar = baseCharacters[4]; // 'な'
            if (
              selectedBaseChar &&
              hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows]
            ) {
              executeSingleTap(() => {
                setHistory((prev) => [...prev, currentDisplay]);
                const row =
                  hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows];
                setCurrentDisplay(row);
                setIsDetailView(true);
              });
            }
          }
        }
      } else {
        // フリック処理
        if (
          direction === 0 &&
          (isDetailView || isTemplateDetailView)
        ) {
          // 戻る機能
          handleBack();
        } else if (direction === 2 && (isDetailView || isTemplateDetailView)) {
          // ゴミ箱機能（右斜め上）
          deleteLastCharacter();
        } else if (direction === 6 && isDetailView && inputMode === "free") {
          // 定型文ボタン（左下）- 自由入力モードでのみ表示
          handleTemplateButtonClick();
        } else if (direction === 8 && isTemplateCategoryView) {
          // 入力内容一括削除（右斜め下）- 定型文モードの初期表示でのみ
          clearAllText();
        } else if (isTemplateCategoryView) {
          // 定型文カテゴリ選択
          const selectedCategory = templateCategories[direction];
          handleTemplateCategorySelect(selectedCategory);
        } else if (isTemplateDetailView) {
          // 定型文詳細から文字選択
          const selectedChar = currentDisplay[direction];
          if (selectedChar && selectedChar.trim() !== "") {
            selectCharacter(selectedChar);
          }
        } else if (isDetailView) {
          // 詳細表示でのフリック：現在の表示から文字を選択
          const selectedChar = currentDisplay[direction];
          if (selectedChar && selectedChar.trim() !== "") {
            selectCharacter(selectedChar);
          }
        } else {
          // 基本表示でのフリック：行を切り替え
          const selectedBaseChar = baseCharacters[direction];

          if (
            selectedBaseChar &&
            hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows]
          ) {
            // 履歴を保存
            setHistory((prev) => [...prev, currentDisplay]);

            const row =
              hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows];
            setCurrentDisplay(row);
            setIsDetailView(true);
          }
        }
      }

      setIsFlicking(false);
      setFlickDirection(null);
    },
    [
      isFlicking,
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
      baseCharacters,
      hiraganaRows,
      templateCategories,
    ]
  );

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

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (singleTapTimeoutId.current) {
        clearTimeout(singleTapTimeoutId.current);
      }
    };
  }, []);

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
      <div className="input-text-display">
        <span
          className={inputText ? "" : "placeholder-text"}
          style={{
            fontSize: calculateFontSize(
              inputText || "入力した文字がここに表示されます"
            ),
          }}
        >
          {inputText || "入力した文字がここに表示されます"}
        </span>
      </div>

      <div className="mode-indicator">
        <span
          className={`mode-text ${
            inputMode === "template" ? "template-mode" : "free-mode"
          }`}
        >
          {inputMode === "template" ? "定型文モード" : "自由入力モード"}
        </span>
      </div>

      <div className="flick-grid">
        <div
          className={`grid-cell ${
            isDetailView || isTemplateDetailView ? "back-cell" : ""
          } ${isFlicking && flickDirection === 0 ? "highlighted" : ""}`}
        >
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
        <div
          className={`grid-cell ${
            isFlicking && flickDirection === 1 ? "highlighted" : ""
          }`}
        >
          {isDetailView || isTemplateCategoryView || isTemplateDetailView ? (
            <span className="hiragana-main">{currentDisplay[1] || ""}</span>
          ) : (
            <span>
              <span className="hiragana-main">{currentDisplay[1] || ""}</span>
              <span className="gyou-suffix">行</span>
            </span>
          )}
        </div>
        <div
          className={`grid-cell ${
            isDetailView || isTemplateDetailView ? "back-cell" : ""
          } ${isFlicking && flickDirection === 2 ? "highlighted" : ""}`}
        >
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
        <div
          className={`grid-cell ${
            isFlicking && flickDirection === 3 ? "highlighted" : ""
          }`}
        >
          {isDetailView || isTemplateCategoryView || isTemplateDetailView ? (
            <span className="hiragana-main">{currentDisplay[3] || ""}</span>
          ) : (
            <span>
              <span className="hiragana-main">{currentDisplay[3] || ""}</span>
              <span className="gyou-suffix">行</span>
            </span>
          )}
        </div>
        <div
          className={`grid-cell center ${
            isFlicking && flickDirection === 4 ? "highlighted" : ""
          }`}
        >
          {isDetailView || isTemplateCategoryView || isTemplateDetailView ? (
            <span className="hiragana-main">{currentDisplay[4] || ""}</span>
          ) : (
            <span>
              <span className="hiragana-main">{currentDisplay[4] || ""}</span>
              <span className="gyou-suffix">行</span>
            </span>
          )}
        </div>
        <div
          className={`grid-cell ${
            isFlicking && flickDirection === 5 ? "highlighted" : ""
          }`}
        >
          {isDetailView || isTemplateCategoryView || isTemplateDetailView ? (
            <span className="hiragana-main">{currentDisplay[5] || ""}</span>
          ) : (
            <span>
              <span className="hiragana-main">{currentDisplay[5] || ""}</span>
              <span className="gyou-suffix">行</span>
            </span>
          )}
        </div>
        <div
          className={`grid-cell ${
            (isDetailView && inputMode === "free") ||
            (isTemplateCategoryView && currentDisplay[6] === "自由入力")
              ? "template-cell"
              : ""
          } ${isFlicking && flickDirection === 6 ? "highlighted" : ""}`}
        >
          {isDetailView && inputMode === "free" ? (
            <span className="template-text">定型文</span>
          ) : isTemplateCategoryView && currentDisplay[6] === "自由入力" ? (
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
        <div
          className={`grid-cell ${
            isFlicking && flickDirection === 7 ? "highlighted" : ""
          }`}
        >
          {isDetailView || isTemplateCategoryView || isTemplateDetailView ? (
            <span className="hiragana-main">{currentDisplay[7] || ""}</span>
          ) : (
            <span>
              <span className="hiragana-main">{currentDisplay[7] || ""}</span>
              <span className="gyou-suffix">行</span>
            </span>
          )}
        </div>
        <div
          className={`grid-cell ${
            isTemplateCategoryView ? "clear-all-cell" : ""
          } ${isFlicking && flickDirection === 8 ? "highlighted" : ""}`}
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
      </div>

      {isFlicking && (
        <div
          className="flick-indicator"
          style={{
            left: `${flickPosition.x}px`,
            top: `${flickPosition.y}px`,
          }}
        >
          {flickDirection !== null && getDirectionArrow(flickDirection)}
        </div>
      )}
    </div>
  );
};

export default FlickInput;
