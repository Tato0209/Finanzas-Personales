import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountTypeModel } from '@/types/account';
import { __ } from '@/utils/i18n';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AccountTypeIconPicker } from './account-type-icon-picker';

interface EditAccountTypeDialogProps {
    accountType: AccountTypeModel;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditAccountTypeDialog({
    accountType,
    open,
    onOpenChange,
    onSuccess,
}: EditAccountTypeDialogProps) {
    const [name, setName] = useState(accountType.name);
    const [icon, setIcon] = useState(accountType.icon || 'wallet');
    const [hasTransactionLedger, setHasTransactionLedger] = useState(
        accountType.has_transaction_ledger,
    );
    const [supportsInvestedAmount, setSupportsInvestedAmount] = useState(
        accountType.supports_invested_amount,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            setName(accountType.name);
            setIcon(accountType.icon || 'wallet');
            setHasTransactionLedger(accountType.has_transaction_ledger);
            setSupportsInvestedAmount(accountType.supports_invested_amount);
            setErrors({});
        }
    }, [open, accountType]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        router.patch(
            `/settings/account-types/${accountType.id}`,
            {
                name,
                icon,
                has_transaction_ledger: hasTransactionLedger,
                supports_invested_amount: supportsInvestedAmount,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onOpenChange(false);
                    onSuccess?.();
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{__('Editar tipo de cuenta')}</DialogTitle>
                        <DialogDescription>
                            {__(
                                'Modifica el nombre, icono y características de este tipo de cuenta.',
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-account-type-name">
                                {__('Nombre')}
                            </Label>
                            <Input
                                id="edit-account-type-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
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
                                    id="edit_has_transaction_ledger"
                                    checked={hasTransactionLedger}
                                    onCheckedChange={(checked) =>
                                        setHasTransactionLedger(checked === true)
                                    }
                                />
                                <div className="space-y-1 leading-none">
                                    <Label
                                        htmlFor="edit_has_transaction_ledger"
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
                                    id="edit_supports_invested_amount"
                                    checked={supportsInvestedAmount}
                                    onCheckedChange={(checked) =>
                                        setSupportsInvestedAmount(checked === true)
                                    }
                                />
                                <div className="space-y-1 leading-none">
                                    <Label
                                        htmlFor="edit_supports_invested_amount"
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
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            {__('Cancelar')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()}>
                            {isSubmitting ? __('Guardando...') : __('Guardar cambios')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
