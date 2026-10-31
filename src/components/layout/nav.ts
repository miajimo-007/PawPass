import { ClipboardList, HeartPulse, House, PawPrint, UserRound, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/cats', label: 'My Cats', icon: PawPrint },
  { to: '/health', label: 'Health', icon: HeartPulse },
  { to: '/records', label: 'Records', icon: ClipboardList },
  { to: '/profile', label: 'Profile', icon: UserRound },
];
