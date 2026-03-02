'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Calendar,
  User,
  MessageSquare,
  ArrowLeft,
  Eye,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string | null;
    email: string;
  };
  _count: {
    chatMessages: number;
    canvas_nodes: number;
  };
}

export default function AdminProjectsPage() {
  const session = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/projects');
      if (response.status === 403) {
        router.push('/');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const filterProjects = useCallback(() => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          project.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm]);

  useEffect(() => {
    if (session?.status === 'unauthenticated') {
      router.push('/api/auth/signin');
      return;
    }

    if (session?.data) {
      fetchProjects();
    }
  }, [session?.data, session?.status, router, fetchProjects]);

  useEffect(() => {
    filterProjects();
  }, [filterProjects]);

  const deleteProject = async (projectId: string) => {
    if (
      !confirm(
        'このプロジェクトを削除してもよろしいですか？この操作は取り消せません。',
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProjects(projects.filter((p) => p.id !== projectId));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
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
            プロジェクト管理
          </h1>
          <p className="text-gray-600">全プロジェクトの監視と管理</p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="プロジェクト名、説明、またはユーザーで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      <Badge variant="outline">
                        {project._count.canvas_nodes} コンポーネント
                      </Badge>
                    </div>

                    {project.description && (
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{project.user.name || project.user.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          作成:{' '}
                          {new Date(project.createdAt).toLocaleDateString(
                            'ja-JP',
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          更新:{' '}
                          {new Date(project.updatedAt).toLocaleDateString(
                            'ja-JP',
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{project._count.chatMessages} メッセージ</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/admin/projects/${project.id}`)
                      }
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      詳細
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteProject(project.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      削除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              {searchTerm
                ? '条件に一致するプロジェクトが見つかりません。'
                : 'プロジェクトがありません。'}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {projects.length}
                </p>
                <p className="text-sm text-gray-600">総プロジェクト数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {projects.reduce((sum, p) => sum + p._count.canvas_nodes, 0)}
                </p>
                <p className="text-sm text-gray-600">総コンポーネント数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {projects.reduce((sum, p) => sum + p._count.chatMessages, 0)}
                </p>
                <p className="text-sm text-gray-600">総チャットメッセージ数</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
