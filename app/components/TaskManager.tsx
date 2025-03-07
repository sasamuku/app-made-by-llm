"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import styles from '../page.module.css';

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  dueDate: string | null;
  userId: string;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  name: string;
}

export default function TaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 1,
    dueDate: '',
    projectId: '' as string | ''
  });
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
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

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Supabaseからセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch('/api/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('タスクの取得中にエラーが発生しました。後でもう一度お試しください。');
      // エラー時は空の配列を設定
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: name === 'priority' ? Number.parseInt(value, 10) : value
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

      const taskData = {
        ...newTask,
        projectId: newTask.projectId ? Number(newTask.projectId) : null,
      };

      const response = await fetch('/api/tasks', {
        method: editingTaskId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingTaskId ? { id: editingTaskId, ...taskData } : taskData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      await fetchTasks();

      // フォームをリセット
      setNewTask({
        title: '',
        description: '',
        status: 'pending',
        priority: 1,
        dueDate: '',
        projectId: ''
      });
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error saving task:', error);
      setError('タスクの保存中にエラーが発生しました。後でもう一度お試しください。');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setNewTask({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || '',
      projectId: task.projectId ? String(task.projectId) : ''
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このタスクを削除してもよろしいですか？')) return;

    try {
      setError(null);

      // Supabaseからセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('タスクの削除中にエラーが発生しました。後でもう一度お試しください。');
    }
  };

  return (
    <div className={styles.taskManager}>
      <h2>{editingTaskId ? 'タスクを編集' : '新しいタスクを追加'}</h2>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.taskForm}>
        <div>
          <label htmlFor="title">タイトル</label>
          <input
            id="title"
            name="title"
            type="text"
            value={newTask.title}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="description">説明</label>
          <textarea
            id="description"
            name="description"
            value={newTask.description}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label htmlFor="projectId">プロジェクト</label>
          <select
            id="projectId"
            name="projectId"
            value={newTask.projectId}
            onChange={handleInputChange}
          >
            <option value="">プロジェクトなし</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status">ステータス</label>
          <select
            id="status"
            name="status"
            value={newTask.status}
            onChange={handleInputChange}
          >
            <option value="pending">未着手</option>
            <option value="in-progress">進行中</option>
            <option value="completed">完了</option>
          </select>
        </div>
        <div>
          <label htmlFor="priority">優先度</label>
          <select
            id="priority"
            name="priority"
            value={newTask.priority}
            onChange={handleInputChange}
          >
            <option value="1">低</option>
            <option value="2">中</option>
            <option value="3">高</option>
          </select>
        </div>
        <div>
          <label htmlFor="dueDate">期限</label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            value={newTask.dueDate}
            onChange={handleInputChange}
          />
        </div>
        <div className={styles.formActions}>
          <button type="submit">
            {editingTaskId ? '更新' : '追加'}
          </button>
          {editingTaskId && (
            <button
              type="button"
              onClick={() => {
                setEditingTaskId(null);
                setNewTask({
                  title: '',
                  description: '',
                  status: 'pending',
                  priority: 1,
                  dueDate: '',
                  projectId: ''
                });
              }}
              className={styles.cancelButton}
            >
              キャンセル
            </button>
          )}
        </div>
      </form>

      <h2>タスク一覧</h2>
      {loading ? (
        <p>読み込み中...</p>
      ) : tasks.length === 0 ? (
        <p>タスクがありません</p>
      ) : (
        <div className={styles.taskList}>
          {tasks.map((task) => (
            <div key={task.id} className={styles.taskItem}>
              <div className={styles.taskHeader}>
                <h3>{task.title}</h3>
                <div className={styles.taskActions}>
                  <button type="button" onClick={() => handleEdit(task)}>編集</button>
                  <button type="button" onClick={() => handleDelete(task.id)}>削除</button>
                </div>
              </div>
              <p>{task.description}</p>
              {task.projectId && (
                <div className={styles.taskProject}>
                  プロジェクト: {projects.find(p => p.id === task.projectId)?.name || 'Unknown'}
                </div>
              )}
              <div className={styles.taskMeta}>
                <span className={`${styles.taskStatus} ${styles[task.status]}`}>
                  {task.status === 'pending' ? '未着手' :
                   task.status === 'in-progress' ? '進行中' : '完了'}
                </span>
                <span className={`${styles.taskPriority} ${styles[`priority-${task.priority}`]}`}>
                  優先度: {task.priority === 1 ? '低' : task.priority === 2 ? '中' : '高'}
                </span>
                {task.dueDate && (
                  <span className={styles.taskDueDate}>
                    期限: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
