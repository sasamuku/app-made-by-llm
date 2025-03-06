"use client";
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import styles from '../page.module.css';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({
          text: 'サインアップに成功しました。確認メールを確認してください。',
          type: 'success'
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: unknown) {
      setMessage({
        text: error instanceof Error ? error.message : 'エラーが発生しました',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <h1>{isSignUp ? 'サインアップ' : 'ログイン'}</h1>
      <form onSubmit={handleAuth} className={styles.authForm}>
        <div>
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'ロード中...' : isSignUp ? 'サインアップ' : 'ログイン'}
        </button>
      </form>
      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsSignUp(!isSignUp)}
        className={styles.switchAuthMode}
      >
        {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : 'アカウントを作成する'}
      </button>
    </div>
  );
}
