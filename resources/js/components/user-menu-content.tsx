import { index as adminIndex } from '@/actions/App/Http/Controllers/AdminController';
import DiscordIcon from '@/components/icons/DiscordIcon';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import accounts from '@/routes/accounts';
import { index as progress } from '@/routes/achievements';
import { edit as editAppearance } from '@/routes/appearance';
import documentation from '@/routes/documentation';
import { index as monthlySummaries } from '@/routes/monthly-summaries';
import { type SharedData, type User } from '@/types';
import { __ } from '@/utils/i18n';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Award,
    BookOpen,
    Eye,
    EyeOff,
    FileText,
    Landmark,
    LifeBuoy,
    LogOut,
    Map,
    MessageSquare,
    Monitor,
    Settings,
    Shield,
} from 'lucide-react';

interface UserMenuContentProps {
    user: User;
    onOpenSupport: () => void;
    onOpenIntegrationRequests: () => void;
}

export function UserMenuContent({
    user,
    onOpenSupport,
    onOpenIntegrationRequests,
}: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const { auth, version, achievements } = usePage<SharedData>().props;

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* What already happened: the medals, and the months we closed.
                Still out of the main navigation, but no longer only somewhere
                to look back at: the streak pill in the header now hangs the two
                live challenges off this same screen, and its footer lands here.
                This entry is the full record; the pill is the bit worth chasing
                today. */}
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full"
                        href={monthlySummaries()}
                        as="button"
                        prefetch
                        onClick={cleanup}
                    >
                        <FileText className="mr-2" />
                        {__('Monthly summaries')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full"
                        href={editAppearance()}
                        as="button"
                        prefetch
                        onClick={cleanup}
                    >
                        <Monitor className="mr-2" />
                        {__('Appearance')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full"
                        href={accounts.index()}
                        as="button"
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        {__('Settings')}
                    </Link>
                </DropdownMenuItem>
                {auth.isAdmin && (
                    <DropdownMenuItem asChild>
                        <Link
                            className="block w-full"
                            href={adminIndex()}
                            as="button"
                            onClick={cleanup}
                        >
                            <Shield className="mr-2" />
                            {__('Admin')}
                        </Link>
                    </DropdownMenuItem>
                )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground">
                <span>{__('Version:')}</span>
                <span>{version}</span>
            </div>
        </>
    );
}
