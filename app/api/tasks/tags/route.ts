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

// タスクに付与されたタグを取得
export async function GET(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // タスクの所有者を確認
    const task = await prisma.task.findUnique({
      where: { id: Number(taskId) }
    });

    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or task not found' }, { status: 403 });
    }

    // タスクに付与されたタグを取得
    const taskTags = await prisma.taskTag.findMany({
      where: {
        taskId: Number(taskId)
      },
      include: {
        tag: true
      }
    });

    // タグ情報のみを返す
    const tags = taskTags.map(taskTag => taskTag.tag);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching task tags:', error);
    return NextResponse.json({ error: 'Failed to fetch task tags' }, { status: 500 });
  }
}

// タスクにタグを付与
export async function POST(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, tagId } = await request.json();

    // バリデーション
    if (!taskId || !tagId) {
      return NextResponse.json({ error: 'Task ID and Tag ID are required' }, { status: 400 });
    }

    // タスクの所有者を確認
    const task = await prisma.task.findUnique({
      where: { id: Number(taskId) }
    });

    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or task not found' }, { status: 403 });
    }

    // タグが存在するか確認
    const tag = await prisma.tag.findUnique({
      where: { id: Number(tagId) }
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // 既に関連付けが存在するか確認
    const existingTaskTag = await prisma.taskTag.findUnique({
      where: {
        taskId_tagId: {
          taskId: Number(taskId),
          tagId: Number(tagId)
        }
      }
    });

    if (existingTaskTag) {
      return NextResponse.json({ error: 'Tag is already assigned to this task' }, { status: 409 });
    }

    // タスクとタグを関連付け
    const taskTag = await prisma.taskTag.create({
      data: {
        taskId: Number(taskId),
        tagId: Number(tagId)
      }
    });

    return NextResponse.json(taskTag, { status: 201 });
  } catch (error) {
    console.error('Error assigning tag to task:', error);
    return NextResponse.json({ error: 'Failed to assign tag to task' }, { status: 500 });
  }
}

// タスクからタグを削除
export async function DELETE(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const tagId = searchParams.get('tagId');

    if (!taskId || !tagId) {
      return NextResponse.json({ error: 'Task ID and Tag ID are required' }, { status: 400 });
    }

    // タスクの所有者を確認
    const task = await prisma.task.findUnique({
      where: { id: Number(taskId) }
    });

    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or task not found' }, { status: 403 });
    }

    // 関連付けが存在するか確認
    const taskTag = await prisma.taskTag.findUnique({
      where: {
        taskId_tagId: {
          taskId: Number(taskId),
          tagId: Number(tagId)
        }
      }
    });

    if (!taskTag) {
      return NextResponse.json({ error: 'Tag is not assigned to this task' }, { status: 404 });
    }

    // タスクとタグの関連付けを削除
    await prisma.taskTag.delete({
      where: {
        taskId_tagId: {
          taskId: Number(taskId),
          tagId: Number(tagId)
        }
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error removing tag from task:', error);
    return NextResponse.json({ error: 'Failed to remove tag from task' }, { status: 500 });
  }
}
