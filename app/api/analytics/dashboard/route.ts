import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/app/lib/prisma';

// Supabaseクライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 認証ヘッダーからユーザーIDを取得する関数
async function getUserIdFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

// 指定された期間の開始日と終了日を計算する関数
function getDateRange(timeRange: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (timeRange) {
    case 'day':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      // デフォルトは1週間
      startDate.setDate(startDate.getDate() - 7);
  }

  return { startDate, endDate };
}

// ダッシュボード用のデータを取得
export async function GET(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'week';

    // 期間の開始日と終了日を計算
    const { startDate, endDate } = getDateRange(timeRange);

    // 1. タスクサマリーを取得
    const taskSummary = await getTaskSummary(userId, startDate, endDate);

    // 2. プロジェクト別のタスク分布を取得
    const tasksByProject = await getTasksByProject(userId, startDate, endDate);

    // 3. タグ別のタスク分布を取得
    const tasksByTag = await getTasksByTag(userId, startDate, endDate);

    // 4. 最近の活動履歴を取得
    const recentActivities = await getRecentActivities(userId, 10);

    // 5. 完了率を計算
    const completionRate = taskSummary.total > 0
      ? Math.round((taskSummary.completed / taskSummary.total) * 100) / 100
      : 0;

    // レスポンスデータを構築
    const dashboardData = {
      taskSummary,
      completionRate,
      tasksByProject,
      tasksByTag,
      recentActivities
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

// タスクサマリーを取得する関数
async function getTaskSummary(userId: string, startDate: Date, endDate: Date) {
  // 全タスク数
  const total = await prisma.task.count({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // 完了タスク数
  const completed = await prisma.task.count({
    where: {
      userId,
      status: 'DONE',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // 進行中タスク数
  const inProgress = await prisma.task.count({
    where: {
      userId,
      status: 'IN_PROGRESS',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // 未着手タスク数
  const todo = await prisma.task.count({
    where: {
      userId,
      status: 'TODO',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // 期限切れタスク数
  const overdue = await prisma.task.count({
    where: {
      userId,
      status: {
        not: 'DONE'
      },
      dueDate: {
        lt: new Date()
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  return {
    total,
    completed,
    inProgress,
    todo,
    overdue
  };
}

// プロジェクト別のタスク分布を取得する関数
async function getTasksByProject(userId: string, startDate: Date, endDate: Date) {
  const projects = await prisma.project.findMany({
    where: {
      userId
    },
    select: {
      id: true,
      name: true,
      tasks: {
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    }
  });

  return projects.map(project => {
    const taskCount = project.tasks.length;
    const completedCount = project.tasks.filter(task => task.status === 'DONE').length;

    return {
      projectId: project.id,
      projectName: project.name,
      taskCount,
      completedCount
    };
  });
}

// タグ別のタスク分布を取得する関数
async function getTasksByTag(userId: string, startDate: Date, endDate: Date) {
  // タグとそれに関連するタスクを取得
  const tags = await prisma.tag.findMany({
    include: {
      tasks: {
        include: {
          task: {
            select: {
              id: true,
              status: true,
              userId: true,
              createdAt: true
            }
          }
        }
      }
    }
  });

  // 結果を整形
  return tags
    .map(tag => {
      // ユーザーのタスクのみをフィルタリング（期間内のもの）
      const userTasks = tag.tasks.filter(taskTag =>
        taskTag.task !== null &&
        taskTag.task.userId === userId &&
        taskTag.task.createdAt >= startDate &&
        taskTag.task.createdAt <= endDate
      );

      const taskCount = userTasks.length;
      const completedCount = userTasks.filter(taskTag =>
        taskTag.task.status === 'DONE'
      ).length;

      return {
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        taskCount,
        completedCount
      };
    })
    .filter(tag => tag.taskCount > 0); // タスクが0のタグは除外
}

// 最近の活動履歴を取得する関数
async function getRecentActivities(userId: string, limit: number) {
  return await prisma.taskActivity.findMany({
    where: {
      userId
    },
    include: {
      task: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: limit
  });
}
