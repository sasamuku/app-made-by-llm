import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/app/lib/prisma';
import { syncUserWithDatabase } from '@/app/lib/server-auth';
import { TaskStatus } from '@prisma/client';

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

export async function GET(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クエリパラメータからタグIDを取得
    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get('tags');

    // タスク検索条件
    const where: {
      userId: string;
      tags?: {
        some: {
          tagId: {
            in: number[];
          };
        };
      };
    } = {
      userId: userId
    };

    // タグによるフィルタリング
    if (tagsParam) {
      const tagIds = tagsParam.split(',').map(id => Number(id));

      where.tags = {
        some: {
          tagId: {
            in: tagIds
          }
        }
      };
    }

    // ユーザーのタスクを取得
    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ],
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // レスポンス形式を整形
    const formattedTasks = tasks.map(task => ({
      ...task,
      tags: task.tags.map(taskTag => taskTag.tag)
    }));

    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // トークンからユーザー情報を取得
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: userData, error } = await supabase.auth.getUser(token || '');

    if (error || !userData.user) {
      return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 });
    }

    // ユーザーをデータベースに同期
    await syncUserWithDatabase(userData.user);

    const data = await request.json();
    let { title, description, status, priority, dueDate, projectId, tagIds } = data;
    if (status === "in-progress") {
      status = "IN_PROGRESS";
    } else if (status === "todo") {
      status = "TODO";
    } else if (status === "done") {
      status = "DONE";
    }

    // タスクを作成
    const task = await prisma.$transaction(async (tx) => {
      // タスクを作成
      const createdTask = await tx.task.create({
        data: {
          title,
          description,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          userId,
          projectId: projectId || null,
          // タグの関連付け
          tags: tagIds && tagIds.length > 0 ? {
            create: tagIds.map((tagId: number) => ({
              tagId: tagId
            }))
          } : undefined
        },
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        }
      });

      // タスク作成の活動を記録
      await tx.taskActivity.create({
        data: {
          taskId: createdTask.id,
          userId,
          action: 'created',
          newStatus: status
        }
      });

      return createdTask;
    });

    // レスポンス形式を整形
    const formattedTask = {
      ...task,
      tags: task.tags.map(taskTag => taskTag.tag)
    };

    return NextResponse.json(formattedTask, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await request.json();
    let { id, title, description, status, priority, dueDate, projectId, tagIds } = data;
    if (status === "in-progress") {
      status = "IN_PROGRESS";
    } else if (status === "todo") {
      status = "TODO";
    } else if (status === "done") {
      status = "DONE";
    }

    // タスクの所有者を確認
    const existingTask = await prisma.task.findUnique({
      where: { id: Number(id) }
    });

    if (!existingTask || existingTask.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or task not found' }, { status: 403 });
    }

    // ステータスが変更されたかどうかを確認
    const statusChanged = existingTask.status !== status;
    const priorityChanged = existingTask.priority !== priority;

    // トランザクションを使用して、タスクの更新とタグの関連付けを一括で行う
    const task = await prisma.$transaction(async (tx) => {
      // 既存のタグ関連付けを削除
      if (tagIds !== undefined) {
        await tx.taskTag.deleteMany({
          where: {
            taskId: Number(id)
          }
        });
      }

      // タスクを更新
      const updatedTask = await tx.task.update({
        where: { id: Number(id) },
        data: {
          title,
          description,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId: projectId || null,
          // ステータスが完了に変更された場合、completedAtを設定
          completedAt: status === 'DONE' && existingTask.status !== 'DONE' ? new Date() : existingTask.completedAt,
          // ステータスが進行中に変更された場合、startedAtを設定（まだ設定されていない場合）
          startedAt: status === 'IN_PROGRESS' && existingTask.status !== 'IN_PROGRESS' && !existingTask.startedAt ? new Date() : existingTask.startedAt,
          // 新しいタグの関連付け
          tags: tagIds && tagIds.length > 0 ? {
            create: tagIds.map((tagId: number) => ({
              tagId: tagId
            }))
          } : undefined
        },
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        }
      });

      // タスク更新の活動を記録
      if (statusChanged || priorityChanged) {
        await tx.taskActivity.create({
          data: {
            taskId: Number(id),
            userId,
            action: 'status_changed',
            oldStatus: statusChanged ? existingTask.status : undefined,
            newStatus: statusChanged ? status : undefined,
            oldPriority: priorityChanged ? existingTask.priority : undefined,
            newPriority: priorityChanged ? priority : undefined
          }
        });
      }

      return updatedTask;
    });

    // レスポンス形式を整形
    const formattedTask = {
      ...task,
      tags: task.tags.map(taskTag => taskTag.tag)
    };

    return NextResponse.json(formattedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // タスクの所有者を確認
    const existingTask = await prisma.task.findUnique({
      where: { id: Number(id) }
    });

    if (!existingTask || existingTask.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or task not found' }, { status: 403 });
    }

    // トランザクションを使用して、タスクの削除と活動記録を一括で行う
    await prisma.$transaction(async (tx) => {
      // タスク削除の活動を記録
      await tx.taskActivity.create({
        data: {
          taskId: Number(id),
          userId,
          action: 'deleted',
          oldStatus: existingTask.status
        }
      });

      // タスクを削除（関連するTaskTagとTaskActivityは自動的に削除される）
      await tx.task.delete({
        where: { id: Number(id) }
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
