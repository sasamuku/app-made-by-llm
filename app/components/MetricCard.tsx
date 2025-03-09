"use client";
import React from 'react';
import styles from '../page.module.css';

interface MetricCardProps {
  title: string;
  value: number | string;
  changeValue?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  changeValue,
  changeLabel,
  icon,
  color = 'primary'
}) => {
  // 変化率の表示用クラスを決定
  const getChangeClass = () => {
    if (!changeValue) return '';
    return changeValue > 0 ? styles.positive : changeValue < 0 ? styles.negative : '';
  };

  // 変化率の表示用文字列を生成
  const getChangeText = () => {
    if (changeValue === undefined) return '';
    const prefix = changeValue > 0 ? '+' : '';
    return `${prefix}${changeValue}% ${changeLabel || ''}`;
  };

  return (
    <div className={`${styles.metricCard} ${styles[`metricCard${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}>
      <div className={styles.metricCardHeader}>
        <h3 className={styles.metricCardTitle}>{title}</h3>
        {icon && <div className={styles.metricCardIcon}>{icon}</div>}
      </div>
      <div className={styles.metricCardBody}>
        <div className={styles.metricCardValue}>{value}</div>
        {changeValue !== undefined && (
          <div className={`${styles.metricCardChange} ${getChangeClass()}`}>
            {getChangeText()}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
