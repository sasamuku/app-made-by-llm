"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import TimeRangeSelector from './TimeRangeSelector';
import AnalyticsChart from './AnalyticsChart';
import styles from '../page.module.css';

// タイムレンジの型定義
type TimeRange = 'day' | 'week' | 'month' | 'year';
type GroupBy = 'hour' | 'day' | 'week' | 'month';

// 生産性データの型定義
interface ProductivityData {
  productivityByTime: Array<{
    timeSlot: string;
    taskCount: number;
    completionRate: number;
  }>;
  productivityByDay: Array<{
    day: string;
    taskCount: number;
    completionRate: number;
  }>;
  completionTrend: Array<{
    date: string;
    completedTasks: number;
    createdTasks: number;
  }>;
  averageCompletionTime: number;
  tagEfficiency: Array<{
    tagId: number;
    tagName: string;
    tagColor: string;
    completionRate: number;
    averageCompletionTime: number;
  }>;
  projectEfficiency: Array<{
    projectId: number;
    projectName: string;
    completionRate: number;
    averageCompletionTime: number;
  }>;
}

const ProductivityAnalysis: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [productivityData, setProductivityData] = useState<ProductivityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 生産性データを取得する関数
  const fetchProductivityData = useCallback(async (range: TimeRange, group: GroupBy) => {
    try {
      setLoading(true);
      setError(null);

      // ユーザーのセッションを取得
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('認証されていません。再ログインしてください。');
        setLoading(false);
        return;
      }

      // APIからデータを取得
      const response = await fetch(`/api/analytics/productivity?timeRange=${range}&groupBy=${group}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }

      const data = await response.json();
      setProductivityData(data);
    } catch (err) {
      console.error('生産性データの取得に失敗しました:', err);
      setError('データの取得に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }, []);

  // タイムレンジまたはグループが変更されたときにデータを再取得
  useEffect(() => {
    fetchProductivityData(timeRange, groupBy);
  }, [timeRange, groupBy, fetchProductivityData]);

  // タイムレンジの変更ハンドラー
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  // グループの変更ハンドラー
  const handleGroupByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setGroupBy(event.target.value as GroupBy);
  };

  // 時間帯別生産性のチャートデータを生成
  const getProductivityByTimeChartData = () => {
    if (!productivityData || !productivityData.productivityByTime.length) return null;

    return {
      labels: productivityData.productivityByTime.map(item => item.timeSlot),
      datasets: [
        {
          label: 'タスク数',
          data: productivityData.productivityByTime.map(item => item.taskCount),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: '完了率 (%)',
          data: productivityData.productivityByTime.map(item => item.completionRate * 100),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
        }
      ],
    };
  };

  // 曜日別生産性のチャートデータを生成
  const getProductivityByDayChartData = () => {
    if (!productivityData || !productivityData.productivityByDay.length) return null;

    return {
      labels: productivityData.productivityByDay.map(item => item.day),
      datasets: [
        {
          label: 'タスク数',
          data: productivityData.productivityByDay.map(item => item.taskCount),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: '完了率 (%)',
          data: productivityData.productivityByDay.map(item => item.completionRate * 100),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
        }
      ],
    };
  };

  // 完了トレンドのチャートデータを生成
  const getCompletionTrendChartData = () => {
    if (!productivityData || !productivityData.completionTrend.length) return null;

    return {
      labels: productivityData.completionTrend.map(item => item.date),
      datasets: [
        {
          label: '完了タスク',
          data: productivityData.completionTrend.map(item => item.completedTasks),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          fill: false,
        },
        {
          label: '作成タスク',
          data: productivityData.completionTrend.map(item => item.createdTasks),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          fill: false,
        }
      ],
    };
  };

  // タグ効率のチャートデータを生成
  const getTagEfficiencyChartData = () => {
    if (!productivityData || !productivityData.tagEfficiency.length) return null;

    return {
      labels: productivityData.tagEfficiency.map(item => item.tagName),
      datasets: [
        {
          label: '完了率 (%)',
          data: productivityData.tagEfficiency.map(item => item.completionRate * 100),
          backgroundColor: productivityData.tagEfficiency.map(item => `${item.tagColor}80`),
          borderColor: productivityData.tagEfficiency.map(item => item.tagColor),
          borderWidth: 1,
        }
      ],
    };
  };

  // プロジェクト効率のチャートデータを生成
  const getProjectEfficiencyChartData = () => {
    if (!productivityData || !productivityData.projectEfficiency.length) return null;

    return {
      labels: productivityData.projectEfficiency.map(item => item.projectName),
      datasets: [
        {
          label: '完了率 (%)',
          data: productivityData.projectEfficiency.map(item => item.completionRate * 100),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: '平均完了時間 (時間)',
          data: productivityData.projectEfficiency.map(item => item.averageCompletionTime),
          backgroundColor: 'rgba(255, 159, 64, 0.6)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
        }
      ],
    };
  };

  // ローディング表示
  if (loading) {
    return (
      <div className={styles.analyticsLoading}>
        <p>データを読み込んでいます...</p>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className={styles.analyticsError}>
        <p>{error}</p>
        <button type="button" onClick={() => fetchProductivityData(timeRange, groupBy)}>再試行</button>
      </div>
    );
  }

  // データがない場合
  if (!productivityData) {
    return (
      <div className={styles.analyticsEmpty}>
        <p>データがありません。タスクを作成して活動を開始してください。</p>
      </div>
    );
  }

  // 各チャートデータを取得
  const productivityByTimeChartData = getProductivityByTimeChartData();
  const productivityByDayChartData = getProductivityByDayChartData();
  const completionTrendChartData = getCompletionTrendChartData();
  const tagEfficiencyChartData = getTagEfficiencyChartData();
  const projectEfficiencyChartData = getProjectEfficiencyChartData();

  return (
    <div className={styles.productivityAnalysis}>
      <div className={styles.analyticsDashboardHeader}>
        <h2>生産性分析</h2>
        <div className={styles.analyticsControls}>
          <TimeRangeSelector onChange={handleTimeRangeChange} defaultValue={timeRange} />
          <div className={styles.groupBySelector}>
            <label htmlFor="groupBy">グループ化:</label>
            <select
              id="groupBy"
              value={groupBy}
              onChange={handleGroupByChange}
              className={styles.groupBySelect}
            >
              <option value="hour">時間別</option>
              <option value="day">日別</option>
              <option value="week">週別</option>
              <option value="month">月別</option>
            </select>
          </div>
        </div>
      </div>

      {/* 平均完了時間 */}
      <div className={styles.averageCompletionTimeCard}>
        <h3>平均タスク完了時間</h3>
        <div className={styles.averageCompletionTimeValue}>
          {productivityData.averageCompletionTime.toFixed(1)} 時間
        </div>
      </div>

      {/* チャートセクション */}
      <div className={styles.analyticsChartsContainer}>
        {/* 時間帯別生産性 */}
        {productivityByTimeChartData && (
          <div className={styles.analyticsChartCard}>
            <h3>時間帯別生産性</h3>
            <AnalyticsChart
              type="bar"
              data={productivityByTimeChartData}
              height={250}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'タスク数'
                    }
                  },
                  y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: '完了率 (%)'
                    },
                    max: 100
                  }
                }
              }}
            />
          </div>
        )}

        {/* 曜日別生産性 */}
        {productivityByDayChartData && (
          <div className={styles.analyticsChartCard}>
            <h3>曜日別生産性</h3>
            <AnalyticsChart
              type="bar"
              data={productivityByDayChartData}
              height={250}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'タスク数'
                    }
                  },
                  y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: '完了率 (%)'
                    },
                    max: 100
                  }
                }
              }}
            />
          </div>
        )}

        {/* 完了トレンド */}
        {completionTrendChartData && (
          <div className={styles.analyticsChartCard}>
            <h3>タスク完了トレンド</h3>
            <AnalyticsChart
              type="line"
              data={completionTrendChartData}
              height={250}
            />
          </div>
        )}

        {/* タグ効率 */}
        {tagEfficiencyChartData && (
          <div className={styles.analyticsChartCard}>
            <h3>タグ別効率</h3>
            <AnalyticsChart
              type="bar"
              data={tagEfficiencyChartData}
              height={250}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                      display: true,
                      text: '完了率 (%)'
                    }
                  }
                }
              }}
            />
          </div>
        )}

        {/* プロジェクト効率 */}
        {projectEfficiencyChartData && (
          <div className={styles.analyticsChartCard}>
            <h3>プロジェクト別効率</h3>
            <AnalyticsChart
              type="bar"
              data={projectEfficiencyChartData}
              height={250}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: '完了率 (%)'
                    },
                    max: 100
                  },
                  y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: '平均完了時間 (時間)'
                    }
                  }
                }
              }}
            />
          </div>
        )}
      </div>

      {/* 生産性向上のヒント */}
      <div className={styles.productivityTipsContainer}>
        <h3>生産性向上のヒント</h3>
        <ul className={styles.productivityTipsList}>
          <li>
            <strong>最適な作業時間帯:</strong> データによると、
            {productivityData.productivityByTime.length > 0 && (() => {
              // 完了率が最も高い時間帯を見つける
              const bestTimeSlot = [...productivityData.productivityByTime]
                .sort((a, b) => b.completionRate - a.completionRate)[0];
              return <span>{bestTimeSlot.timeSlot}の時間帯</span>;
            })()}
            にタスクの完了率が最も高くなっています。重要なタスクをこの時間帯に計画してみてください。
          </li>
          <li>
            <strong>効率的なタグ:</strong>
            {productivityData.tagEfficiency.length > 0 && (() => {
              // 完了率が最も高いタグを見つける
              const bestTag = [...productivityData.tagEfficiency]
                .sort((a, b) => b.completionRate - a.completionRate)[0];
              return <span>「{bestTag.tagName}」タグ</span>;
            })()}
            のタスクの完了率が最も高くなっています。このカテゴリのタスクに集中すると生産性が向上する可能性があります。
          </li>
          <li>
            <strong>バランスの取れたワークロード:</strong> 作成タスクと完了タスクの比率を確認し、未完了のタスクが蓄積しないようにしましょう。
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ProductivityAnalysis;
