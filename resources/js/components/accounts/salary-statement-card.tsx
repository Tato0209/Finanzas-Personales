import { AmountDisplay } from '@/components/ui/amount-display';
import { AmountInput } from '@/components/ui/amount-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Account, CurrencyCode, SalaryStatement } from '@/types/account';
import { __ } from '@/utils/i18n';
import { router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    Calendar,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    Pencil,
    PiggyBank,
    Printer,
} from 'lucide-react';
import { useState } from 'react';

interface SalaryStatementCardProps {
    account: Account;
    currencyCode: CurrencyCode;
    statement: SalaryStatement | null;
}

export function SalaryStatementCard({
    account,
    currencyCode,
    statement,
}: SalaryStatementCardProps) {
    const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
    const [statementModalOpen, setStatementModalOpen] = useState(false);
    const [newSalaryAmount, setNewSalaryAmount] = useState<number>(
        statement?.salary_amount || 0,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!statement) {
        return null;
    }

    const handleMonthChange = (newMonth: string) => {
        router.get(
            `/accounts/${account.id}`,
            { month: newMonth },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSaveSalary = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.post(
            `/accounts/${account.id}/salary`,
            {
                month: statement.month,
                amount: newSalaryAmount,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSalaryDialogOpen(false);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    const months = statement.available_months || [statement.month];
    const currentIndex = months.indexOf(statement.month);
    const hasPrevious = currentIndex < months.length - 1;
    const hasNext = currentIndex > 0;

    const goToPreviousMonth = () => {
        if (hasPrevious) {
            handleMonthChange(months[currentIndex + 1]);
        }
    };

    const goToNextMonth = () => {
        if (hasNext) {
            handleMonthChange(months[currentIndex - 1]);
        }
    };

    const isDeficit = statement.remaining_balance < 0;

    return (
        <Card className="border-primary/20 bg-card/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold tracking-tight">
                            {__('Control Mensual de Salario')}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {__(
                                'Ciclo mensual independiente con reinicio a 0 cada mes',
                            )}
                        </p>
                    </div>
                </div>

                {/* Selector de Mes */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={goToPreviousMonth}
                        disabled={!hasPrevious}
                        title={__('Mes anterior')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Select
                        value={statement.month}
                        onValueChange={handleMonthChange}
                    >
                        <SelectTrigger className="h-8 w-[150px] text-xs font-medium">
                            <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue placeholder={statement.month_name} />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem
                                    key={m}
                                    value={m}
                                    className="text-xs"
                                >
                                    {m === statement.month
                                        ? statement.month_name
                                        : m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={goToNextMonth}
                        disabled={!hasNext}
                        title={__('Mes siguiente')}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setStatementModalOpen(true)}
                    >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                        {__('Extracto')}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                {/* Alerta si el salario no está asignado para este mes */}
                {!statement.has_salary_set ? (
                    <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 sm:flex-row">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm font-medium">
                                    {__('Aún no has registrado tu salario de')}{' '}
                                    <span className="font-semibold text-primary">
                                        {statement.month_name}
                                    </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {__(
                                        'Este mes comienza en 0. Ingresa tu salario percibido para controlar tus gastos.',
                                    )}
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => {
                                setNewSalaryAmount(0);
                                setSalaryDialogOpen(true);
                            }}
                            className="w-full shrink-0 sm:w-auto"
                        >
                            <Banknote className="mr-1.5 h-4 w-4" />
                            {__('Asignar Salario del Mes')}
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* 4 Métricas clave del mes */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {/* Salario Asignado */}
                            <div className="rounded-xl border bg-background/50 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {__('Salario Ingresado')}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            setNewSalaryAmount(
                                                statement.salary_amount,
                                            );
                                            setSalaryDialogOpen(true);
                                        }}
                                        title={__('Editar salario del mes')}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                </div>
                                <div className="mt-1 flex items-baseline gap-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    <AmountDisplay
                                        amountInCents={statement.salary_amount}
                                        currencyCode={currencyCode}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {__('Base de')} {statement.month_name}
                                </span>
                            </div>

                            {/* Gastos del Mes */}
                            <div className="rounded-xl border bg-background/50 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {__('Gastos del Mes')}
                                    </span>
                                    <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                                </div>
                                <div className="mt-1 flex items-baseline gap-1 text-lg font-bold text-rose-600 dark:text-rose-400">
                                    <AmountDisplay
                                        amountInCents={statement.total_spent}
                                        currencyCode={currencyCode}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {statement.spent_percentage}%{' '}
                                    {__('del salario consumido')}
                                </span>
                            </div>

                            {/* Remanente Disponible */}
                            <div
                                className={`rounded-xl border p-3 ${
                                    isDeficit
                                        ? 'border-rose-300 bg-rose-50/50 dark:border-rose-950 dark:bg-rose-950/20'
                                        : 'bg-background/50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {__('Restante Disponible')}
                                    </span>
                                    {isDeficit ? (
                                        <Badge
                                            variant="destructive"
                                            className="h-4 px-1 text-[9px]"
                                        >
                                            {__('Déficit')}
                                        </Badge>
                                    ) : (
                                        <PiggyBank className="h-3.5 w-3.5 text-emerald-500" />
                                    )}
                                </div>
                                <div
                                    className={`mt-1 flex items-baseline gap-1 text-lg font-bold ${
                                        isDeficit
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-primary'
                                    }`}
                                >
                                    <AmountDisplay
                                        amountInCents={
                                            statement.remaining_balance
                                        }
                                        currencyCode={currencyCode}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {isDeficit
                                        ? __('Sobregasto este mes')
                                        : __(
                                              'Disponible para gastar o ahorrar',
                                          )}
                                </span>
                            </div>

                            {/* Tasa de Ahorro */}
                            <div className="rounded-xl border bg-background/50 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {__('Tasa de Ahorro')}
                                    </span>
                                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                                <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    {statement.savings_rate}%
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {__('del salario retenido')}
                                </span>
                            </div>
                        </div>

                        {/* Barra de Progreso del Salario Gastado */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-muted-foreground">
                                    {__('Progreso del mes')}
                                </span>
                                <span
                                    className={
                                        isDeficit
                                            ? 'font-bold text-rose-500'
                                            : 'text-muted-foreground'
                                    }
                                >
                                    {statement.spent_percentage}%{' '}
                                    {__('gastado')}
                                </span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/80">
                                <div
                                    className={`h-full transition-all duration-500 ${
                                        isDeficit
                                            ? 'bg-rose-500'
                                            : statement.spent_percentage > 85
                                              ? 'bg-amber-500'
                                              : 'bg-emerald-500'
                                    }`}
                                    style={{
                                        width: `${Math.min(100, statement.spent_percentage)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}
            </CardContent>

            {/* Modal para Registrar / Editar Salario */}
            <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleSaveSalary}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Banknote className="h-5 w-5 text-primary" />
                                {__('Salario de')} {statement.month_name}
                            </DialogTitle>
                            <DialogDescription>
                                {__(
                                    'Define cuánto ingresaste o sacaste de salario para este mes. El control de gastos de este ciclo se calculará en base a este monto.',
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="my-6 space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="monthly-salary-input"
                                    className="text-xs font-medium text-foreground"
                                >
                                    {__('Monto del Salario')} (
                                    {(
                                        currencyCode ||
                                        account.currency_code ||
                                        'USD'
                                    ).toUpperCase()}
                                    )
                                </label>
                                <AmountInput
                                    id="monthly-salary-input"
                                    value={newSalaryAmount}
                                    currencyCode={
                                        currencyCode ||
                                        account.currency_code ||
                                        'USD'
                                    }
                                    onChange={(val) =>
                                        setNewSalaryAmount(val || 0)
                                    }
                                    className="text-lg font-semibold"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSalaryDialogOpen(false)}
                                disabled={isSubmitting}
                            >
                                {__('Cancelar')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting
                                    ? __('Guardando...')
                                    : __('Guardar Salario')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de Extracto Mensual Completo */}
            <SalaryMonthlyStatementModal
                open={statementModalOpen}
                onOpenChange={setStatementModalOpen}
                account={account}
                currencyCode={currencyCode}
                statement={statement}
            />
        </Card>
    );
}

/**
 * Modal y vista imprimible del Extracto Mensual de Salario
 */
interface SalaryMonthlyStatementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    account: Account;
    currencyCode: CurrencyCode;
    statement: SalaryStatement;
}

function SalaryMonthlyStatementModal({
    open,
    onOpenChange,
    account,
    currencyCode,
    statement,
}: SalaryMonthlyStatementModalProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl print:m-0 print:max-h-none print:w-full print:border-none print:p-0 print:shadow-none">
                <div className="print-area space-y-6 p-2">
                    {/* Encabezado del Extracto */}
                    <div className="flex flex-col justify-between border-b pb-4 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <Banknote className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold tracking-tight">
                                    {__('Extracto Mensual de Salario')}
                                </h2>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {account.name} &bull;{' '}
                                <span className="font-semibold text-foreground">
                                    {statement.month_name}
                                </span>
                            </p>
                        </div>
                        <div className="mt-3 flex items-center gap-2 sm:mt-0 print:hidden">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                                className="gap-1.5"
                            >
                                <Printer className="h-4 w-4" />
                                {__('Imprimir / PDF')}
                            </Button>
                        </div>
                    </div>

                    {/* Resumen Financiero del Mes */}
                    <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-4">
                        <div>
                            <span className="text-xs text-muted-foreground">
                                {__('Salario Ingresado')}
                            </span>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                <AmountDisplay
                                    amountInCents={statement.salary_amount}
                                    currencyCode={currencyCode}
                                />
                            </div>
                        </div>

                        <div>
                            <span className="text-xs text-muted-foreground">
                                {__('Total Gastado')}
                            </span>
                            <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                                <AmountDisplay
                                    amountInCents={statement.total_spent}
                                    currencyCode={currencyCode}
                                />
                            </div>
                        </div>

                        <div>
                            <span className="text-xs text-muted-foreground">
                                {__('Remanente / Ahorro')}
                            </span>
                            <div
                                className={`text-lg font-bold ${
                                    statement.remaining_balance < 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-primary'
                                }`}
                            >
                                <AmountDisplay
                                    amountInCents={statement.remaining_balance}
                                    currencyCode={currencyCode}
                                />
                            </div>
                        </div>

                        <div>
                            <span className="text-xs text-muted-foreground">
                                {__('Tasa de Ahorro')}
                            </span>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {statement.savings_rate}%
                            </div>
                        </div>
                    </div>

                    {/* Desglose de Gastos por Categoría */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold tracking-tight">
                            {__('Desglose de Gastos por Categoría')}
                        </h3>

                        {statement.categories_breakdown.length === 0 ? (
                            <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                                {__('No hay gastos registrados en este mes.')}
                            </p>
                        ) : (
                            <div className="space-y-2.5">
                                {statement.categories_breakdown.map((cat) => (
                                    <div
                                        key={cat.category_id ?? 'uncategorized'}
                                        className="space-y-1 rounded-lg border bg-card p-2.5"
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            cat.color,
                                                    }}
                                                />
                                                <span className="font-medium text-foreground">
                                                    {cat.name}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    ({cat.count}{' '}
                                                    {cat.count === 1
                                                        ? __('gasto')
                                                        : __('gastos')}
                                                    )
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">
                                                    <AmountDisplay
                                                        amountInCents={
                                                            cat.total
                                                        }
                                                        currencyCode={
                                                            currencyCode
                                                        }
                                                    />
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="h-4 px-1.5 text-[10px]"
                                                >
                                                    {cat.percentage}%
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${cat.percentage}%`,
                                                    backgroundColor: cat.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Resumen del Cierre */}
                    <div className="rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">
                            {__('Información del Cierre')}
                        </p>
                        <p className="mt-1">
                            {__(
                                'Este extracto refleja los ingresos de salario y consumos registrados entre el 1 y el último día de',
                            )}{' '}
                            {statement.month_name}.{' '}
                            {__(
                                'El próximo mes se iniciará nuevamente con un saldo base en cero.',
                            )}
                        </p>
                    </div>
                </div>

                <DialogFooter className="print:hidden">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {__('Cerrar')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
