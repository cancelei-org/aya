'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Crown,
  Shield,
  Calendar,
  MessageSquare,
  FolderOpen,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  isPremium: boolean;
  isAdmin: boolean;
  chatCount: number;
  createdAt: string;
  lastActiveAt: string | null;
  _count: {
    projects: number;
    chatUsage: number;
  };
}

export default function AdminUsersPage() {
  const session = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'premium' | 'admin' | 'active'
  >('all');

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.status === 403) {
        router.push('/');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const filterUsers = useCallback(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'premium':
        filtered = filtered.filter((user) => user.isPremium);
        break;
      case 'admin':
        filtered = filtered.filter((user) => user.isAdmin);
        break;
      case 'active':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(
          (user) =>
            user.lastActiveAt && new Date(user.lastActiveAt) > thirtyDaysAgo,
        );
        break;
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterType]);

  useEffect(() => {
    if (session?.status === 'unauthenticated') {
      router.push('/api/auth/signin');
      return;
    }

    if (session?.data) {
      fetchUsers();
    }
  }, [session?.data, session?.status, router, fetchUsers]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const toggleUserStatus = async (
    userId: string,
    field: 'isPremium' | 'isAdmin',
    currentValue: boolean,
  ) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentValue }),
      });

      if (response.ok) {
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, [field]: !currentValue } : user,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  if (session?.status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!session?.data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                ダッシュボードに戻る
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ユーザー管理
          </h1>
          <p className="text-gray-600">全ユーザーの管理と監視</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="ユーザー名またはメールアドレスで検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterType('all')}
                  size="sm"
                >
                  全て ({users.length})
                </Button>
                <Button
                  variant={filterType === 'premium' ? 'default' : 'outline'}
                  onClick={() => setFilterType('premium')}
                  size="sm"
                >
                  プレミアム ({users.filter((u) => u.isPremium).length})
                </Button>
                <Button
                  variant={filterType === 'admin' ? 'default' : 'outline'}
                  onClick={() => setFilterType('admin')}
                  size="sm"
                >
                  管理者 ({users.filter((u) => u.isAdmin).length})
                </Button>
                <Button
                  variant={filterType === 'active' ? 'default' : 'outline'}
                  onClick={() => setFilterType('active')}
                  size="sm"
                >
                  アクティブ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.name?.charAt(0) ||
                        user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">
                          {user.name || 'Unknown'}
                        </h3>
                        {user.isPremium && (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800"
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                        {user.isAdmin && (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600">{user.email}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          登録:{' '}
                          {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                        </div>
                        {user.lastActiveAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            最終活動:{' '}
                            {new Date(user.lastActiveAt).toLocaleDateString(
                              'ja-JP',
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Stats */}
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-gray-500">
                          <FolderOpen className="h-4 w-4" />
                          <span>{user._count.projects}</span>
                        </div>
                        <p className="text-xs text-gray-400">プロジェクト</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-gray-500">
                          <MessageSquare className="h-4 w-4" />
                          <span>{user._count.chatUsage}</span>
                        </div>
                        <p className="text-xs text-gray-400">チャット</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant={user.isPremium ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          toggleUserStatus(user.id, 'isPremium', user.isPremium)
                        }
                      >
                        {user.isPremium ? 'Premium解除' : 'Premium付与'}
                      </Button>
                      <Button
                        variant={user.isAdmin ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() =>
                          toggleUserStatus(user.id, 'isAdmin', user.isAdmin)
                        }
                      >
                        {user.isAdmin ? 'Admin解除' : 'Admin付与'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              条件に一致するユーザーが見つかりません。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
