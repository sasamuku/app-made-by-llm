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

// タグ一覧を取得
export async function GET(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      console.error('Unauthorized: No user ID found in token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching tags for user:', userId);

    try {
      // すべてのタグを取得
      const tags = await prisma.tag.findMany({
        include: {
          _count: {
            select: { tasks: true }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log('Tags fetched successfully:', tags.length);
      return NextResponse.json(tags);
    } catch (prismaError) {
      console.error('Prisma error fetching tags:', prismaError);
      // エラーが発生しても空の配列を返す
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching tags:', error);
    // エラーが発生しても空の配列を返す
    return NextResponse.json([]);
  }
}

// 新しいタグを作成
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

    const { name, color } = await request.json();

    // バリデーション
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json({ error: 'Valid color in hex format is required' }, { status: 400 });
    }

    // 同じ名前のタグが既に存在するか確認
    const existingTag = await prisma.tag.findUnique({
      where: { name }
    });

    if (existingTag) {
      return NextResponse.json({ error: 'Tag with this name already exists' }, { status: 409 });
    }

    // タグを作成
    const tag = await prisma.tag.create({
      data: {
        name,
        color
      }
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

// タグを更新
export async function PUT(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, color } = await request.json();

    // バリデーション
    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json({ error: 'Valid color in hex format is required' }, { status: 400 });
    }

    // タグが存在するか確認
    const existingTag = await prisma.tag.findUnique({
      where: { id: Number(id) },
      include: {
        tasks: {
          include: {
            task: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // ユーザーがこのタグを使用しているか確認
    const userUsesTag = existingTag.tasks.some(taskTag => taskTag.task.userId === userId);
    if (!userUsesTag) {
      return NextResponse.json({ error: 'Unauthorized to modify this tag' }, { status: 403 });
    }

    // 同じ名前の別のタグが存在するか確認
    const duplicateTag = await prisma.tag.findFirst({
      where: {
        name,
        id: {
          not: Number(id)
        }
      }
    });

    if (duplicateTag) {
      return NextResponse.json({ error: 'Another tag with this name already exists' }, { status: 409 });
    }

    // タグを更新
    const tag = await prisma.tag.update({
      where: { id: Number(id) },
      data: {
        name,
        color
      }
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// タグを削除
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
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    // タグが存在するか確認
    const existingTag = await prisma.tag.findUnique({
      where: { id: Number(id) },
      include: {
        tasks: {
          include: {
            task: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // ユーザーがこのタグを使用しているか確認
    const userUsesTag = existingTag.tasks.some(taskTag => taskTag.task.userId === userId);
    if (!userUsesTag) {
      return NextResponse.json({ error: 'Unauthorized to delete this tag' }, { status: 403 });
    }

    // タグを削除（関連するTaskTagは自動的に削除される）
    await prisma.$transaction([
      prisma.taskTag.deleteMany({
        where: { tagId: Number(id) }
      }),
      prisma.tag.delete({
        where: { id: Number(id) }
      })
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
