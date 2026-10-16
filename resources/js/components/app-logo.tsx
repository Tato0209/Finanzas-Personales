import { cn } from '@/lib/utils';
import AppLogoIcon from './app-logo-icon';

export default function AppLogo({ mobile }: { mobile?: boolean }) {
    return (
        <div className="flex items-center gap-2.5">
            <div
                className={cn([
                    'flex aspect-square size-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-400',
                    { 'size-7': mobile },
                ])}
            >
                <AppLogoIcon className="size-5" />
            </div>
            {!mobile && (
                <div className="grid flex-1 text-left">
                    <span className="truncate font-sans text-sm font-bold tracking-tight text-foreground">
                        Finanzas Personales
                    </span>
                    <span className="-mt-0.5 truncate text-[10px] font-medium text-muted-foreground">
                        Control & Gestión
                    </span>
                </div>
            )}
        </div>
    );
}
