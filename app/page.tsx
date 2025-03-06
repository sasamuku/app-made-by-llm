"use client";
import { useState, useEffect } from "react";
// import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import styles from "./page.module.css";
// import Auth from "./components/Auth";
import TaskManager from "./components/TaskManager";
import ProjectManager from "./components/ProjectManager";

export default function Home() {
  // const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects'>('tasks');

  // useEffect(() => {
  //   // セッションの確認
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     setSession(session);
  //   });

  //   // 認証状態の変更を監視
  //   const {
  //     data: { subscription },
  //   } = supabase.auth.onAuthStateChange((_event, session) => {
  //     setSession(session);
  //   });

  //   return () => subscription.unsubscribe();
  // }, []);

  // const handleSignOut = async () => {
  //   await supabase.auth.signOut();
  // };

  // if (!session) {
  //   return <Auth />;
  // }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>SaaS タスク管理アプリケーション</h1>
        <div className={styles.userInfo}>
          <span>ユーザー</span>
          {/* <button type="button" onClick={handleSignOut} className={styles.signOutButton}>
            サインアウト
          </button> */}
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
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'tasks' ? <TaskManager /> : <ProjectManager />}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2023 SaaS タスク管理アプリケーション</p>
        <p>&copy; {new Date().getFullYear()} SaaS タスク管理アプリケーション</p>
      </footer>
    </div>
  );
}
