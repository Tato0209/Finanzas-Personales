import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { __ } from '@/utils/i18n';
import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AccountTypeIconPicker } from './account-type-icon-picker';

interface CreateAccountTypeDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function CreateAccountTypeDialog({
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    trigger,
}: CreateAccountTypeDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = isControlled ? setControlledOpen! : setUncontrolledOpen;

    const [name, setName] = useState('');
    const [icon, setIcon] = useState('wallet');
    const [hasTransactionLedger, setHasTransactionLedger] = useState(true);
    const [supportsInvestedAmount, setSupportsInvestedAmount] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.post(
            '/settings/account-types',
            {
                name,
                icon,
                has_transaction_ledger: hasTransactionLedger,
                supports_invested_amount: supportsInvestedAmount,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setOpen(false);
                    setName('');
                    setIcon('wallet');
                    setHasTransactionLedger(true);
                    setSupportsInvestedAmount(false);
                },
                onError: (errs) => {
                    setErrors(errs);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {__('Crear tipo de cuenta')}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{__('Crear tipo de cuenta')}</DialogTitle>
                        <DialogDescription>
                            {__(
                                'Agrega un nuevo tipo de cuenta personalizado para clasificar tus finanzas.',
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="account-type-name">
                                {__('Nombre')}
                            </Label>
                            <Input
                                id="account-type-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={__('ej. Efectivo, Criptomonedas, Billetera digital')}
                                required
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>{__('Icono')}</Label>
                            <AccountTypeIconPicker
                                value={icon}
                                onChange={setIcon}
                            />
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex items-start space-x-3 rounded-md border p-3">
                                <Checkbox
                                    id="has_transaction_ledger"
                                    checked={hasTransactionLedger}
                                    onCheckedChange={(checked) =>
                                        setHasTransactionLedger(checked === true)
                                    }
                                />
                                <div className="space-y-1 leading-none">
                                    <Label
                                        htmlFor="has_transaction_ledger"
                                        className="cursor-pointer font-medium"
                                    >
                                        {__('Registro de transacciones')}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        {__(
                                            'Permite registrar movimientos (ingresos y gastos). Si se desactiva, la cuenta será solo para seguimiento de balance.',
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3 rounded-md border p-3">
                                <Checkbox
                                    id="supports_invested_amount"
                                    checked={supportsInvestedAmount}
                                    onCheckedChange={(checked) =>
                                        setSupportsInvestedAmount(checked === true)
                                    }
                                />
                                <div className="space-y-1 leading-none">
                                    <Label
                                        htmlFor="supports_invested_amount"
                                        className="cursor-pointer font-medium"
                                    >
                                        {__('Permite registrar monto invertido')}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        {__(
                                            'Ideal para cuentas de inversión o fondos donde deseas monitorear ganancias o pérdidas.',
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            {__('Cancelar')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()}>
                            {isSubmitting ? __('Guardando...') : __('Crear tipo de cuenta')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
