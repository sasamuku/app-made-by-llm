"use client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions, ChartData } from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import styles from '../page.module.css';

// Chart.jsの必要なコンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// チャートタイプの定義
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

interface AnalyticsChartProps {
  type: ChartType;
  data: ChartData<any>;
  options?: ChartOptions<any>;
  height?: number;
  width?: number;
  title?: string;
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  type,
  data,
  options = {},
  height,
  width,
  title
}) => {
  // デフォルトのオプションをマージ
  const defaultOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title || '',
      },
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // チャートタイプに基づいてコンポーネントを選択
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <Bar data={data} options={mergedOptions} />;
      case 'line':
        return <Line data={data} options={mergedOptions} />;
      case 'pie':
        return <Pie data={data} options={mergedOptions} />;
      case 'doughnut':
        return <Doughnut data={data} options={mergedOptions} />;
      default:
        return <Bar data={data} options={mergedOptions} />;
    }
  };

  return (
    <div
      className={styles.analyticsChart}
      style={{
        height: height ? `${height}px` : '300px',
        width: width ? `${width}px` : '100%'
      }}
    >
      {renderChart()}
    </div>
  );
};

export default AnalyticsChart;
