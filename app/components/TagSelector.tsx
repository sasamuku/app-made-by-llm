"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import styles from '../page.module.css';
import TagBadge from './TagBadge';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

export default function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

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

      console.log('TagSelector: Fetching tags with token');

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
          console.log('TagSelector: Tags fetched successfully:', data.length);
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
      setError('タグの取得中にエラーが発生しました');
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: number) => {
    const newSelectedTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];

    onChange(newSelectedTagIds);
  };

  const handleRemoveTag = (tagId: number) => {
    const newSelectedTagIds = selectedTagIds.filter(id => id !== tagId);
    onChange(newSelectedTagIds);
  };

  // 検索条件に一致するタグをフィルタリング
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 選択されたタグを取得
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  return (
    <div className={styles.tagSelector}>
      <div className={styles.selectedTags}>
        {selectedTags.length > 0 ? (
          selectedTags.map(tag => (
            <TagBadge
              key={tag.id}
              tag={tag}
              onRemove={() => handleRemoveTag(tag.id)}
            />
          ))
        ) : (
          <span className={styles.noTagsSelected}>タグが選択されていません</span>
        )}
      </div>

      <div className={styles.tagSelectorDropdown}>
        <button
          type="button"
          className={styles.tagSelectorButton}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {isDropdownOpen ? 'タグを閉じる' : 'タグを選択'}
        </button>

        {isDropdownOpen && (
          <div className={styles.tagDropdownContent}>
            <div className={styles.tagSearchContainer}>
              <input
                type="text"
                placeholder="タグを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.tagSearchInput}
              />
            </div>

            {loading ? (
              <div className={styles.tagDropdownLoading}>読み込み中...</div>
            ) : error ? (
              <div className={styles.tagDropdownError}>{error}</div>
            ) : filteredTags.length === 0 ? (
              <div className={styles.tagDropdownEmpty}>
                {searchTerm ? 'タグが見つかりません' : 'タグがありません'}
              </div>
            ) : (
              <div className={styles.tagDropdownList}>
                {filteredTags.map(tag => (
                  <div
                    key={tag.id}
                    className={styles.tagDropdownItem}
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    <TagBadge
                      tag={tag}
                      clickable
                      selected={selectedTagIds.includes(tag.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
