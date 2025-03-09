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

// 生産性目標を取得
export async function GET(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // 検索条件を構築
    const where: {
      userId: string;
      endDate?: {
        gte?: Date;
      };
    } = {
      userId
    };

    // アクティブな目標のみを取得する場合
    if (activeOnly) {
      const now = new Date();
      where.endDate = {
        gte: now
      };
    }

    // 生産性目標を取得
    const goals = await prisma.productivityGoal.findMany({
      where,
      orderBy: [
        { startDate: 'asc' }
      ]
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error('Error fetching productivity goals:', error);
    return NextResponse.json({ error: 'Failed to fetch productivity goals' }, { status: 500 });
  }
}

// 新しい生産性目標を作成
export async function POST(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { title, description, targetType, targetValue, startDate, endDate } = data;

    // バリデーション
    if (!title || !targetType || !targetValue || !startDate) {
      return NextResponse.json({
        error: 'Title, target type, target value, and start date are required'
      }, { status: 400 });
    }

    // 生産性目標を作成
    const goal = await prisma.productivityGoal.create({
      data: {
        userId,
        title,
        description,
        targetType,
        targetValue,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        achieved: false,
        progress: 0
      }
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Error creating productivity goal:', error);
    return NextResponse.json({ error: 'Failed to create productivity goal' }, { status: 500 });
  }
}

// 生産性目標を更新
export async function PUT(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id, title, description, targetType, targetValue, startDate, endDate, achieved, progress } = data;

    // バリデーション
    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    // 目標の所有者を確認
    const existingGoal = await prisma.productivityGoal.findUnique({
      where: { id: Number(id) }
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (existingGoal.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to update this goal' }, { status: 403 });
    }

    // 更新データを準備
    const updateData: {
      title?: string;
      description?: string | null;
      targetType?: string;
      targetValue?: number;
      startDate?: Date;
      endDate?: Date | null;
      achieved?: boolean;
      progress?: number;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetType !== undefined) updateData.targetType = targetType;
    if (targetValue !== undefined) updateData.targetValue = targetValue;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (achieved !== undefined) updateData.achieved = achieved;
    if (progress !== undefined) updateData.progress = progress;

    // 生産性目標を更新
    const goal = await prisma.productivityGoal.update({
      where: { id: Number(id) },
      data: updateData
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error updating productivity goal:', error);
    return NextResponse.json({ error: 'Failed to update productivity goal' }, { status: 500 });
  }
}

// 生産性目標を削除
export async function DELETE(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    // 目標の所有者を確認
    const existingGoal = await prisma.productivityGoal.findUnique({
      where: { id: Number(id) }
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (existingGoal.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this goal' }, { status: 403 });
    }

    // 生産性目標を削除
    await prisma.productivityGoal.delete({
      where: { id: Number(id) }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting productivity goal:', error);
    return NextResponse.json({ error: 'Failed to delete productivity goal' }, { status: 500 });
  }
}
