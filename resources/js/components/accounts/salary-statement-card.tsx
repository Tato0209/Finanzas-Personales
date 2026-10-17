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
import type {
    Account,
    CurrencyCode,
    SalaryCategoryBreakdown,
    SalaryStatement,
} from '@/types/account';
import {
    getCategoryColorClasses,
    type CategoryColor,
} from '@/types/category';
import type { Transaction } from '@/types/transaction';
import { formatDateMedium } from '@/utils/date';
import { __ } from '@/utils/i18n';
import { router } from '@inertiajs/react';
import * as Icons from 'lucide-react';
import {
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    FileSpreadsheet,
    Layers,
    Pencil,
    PieChart as PieChartIcon,
    PiggyBank,
    Printer,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
} from 'recharts';

const CATEGORY_HEX_COLORS: Record<string, string> = {
    amber: '#f59e0b',
    rose: '#f43f5e',
    blue: '#3b82f6',
    violet: '#8b5cf6',
    cyan: '#06b6d4',
    emerald: '#10b981',
    gray: '#6b7280',
    green: '#22c55e',
    lime: '#84cc16',
    fuchsia: '#d946ef',
    indigo: '#6366f1',
    orange: '#f97316',
    pink: '#ec4899',
    purple: '#a855f7',
    red: '#ef4444',
    stone: '#78716c',
    neutral: '#737373',
    slate: '#64748b',
    teal: '#14b8a6',
    yellow: '#eab308',
};

const PALETTE_FALLBACK = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#6366f1',
    '#14b8a6',
    '#eab308',
];

function getCategoryHex(colorName: string, index = 0): string {
    return (
        CATEGORY_HEX_COLORS[colorName] ||
        PALETTE_FALLBACK[index % PALETTE_FALLBACK.length]
    );
}

function resolveLucideIcon(iconName: string): LucideIcon {
    if (!iconName) {
        return Icons.HelpCircle;
    }

    const iconMap = Icons as unknown as Record<string, LucideIcon>;
    if (iconMap[iconName]) {
        return iconMap[iconName];
    }

    const pascal = iconName
        .split('-')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join('');

    if (iconMap[pascal]) {
        return iconMap[pascal];
    }

    return Icons.HelpCircle;
}

interface SalaryStatementCardProps {
    account: Account;
    currencyCode: CurrencyCode;
    statement: SalaryStatement | null;
    transactions?: Transaction[];
}

type DashboardViewMode = 'expenses' | 'incomes' | 'all_time';

export function SalaryStatementCard({
    account,
    currencyCode,
    statement,
    transactions = [],
}: SalaryStatementCardProps) {
    const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
    const [statementModalOpen, setStatementModalOpen] = useState(false);
    const [newSalaryAmount, setNewSalaryAmount] = useState<number>(
        statement?.salary_amount || 0,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<DashboardViewMode>('expenses');
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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
                month: statement.month === 'all' ? new Date().toISOString().slice(0, 7) : statement.month,
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

    // Active categories based on view mode
    const activeCategories: SalaryCategoryBreakdown[] = useMemo(() => {
        if (viewMode === 'incomes') {
            return statement.income_categories_breakdown || [];
        }
        if (viewMode === 'all_time') {
            return statement.all_time_categories_breakdown || statement.categories_breakdown || [];
        }
        return statement.categories_breakdown || [];
    }, [viewMode, statement]);

    // Active total amount for the current view mode
    const activeTotal = useMemo(() => {
        if (viewMode === 'incomes') {
            return statement.salary_amount;
        }
        if (viewMode === 'all_time') {
            return statement.all_time_total_spent ?? statement.total_spent;
        }
        return statement.total_spent;
    }, [viewMode, statement]);

    // Donut chart dataset
    const chartData = useMemo(() => {
        return activeCategories.map((cat, idx) => ({
            id: cat.category_id ?? `cat-${idx}`,
            name: cat.name,
            value: cat.total,
            color: getCategoryHex(cat.color, idx),
            colorName: cat.color,
            percentage: cat.percentage,
            count: cat.count,
            icon: cat.icon,
        }));
    }, [activeCategories]);

    // Filter transactions for an expanded category
    const categoryTransactions = useMemo(() => {
        if (!expandedCategory || !transactions.length) {
            return [];
        }

        return transactions.filter((t) => {
            const matchesCat =
                expandedCategory === '__none__'
                    ? !t.category_id
                    : t.category_id === expandedCategory;

            if (!matchesCat) {
                return false;
            }

            // If not all-time mode and valid month, filter by month
            if (statement.month !== 'all' && statement.month) {
                return t.transaction_date.startsWith(statement.month);
            }

            return true;
        });
    }, [expandedCategory, transactions, statement.month]);

    const stats = statement.stats;
    const topCategory = stats?.top_category ?? activeCategories[0] ?? null;

    return (
        <Card className="border-primary/20 bg-card/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold tracking-tight">
                            {__('Control y Dashboard de Salario')}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {__(
                                'Ciclo mensual independiente con seguimiento de gastos por categoría',
                            )}
                        </p>
                    </div>
                </div>

                {/* Selector de Mes */}
                <div className="flex flex-wrap items-center gap-2">
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
                        <SelectTrigger className="h-8 w-[160px] text-xs font-medium">
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
                            <SelectItem value="all" className="text-xs font-semibold text-primary">
                                {__('Todo el historial')}
                            </SelectItem>
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

            <CardContent className="space-y-6">
                {/* Alerta si el salario no está asignado para este mes */}
                {!statement.has_salary_set && statement.month !== 'all' ? (
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
                                    {statement.month === 'all'
                                        ? __('Ingresos acumulados')
                                        : `${__('Base de')} ${statement.month_name}`}
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
                                    {__('Progreso del ciclo')}
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

                {/* ============================================================== */}
                {/* DASHBOARD DE CATEGORÍAS (Categorías por Tipo y Monto) */}
                {/* ============================================================== */}
                <div className="rounded-2xl border border-border/80 bg-background/60 p-4 shadow-sm backdrop-blur-md sm:p-5">
                    {/* Header del Dashboard de Categorías */}
                    <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between border-b">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <PieChartIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                                    {__('Dashboard de Gastos por Categoría')}
                                    <Badge variant="outline" className="text-[10px] font-normal py-0 h-4">
                                        {statement.month_name}
                                    </Badge>
                                </h3>
                                <p className="text-[11px] text-muted-foreground">
                                    {__('Visualiza el monto total y porcentaje consumido por cada tipo de categoría')}
                                </p>
                            </div>
                        </div>

                        {/* Botones de alternancia de vista */}
                        <div className="flex items-center rounded-lg border bg-muted/40 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => {
                                    setViewMode('expenses');
                                    setExpandedCategory(null);
                                }}
                                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                                    viewMode === 'expenses'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ArrowDownRight className="h-3 w-3 text-rose-500" />
                                <span>{__('Gastos')}</span>
                                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                                    {statement.categories_breakdown?.length || 0}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setViewMode('incomes');
                                    setExpandedCategory(null);
                                }}
                                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                                    viewMode === 'incomes'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                <span>{__('Ingresos')}</span>
                                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                                    {statement.income_categories_breakdown?.length || 0}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setViewMode('all_time');
                                    setExpandedCategory(null);
                                }}
                                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                                    viewMode === 'all_time'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Layers className="h-3 w-3 text-primary" />
                                <span>{__('Histórico')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Fila de Tarjetas KPI / Insights de Categorías */}
                    <div className="grid grid-cols-2 gap-2.5 pt-4 sm:grid-cols-4">
                        {/* Mayor Gasto */}
                        <div className="rounded-xl border bg-card/80 p-2.5">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                                {viewMode === 'incomes' ? __('Principal Ingreso') : __('Categoría Principal')}
                            </span>
                            <div className="mt-1 flex items-center justify-between gap-1">
                                <span className="truncate text-xs font-semibold text-foreground">
                                    {topCategory ? topCategory.name : __('Ninguna')}
                                </span>
                                {topCategory && (
                                    <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                        {topCategory.percentage}%
                                    </Badge>
                                )}
                            </div>
                            {topCategory && (
                                <div className="mt-0.5 text-xs font-bold text-primary">
                                    <AmountDisplay
                                        amountInCents={topCategory.total}
                                        currencyCode={currencyCode}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Categorías con Movimiento */}
                        <div className="rounded-xl border bg-card/80 p-2.5">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                                {__('Categorías Activas')}
                            </span>
                            <div className="mt-1 text-base font-bold text-foreground">
                                {activeCategories.length}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                                {activeCategories.reduce((acc, c) => acc + c.count, 0)} {__('transacciones')}
                            </span>
                        </div>

                        {/* Gasto Promedio */}
                        <div className="rounded-xl border bg-card/80 p-2.5">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                                {viewMode === 'incomes' ? __('Ingreso Promedio') : __('Gasto Promedio')}
                            </span>
                            <div className="mt-1 text-base font-bold text-foreground">
                                <AmountDisplay
                                    amountInCents={
                                        activeCategories.reduce((acc, c) => acc + c.count, 0) > 0
                                            ? Math.round(activeTotal / activeCategories.reduce((acc, c) => acc + c.count, 0))
                                            : 0
                                    }
                                    currencyCode={currencyCode}
                                />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                                {__('por movimiento')}
                            </span>
                        </div>

                        {/* Presupuesto Diario Disponible */}
                        <div className="rounded-xl border bg-card/80 p-2.5">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                                {__('Presupuesto Diario')}
                            </span>
                            <div className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">
                                <AmountDisplay
                                    amountInCents={stats?.daily_budget_remaining ?? 0}
                                    currencyCode={currencyCode}
                                />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                                {stats?.days_remaining ?? 1} {__('días restantes')}
                            </span>
                        </div>
                    </div>

                    {/* Sección Principal: Donut Chart + Desglose Interactivo */}
                    {activeCategories.length === 0 ? (
                        <div className="my-6 flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <PieChartIcon className="h-6 w-6" />
                            </div>
                            <h4 className="mt-3 text-sm font-semibold text-foreground">
                                {__('Sin movimientos en este período')}
                            </h4>
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                {__(
                                    'No se registran transacciones para la vista seleccionada. Agrega tus gastos o ingresos para visualizar el desglose.',
                                )}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                            {/* Gráfico Donut de Distribución */}
                            <div className="flex flex-col items-center justify-center rounded-xl border bg-card/40 p-4 lg:col-span-5">
                                <div className="text-center">
                                    <span className="text-xs font-semibold text-foreground">
                                        {__('Distribución de')} {viewMode === 'incomes' ? __('Ingresos') : __('Gastos')}
                                    </span>
                                    <p className="text-[10px] text-muted-foreground">
                                        {__('Pasa el cursor para ver el monto')}
                                    </p>
                                </div>

                                <div className="relative mt-2 h-[220px] w-full max-w-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <RechartsTooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) {
                                                        return null;
                                                    }
                                                    const data = payload[0].payload;
                                                    const IconComponent = resolveLucideIcon(data.icon);
                                                    return (
                                                        <div className="rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-md backdrop-blur-sm">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="h-2.5 w-2.5 rounded-full"
                                                                    style={{ backgroundColor: data.color }}
                                                                />
                                                                <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                                                                <span className="font-semibold text-foreground">
                                                                    {data.name}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1 flex items-center justify-between gap-3 text-muted-foreground">
                                                                <span>
                                                                    <AmountDisplay
                                                                        amountInCents={data.value}
                                                                        currencyCode={currencyCode}
                                                                    />
                                                                </span>
                                                                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                                                    {data.percentage}%
                                                                </Badge>
                                                            </div>
                                                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                                                                {data.count} {data.count === 1 ? __('gasto') : __('gastos')}
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Pie
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={88}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${entry.id}-${index}`}
                                                        fill={entry.color}
                                                        stroke="var(--background)"
                                                        strokeWidth={2}
                                                    />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* Centro del Donut */}
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                            {viewMode === 'incomes' ? __('Total Ingresos') : __('Total Gastos')}
                                        </span>
                                        <span className="text-base font-bold tracking-tight text-foreground">
                                            <AmountDisplay
                                                amountInCents={activeTotal}
                                                currencyCode={currencyCode}
                                            />
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {activeCategories.length} {activeCategories.length === 1 ? __('categoría') : __('categorías')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Lista Detallada de Categorías con Montos y Desglose */}
                            <div className="space-y-2.5 lg:col-span-7">
                                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
                                    <span>{__('Categoría / Movimientos')}</span>
                                    <span>{__('Monto / Participación')}</span>
                                </div>

                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                    {activeCategories.map((cat, idx) => {
                                        const isExpanded = expandedCategory === (cat.category_id ?? '__none__');
                                        const Icon = resolveLucideIcon(cat.icon);
                                        const hexColor = getCategoryHex(cat.color, idx);
                                        const colorClasses = getCategoryColorClasses(
                                            (cat.color || 'stone') as CategoryColor,
                                        );

                                        return (
                                            <div
                                                key={cat.category_id ?? `cat-${idx}`}
                                                className="group rounded-xl border bg-card/80 p-3 transition-all hover:border-primary/40 hover:bg-card hover:shadow-xs"
                                            >
                                                {/* Encabezado de la Fila de Categoría */}
                                                <div
                                                    className="flex cursor-pointer items-center justify-between gap-3"
                                                    onClick={() =>
                                                        setExpandedCategory(
                                                            isExpanded ? null : (cat.category_id ?? '__none__'),
                                                        )
                                                    }
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div
                                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClasses.bg} ${colorClasses.text}`}
                                                        >
                                                            <Icon className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="truncate text-xs font-semibold text-foreground">
                                                                    {cat.name}
                                                                </span>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="h-4 px-1 text-[10px] font-normal"
                                                                >
                                                                    {cat.percentage}%
                                                                </Badge>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {cat.count}{' '}
                                                                {cat.count === 1
                                                                    ? __('movimiento')
                                                                    : __('movimientos')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <div className="text-right">
                                                            <span className="text-xs font-bold text-foreground">
                                                                <AmountDisplay
                                                                    amountInCents={cat.total}
                                                                    currencyCode={currencyCode}
                                                                />
                                                            </span>
                                                        </div>
                                                        <div className="text-muted-foreground group-hover:text-foreground">
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Barra de progreso de la Categoría */}
                                                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${Math.min(100, cat.percentage)}%`,
                                                            backgroundColor: hexColor,
                                                        }}
                                                    />
                                                </div>

                                                {/* Detalle expandible con las transacciones de esta categoría */}
                                                {isExpanded && (
                                                    <div className="mt-3 border-t pt-2.5">
                                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                                                            {__('Movimientos en')} {cat.name} ({categoryTransactions.length})
                                                        </span>
                                                        {categoryTransactions.length === 0 ? (
                                                            <p className="text-[11px] text-muted-foreground italic">
                                                                {__('No se cargaron transacciones detalladas para esta categoría.')}
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                                                {categoryTransactions.map((tx) => (
                                                                    <div
                                                                        key={tx.id}
                                                                        className="flex items-center justify-between rounded-lg bg-muted/30 px-2 py-1.5 text-xs"
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                                                {formatDateMedium(tx.transaction_date)}
                                                                            </span>
                                                                            <span className="truncate font-medium text-foreground">
                                                                                {tx.description}
                                                                            </span>
                                                                        </div>
                                                                        <span
                                                                            className={`shrink-0 font-semibold ${
                                                                                tx.amount < 0
                                                                                    ? 'text-rose-600 dark:text-rose-400'
                                                                                    : 'text-emerald-600 dark:text-emerald-400'
                                                                            }`}
                                                                        >
                                                                            <AmountDisplay
                                                                                amountInCents={tx.amount}
                                                                                currencyCode={currencyCode}
                                                                            />
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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
                                {statement.categories_breakdown.map((cat, idx) => (
                                    <div
                                        key={cat.category_id ?? `cat-${idx}`}
                                        className="space-y-1 rounded-lg border bg-card p-2.5"
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{
                                                        backgroundColor: getCategoryHex(cat.color, idx),
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
                                                    backgroundColor: getCategoryHex(cat.color, idx),
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
