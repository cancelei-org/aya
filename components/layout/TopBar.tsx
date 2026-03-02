'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ExternalLink,
  User,
  Settings,
  LogOut,
  Undo,
  Redo,
  Shield,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStores } from '@/hooks/useStores';
import { useSession } from 'next-auth/react';
import { handleSignOut } from '@/utils/ui/unifiedUiUtils';
import { useRouter } from 'next/navigation';
import { isUserAdmin } from '@/lib/admin-auth';
import BulkDeleteDialog from '@/components/dialogs/BulkDeleteDialog';

export function TopBar() {
  // Get all state from stores
  const { data: session } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const {
    chatLimit,
    currentProject,
    isProcessing,
    isSaving,
    activeTab: _activeTab,
    setActiveTab: _setActiveTab,
    canUndo,
    canRedo,
    handleUndo: onUndo,
    handleRedo: onRedo,
  } = useStores();
  const [headerSize, setHeaderSize] = useState({
    height: 'h-14',
    logoSize: 'h-8',
    fontSize: 'text-base',
    padding: 'px-4',
    gap: 'gap-4',
  });

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/admin/dashboard');
          setIsAdmin(response.ok);
        } catch (error) {
          setIsAdmin(false);
        }
      }
    };

    checkAdminStatus();
  }, [session?.user?.email]);

  // Debug: Log session status
  useEffect(() => {
    console.log('TopBar session status:', {
      status: session ? 'authenticated' : 'not authenticated',
      user: session?.user,
      email: session?.user?.email,
    });
  }, [session]);

  useEffect(() => {
    const updateHeaderSize = () => {
      const width = window.innerWidth;

      // iPad detection (768px - 1024px width, touch device)
      const isIPad = width >= 768 && width <= 1024 && 'ontouchstart' in window;

      // Large monitor detection (width > 1440px)
      const isLargeMonitor = width > 1440;

      // Mac/Desktop detection (width > 1024px, no touch)
      const isMacDesktop = width > 1024 && !('ontouchstart' in window);

      if (isIPad) {
        // iPad: smaller header (h-8)
        setHeaderSize({
          height: 'h-8',
          logoSize: 'h-5',
          fontSize: 'text-sm',
          padding: 'px-2',
          gap: 'gap-2',
        });
      } else if (isLargeMonitor) {
        // Large monitor: larger header
        setHeaderSize({
          height: 'h-16',
          logoSize: 'h-10',
          fontSize: 'text-lg',
          padding: 'px-6',
          gap: 'gap-6',
        });
      } else if (isMacDesktop) {
        // Mac/Desktop: standard header
        setHeaderSize({
          height: 'h-14',
          logoSize: 'h-8',
          fontSize: 'text-base',
          padding: 'px-4',
          gap: 'gap-4',
        });
      } else {
        // Mobile: compact header
        setHeaderSize({
          height: 'h-12',
          logoSize: 'h-6',
          fontSize: 'text-sm',
          padding: 'px-2',
          gap: 'gap-2',
        });
      }
    };

    // Initial size calculation
    updateHeaderSize();

    // Listen for window resize
    window.addEventListener('resize', updateHeaderSize);

    return () => {
      window.removeEventListener('resize', updateHeaderSize);
    };
  }, []);

  return (
    <>
      {/* Top Bar */}
      <div
        className={`${headerSize.height} border-b bg-background ${headerSize.padding} flex items-center justify-between`}
      >
        <div className={`flex items-center ${headerSize.gap}`}>
          <div className="flex items-center gap-2">
            <img
              src="/aya-logo.jpg"
              alt="AYA Logo"
              className={`${headerSize.logoSize} w-auto`}
            />
            <span className={`font-semibold ${headerSize.fontSize}`}>AYA</span>
          </div>
          {/* Chat Limit Display */}
          {chatLimit && (
            <div className="flex items-center gap-2 text-sm">
              {chatLimit.isPremium ? (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Premium - Unlimited
                </span>
              ) : (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    chatLimit.chatCount >= 80
                      ? 'bg-red-100 text-red-800'
                      : chatLimit.chatCount >= 50
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  Chats: {chatLimit.chatCount}/100
                </span>
              )}
            </div>
          )}
          {/* Processing Indicator */}
          {currentProject && (
            <div className="flex items-center gap-2 text-sm">
              {isProcessing || isSaving ? (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium animate-pulse">
                  {isSaving ? 'Saving...' : 'Processing...'}
                </span>
              ) : (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Ready
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-1 mr-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 px-2"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className="flex items-center gap-1 px-2"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {/* Bulk Delete Button */}
          {session?.user && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Reset Project</span>
            </Button>
          )}

          {/* Request Update Button */}
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              window.open(
                'https://discord.gg/5apQWmUffq',
                '_blank',
                'noopener,noreferrer',
              );
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Request Update</span>
          </Button>
          {/* User Menu */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {session?.user?.image ? (
                    <img
                      src={session.user.image || '/placeholder.svg'}
                      alt="Profile"
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {session?.user?.name || session?.user?.email}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>管理者ダッシュボード</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="text-sm text-gray-500">No session</div>
          )}
        </div>
      </div>

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        isOpen={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
      />
    </>
  );
}
