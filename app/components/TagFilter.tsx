"use client";
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import styles from '../page.module.css';
import TagBadge from './TagBadge';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TagFilterProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

export default function TagFilter({ selectedTagIds, onChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetchTags();
  }, [pathname]);

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

      console.log('TagFilter: Fetching tags with token');

      try {
        const response = await fetch('/api/tags', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // すべてのステータスコードを適切に処理
        if (!response.ok) {
          console.error(`API error: ${response.status}`);
          if (response.status === 401) {
            setError('認証エラー: 再ログインしてください');
          } else {
            setError(`APIエラー: ステータスコード ${response.status}`);
          }
          setTags([]);
          return;
        }

        const data = await response.json();

        // レスポンスデータの検証
        if (Array.isArray(data)) {
          console.log('TagFilter: Tags fetched successfully:', data.length);
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

  const handleClearFilters = () => {
    onChange([]);
  };

  // 選択されたタグを取得
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  return (
    <div className={styles.tagFilter}>
      <div className={styles.tagFilterHeader}>
        <h3>タグでフィルター</h3>
        {selectedTagIds.length > 0 && (
          <button
            type="button"
            className={styles.clearFiltersButton}
            onClick={handleClearFilters}
          >
            クリア
          </button>
        )}
        <button
          type="button"
          className={styles.expandFilterButton}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {selectedTagIds.length > 0 && (
        <div className={styles.activeFilters}>
          {selectedTags.map(tag => (
            <TagBadge
              key={tag.id}
              tag={tag}
              onRemove={() => handleTagToggle(tag.id)}
              selected
            />
          ))}
        </div>
      )}

      {isExpanded && (
        <div className={styles.tagFilterContent}>
          {loading ? (
            <div className={styles.tagFilterLoading}>読み込み中...</div>
          ) : error ? (
            <div className={styles.tagFilterError}>{error}</div>
          ) : tags.length === 0 ? (
            <div className={styles.tagFilterEmpty}>タグがありません</div>
          ) : (
            <div className={styles.tagFilterList}>
              {tags.map(tag => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  clickable
                  onClick={() => handleTagToggle(tag.id)}
                  selected={selectedTagIds.includes(tag.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
