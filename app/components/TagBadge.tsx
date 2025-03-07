"use client";
import { useState } from 'react';
import styles from '../page.module.css';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  clickable?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

export default function TagBadge({ tag, onRemove, clickable = false, onClick, selected = false }: TagBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // タグの背景色と文字色を計算
  const getBadgeStyle = () => {
    // 選択状態の場合は濃い色にする
    const backgroundColor = selected
      ? tag.color
      : `${tag.color}80`; // 50%の透明度を追加

    // 背景色の明るさに基づいて文字色を決定（明るい背景には暗い文字、暗い背景には明るい文字）
    const isLight = isLightColor(tag.color);
    const textColor = isLight ? '#000000' : '#ffffff';

    return {
      backgroundColor,
      color: textColor,
      cursor: clickable ? 'pointer' : 'default',
      border: selected ? `2px solid ${tag.color}` : 'none'
    };
  };

  // 色の明るさを判定する関数
  const isLightColor = (color: string) => {
    // カラーコードからRGB値を取得
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // 明るさを計算（YIQ方式）
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128; // 128以上なら明るい色と判定
  };

  return (
    <div
      className={styles.tagBadge}
      style={getBadgeStyle()}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          className={styles.tagRemoveButton}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove tag ${tag.name}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
