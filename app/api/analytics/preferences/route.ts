import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';

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

// ユーザーの分析設定を取得
export async function GET(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーの分析設定を取得
    let preferences = await prisma.analyticsPreference.findUnique({
      where: {
        userId
      }
    });

    // 設定が存在しない場合はデフォルト設定を作成
    if (!preferences) {
      preferences = await prisma.analyticsPreference.create({
        data: {
          userId,
          dataCollectionEnabled: true,
          defaultTimeRange: 'week',
          dashboardLayout: Prisma.JsonNull
        }
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching analytics preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics preferences' }, { status: 500 });
  }
}

// ユーザーの分析設定を更新
export async function PUT(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { dataCollectionEnabled, defaultTimeRange, dashboardLayout } = data;

    // 更新データを準備
    const updateData: {
      dataCollectionEnabled?: boolean;
      defaultTimeRange?: string;
      dashboardLayout?: Prisma.InputJsonValue;
    } = {};

    if (dataCollectionEnabled !== undefined) updateData.dataCollectionEnabled = dataCollectionEnabled;
    if (defaultTimeRange !== undefined) updateData.defaultTimeRange = defaultTimeRange;
    if (dashboardLayout !== undefined) {
      updateData.dashboardLayout = dashboardLayout === null ? Prisma.JsonNull : dashboardLayout;
    }

    // バリデーション
    if (defaultTimeRange && !['day', 'week', 'month', 'year'].includes(defaultTimeRange)) {
      return NextResponse.json({
        error: 'Invalid time range. Must be one of: day, week, month, year'
      }, { status: 400 });
    }

    // ユーザーの分析設定を取得
    let preferences = await prisma.analyticsPreference.findUnique({
      where: {
        userId
      }
    });

    // 設定が存在しない場合は作成、存在する場合は更新
    if (!preferences) {
      preferences = await prisma.analyticsPreference.create({
        data: {
          userId,
          ...updateData
        }
      });
    } else {
      preferences = await prisma.analyticsPreference.update({
        where: {
          userId
        },
        data: updateData
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error updating analytics preferences:', error);
    return NextResponse.json({ error: 'Failed to update analytics preferences' }, { status: 500 });
  }
}
