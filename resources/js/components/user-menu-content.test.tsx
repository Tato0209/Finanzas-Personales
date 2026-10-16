import { type User } from '@/types';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMenuContent } from './user-menu-content';

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenuGroup: ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
    ),
    DropdownMenuItem: ({
        children,
        onClick,
    }: {
        children: ReactNode;
        onClick?: () => void;
    }) => <div onClick={onClick}>{children}</div>,
    DropdownMenuLabel: ({ children }: { children: ReactNode }) => (
        <div>{children}</div>
    ),
    DropdownMenuSeparator: () => <hr />,
}));

vi.mock('@/components/user-info', () => ({
    UserInfo: () => <div>User</div>,
}));

vi.mock('@/contexts/privacy-mode-context', () => ({
    usePrivacyMode: () => ({
        isPrivacyModeEnabled: false,
        togglePrivacyMode: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-mobile-navigation', () => ({
    useMobileNavigation: () => vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        ...props
    }: {
        children: ReactNode;
        // Wayfinder hands `Link` a route object; only the raw <a> links are strings.
        href: string | { url: string };
        as?: string;
        prefetch?: boolean;
    }) => {
        delete props.as;
        delete props.prefetch;

        return (
            <a href={typeof href === 'string' ? href : href.url} {...props}>
                {children}
            </a>
        );
    },
    router: {
        flushAll: vi.fn(),
    },
    usePage: () => ({
        props: {
            version: 'test-version',
            auth: { isAdmin },
        },
    }),
}));

/** Flipped per test: the Admin item is the one thing the menu gates on it. */
let isAdmin = false;

beforeEach(() => {
    isAdmin = false;
});

const user: User = {
    id: '0194d20b-2b25-7000-8000-000000000001',
    name: 'Test User',
    email: 'test@example.com',
    currency_code: 'USD',
    locale: 'en',
    format_locale: 'en-US',
    timezone: 'UTC',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00.000000Z',
    updated_at: '2026-01-01T00:00:00.000000Z',
};

describe('UserMenuContent', () => {
    it('renders monthly summaries, appearance, and settings', () => {
        render(<UserMenuContent user={user} />);

        expect(
            screen.getByRole('link', { name: /monthly summaries/i }),
        ).toBeDefined();
        expect(screen.getByRole('link', { name: /appearance/i })).toBeDefined();
        expect(screen.getByRole('link', { name: /settings/i })).toBeDefined();
    });

    it('renders the log out button', () => {
        render(<UserMenuContent user={user} />);

        expect(screen.getByRole('link', { name: /log out/i })).toBeDefined();
    });

    it('hides the admin link from everyone but the admin', () => {
        render(<UserMenuContent user={user} />);

        expect(screen.queryByText('Admin')).toBeNull();
    });

    it('links the admin to /admin', () => {
        isAdmin = true;

        render(<UserMenuContent user={user} />);

        expect(
            screen.getByRole('link', { name: /admin/i }).getAttribute('href'),
        ).toBe('/admin');
    });
});
