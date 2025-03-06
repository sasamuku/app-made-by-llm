import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import prisma from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Supabaseクライアントを作成
    const supabase = createRouteHandlerClient({ cookies });

    // 認証セッションを取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

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
    // Supabaseクライアントを作成
    const supabase = createRouteHandlerClient({ cookies });

    // 認証セッションを取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
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
    // Supabaseクライアントを作成
    const supabase = createRouteHandlerClient({ cookies });

    // 認証セッションを取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
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
    // Supabaseクライアントを作成
    const supabase = createRouteHandlerClient({ cookies });

    // 認証セッションを取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
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
