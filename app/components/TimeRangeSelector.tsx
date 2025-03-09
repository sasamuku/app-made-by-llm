"use client";
import { useState } from 'react';
import styles from '../page.module.css';

type TimeRange = 'day' | 'week' | 'month' | 'year';

interface TimeRangeSelectorProps {
  onChange: (range: TimeRange) => void;
  defaultValue?: TimeRange;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  onChange,
  defaultValue = 'week'
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>(defaultValue);

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
    onChange(range);
  };

  return (
    <div className={styles.timeRangeSelector}>
      <div className={styles.timeRangeSelectorButtons}>
        <button
          type="button"
          className={`${styles.timeRangeButton} ${selectedRange === 'day' ? styles.activeTimeRange : ''}`}
          onClick={() => handleRangeChange('day')}
        >
          日次
        </button>
        <button
          type="button"
          className={`${styles.timeRangeButton} ${selectedRange === 'week' ? styles.activeTimeRange : ''}`}
          onClick={() => handleRangeChange('week')}
        >
          週次
        </button>
        <button
          type="button"
          className={`${styles.timeRangeButton} ${selectedRange === 'month' ? styles.activeTimeRange : ''}`}
          onClick={() => handleRangeChange('month')}
        >
          月次
        </button>
        <button
          type="button"
          className={`${styles.timeRangeButton} ${selectedRange === 'year' ? styles.activeTimeRange : ''}`}
          onClick={() => handleRangeChange('year')}
        >
          年次
        </button>
      </div>
    </div>
  );
};

export default TimeRangeSelector;
