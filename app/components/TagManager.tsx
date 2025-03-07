"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import styles from '../page.module.css';
import TagBadge from './TagBadge';

interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

export default function TagManager() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState({
    name: '',
    color: '#3498db'
  });
  const [loading, setLoading] = useState(true);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTags();
    }
  }, [user]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);

      // Supabaseからセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error('認証トークンがありません');
        setError('認証トークンがありません。再ログインしてください。');
        setTags([]);
        setLoading(false);
        return;
      }

      console.log('Fetching tags with token');

      try {
        const response = await fetch('/api/tags', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok && response.status !== 401) {
          console.error(`API error: ${response.status}`);
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // エラーレスポンスの場合でも配列として処理
        if (Array.isArray(data)) {
          console.log('Tags fetched successfully:', data.length);
          setTags(data);
        } else if (data.error) {
          console.error('API returned error:', data.error);
          setError(`APIエラー: ${data.error}`);
          setTags([]);
        } else {
          console.error('API returned unexpected data format');
          setError('予期しないデータ形式が返されました');
          setTags([]);
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        setError('APIリクエスト中にエラーが発生しました。ネットワーク接続を確認してください。');
        setTags([]);
      }
    } catch (error) {
      console.error('Error in fetchTags:', error);
      setError('タグの取得中にエラーが発生しました。後でもう一度お試しください。');
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTag(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      // バリデーション
      if (!newTag.name.trim()) {
        setError('タグ名を入力してください');
        return;
      }

      if (!/^#[0-9A-Fa-f]{6}$/.test(newTag.color)) {
        setError('有効なカラーコードを入力してください（例: #3498db）');
        return;
      }

      // Supabaseからセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch('/api/tags', {
        method: editingTagId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingTagId ? { id: editingTagId, ...newTag } : newTag),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      await fetchTags();

      // フォームをリセット
      setNewTag({
        name: '',
        color: '#3498db'
      });
      setEditingTagId(null);
    } catch (error) {
      console.error('Error saving tag:', error);
      setError(error instanceof Error ? error.message : 'タグの保存中にエラーが発生しました。後でもう一度お試しください。');
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setNewTag({
      name: tag.name,
      color: tag.color
    });
  };

  const handleDelete = async (id: number) => {
    // タグに関連付けられたタスクがある場合は確認
    const tagToDelete = tags.find(tag => tag.id === id);
    const taskCount = tagToDelete?._count?.tasks || 0;

    let confirmMessage = 'このタグを削除してもよろしいですか？';
    if (taskCount > 0) {
      confirmMessage = `このタグは${taskCount}個のタスクに使用されています。削除してもよろしいですか？タスクからタグは削除されますが、タスク自体は削除されません。`;
    }

    if (!confirm(confirmMessage)) return;

    try {
      setError(null);

      // Supabaseからセッショントークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch(`/api/tags?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      await fetchTags();

      // 編集中のタグが削除された場合はフォームをリセット
      if (editingTagId === id) {
        setNewTag({
          name: '',
          color: '#3498db'
        });
        setEditingTagId(null);
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError('タグの削除中にエラーが発生しました。後でもう一度お試しください。');
    }
  };

  // カラーピッカーのプリセット色
  const colorPresets = [
    '#3498db', // 青
    '#2ecc71', // 緑
    '#e74c3c', // 赤
    '#f39c12', // オレンジ
    '#9b59b6', // 紫
    '#1abc9c', // ターコイズ
    '#34495e', // 紺
    '#e67e22', // 茶
    '#95a5a6', // グレー
    '#16a085', // 深緑
  ];

  return (
    <div className={styles.tagManager}>
      <h2>{editingTagId ? 'タグを編集' : '新しいタグを追加'}</h2>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.tagForm}>
        <div>
          <label htmlFor="name">タグ名</label>
          <input
            id="name"
            name="name"
            type="text"
            value={newTag.name}
            onChange={handleInputChange}
            required
            maxLength={20}
            placeholder="タグ名を入力"
          />
        </div>
        <div>
          <label htmlFor="color">色</label>
          <div className={styles.colorPickerContainer}>
            <input
              id="color"
              name="color"
              type="color"
              value={newTag.color}
              onChange={handleInputChange}
              className={styles.colorPicker}
            />
            <div className={styles.colorPresets}>
              {colorPresets.map(color => (
                <button
                  key={color}
                  type="button"
                  className={styles.colorPreset}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewTag(prev => ({ ...prev, color }))}
                  aria-label={`色を選択: ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className={styles.tagPreview}>
          <label>プレビュー</label>
          <TagBadge tag={{ id: 0, name: newTag.name || 'タグ名', color: newTag.color }} />
        </div>
        <div className={styles.formActions}>
          <button type="submit">
            {editingTagId ? '更新' : '追加'}
          </button>
          {editingTagId && (
            <button
              type="button"
              onClick={() => {
                setEditingTagId(null);
                setNewTag({
                  name: '',
                  color: '#3498db'
                });
              }}
              className={styles.cancelButton}
            >
              キャンセル
            </button>
          )}
        </div>
      </form>

      <h2>タグ一覧</h2>
      {loading ? (
        <p>読み込み中...</p>
      ) : tags.length === 0 ? (
        <p>タグがありません</p>
      ) : (
        <div className={styles.tagList}>
          {tags.map((tag) => (
            <div key={tag.id} className={styles.tagItem}>
              <div className={styles.tagItemContent}>
                <TagBadge tag={tag} />
                {tag._count && (
                  <span className={styles.tagCount}>
                    {tag._count.tasks} タスク
                  </span>
                )}
              </div>
              <div className={styles.tagActions}>
                <button type="button" onClick={() => handleEdit(tag)}>編集</button>
                <button type="button" onClick={() => handleDelete(tag.id)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
