"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";

export default function Home() {
interface Task {
  id: number;
  title: string;
  status: string;
}

interface Project {
  id: number;
  name: string;
}

const [tasks, setTasks] = useState<Task[]>([]);
const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Fetch tasks and projects from the API
    async function fetchData() {
      const tasksResponse = await fetch("/api/tasks");
      const projectsResponse = await fetch("/api/projects");
      const tasksData = await tasksResponse.json();
      const projectsData = await projectsResponse.json();
      setTasks(tasksData);
      setProjects(projectsData);
    }
    fetchData();
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Task Management</h1>
        <section>
          <h2>Tasks</h2>
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                {task.title} - {task.status}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Projects</h2>
          <ul>
            {projects.map((project) => (
              <li key={project.id}>
                {project.name}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
