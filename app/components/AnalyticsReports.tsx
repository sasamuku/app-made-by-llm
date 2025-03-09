"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import styles from '../page.module.css';

// レポートタイプの型定義
type ReportType = 'productivity' | 'project' | 'team';
type ReportFormat = 'json' | 'csv';

interface ReportFormData {
  startDate: string;
  endDate: string;
  type: ReportType;
  format: ReportFormat;
  projectId?: string;
}

const AnalyticsReports: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [formData, setFormData] = useState<ReportFormData>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'productivity',
    format: 'csv',
  });

  // プロジェクト一覧を取得する関数
  const fetchProjects = useCallback(async () => {
    try {
      // ユーザーのセッションを取得
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('認証されていません。再ログインしてください。');
        return;
      }

      // APIからプロジェクト一覧を取得
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }

      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('プロジェクト一覧の取得に失敗しました:', err);
      setError('プロジェクト一覧の取得に失敗しました。後でもう一度お試しください。');
    }
  }, []);

  // コンポーネントのマウント時にプロジェクト一覧を取得
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // フォームの入力値を更新する関数
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // レポートを生成する関数
  const generateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // ユーザーのセッションを取得
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('認証されていません。再ログインしてください。');
        setLoading(false);
        return;
      }

      // クエリパラメータを構築
      let url = `/api/analytics/reports?startDate=${formData.startDate}&endDate=${formData.endDate}&type=${formData.type}&format=${formData.format}`;
      if (formData.type === 'project' && formData.projectId) {
        url += `&projectId=${formData.projectId}`;
      }

      // APIからレポートを取得
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }

      // レポート形式に応じた処理
      if (formData.format === 'csv') {
        // CSVファイルをダウンロード
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${formData.type}_report_${formData.startDate}_to_${formData.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        setSuccess('レポートが正常に生成されました。ダウンロードが開始されます。');
      } else {
        // JSONデータを表示
        const data = await response.json();
        console.log('レポートデータ:', data);
        setSuccess('レポートが正常に生成されました。コンソールでデータを確認できます。');
      }
    } catch (err) {
      console.error('レポート生成に失敗しました:', err);
      setError('レポート生成に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // レポートタイプの説明を取得する関数
  const getReportTypeDescription = (type: ReportType) => {
    switch (type) {
      case 'productivity':
        return '生産性レポートは、タスクの完了率、時間帯別・曜日別の生産性、タグ別の効率などを含みます。';
      case 'project':
        return 'プロジェクトレポートは、特定のプロジェクトのタスク進捗状況、タグ分布、活動履歴などを含みます。';
      case 'team':
        return 'チームレポートは、チームメンバーごとのタスク統計、チーム全体の生産性などを含みます。';
      default:
        return '';
    }
  };

  return (
    <div className={styles.analyticsReports}>
      <div className={styles.analyticsDashboardHeader}>
        <h2>レポート生成</h2>
      </div>

      {/* レポート生成フォーム */}
      <div className={styles.reportFormContainer}>
        <form onSubmit={generateReport} className={styles.reportForm}>
          {/* 期間選択 */}
          <div className={styles.formGroup}>
            <h3>期間選択</h3>
            <div className={styles.dateRangeInputs}>
              <div className={styles.formField}>
                <label htmlFor="startDate">開始日:</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="endDate">終了日:</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className={styles.dateInput}
                />
              </div>
            </div>
          </div>

          {/* レポートタイプ選択 */}
          <div className={styles.formGroup}>
            <h3>レポートタイプ</h3>
            <div className={styles.reportTypeOptions}>
              <div className={styles.reportTypeOption}>
                <input
                  type="radio"
                  id="productivity"
                  name="type"
                  value="productivity"
                  checked={formData.type === 'productivity'}
                  onChange={handleInputChange}
                  className={styles.radioInput}
                />
                <label htmlFor="productivity" className={styles.reportTypeLabel}>
                  <div className={styles.reportTypeName}>生産性レポート</div>
                  <div className={styles.reportTypeDescription}>
                    {getReportTypeDescription('productivity')}
                  </div>
                </label>
              </div>
              <div className={styles.reportTypeOption}>
                <input
                  type="radio"
                  id="project"
                  name="type"
                  value="project"
                  checked={formData.type === 'project'}
                  onChange={handleInputChange}
                  className={styles.radioInput}
                />
                <label htmlFor="project" className={styles.reportTypeLabel}>
                  <div className={styles.reportTypeName}>プロジェクトレポート</div>
                  <div className={styles.reportTypeDescription}>
                    {getReportTypeDescription('project')}
                  </div>
                </label>
              </div>
              <div className={styles.reportTypeOption}>
                <input
                  type="radio"
                  id="team"
                  name="type"
                  value="team"
                  checked={formData.type === 'team'}
                  onChange={handleInputChange}
                  className={styles.radioInput}
                />
                <label htmlFor="team" className={styles.reportTypeLabel}>
                  <div className={styles.reportTypeName}>チームレポート</div>
                  <div className={styles.reportTypeDescription}>
                    {getReportTypeDescription('team')}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* プロジェクト選択（プロジェクトレポートの場合のみ表示） */}
          {formData.type === 'project' && (
            <div className={styles.formGroup}>
              <h3>プロジェクト選択</h3>
              <div className={styles.formField}>
                <select
                  id="projectId"
                  name="projectId"
                  value={formData.projectId || ''}
                  onChange={handleInputChange}
                  required
                  className={styles.selectInput}
                >
                  <option value="">プロジェクトを選択してください</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* レポート形式選択 */}
          <div className={styles.formGroup}>
            <h3>レポート形式</h3>
            <div className={styles.formField}>
              <select
                id="format"
                name="format"
                value={formData.format}
                onChange={handleInputChange}
                className={styles.selectInput}
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}

          {/* 成功メッセージ */}
          {success && (
            <div className={styles.successMessage}>
              <p>{success}</p>
            </div>
          )}

          {/* 送信ボタン */}
          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.generateReportButton}
              disabled={loading}
            >
              {loading ? 'レポート生成中...' : 'レポートを生成'}
            </button>
          </div>
        </form>
      </div>

      {/* レポート活用のヒント */}
      <div className={styles.reportTipsContainer}>
        <h3>レポート活用のヒント</h3>
        <ul className={styles.reportTipsList}>
          <li>
            <strong>定期的なレポート生成:</strong> 週次または月次でレポートを生成し、生産性の変化を追跡しましょう。
          </li>
          <li>
            <strong>プロジェクト完了時のレビュー:</strong> プロジェクト完了時にレポートを生成し、成功要因や改善点を分析しましょう。
          </li>
          <li>
            <strong>チーム共有:</strong> レポートをチームメンバーと共有し、全体の生産性向上に役立てましょう。
          </li>
          <li>
            <strong>データ分析:</strong> CSVレポートをExcelやGoogleスプレッドシートにインポートして、さらに詳細な分析を行うことができます。
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsReports;
