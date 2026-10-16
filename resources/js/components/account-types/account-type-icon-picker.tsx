import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ACCOUNT_TYPE_ICON_MAP } from '@/types/account';
import { __ } from '@/utils/i18n';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface AccountTypeIconPickerProps {
    value: string;
    onChange: (icon: string) => void;
}

const AVAILABLE_ICONS: { key: string; label: string }[] = [
    { key: 'wallet', label: 'Billetera' },
    { key: 'banknote', label: 'Efectivo / Sueldo' },
    { key: 'piggy-bank', label: 'Ahorro' },
    { key: 'line-chart', label: 'Inversión' },
    { key: 'credit-card', label: 'Tarjeta' },
    { key: 'coins', label: 'Monedas' },
    { key: 'landmark', label: 'Banco / Entidad' },
    { key: 'building-2', label: 'Préstamo / Empresa' },
    { key: 'home', label: 'Inmueble / Propiedad' },
    { key: 'trending-up', label: 'Jubilación / Fondos' },
    { key: 'receipt', label: 'Recibo' },
    { key: 'gem', label: 'Valor / Joya' },
    { key: 'circle-dollar-sign', label: 'Dinero' },
    { key: 'shield-check', label: 'Seguro / Depósito' },
    { key: 'briefcase', label: 'Negocio / Trabajo' },
    { key: 'folder-kanban', label: 'Otros' },
];

export function AccountTypeIconPicker({
    value,
    onChange,
}: AccountTypeIconPickerProps) {
    const [open, setOpen] = useState(false);

    const CurrentIcon: LucideIcon = ACCOUNT_TYPE_ICON_MAP[value] || ACCOUNT_TYPE_ICON_MAP['wallet'];
    const currentLabel = AVAILABLE_ICONS.find((i) => i.key === value)?.label || value;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="flex w-full items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <CurrentIcon className="h-4 w-4" />
                        <span>{currentLabel}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                    {__('Selecciona un icono')}
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {AVAILABLE_ICONS.map((item) => {
                        const IconComponent = ACCOUNT_TYPE_ICON_MAP[item.key];
                        const isSelected = item.key === value;

                        if (!IconComponent) return null;

                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                    onChange(item.key);
                                    setOpen(false);
                                }}
                                title={item.label}
                                className={`flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-center transition-colors hover:bg-accent hover:text-accent-foreground ${
                                    isSelected
                                        ? 'border-primary bg-primary/10 text-primary font-medium'
                                        : 'border-transparent'
                                }`}
                            >
                                <IconComponent className="h-5 w-5" />
                                <span className="line-clamp-1 text-[10px]">
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
