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

// レポートを生成
export async function GET(request: NextRequest) {
  try {
    // トークンからユーザーIDを取得
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const type = searchParams.get('type') || 'productivity';
    const format = searchParams.get('format') || 'json';
    const projectId = searchParams.get('projectId');

    // 日付範囲のバリデーション
    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    // レポートタイプに基づいてデータを取得
    let reportData: Record<string, any>;
    switch (type) {
      case 'productivity':
        reportData = await generateProductivityReport(userId, startDate, endDate);
        break;
      case 'project':
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID is required for project report' }, { status: 400 });
        }
        reportData = await generateProjectReport(userId, startDate, endDate, Number(projectId));
        break;
      case 'team':
        reportData = await generateTeamReport(userId, startDate, endDate);
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // レポート形式に基づいてレスポンスを生成
    switch (format) {
      case 'json':
        return NextResponse.json(reportData);
      case 'csv':
        return generateCsvResponse(reportData, type);
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

// 生産性レポートを生成する関数
async function generateProductivityReport(userId: string, startDate: Date, endDate: Date) {
  // 期間内のタスク統計を取得
  const taskStats = await getTaskStats(userId, startDate, endDate);

  // 日別のタスク完了数を取得
  const dailyCompletions = await getDailyCompletions(userId, startDate, endDate);

  // タグ別の完了率を取得
  const tagEfficiency = await getTagEfficiency(userId, startDate, endDate);

  // 時間帯別の生産性を取得
  const hourlyProductivity = await getHourlyProductivity(userId, startDate, endDate);

  // 平均タスク完了時間を計算
  const averageCompletionTime = await getAverageCompletionTime(userId, startDate, endDate);

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    },
    taskStats,
    dailyCompletions,
    tagEfficiency,
    hourlyProductivity,
    averageCompletionTime
  };
}

// プロジェクトレポートを生成する関数
async function generateProjectReport(userId: string, startDate: Date, endDate: Date, projectId: number) {
  // プロジェクトの基本情報を取得
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!project) {
    throw new Error('Project not found or unauthorized');
  }

  // プロジェクト内のタスク統計を取得
  const taskStats = await getTaskStats(userId, startDate, endDate, projectId);

  // プロジェクト内のタスク完了の進捗を取得
  const taskProgress = await getProjectTaskProgress(projectId, startDate, endDate);

  // プロジェクト内のタグ別タスク分布を取得
  const tagDistribution = await getProjectTagDistribution(projectId, startDate, endDate);

  // プロジェクト内のタスク活動履歴を取得
  const recentActivities = await getProjectActivities(projectId, userId, startDate, endDate);

  return {
    project,
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    },
    taskStats,
    taskProgress,
    tagDistribution,
    recentActivities
  };
}

// チームレポートを生成する関数
async function generateTeamReport(userId: string, startDate: Date, endDate: Date) {
  // ユーザーが所属するチームを取得
  const teams = await prisma.teamMember.findMany({
    where: {
      userId
    },
    include: {
      team: true
    }
  });

  if (teams.length === 0) {
    return {
      message: 'User is not a member of any team',
      teams: []
    };
  }

  // チームごとのレポートを生成
  const teamReports = await Promise.all(
    teams.map(async (teamMember) => {
      const team = teamMember.team;

      // チームメンバーを取得
      const members = await prisma.teamMember.findMany({
        where: {
          teamId: team.id
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      });

      // チーム全体のタスク統計を取得
      const teamTaskStats = await getTeamTaskStats(team.id, startDate, endDate);

      // メンバーごとのタスク統計を取得
      const memberStats = await Promise.all(
        members.map(async (member) => {
          const memberTaskStats = await getTaskStats(member.userId, startDate, endDate);
          return {
            userId: member.userId,
            userName: member.user.name,
            role: member.role,
            taskStats: memberTaskStats
          };
        })
      );

      return {
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
          memberCount: members.length
        },
        members: members.map(m => ({
          id: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role
        })),
        teamTaskStats,
        memberStats
      };
    })
  );

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    },
    teamReports
  };
}

// タスク統計を取得する関数
async function getTaskStats(userId: string, startDate: Date, endDate: Date, projectId?: number) {
  const where: {
    userId: string;
    createdAt: {
      gte: Date;
      lte: Date;
    };
    projectId?: number;
  } = {
    userId,
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  };

  if (projectId) {
    where.projectId = projectId;
  }

  // 全タスク数
  const total = await prisma.task.count({
    where
  });

  // 完了タスク数
  const completed = await prisma.task.count({
    where: {
      ...where,
      status: 'DONE'
    }
  });

  // 進行中タスク数
  const inProgress = await prisma.task.count({
    where: {
      ...where,
      status: 'IN_PROGRESS'
    }
  });

  // 未着手タスク数
  const todo = await prisma.task.count({
    where: {
      ...where,
      status: 'TODO'
    }
  });

  // 期限切れタスク数
  const overdue = await prisma.task.count({
    where: {
      ...where,
      status: {
        not: 'DONE'
      },
      dueDate: {
        lt: new Date()
      }
    }
  });

  // 完了率
  const completionRate = total > 0 ? Math.round((completed / total) * 100) / 100 : 0;

  return {
    total,
    completed,
    inProgress,
    todo,
    overdue,
    completionRate
  };
}

// 日別のタスク完了数を取得する関数
async function getDailyCompletions(userId: string, startDate: Date, endDate: Date) {
  // 日付の範囲を生成
  const days: string[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    days.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 完了したタスクを取得
  const completedTasks = await prisma.taskActivity.findMany({
    where: {
      userId,
      action: 'status_changed',
      newStatus: 'DONE',
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      timestamp: true
    }
  });

  // 作成されたタスクを取得
  const createdTasks = await prisma.taskActivity.findMany({
    where: {
      userId,
      action: 'created',
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      timestamp: true
    }
  });

  // 日別にカウント
  const dailyData = days.map(day => {
    const dayStart = new Date(day);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const completedCount = completedTasks.filter(
      task => new Date(task.timestamp) >= dayStart && new Date(task.timestamp) <= dayEnd
    ).length;

    const createdCount = createdTasks.filter(
      task => new Date(task.timestamp) >= dayStart && new Date(task.timestamp) <= dayEnd
    ).length;

    return {
      date: day,
      completed: completedCount,
      created: createdCount
    };
  });

  return dailyData;
}

// タグ別の完了率を取得する関数
async function getTagEfficiency(userId: string, startDate: Date, endDate: Date) {
  // タグとそれに関連するタスクタグを取得
  const tags = await prisma.tag.findMany();

  // 各タグに関連するタスクタグを取得
  const tagEfficiencyData = await Promise.all(
    tags.map(async (tag) => {
      // このタグに関連するタスクタグを取得
      const taskTags = await prisma.taskTag.findMany({
        where: {
          tagId: tag.id
        },
        include: {
          task: {
            where: {
              userId,
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            }
          }
        }
      });

      // ユーザーのタスクのみをフィルタリング
      const userTasks = taskTags.filter(taskTag => taskTag.task !== null);
      const taskCount = userTasks.length;

      if (taskCount === 0) {
        return null;
      }

      const completedCount = userTasks.filter(taskTag => taskTag.task.status === 'DONE').length;
      const completionRate = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) / 100 : 0;

      // 完了したタスクの平均完了時間を計算
      const completedTasks = userTasks.filter(taskTag =>
        taskTag.task.status === 'DONE' &&
        taskTag.task.startedAt &&
        taskTag.task.completedAt
      );

      let averageCompletionTime = 0;
      if (completedTasks.length > 0) {
        const totalCompletionTime = completedTasks.reduce((sum, taskTag) => {
          const startedAt = new Date(taskTag.task.startedAt!);
          const completedAt = new Date(taskTag.task.completedAt!);
          return sum + (completedAt.getTime() - startedAt.getTime());
        }, 0);

        // ミリ秒から時間に変換
        averageCompletionTime = Math.round((totalCompletionTime / completedTasks.length) / (1000 * 60 * 60) * 10) / 10;
      }

      return {
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        taskCount,
        completedCount,
        completionRate,
        averageCompletionTime
      };
    })
  );

  // nullを除外して結果を返す
  return tagEfficiencyData.filter(tag => tag !== null);
}

// 時間帯別の生産性を取得する関数
async function getHourlyProductivity(userId: string, startDate: Date, endDate: Date) {
  // 完了したタスクの活動を取得
  const completionActivities = await prisma.taskActivity.findMany({
    where: {
      userId,
      action: 'status_changed',
      newStatus: 'DONE',
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      timestamp: true
    }
  });

  // 時間帯別にカウント
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const count = completionActivities.filter(activity => {
      const activityHour = new Date(activity.timestamp).getHours();
      return activityHour === hour;
    }).length;

    return {
      hour,
      count
    };
  });

  return hourlyData;
}

// 平均タスク完了時間を計算する関数
async function getAverageCompletionTime(userId: string, startDate: Date, endDate: Date) {
  // 完了したタスクを取得
  const completedTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'DONE',
      startedAt: {
        not: null
      },
      completedAt: {
        not: null,
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      startedAt: true,
      completedAt: true
    }
  });

  if (completedTasks.length === 0) {
    return {
      averageHours: 0,
      totalTasks: 0
    };
  }

  // 平均完了時間を計算
  const totalCompletionTime = completedTasks.reduce((sum, task) => {
    const startedAt = new Date(task.startedAt!);
    const completedAt = new Date(task.completedAt!);
    return sum + (completedAt.getTime() - startedAt.getTime());
  }, 0);

  // ミリ秒から時間に変換
  const averageHours = Math.round((totalCompletionTime / completedTasks.length) / (1000 * 60 * 60) * 10) / 10;

  return {
    averageHours,
    totalTasks: completedTasks.length
  };
}

// プロジェクトのタスク進捗を取得する関数
async function getProjectTaskProgress(projectId: number, startDate: Date, endDate: Date) {
  // プロジェクト内のタスクを取得
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      completedAt: true
    }
  });

  // ステータス別にグループ化
  const statusGroups = {
    TODO: tasks.filter(task => task.status === 'TODO'),
    IN_PROGRESS: tasks.filter(task => task.status === 'IN_PROGRESS'),
    DONE: tasks.filter(task => task.status === 'DONE')
  };

  // 完了率を計算
  const totalTasks = tasks.length;
  const completedTasks = statusGroups.DONE.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) / 100 : 0;

  return {
    totalTasks,
    statusGroups,
    completionRate
  };
}

// プロジェクトのタグ分布を取得する関数
async function getProjectTagDistribution(projectId: number, startDate: Date, endDate: Date) {
  // プロジェクト内のタスクIDを取得
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      id: true
    }
  });

  const taskIds = tasks.map(task => task.id);

  if (taskIds.length === 0) {
    return [];
  }

  // タスクに関連付けられたタグを取得
  const taskTags = await prisma.taskTag.findMany({
    where: {
      taskId: {
        in: taskIds
      }
    },
    include: {
      tag: true
    }
  });

  // タグごとにカウント
  const tagCounts: Record<number, { tag: any; count: number }> = {};
  taskTags.forEach(taskTag => {
    const tagId = taskTag.tag.id;
    if (!tagCounts[tagId]) {
      tagCounts[tagId] = {
        tag: taskTag.tag,
        count: 0
      };
    }
    tagCounts[tagId].count++;
  });

  return Object.values(tagCounts).map(item => ({
    tagId: item.tag.id,
    tagName: item.tag.name,
    tagColor: item.tag.color,
    count: item.count,
    percentage: Math.round((item.count / taskIds.length) * 100) / 100
  }));
}

// プロジェクトの活動履歴を取得する関数
async function getProjectActivities(projectId: number, userId: string, startDate: Date, endDate: Date) {
  // プロジェクト内のタスクIDを取得
  const tasks = await prisma.task.findMany({
    where: {
      projectId
    },
    select: {
      id: true,
      title: true
    }
  });

  const taskIds = tasks.map(task => task.id);

  if (taskIds.length === 0) {
    return [];
  }

  // タスクの活動履歴を取得
  const activities = await prisma.taskActivity.findMany({
    where: {
      taskId: {
        in: taskIds
      },
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    }
  });

  // タスクタイトルを追加
  return activities.map(activity => {
    const task = tasks.find(t => t.id === activity.taskId);
    return {
      ...activity,
      taskTitle: task?.title || 'Unknown Task'
    };
  });
}

// チームのタスク統計を取得する関数
async function getTeamTaskStats(teamId: number, startDate: Date, endDate: Date) {
  // チームメンバーを取得
  const members = await prisma.teamMember.findMany({
    where: {
      teamId
    },
    select: {
      userId: true
    }
  });

  const memberIds = members.map(member => member.userId);

  // チーム全体のタスク統計
  const total = await prisma.task.count({
    where: {
      userId: {
        in: memberIds
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  const completed = await prisma.task.count({
    where: {
      userId: {
        in: memberIds
      },
      status: 'DONE',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  const inProgress = await prisma.task.count({
    where: {
      userId: {
        in: memberIds
      },
      status: 'IN_PROGRESS',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  const todo = await prisma.task.count({
    where: {
      userId: {
        in: memberIds
      },
      status: 'TODO',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  const completionRate = total > 0 ? Math.round((completed / total) * 100) / 100 : 0;

  return {
    total,
    completed,
    inProgress,
    todo,
    completionRate
  };
}

// CSVレスポンスを生成する関数
function generateCsvResponse(data: any, reportType: string) {
  let csvContent = '';

  switch (reportType) {
    case 'productivity':
      csvContent = generateProductivityCsv(data);
      break;
    case 'project':
      csvContent = generateProjectCsv(data);
      break;
    case 'team':
      csvContent = generateTeamCsv(data);
      break;
    default:
      csvContent = 'Invalid report type';
  }

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${reportType}_report.csv"`
    }
  });
}

// 生産性レポートのCSVを生成する関数
function generateProductivityCsv(data: any) {
  let csv = 'Period,Start Date,End Date\n';
  csv += `Period,${data.period.startDate},${data.period.endDate}\n\n`;

  csv += 'Task Statistics,Total,Completed,In Progress,Todo,Overdue,Completion Rate\n';
  csv += `Task Statistics,${data.taskStats.total},${data.taskStats.completed},${data.taskStats.inProgress},${data.taskStats.todo},${data.taskStats.overdue},${data.taskStats.completionRate}\n\n`;

  csv += 'Daily Completions,Date,Completed,Created\n';
  data.dailyCompletions.forEach((day: any) => {
    csv += `Daily Completions,${day.date},${day.completed},${day.created}\n`;
  });
  csv += '\n';

  csv += 'Tag Efficiency,Tag ID,Tag Name,Task Count,Completed Count,Completion Rate,Average Completion Time (hours)\n';
  data.tagEfficiency.forEach((tag: any) => {
    csv += `Tag Efficiency,${tag.tagId},${tag.tagName},${tag.taskCount},${tag.completedCount},${tag.completionRate},${tag.averageCompletionTime}\n`;
  });
  csv += '\n';

  csv += 'Hourly Productivity,Hour,Task Count\n';
  data.hourlyProductivity.forEach((hour: any) => {
    csv += `Hourly Productivity,${hour.hour},${hour.count}\n`;
  });
  csv += '\n';

  csv += 'Average Completion Time,Hours,Total Tasks\n';
  csv += `Average Completion Time,${data.averageCompletionTime.averageHours},${data.averageCompletionTime.totalTasks}\n`;

  return csv;
}

// プロジェクトレポートのCSVを生成する関数
function generateProjectCsv(data: any) {
  let csv = 'Project,ID,Name,Description,Created At,Updated At\n';
  csv += `Project,${data.project.id},${data.project.name},${data.project.description || ''},${data.project.createdAt},${data.project.updatedAt}\n\n`;

  csv += 'Period,Start Date,End Date\n';
  csv += `Period,${data.period.startDate},${data.period.endDate}\n\n`;

  csv += 'Task Statistics,Total,Completed,In Progress,Todo,Overdue,Completion Rate\n';
  csv += `Task Statistics,${data.taskStats.total},${data.taskStats.completed},${data.taskStats.inProgress},${data.taskStats.todo},${data.taskStats.overdue},${data.taskStats.completionRate}\n\n`;

  csv += 'Task Progress,Total Tasks,Completed Tasks,Completion Rate\n';
  csv += `Task Progress,${data.taskProgress.totalTasks},${data.taskProgress.statusGroups.DONE.length},${data.taskProgress.completionRate}\n\n`;

  csv += 'Tag Distribution,Tag ID,Tag Name,Count,Percentage\n';
  data.tagDistribution.forEach((tag: any) => {
    csv += `Tag Distribution,${tag.tagId},${tag.tagName},${tag.count},${tag.percentage}\n`;
  });

  return csv;
}

// チームレポートのCSVを生成する関数
function generateTeamCsv(data: any) {
  let csv = 'Period,Start Date,End Date\n';
  csv += `Period,${data.period.startDate},${data.period.endDate}\n\n`;

  data.teamReports.forEach((teamReport: any) => {
    csv += `Team,ID,Name,Description,Member Count\n`;
    csv += `Team,${teamReport.team.id},${teamReport.team.name},${teamReport.team.description || ''},${teamReport.team.memberCount}\n\n`;

    csv += 'Team Task Statistics,Total,Completed,In Progress,Todo,Completion Rate\n';
    csv += `Team Task Statistics,${teamReport.teamTaskStats.total},${teamReport.teamTaskStats.completed},${teamReport.teamTaskStats.inProgress},${teamReport.teamTaskStats.todo},${teamReport.teamTaskStats.completionRate}\n\n`;

    csv += 'Members,User ID,Name,Email,Role\n';
    teamReport.members.forEach((member: any) => {
      csv += `Members,${member.id},${member.name || ''},${member.email},${member.role}\n`;
    });
    csv += '\n';

    csv += 'Member Statistics,User ID,Name,Role,Total Tasks,Completed Tasks,Completion Rate\n';
    teamReport.memberStats.forEach((member: any) => {
      csv += `Member Statistics,${member.userId},${member.userName || ''},${member.role},${member.taskStats.total},${member.taskStats.completed},${member.taskStats.completionRate}\n`;
    });
    csv += '\n';
  });

  return csv;
}
