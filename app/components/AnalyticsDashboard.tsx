"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import TimeRangeSelector from './TimeRangeSelector';
import MetricCard from './MetricCard';
import AnalyticsChart from './AnalyticsChart';
import ProductivityAnalysis from './ProductivityAnalysis';
import TaskPrediction from './TaskPrediction';
import AnalyticsReports from './AnalyticsReports';
import styles from '../page.module.css';

// タイムレンジと分析画面の型定義
type TimeRange = 'day' | 'week' | 'month' | 'year';
type AnalyticsView = 'dashboard' | 'productivity' | 'prediction' | 'reports';

// ダッシュボードデータの型定義
interface DashboardData {
  taskSummary: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
  };
  completionRate: number;
  tasksByProject: Array<{
    projectId: number;
    projectName: string;
    taskCount: number;
    completedCount: number;
  }>;
  tasksByTag: Array<{
    tagId: number;
    tagName: string;
    tagColor: string;
    taskCount: number;
    completedCount: number;
  }>;
  recentActivities: Array<{
    id: number;
    taskId: number;
    taskTitle?: string;
    action: string;
    timestamp: string;
  }>;
}

const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AnalyticsView>('dashboard');

  // ダッシュボードデータを取得する関数（useCallbackでメモ化）
  const fetchDashboardData = useCallback(async (range: TimeRange) => {
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
      const response = await fetch(`/api/analytics/dashboard?timeRange=${range}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('ダッシュボードデータの取得に失敗しました:', err);
      setError('データの取得に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }, []);

  // タイムレンジが変更されたときにデータを再取得
  useEffect(() => {
    fetchDashboardData(timeRange);
  }, [timeRange, fetchDashboardData]);

  // タイムレンジの変更ハンドラー
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  // タスク完了率のチャートデータを生成
  const getCompletionRateChartData = () => {
    if (!dashboardData) return null;

    return {
      labels: ['完了', '進行中', '未着手'],
      datasets: [
        {
          label: 'タスク数',
          data: [
            dashboardData.taskSummary.completed,
            dashboardData.taskSummary.inProgress,
            dashboardData.taskSummary.todo
          ],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)'
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // プロジェクト別タスク分布のチャートデータを生成
  const getProjectChartData = () => {
    if (!dashboardData || !dashboardData.tasksByProject.length) return null;

    return {
      labels: dashboardData.tasksByProject.map(p => p.projectName),
      datasets: [
        {
          label: '完了タスク',
          data: dashboardData.tasksByProject.map(p => p.completedCount),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: '全タスク',
          data: dashboardData.tasksByProject.map(p => p.taskCount),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // タグ別タスク分布のチャートデータを生成
  const getTagChartData = () => {
    if (!dashboardData || !dashboardData.tasksByTag.length) return null;

    return {
      labels: dashboardData.tasksByTag.map(t => t.tagName),
      datasets: [
        {
          label: 'タスク数',
          data: dashboardData.tasksByTag.map(t => t.taskCount),
          backgroundColor: dashboardData.tasksByTag.map(t => `${t.tagColor}80`), // 透明度を追加
          borderColor: dashboardData.tasksByTag.map(t => t.tagColor),
          borderWidth: 1,
        },
      ],
    };
  };

  // アクションの日本語表示を取得
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return '作成';
      case 'updated':
        return '更新';
      case 'status_changed':
        return 'ステータス変更';
      case 'deleted':
        return '削除';
      default:
        return action;
    }
  };

  // 日付のフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // ローディング表示
  if (loading && currentView === 'dashboard') {
    return (
      <div className={styles.analyticsLoading}>
        <p>データを読み込んでいます...</p>
      </div>
    );
  }

  // エラー表示
  if (error && currentView === 'dashboard') {
    return (
      <div className={styles.analyticsError}>
        <p>{error}</p>
        <button type="button" onClick={() => fetchDashboardData(timeRange)}>再試行</button>
      </div>
    );
  }

  // データがない場合
  if (!dashboardData && currentView === 'dashboard') {
    return (
      <div className={styles.analyticsEmpty}>
        <p>データがありません。タスクを作成して活動を開始してください。</p>
      </div>
    );
  }

  // メインダッシュボード以外の画面を表示する場合
  if (currentView !== 'dashboard') {
    return (
      <div className={styles.analyticsDashboard}>
        <div className={styles.analyticsDashboardHeader}>
          <button
            type="button"
            className={styles.backToDashboardButton}
            onClick={() => setCurrentView('dashboard')}
          >
            ← ダッシュボードに戻る
          </button>
        </div>

        {currentView === 'productivity' && <ProductivityAnalysis />}
        {currentView === 'prediction' && <TaskPrediction />}
        {currentView === 'reports' && <AnalyticsReports />}
      </div>
    );
  }

  // 完了率チャートデータ
  const completionRateChartData = getCompletionRateChartData();
  // プロジェクト別チャートデータ
  const projectChartData = getProjectChartData();
  // タグ別チャートデータ
  const tagChartData = getTagChartData();

  // メインダッシュボードを表示
  return (
    <div className={styles.analyticsDashboard}>
      <div className={styles.analyticsDashboardHeader}>
        <h2>タスク分析ダッシュボード</h2>
        <TimeRangeSelector onChange={handleTimeRangeChange} defaultValue={timeRange} />
      </div>

      {/* タスクサマリーカード */}
      <div className={styles.metricCardsContainer}>
        <MetricCard
          title="全タスク"
          value={dashboardData?.taskSummary.total || 0}
          color="primary"
        />
        <MetricCard
          title="完了タスク"
          value={dashboardData?.taskSummary.completed || 0}
          color="success"
        />
        <MetricCard
          title="進行中タスク"
          value={dashboardData?.taskSummary.inProgress || 0}
          color="info"
        />
        <MetricCard
          title="未着手タスク"
          value={dashboardData?.taskSummary.todo || 0}
          color="warning"
        />
        <MetricCard
          title="期限切れタスク"
          value={dashboardData?.taskSummary.overdue || 0}
          color="danger"
        />
      </div>

      {/* チャートセクション */}
      <div className={styles.analyticsChartsContainer}>
        {/* 完了率チャート */}
        <div className={styles.analyticsChartCard}>
          <h3>タスク完了状況</h3>
          {completionRateChartData && (
            <AnalyticsChart
              type="doughnut"
              data={completionRateChartData}
              height={250}
            />
          )}
          <div className={styles.analyticsChartInfo}>
            <p>完了率: {Math.round((dashboardData?.completionRate || 0) * 100)}%</p>
          </div>
        </div>

        {/* プロジェクト別チャート */}
        {projectChartData && (
          <div className={styles.analyticsChartCard}>
            <h3>プロジェクト別タスク分布</h3>
            <AnalyticsChart
              type="bar"
              data={projectChartData}
              height={250}
            />
          </div>
        )}

        {/* タグ別チャート */}
        {tagChartData && (
          <div className={styles.analyticsChartCard}>
            <h3>タグ別タスク分布</h3>
            <AnalyticsChart
              type="pie"
              data={tagChartData}
              height={250}
            />
          </div>
        )}
      </div>

      {/* 最近の活動履歴 */}
      <div className={styles.recentActivitiesContainer}>
        <h3>最近の活動履歴</h3>
        {(dashboardData?.recentActivities.length || 0) > 0 ? (
          <ul className={styles.activityList}>
            {dashboardData?.recentActivities.map(activity => (
              <li key={activity.id} className={styles.activityItem}>
                <div className={styles.activityTime}>
                  {formatDate(activity.timestamp)}
                </div>
                <div className={styles.activityContent}>
                  <span className={styles.activityAction}>
                    {getActionLabel(activity.action)}
                  </span>
                  <span className={styles.activityTask}>
                    {activity.taskTitle || `タスク #${activity.taskId}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>最近の活動はありません。</p>
        )}
      </div>

      {/* 詳細分析へのリンク */}
      <div className={styles.analyticsLinks}>
        <button
          type="button"
          className={styles.analyticsLinkButton}
          onClick={() => setCurrentView('productivity')}
        >
          生産性分析を表示
        </button>
        <button
          type="button"
          className={styles.analyticsLinkButton}
          onClick={() => setCurrentView('prediction')}
        >
          タスク予測・推奨を表示
        </button>
        <button
          type="button"
          className={styles.analyticsLinkButton}
          onClick={() => setCurrentView('reports')}
        >
          レポートを生成
        </button>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
