"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import styles from '../page.module.css';

interface Project {
  id: number;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

export default function ProjectManager() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Supabaseからセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('プロジェクトの取得中にエラーが発生しました。後でもう一度お試しください。');
      // エラー時は空の配列を設定
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProject(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      // Supabaseからセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch('/api/projects', {
        method: editingProjectId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingProjectId ? { id: editingProjectId, ...newProject } : newProject),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      await fetchProjects();

      // フォームをリセット
      setNewProject({
        name: '',
        description: ''
      });
      setEditingProjectId(null);
    } catch (error) {
      console.error('Error saving project:', error);
      setError('プロジェクトの保存中にエラーが発生しました。後でもう一度お試しください。');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setNewProject({
      name: project.name,
      description: project.description || ''
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このプロジェクトを削除してもよろしいですか？関連するタスクも削除されます。')) return;

    try {
      setError(null);

      // Supabaseからセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch(`/api/projects?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      await fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('プロジェクトの削除中にエラーが発生しました。後でもう一度お試しください。');
    }
  };

  return (
    <div className={styles.projectManager}>
      <h2>{editingProjectId ? 'プロジェクトを編集' : '新しいプロジェクトを追加'}</h2>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.projectForm}>
        <div>
          <label htmlFor="name">プロジェクト名</label>
          <input
            id="name"
            name="name"
            type="text"
            value={newProject.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="description">説明</label>
          <textarea
            id="description"
            name="description"
            value={newProject.description}
            onChange={handleInputChange}
          />
        </div>
        <div className={styles.formActions}>
          <button type="submit">
            {editingProjectId ? '更新' : '追加'}
          </button>
          {editingProjectId && (
            <button
              type="button"
              onClick={() => {
                setEditingProjectId(null);
                setNewProject({
                  name: '',
                  description: ''
                });
              }}
              className={styles.cancelButton}
            >
              キャンセル
            </button>
          )}
        </div>
      </form>

      <h2>プロジェクト一覧</h2>
      {loading ? (
        <p>読み込み中...</p>
      ) : projects.length === 0 ? (
        <p>プロジェクトがありません</p>
      ) : (
        <div className={styles.projectList}>
          {projects.map((project) => (
            <div key={project.id} className={styles.projectItem}>
              <div className={styles.projectHeader}>
                <h3>{project.name}</h3>
                <div className={styles.projectActions}>
                  <button type="button" onClick={() => handleEdit(project)}>編集</button>
                  <button type="button" onClick={() => handleDelete(project.id)}>削除</button>
                </div>
              </div>
              <p>{project.description}</p>
              {project._count && (
                <div className={styles.projectStats}>
                  <span>タスク数: {project._count.tasks}</span>
                </div>
              )}
              <div className={styles.projectMeta}>
                <span className={styles.projectDate}>
                  作成日: {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
