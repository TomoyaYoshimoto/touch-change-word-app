import React, { useState, useCallback, useRef } from 'react';
import './FlickInput.css';

interface TouchPosition {
  x: number;
  y: number;
}


const FlickInput: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [currentDisplay, setCurrentDisplay] = useState<string[]>(['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら']);
  const [isFlicking, setIsFlicking] = useState(false);
  const [flickPosition, setFlickPosition] = useState<TouchPosition>({ x: 0, y: 0 });
  const [flickDirection, setFlickDirection] = useState<number | null>(null);
  const [history, setHistory] = useState<string[][]>([]);
  const [isDetailView, setIsDetailView] = useState(false);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const touchStartPos = useRef<TouchPosition>({ x: 0, y: 0 });

  // 基本の9文字
  const baseCharacters = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら'];

  // ひらがな行の定義（3x3グリッド用: [空, い, 空, え, あ, う, 空, お, 空]）
  const hiraganaRows = {
    'あ': ['', 'い', '', 'え', 'あ', 'う', '', 'お', ''],
    'か': ['', 'き', '', 'け', 'か', 'く', '', 'こ', ''],
    'さ': ['', 'し', '', 'せ', 'さ', 'す', '', 'そ', ''],
    'た': ['', 'ち', '', 'て', 'た', 'つ', '', 'と', ''],
    'な': ['', 'に', '', 'ね', 'な', 'ぬ', '', 'の', ''],
    'は': ['', 'ひ', '', 'へ', 'は', 'ふ', '', 'ほ', ''],
    'ま': ['', 'み', '', 'め', 'ま', 'む', '', 'も', ''],
    'や': ['', '', '', '', 'や', 'ゆ', '', 'よ', ''],
    'ら': ['', 'り', '', 'れ', 'ら', 'る', '', 'ろ', '']
  };

  // 矢印の定義
  const getDirectionArrow = (direction: number): string => {
    const arrows = ['↖', '↑', '↗', '←', '●', '→', '↙', '↓', '↘'];
    return arrows[direction] || '';
  };

  // フリック方向を判定
  const getFlickDirection = (startPos: TouchPosition, endPos: TouchPosition): number => {
    const deltaX = endPos.x - startPos.x;
    const deltaY = endPos.y - startPos.y;
    const threshold = 30; // フリック判定の最小距離

    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
      return 4; // 中央（タップ）
    }

    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    
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
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!isFlicking) return;
    
    const touch = e.touches[0];
    const currentPos = { x: touch.clientX, y: touch.clientY };
    setFlickPosition(currentPos);
    
    // リアルタイムで方向を判定
    const direction = getFlickDirection(touchStartPos.current, currentPos);
    setFlickDirection(direction);
  }, [isFlicking]);

  // 戻る機能
  const handleBack = useCallback(() => {
    if (history.length > 0) {
      const previousDisplay = history[history.length - 1];
      setCurrentDisplay(previousDisplay);
      setHistory(prev => prev.slice(0, -1));
      setIsDetailView(false);
    }
  }, [history]);

  // 文字選択機能
  const selectCharacter = useCallback((char: string) => {
    if (char && char.trim() !== '') {
      setInputText(prev => prev + char);
    }
  }, []);

  // 文字削除機能
  const deleteLastCharacter = useCallback(() => {
    setInputText(prev => prev.slice(0, -1));
  }, []);

  // ダブルタップ判定
  const isDoubleTap = useCallback(() => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastTapTime;
    setLastTapTime(currentTime);
    return timeDiff < 300; // 300ms以内のタップをダブルタップと判定
  }, [lastTapTime]);

  // タッチ終了
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
      // ダブルタップ判定
      if (isDoubleTap()) {
        deleteLastCharacter();
      } else if (isDetailView) {
        // 詳細表示でのタップ：中央の文字を選択
        const centerChar = currentDisplay[4];
        selectCharacter(centerChar);
      } else {
        // 基本表示でのタップ：中央の「な」を選択
        const selectedBaseChar = baseCharacters[4]; // 'な'
        if (selectedBaseChar && hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows]) {
          setHistory(prev => [...prev, currentDisplay]);
          const row = hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows];
          setCurrentDisplay(row);
          setIsDetailView(true);
        }
      }
    } else {
      // フリック処理
      if (direction === 0 && isDetailView) {
        // 戻る機能
        handleBack();
      } else if (direction === 2 && isDetailView) {
        // ゴミ箱機能（右斜め上）
        deleteLastCharacter();
      } else if (isDetailView) {
        // 詳細表示でのフリック：現在の表示から文字を選択
        const selectedChar = currentDisplay[direction];
        if (selectedChar && selectedChar.trim() !== '') {
          selectCharacter(selectedChar);
        }
      } else {
        // 基本表示でのフリック：行を切り替え
        const selectedBaseChar = baseCharacters[direction];
        
        if (selectedBaseChar && hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows]) {
          // 履歴を保存
          setHistory(prev => [...prev, currentDisplay]);
          
          const row = hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows];
          setCurrentDisplay(row);
          setIsDetailView(true);
        }
      }
    }

    setIsFlicking(false);
    setFlickDirection(null);
  }, [isFlicking, isDetailView, currentDisplay, handleBack, selectCharacter, deleteLastCharacter, isDoubleTap]);

  // マウスイベント（開発用）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    setFlickPosition({ x: e.clientX, y: e.clientY });
    setIsFlicking(true);
    setFlickDirection(4); // 初期状態で中央をハイライト
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isFlicking) return;
    const currentPos = { x: e.clientX, y: e.clientY };
    setFlickPosition(currentPos);
    
    // リアルタイムで方向を判定
    const direction = getFlickDirection(touchStartPos.current, currentPos);
    setFlickDirection(direction);
  }, [isFlicking]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isFlicking) return;

    const endPos = { x: e.clientX, y: e.clientY };
    const direction = getFlickDirection(touchStartPos.current, endPos);
    
    // タップ判定（フリックしていない場合）
    const deltaX = endPos.x - touchStartPos.current.x;
    const deltaY = endPos.y - touchStartPos.current.y;
    const isTab = Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30;
    
    if (isTab) {
      // ダブルタップ判定
      if (isDoubleTap()) {
        deleteLastCharacter();
      } else if (isDetailView) {
        // 詳細表示でのタップ：中央の文字を選択
        const centerChar = currentDisplay[4];
        selectCharacter(centerChar);
      } else {
        // 基本表示でのタップ：中央の「な」を選択
        const selectedBaseChar = baseCharacters[4]; // 'な'
        if (selectedBaseChar && hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows]) {
          setHistory(prev => [...prev, currentDisplay]);
          const row = hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows];
          setCurrentDisplay(row);
          setIsDetailView(true);
        }
      }
    } else {
      // フリック処理
      if (direction === 0 && isDetailView) {
        // 戻る機能
        handleBack();
      } else if (direction === 2 && isDetailView) {
        // ゴミ箱機能（右斜め上）
        deleteLastCharacter();
      } else if (isDetailView) {
        // 詳細表示でのフリック：現在の表示から文字を選択
        const selectedChar = currentDisplay[direction];
        if (selectedChar && selectedChar.trim() !== '') {
          selectCharacter(selectedChar);
        }
      } else {
        // 基本表示でのフリック：行を切り替え
        const selectedBaseChar = baseCharacters[direction];
        
        if (selectedBaseChar && hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows]) {
          // 履歴を保存
          setHistory(prev => [...prev, currentDisplay]);
          
          const row = hiraganaRows[selectedBaseChar as keyof typeof hiraganaRows];
          setCurrentDisplay(row);
          setIsDetailView(true);
        }
      }
    }

    setIsFlicking(false);
    setFlickDirection(null);
  }, [isFlicking, isDetailView, currentDisplay, handleBack, selectCharacter, deleteLastCharacter, isDoubleTap]);

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
        <span>{inputText || '入力した文字がここに表示されます'}</span>
      </div>
      
      <div className="flick-grid">
        <div className={`grid-cell ${isDetailView ? 'back-cell' : ''} ${isFlicking && flickDirection === 0 ? 'highlighted' : ''}`}>
          {isDetailView ? <span className="return-icon">↩︎</span> : (
            <span><span className="hiragana-main">{currentDisplay[0] || ''}</span><span className="gyou-suffix">行</span></span>
          )}
        </div>
        <div className={`grid-cell ${isFlicking && flickDirection === 1 ? 'highlighted' : ''}`}>
          {isDetailView ? <span className="hiragana-main">{currentDisplay[1] || ''}</span> : (
            <span><span className="hiragana-main">{currentDisplay[1] || ''}</span><span className="gyou-suffix">行</span></span>
          )}
        </div>
        <div className={`grid-cell ${isDetailView ? 'back-cell' : ''} ${isFlicking && flickDirection === 2 ? 'highlighted' : ''}`}>
          {isDetailView ? <span className="delete-icon">🗑️</span> : (
            <span><span className="hiragana-main">{currentDisplay[2] || ''}</span><span className="gyou-suffix">行</span></span>
          )}
        </div>
        <div className={`grid-cell ${isFlicking && flickDirection === 3 ? 'highlighted' : ''}`}>
          {isDetailView ? <span className="hiragana-main">{currentDisplay[3] || ''}</span> : (
            <span><span className="hiragana-main">{currentDisplay[3] || ''}</span><span className="gyou-suffix">行</span></span>
          )}
        </div>
        <div className={`grid-cell center ${isFlicking && flickDirection === 4 ? 'highlighted' : ''}`}>
          {isDetailView ? <span className="hiragana-main">{currentDisplay[4] || ''}</span> : (
            <span><span className="hiragana-main">{currentDisplay[4] || ''}</span><span className="gyou-suffix">行</span></span>
          )}
        </div>
        <div className={`grid-cell ${isFlicking && flickDirection === 5 ? 'highlighted' : ''}`}>
          {isDetailView ? <span className="hiragana-main">{currentDisplay[5] || ''}</span> : (
            <span><span className="hiragana-main">{currentDisplay[5] || ''}</span><span className="gyou-suffix">行</span></span>
          )}
        </div>
        <div className={`grid-cell ${isFlicking && flickDirection === 6 ? 'highlighted' : ''}`}>
          {isDetailView ? <span className="hiragana-main">{currentDisplay[6] || ''}</span> : (
            <span><span className="hiragana-main">{currentDisplay[6] || ''}</span><span className="gyou-suffix">行</span></span>
          )}
        </div>
        <div className={`grid-cell ${isFlicking && flickDirection === 7 ? 'highlighted' : ''}`}>
          {isDetailView ? <span className="hiragana-main">{currentDisplay[7] || ''}</span> : (
            <span><span className="hiragana-main">{currentDisplay[7] || ''}</span><span className="gyou-suffix">行</span></span>
          )}
        </div>
        <div className={`grid-cell ${isFlicking && flickDirection === 8 ? 'highlighted' : ''}`}>
          {isDetailView ? <span className="hiragana-main">{currentDisplay[8] || ''}</span> : (
            <span><span className="hiragana-main">{currentDisplay[8] || ''}</span><span className="gyou-suffix">行</span></span>
          )}
        </div>
      </div>

      {isFlicking && (
        <div 
          className="flick-indicator"
          style={{
            left: `${flickPosition.x}px`,
            top: `${flickPosition.y}px`
          }}
        >
          {flickDirection !== null && getDirectionArrow(flickDirection)}
        </div>
      )}
    </div>
  );
};

export default FlickInput;