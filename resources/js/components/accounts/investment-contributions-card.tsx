import { AmountDisplay } from '@/components/ui/amount-display';
import { AmountInput } from '@/components/ui/amount-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type {
    Account,
    CurrencyCode,
    InvestmentContributionItem,
    InvestmentContributionsData,
} from '@/types/account';
import { todayDateString } from '@/utils/date';
import { __ } from '@/utils/i18n';
import { router } from '@inertiajs/react';
import {
    Calendar,
    Coins,
    Edit2,
    History,
    PiggyBank,
    Plus,
    Trash2,
    TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

interface InvestmentContributionsCardProps {
    account: Account;
    currencyCode: CurrencyCode;
    data: InvestmentContributionsData | null;
}

export function InvestmentContributionsCard({
    account,
    currencyCode,
    data,
}: InvestmentContributionsCardProps) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingItem, setEditingItem] =
        useState<InvestmentContributionItem | null>(null);
    const [deletingItem, setDeletingItem] =
        useState<InvestmentContributionItem | null>(null);

    // Form states for creating a new contribution
    const [newDate, setNewDate] = useState<string>(todayDateString());
    const [newAmount, setNewAmount] = useState<number>(0);
    const [newNotes, setNewNotes] = useState<string>('');
    const [addToBalance, setAddToBalance] = useState<boolean>(true);
    const [addToInvested, setAddToInvested] = useState<boolean>(true);

    // Form states for editing
    const [editDate, setEditDate] = useState<string>('');
    const [editAmount, setEditAmount] = useState<number>(0);
    const [editNotes, setEditNotes] = useState<string>('');
    const [syncBalanceOnEdit, setSyncBalanceOnEdit] = useState<boolean>(true);

    // Delete options
    const [adjustBalanceOnDelete, setAdjustBalanceOnDelete] =
        useState<boolean>(true);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const openCreateModal = () => {
        setNewDate(todayDateString());
        setNewAmount(0);
        setNewNotes('');
        setAddToBalance(true);
        setAddToInvested(true);
        setCreateModalOpen(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAmount <= 0) return;

        setIsSubmitting(true);
        router.post(
            `/accounts/${account.id}/contributions`,
            {
                contribution_date: newDate,
                amount: newAmount,
                notes: newNotes,
                add_to_balance: addToBalance,
                add_to_invested: addToInvested,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCreateModalOpen(false);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    const openEditModal = (item: InvestmentContributionItem) => {
        setEditingItem(item);
        setEditDate(item.contribution_date);
        setEditAmount(item.amount);
        setEditNotes(item.notes ?? '');
        setSyncBalanceOnEdit(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem || editAmount <= 0) return;

        setIsSubmitting(true);
        router.put(
            `/accounts/${account.id}/contributions/${editingItem.id}`,
            {
                contribution_date: editDate,
                amount: editAmount,
                notes: editNotes,
                sync_balance: syncBalanceOnEdit,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingItem(null);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    const handleDeleteSubmit = () => {
        if (!deletingItem) return;

        setIsSubmitting(true);
        router.delete(
            `/accounts/${account.id}/contributions/${deletingItem.id}?adjust_balance=${adjustBalanceOnDelete ? 1 : 0}`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDeletingItem(null);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    const currCode = currencyCode || account.currency_code || 'USD';

    return (
        <Card className="border-primary/20 bg-card/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Coins className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold tracking-tight">
                            {__('Aportes Mensuales')}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {__(
                                'Control y registro de tus aportaciones periódicas a esta inversión',
                            )}
                        </p>
                    </div>
                </div>

                <Button
                    size="sm"
                    onClick={openCreateModal}
                    className="gap-1.5 shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    {__('Registrar Aporte')}
                </Button>
            </CardHeader>

            <CardContent className="space-y-6 pt-2">
                {/* 4 Métricas de Aportes */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {/* Aporte del Mes Actual */}
                    <div className="rounded-xl border bg-background/50 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                                {__('Aporte de este mes')}
                            </span>
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            <AmountDisplay
                                amountInCents={
                                    data?.current_month_contributed ?? 0
                                }
                                currencyCode={currCode}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                            {data?.current_month_name ?? __('Mes actual')}
                        </span>
                    </div>

                    {/* Total Aportado */}
                    <div className="rounded-xl border bg-background/50 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                                {__('Total Aportado')}
                            </span>
                            <PiggyBank className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-1 text-lg font-bold text-foreground">
                            <AmountDisplay
                                amountInCents={data?.total_contributed ?? 0}
                                currencyCode={currCode}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                            {data?.contributions_count ?? 0}{' '}
                            {data?.contributions_count === 1
                                ? __('aporte registrado')
                                : __('aportes registrados')}
                        </span>
                    </div>

                    {/* Promedio Mensual */}
                    <div className="rounded-xl border bg-background/50 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                                {__('Promedio Mensual')}
                            </span>
                            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-1 text-lg font-bold text-foreground">
                            <AmountDisplay
                                amountInCents={data?.average_monthly ?? 0}
                                currencyCode={currCode}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                            {__('por mes con aportaciones')}
                        </span>
                    </div>

                    {/* Ganancia sobre Inversión */}
                    <div className="rounded-xl border bg-background/50 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                                {__('Rendimiento Total')}
                            </span>
                            <Badge
                                variant={
                                    (data?.net_gain ?? 0) >= 0
                                        ? 'secondary'
                                        : 'destructive'
                                }
                                className="h-4 px-1 text-[9px]"
                            >
                                {(data?.gain_percentage ?? 0) >= 0 ? '+' : ''}
                                {data?.gain_percentage ?? 0}%
                            </Badge>
                        </div>
                        <div
                            className={`mt-1 flex items-baseline gap-1 text-lg font-bold ${
                                (data?.net_gain ?? 0) >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                            }`}
                        >
                            <AmountDisplay
                                amountInCents={data?.net_gain ?? 0}
                                currencyCode={currCode}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                            {__('Valor portafolio menos invertido')}
                        </span>
                    </div>
                </div>

                {/* Desglose / Historial de Aportes */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold tracking-tight">
                                {__('Historial de Aportes')}
                            </h3>
                        </div>
                        {data?.has_contributions && (
                            <span className="text-xs text-muted-foreground">
                                {data.contributions.length}{' '}
                                {data.contributions.length === 1
                                    ? __('registro')
                                    : __('registros')}
                            </span>
                        )}
                    </div>

                    {!data || !data.has_contributions ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                                <Coins className="h-6 w-6" />
                            </div>
                            <h4 className="mt-3 text-sm font-semibold text-foreground">
                                {__('Sin aportes registrados')}
                            </h4>
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                {__(
                                    'Comienza a registrar cuánto dinero ingresas cada mes a esta inversión para medir tu constancia y rentabilidad.',
                                )}
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={openCreateModal}
                                className="mt-4 gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                {__('Registrar Primer Aporte')}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {data.monthly_breakdown.map((monthGroup) => (
                                <div
                                    key={monthGroup.month}
                                    className="overflow-hidden rounded-xl border bg-card"
                                >
                                    {/* Cabecera del mes */}
                                    <div className="flex items-center justify-between bg-muted/40 px-4 py-2.5 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold capitalize text-foreground">
                                                {monthGroup.month_name}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="h-4 text-[10px]"
                                            >
                                                {monthGroup.count}{' '}
                                                {monthGroup.count === 1
                                                    ? __('aporte')
                                                    : __('aportes')}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                            <span>+</span>
                                            <AmountDisplay
                                                amountInCents={monthGroup.total}
                                                currencyCode={currCode}
                                            />
                                        </div>
                                    </div>

                                    {/* Lista de aportes del mes */}
                                    <div className="divide-y divide-border/60">
                                        {monthGroup.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/20"
                                            >
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-foreground">
                                                            {item.formatted_date}
                                                        </span>
                                                        {item.notes && (
                                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                                {item.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                        +{' '}
                                                        <AmountDisplay
                                                            amountInCents={
                                                                item.amount
                                                            }
                                                            currencyCode={
                                                                currCode
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    item,
                                                                )
                                                            }
                                                            title={__(
                                                                'Editar aporte',
                                                            )}
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                                                            onClick={() =>
                                                                setDeletingItem(
                                                                    item,
                                                                )
                                                            }
                                                            title={__(
                                                                'Eliminar aporte',
                                                            )}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Modal: Registrar Nuevo Aporte */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCreateSubmit}>
                        <DialogHeader>
                            <DialogTitle>
                                {__('Registrar Aporte Mensual')}
                            </DialogTitle>
                            <DialogDescription>
                                {__(
                                    'Ingresa el monto que agregaste o aportarás a tu cuenta de inversión.',
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="my-5 space-y-4">
                            {/* Fecha */}
                            <div className="space-y-1.5">
                                <Label htmlFor="contribution-date">
                                    {__('Fecha del Aporte')}
                                </Label>
                                <Input
                                    id="contribution-date"
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Monto */}
                            <div className="space-y-1.5">
                                <Label htmlFor="contribution-amount">
                                    {__('Monto del Aporte')} (
                                    {currCode.toUpperCase()})
                                </Label>
                                <AmountInput
                                    id="contribution-amount"
                                    value={newAmount}
                                    currencyCode={currCode}
                                    onChange={(val) => setNewAmount(val || 0)}
                                    className="text-lg font-semibold"
                                    autoFocus
                                />
                            </div>

                            {/* Notas / Concepto */}
                            <div className="space-y-1.5">
                                <Label htmlFor="contribution-notes">
                                    {__('Nota / Concepto')} ({__('Opcional')})
                                </Label>
                                <Input
                                    id="contribution-notes"
                                    placeholder={__(
                                        'Ej: Aporte mensual ETF, Aporte extraordinario...',
                                    )}
                                    value={newNotes}
                                    onChange={(e) =>
                                        setNewNotes(e.target.value)
                                    }
                                />
                            </div>

                            {/* Opciones de sincronización */}
                            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                                <div className="flex items-start space-x-2.5">
                                    <Checkbox
                                        id="add-to-balance"
                                        checked={addToBalance}
                                        onCheckedChange={(checked) =>
                                            setAddToBalance(!!checked)
                                        }
                                    />
                                    <div className="grid gap-1 leading-none">
                                        <label
                                            htmlFor="add-to-balance"
                                            className="text-xs font-medium cursor-pointer text-foreground"
                                        >
                                            {__(
                                                'Sumar al valor actual del balance',
                                            )}
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            {__(
                                                'Aumenta el balance registrado de la cuenta en este mismo monto.',
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-2.5">
                                    <Checkbox
                                        id="add-to-invested"
                                        checked={addToInvested}
                                        onCheckedChange={(checked) =>
                                            setAddToInvested(!!checked)
                                        }
                                    />
                                    <div className="grid gap-1 leading-none">
                                        <label
                                            htmlFor="add-to-invested"
                                            className="text-xs font-medium cursor-pointer text-foreground"
                                        >
                                            {__(
                                                'Actualizar capital invertido acumulado',
                                            )}
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            {__(
                                                'Suma este aporte a tu base invertida para el cálculo de ganancias.',
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
                                onClick={() => setCreateModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                {__('Cancelar')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || newAmount <= 0}
                            >
                                {isSubmitting
                                    ? __('Guardando...')
                                    : __('Guardar Aporte')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Editar Aporte */}
            <Dialog
                open={!!editingItem}
                onOpenChange={(open) => !open && setEditingItem(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader>
                            <DialogTitle>{__('Editar Aporte')}</DialogTitle>
                            <DialogDescription>
                                {__(
                                    'Modifica los datos de este aporte registrado.',
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="my-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-contribution-date">
                                    {__('Fecha')}
                                </Label>
                                <Input
                                    id="edit-contribution-date"
                                    type="date"
                                    value={editDate}
                                    onChange={(e) =>
                                        setEditDate(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-contribution-amount">
                                    {__('Monto')} ({currCode.toUpperCase()})
                                </Label>
                                <AmountInput
                                    id="edit-contribution-amount"
                                    value={editAmount}
                                    currencyCode={currCode}
                                    onChange={(val) => setEditAmount(val || 0)}
                                    className="text-lg font-semibold"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-contribution-notes">
                                    {__('Nota / Concepto')}
                                </Label>
                                <Input
                                    id="edit-contribution-notes"
                                    value={editNotes}
                                    onChange={(e) =>
                                        setEditNotes(e.target.value)
                                    }
                                />
                            </div>

                            <div className="rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-start space-x-2.5">
                                    <Checkbox
                                        id="sync-balance-edit"
                                        checked={syncBalanceOnEdit}
                                        onCheckedChange={(checked) =>
                                            setSyncBalanceOnEdit(!!checked)
                                        }
                                    />
                                    <div className="grid gap-1 leading-none">
                                        <label
                                            htmlFor="sync-balance-edit"
                                            className="text-xs font-medium cursor-pointer text-foreground"
                                        >
                                            {__(
                                                'Ajustar balance e inversión por la diferencia',
                                            )}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingItem(null)}
                                disabled={isSubmitting}
                            >
                                {__('Cancelar')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || editAmount <= 0}
                            >
                                {isSubmitting
                                    ? __('Guardando...')
                                    : __('Actualizar Aporte')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Confirmar Eliminación */}
            <Dialog
                open={!!deletingItem}
                onOpenChange={(open) => !open && setDeletingItem(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{__('Eliminar Aporte')}</DialogTitle>
                        <DialogDescription>
                            {__(
                                '¿Estás seguro de que deseas eliminar este aporte?',
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {deletingItem && (
                        <div className="my-4 space-y-3">
                            <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                                <div className="flex justify-between font-medium">
                                    <span>{deletingItem.formatted_date}</span>
                                    <span className="font-bold text-foreground">
                                        <AmountDisplay
                                            amountInCents={deletingItem.amount}
                                            currencyCode={currCode}
                                        />
                                    </span>
                                </div>
                                {deletingItem.notes && (
                                    <p className="mt-1 text-muted-foreground">
                                        {deletingItem.notes}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-start space-x-2.5 rounded-lg border bg-muted/30 p-3">
                                <Checkbox
                                    id="adjust-balance-delete"
                                    checked={adjustBalanceOnDelete}
                                    onCheckedChange={(checked) =>
                                        setAdjustBalanceOnDelete(!!checked)
                                    }
                                />
                                <div className="grid gap-1 leading-none">
                                    <label
                                        htmlFor="adjust-balance-delete"
                                        className="text-xs font-medium cursor-pointer text-foreground"
                                    >
                                        {__(
                                            'Restar también este monto del balance e inversión actual',
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeletingItem(null)}
                            disabled={isSubmitting}
                        >
                            {__('Cancelar')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? __('Eliminando...')
                                : __('Eliminar')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
