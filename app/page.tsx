"use client";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import styles from "./page.module.css";
import Auth from "./components/Auth";
import TaskManager from "./components/TaskManager";
import ProjectManager from "./components/ProjectManager";
import TagManager from "./components/TagManager";
import AnalyticsDashboard from "./components/AnalyticsDashboard";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects' | 'tags' | 'analytics'>('tasks');

  useEffect(() => {
    // セッションの確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>タスク管理アプリケーション</h1>
        <div className={styles.userInfo}>
          <span>{session.user.email}</span>
          <button type="button" onClick={handleSignOut} className={styles.signOutButton}>
            サインアウト
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'tasks' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            タスク
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'projects' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            プロジェクト
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'tags' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            タグ
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'analytics' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            分析
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'tasks' ? <TaskManager /> :
           activeTab === 'projects' ? <ProjectManager /> :
           activeTab === 'tags' ? <TagManager /> :
           <AnalyticsDashboard />}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} タスク管理アプリケーション</p>
      </footer>
    </div>
  );
}
