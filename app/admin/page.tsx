'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  MessageSquare,
  FolderOpen,
  Activity,
  TrendingUp,
  Settings,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalChatMessages: number;
  premiumUsers: number;
  feedbackCount: number;
  recentActivity: {
    newUsersToday: number;
    projectsCreatedToday: number;
    chatMessagesToday: number;
  };
}

export default function AdminDashboard() {
  const session = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminAndFetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (response.status === 403) {
        router.push('/');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (session?.status === 'unauthenticated') {
      router.push('/api/auth/signin');
      return;
    }

    if (session?.data) {
      checkAdminAndFetchStats();
    }
  }, [session?.data, session?.status, router, checkAdminAndFetchStats]);

  if (session?.status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!session?.data || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            管理者ダッシュボード
          </h1>
          <p className="text-gray-600">ORBOH システムの使用状況と管理</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      総ユーザー数
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalUsers}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      アクティブユーザー
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.activeUsers}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      総プロジェクト数
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalProjects}
                    </p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      プレミアムユーザー
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.premiumUsers}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Today's Activity */}
        {stats && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                今日のアクティビティ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.recentActivity.newUsersToday}
                  </p>
                  <p className="text-sm text-gray-600">新規ユーザー</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.recentActivity.projectsCreatedToday}
                  </p>
                  <p className="text-sm text-gray-600">新規プロジェクト</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.recentActivity.chatMessagesToday}
                  </p>
                  <p className="text-sm text-gray-600">チャットメッセージ</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Management Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold">ユーザー管理</h3>
                  <p className="text-sm text-gray-600">
                    ユーザーの詳細情報と活動状況
                  </p>
                </div>
              </div>
              <Link href="/admin/users">
                <Button className="w-full">管理画面を開く</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <FolderOpen className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="text-lg font-semibold">プロジェクト管理</h3>
                  <p className="text-sm text-gray-600">
                    全プロジェクトの監視と管理
                  </p>
                </div>
              </div>
              <Link href="/admin/projects">
                <Button className="w-full">管理画面を開く</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <MessageSquare className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold">フィードバック</h3>
                  <p className="text-sm text-gray-600">
                    ユーザーからのフィードバック
                  </p>
                </div>
              </div>
              <Link href="/admin/feedback">
                <Button className="w-full">管理画面を開く</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Activity className="h-8 w-8 text-orange-600" />
                <div>
                  <h3 className="text-lg font-semibold">システム監視</h3>
                  <p className="text-sm text-gray-600">
                    パフォーマンスとエラー監視
                  </p>
                </div>
              </div>
              <Link href="/admin/monitoring">
                <Button className="w-full">管理画面を開く</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <BarChart3 className="h-8 w-8 text-indigo-600" />
                <div>
                  <h3 className="text-lg font-semibold">分析レポート</h3>
                  <p className="text-sm text-gray-600">使用統計と分析データ</p>
                </div>
              </div>
              <Link href="/admin/analytics">
                <Button className="w-full">管理画面を開く</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Settings className="h-8 w-8 text-gray-600" />
                <div>
                  <h3 className="text-lg font-semibold">システム設定</h3>
                  <p className="text-sm text-gray-600">アプリケーション設定</p>
                </div>
              </div>
              <Link href="/admin/settings">
                <Button className="w-full">管理画面を開く</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
