import { cn } from '@/lib/utils';
import AppLogoIcon from './app-logo-icon';

export default function AppLogo({ mobile }: { mobile?: boolean }) {
    return (
        <div className="flex items-center gap-2.5">
            <div
                className={cn([
                    'flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30 shadow-xs',
                    { 'size-7': mobile },
                ])}
            >
                <AppLogoIcon className="size-5" />
            </div>
            {!mobile && (
                <div className="grid flex-1 text-left">
                    <span className="truncate font-bold text-sm tracking-tight text-foreground font-sans">
                        Finanzas Personales
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground font-medium -mt-0.5">
                        Control & Gestión
                    </span>
                </div>
            )}
        </div>
    );
}
