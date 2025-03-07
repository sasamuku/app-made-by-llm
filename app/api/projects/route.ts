import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/app/lib/prisma';
import { syncUserWithDatabase } from '@/app/lib/server-auth';

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

    // ユーザーのプロジェクトを取得
    const projects = await prisma.project.findMany({
      where: {
        userId: userId
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
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

    const { name, description } = await request.json();

    // プロジェクトを作成
    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, name, description } = await request.json();

    // プロジェクトの所有者を確認
    const existingProject = await prisma.project.findUnique({
      where: { id: Number(id) }
    });

    if (!existingProject || existingProject.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or project not found' }, { status: 403 });
    }

    // プロジェクトを更新
    const project = await prisma.project.update({
      where: { id: Number(id) },
      data: {
        name,
        description
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
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
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // プロジェクトの所有者を確認
    const existingProject = await prisma.project.findUnique({
      where: { id: Number(id) }
    });

    if (!existingProject || existingProject.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized or project not found' }, { status: 403 });
    }

    // 関連するタスクも削除する
    await prisma.$transaction([
      prisma.task.deleteMany({
        where: { projectId: Number(id) }
      }),
      prisma.project.delete({
        where: { id: Number(id) }
      })
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
