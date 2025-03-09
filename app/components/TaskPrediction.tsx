"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AnalyticsChart from './AnalyticsChart';
import styles from '../page.module.css';

// 予測データの型定義
interface PredictionData {
  recommendedTasks: Array<{
    id: number;
    title: string;
    priority: number;
    estimatedCompletionTime: number;
    dueDate: string;
    score: number;
  }>;
  workloadForecast: Array<{
    date: string;
    estimatedHours: number;
    scheduledTasks: number;
  }>;
  similarTasks: Array<{
    taskId: number;
    title: string;
    completionTime: number;
    tags: Array<{
      id: number;
      name: string;
      color: string;
    }>;
  }>;
}

const TaskPrediction: React.FC = () => {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 予測データを取得する関数
  const fetchPredictionData = useCallback(async () => {
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
      const response = await fetch('/api/analytics/predictions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }

      const data = await response.json();
      setPredictionData(data);
    } catch (err) {
      console.error('予測データの取得に失敗しました:', err);
      setError('データの取得に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }, []);

  // コンポーネントのマウント時にデータを取得
  useEffect(() => {
    fetchPredictionData();
  }, [fetchPredictionData]);

  // 作業負荷予測のチャートデータを生成
  const getWorkloadForecastChartData = () => {
    if (!predictionData || !predictionData.workloadForecast.length) return null;

    return {
      labels: predictionData.workloadForecast.map(item => item.date),
      datasets: [
        {
          label: '予測作業時間 (時間)',
          data: predictionData.workloadForecast.map(item => item.estimatedHours),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: '予定タスク数',
          data: predictionData.workloadForecast.map(item => item.scheduledTasks),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
        }
      ],
    };
  };

  // 優先度に基づくクラス名を取得
  const getPriorityClassName = (priority: number) => {
    switch (priority) {
      case 3:
        return styles.highPriority;
      case 2:
        return styles.mediumPriority;
      default:
        return styles.lowPriority;
    }
  };

  // 日付のフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
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
        <button type="button" onClick={fetchPredictionData}>再試行</button>
      </div>
    );
  }

  // データがない場合
  if (!predictionData) {
    return (
      <div className={styles.analyticsEmpty}>
        <p>予測データがありません。より多くのタスクを完了させると、より正確な予測が可能になります。</p>
      </div>
    );
  }

  // 作業負荷予測チャートデータ
  const workloadForecastChartData = getWorkloadForecastChartData();

  return (
    <div className={styles.taskPrediction}>
      <div className={styles.analyticsDashboardHeader}>
        <h2>タスク予測・推奨</h2>
      </div>

      {/* 推奨タスクセクション */}
      <div className={styles.recommendedTasksContainer}>
        <h3>今日取り組むべきタスク</h3>
        {predictionData.recommendedTasks.length > 0 ? (
          <div className={styles.recommendedTasksList}>
            {predictionData.recommendedTasks.map(task => (
              <div key={task.id} className={styles.recommendedTaskItem}>
                <div className={styles.recommendedTaskHeader}>
                  <h4>{task.title}</h4>
                  <div className={`${styles.recommendedTaskScore} ${task.score > 70 ? styles.highScore : task.score > 40 ? styles.mediumScore : styles.lowScore}`}>
                    {Math.round(task.score)}%
                  </div>
                </div>
                <div className={styles.recommendedTaskDetails}>
                  <div className={styles.recommendedTaskDetail}>
                    <span className={styles.recommendedTaskDetailLabel}>優先度:</span>
                    <span className={getPriorityClassName(task.priority)}>
                      {task.priority === 3 ? '高' : task.priority === 2 ? '中' : '低'}
                    </span>
                  </div>
                  <div className={styles.recommendedTaskDetail}>
                    <span className={styles.recommendedTaskDetailLabel}>予想完了時間:</span>
                    <span>{task.estimatedCompletionTime.toFixed(1)} 時間</span>
                  </div>
                  {task.dueDate && (
                    <div className={styles.recommendedTaskDetail}>
                      <span className={styles.recommendedTaskDetailLabel}>期限:</span>
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>推奨タスクがありません。</p>
        )}
      </div>

      {/* 作業負荷予測セクション */}
      <div className={styles.workloadForecastContainer}>
        <h3>今後の作業負荷予測</h3>
        {workloadForecastChartData ? (
          <div className={styles.analyticsChartCard}>
            <AnalyticsChart
              type="bar"
              data={workloadForecastChartData}
              height={250}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: '予測作業時間 (時間)'
                    }
                  },
                  y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: '予定タスク数'
                    }
                  }
                }
              }}
            />
          </div>
        ) : (
          <p className={styles.emptyMessage}>作業負荷予測データがありません。</p>
        )}
      </div>

      {/* 類似タスク参照セクション */}
      <div className={styles.similarTasksContainer}>
        <h3>類似タスク参照</h3>
        {predictionData.similarTasks.length > 0 ? (
          <div className={styles.similarTasksList}>
            {predictionData.similarTasks.map(task => (
              <div key={task.taskId} className={styles.similarTaskItem}>
                <div className={styles.similarTaskHeader}>
                  <h4>{task.title}</h4>
                  <div className={styles.similarTaskCompletionTime}>
                    {task.completionTime.toFixed(1)} 時間
                  </div>
                </div>
                {task.tags.length > 0 && (
                  <div className={styles.similarTaskTags}>
                    {task.tags.map(tag => (
                      <span
                        key={tag.id}
                        className={styles.similarTaskTag}
                        style={{ backgroundColor: `${tag.color}40`, borderColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>類似タスクデータがありません。</p>
        )}
      </div>

      {/* 予測精度向上のヒント */}
      <div className={styles.predictionTipsContainer}>
        <h3>予測精度向上のヒント</h3>
        <ul className={styles.predictionTipsList}>
          <li>
            <strong>タスクの詳細を充実させる:</strong> タスクの説明、タグ、優先度などの情報を詳細に設定すると、より正確な予測が可能になります。
          </li>
          <li>
            <strong>タスクの開始・完了時間を記録する:</strong> タスクの実際の作業時間を記録することで、将来の類似タスクの所要時間予測が向上します。
          </li>
          <li>
            <strong>定期的にタスクを更新する:</strong> タスクのステータスや進捗状況を定期的に更新することで、より正確な作業負荷予測が可能になります。
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TaskPrediction;
