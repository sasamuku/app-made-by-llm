import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/server-auth';

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

// タスク活動を記録
export async function POST(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { taskId, action, oldStatus, newStatus, oldPriority, newPriority } = data;

    // バリデーション
    if (!taskId || !action) {
      return NextResponse.json({ error: 'Task ID and action are required' }, { status: 400 });
    }

    // タスクの所有者を確認
    const task = await prisma.task.findUnique({
      where: { id: Number(taskId) }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to record activity for this task' }, { status: 403 });
    }

    // タスク活動を記録
    const activity = await prisma.taskActivity.create({
      data: {
        taskId: Number(taskId),
        userId,
        action,
        oldStatus,
        newStatus,
        oldPriority,
        newPriority,
      }
    });

    // ステータスが完了に変更された場合、タスクのcompletedAtを更新
    if (action === 'status_changed' && newStatus === 'DONE' && oldStatus !== 'DONE') {
      await prisma.task.update({
        where: { id: Number(taskId) },
        data: { completedAt: new Date() }
      });
    }

    // ステータスが進行中に変更された場合、タスクのstartedAtを更新（まだ設定されていない場合）
    if (action === 'status_changed' && newStatus === 'IN_PROGRESS' && oldStatus !== 'IN_PROGRESS') {
      const taskToUpdate = await prisma.task.findUnique({
        where: { id: Number(taskId) },
        select: { startedAt: true }
      });

      if (!taskToUpdate?.startedAt) {
        await prisma.task.update({
          where: { id: Number(taskId) },
          data: { startedAt: new Date() }
        });
      }
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Error recording task activity:', error);
    return NextResponse.json({ error: 'Failed to record task activity' }, { status: 500 });
  }
}

// タスク活動履歴を取得
export async function GET(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const taskId = searchParams.get('taskId');
    const action = searchParams.get('action');

    // 検索条件を構築
    const where: {
      userId: string;
      timestamp?: {
        gte?: Date;
        lte?: Date;
      };
      taskId?: number;
      action?: string;
    } = {
      userId
    };

    // 日付範囲でフィルタリング
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    // タスクIDでフィルタリング
    if (taskId) {
      where.taskId = Number(taskId);
    }

    // アクションでフィルタリング
    if (action) {
      where.action = action;
    }

    // タスク活動を取得
    const activities = await prisma.taskActivity.findMany({
      where,
      include: {
        task: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching task activities:', error);
    return NextResponse.json({ error: 'Failed to fetch task activities' }, { status: 500 });
  }
}
