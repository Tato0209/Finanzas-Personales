import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AccountTypeModel } from '@/types/account';
import { __ } from '@/utils/i18n';
import { router } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface DeleteAccountTypeDialogProps {
    accountType: AccountTypeModel;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function DeleteAccountTypeDialog({
    accountType,
    open,
    onOpenChange,
    onSuccess,
}: DeleteAccountTypeDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const count = accountType.accounts_count ?? 0;

    function handleDelete() {
        setIsDeleting(true);
        router.delete(`/settings/account-types/${accountType.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                onSuccess?.();
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {count > 0 && (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        )}
                        <DialogTitle>{__('Eliminar tipo de cuenta')}</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-sm">
                        {count > 0 ? (
                            <span>
                                {__(
                                    'Hay :count cuenta(s) asociadas a este tipo de cuenta (:name). Si lo eliminas, las cuentas existentes conservarán sus datos, pero este tipo de cuenta ya no estará disponible para nuevas cuentas.',
                                    { count: count.toString(), name: accountType.name },
                                )}
                            </span>
                        ) : (
                            <span>
                                {__(
                                    '¿Estás seguro de que deseas eliminar el tipo de cuenta ":name"? Ya no estará disponible en tu lista de opciones.',
                                    { name: accountType.name },
                                )}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        {__('Cancelar')}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? __('Eliminando...') : __('Eliminar')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
