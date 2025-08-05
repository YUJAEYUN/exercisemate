'use client';

import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  activePattern: string;
}

const navItems: NavItem[] = [
  {
    icon: BarChart3,
    label: '대시보드',
    href: '/dashboard',
    activePattern: '^/dashboard'
  },
  {
    icon: Users,
    label: '그룹',
    href: '/group',
    activePattern: '^/group'
  },
  {
    icon: Settings,
    label: '설정',
    href: '/settings',
    activePattern: '^/settings'
  }
];

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  // 로그인하지 않은 사용자나 로딩 중일 때는 네비게이션바 숨김
  if (loading || !user) {
    return null;
  }

  // 로그인 페이지에서는 네비게이션바 숨김
  if (pathname === '/' && !user) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[9999] shadow-lg">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = new RegExp(item.activePattern).test(pathname);
            
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors min-w-0 flex-1',
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon className={cn('w-5 h-5 mb-1', isActive ? 'text-blue-600' : 'text-gray-600')} />
                <span className={cn(
                  'text-xs font-medium truncate',
                  isActive ? 'text-blue-600' : 'text-gray-600'
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
