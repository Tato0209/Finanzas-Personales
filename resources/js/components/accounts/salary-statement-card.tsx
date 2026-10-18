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
    SalaryBudgetCategory,
    SalaryStatement,
    UserCategoryOption,
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
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    FileSpreadsheet,
    HelpCircle,
    Pencil,
    PiggyBank,
    Printer,
    Sliders,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

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

function getCategoryHex(colorName: string): string {
    return CATEGORY_HEX_COLORS[colorName] || '#64748b';
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

type BudgetTabMode = 'categories' | 'rule_50_30_20';

export function SalaryStatementCard({
    account,
    currencyCode,
    statement,
    transactions = [],
}: SalaryStatementCardProps) {
    const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
    const [statementModalOpen, setStatementModalOpen] = useState(false);
    const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
    const [singleCategoryBudgetOpen, setSingleCategoryBudgetOpen] = useState<SalaryBudgetCategory | null>(null);
    const [singleBudgetAmount, setSingleBudgetAmount] = useState<number>(0);

    const [newSalaryAmount, setNewSalaryAmount] = useState<number>(
        statement?.salary_amount || 0,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabMode, setTabMode] = useState<BudgetTabMode>('categories');
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    // Editable category allocations in modal
    const [editingBudgets, setEditingBudgets] = useState<Record<string, { amount: number; group: 'needs' | 'wants' | 'savings' }>>({});

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

    const handleOpenBudgetDialog = () => {
        const initial: Record<string, { amount: number; group: 'needs' | 'wants' | 'savings' }> = {};
        const options: UserCategoryOption[] = statement.user_categories_options || [];

        options.forEach((opt) => {
            initial[opt.id] = {
                amount: opt.allocated_amount || 0,
                group: opt.group_50_30_20,
            };
        });

        // Also merge any existing budget categories
        (statement.budget_categories || []).forEach((bc) => {
            if (bc.category_id) {
                initial[bc.category_id] = {
                    amount: bc.allocated_amount || 0,
                    group: bc.group_50_30_20,
                };
            }
        });

        setEditingBudgets(initial);
        setBudgetDialogOpen(true);
    };

    const handleApply503020Preset = () => {
        setIsSubmitting(true);
        router.post(
            `/accounts/${account.id}/category-budgets`,
            {
                month: statement.month,
                preset: '50_30_20',
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setBudgetDialogOpen(false);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    const handleSaveAllBudgets = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const budgetsArray = Object.entries(editingBudgets).map(([catId, data]) => ({
            category_id: catId,
            allocated_amount: data.amount,
            group_50_30_20: data.group,
        }));

        router.post(
            `/accounts/${account.id}/category-budgets`,
            {
                month: statement.month,
                budgets: budgetsArray,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setBudgetDialogOpen(false);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    const handleSaveSingleCategoryBudget = (e: React.FormEvent) => {
        e.preventDefault();
        if (!singleCategoryBudgetOpen?.category_id) return;

        setIsSubmitting(true);
        router.post(
            `/accounts/${account.id}/category-budgets`,
            {
                month: statement.month,
                budgets: [
                    {
                        category_id: singleCategoryBudgetOpen.category_id,
                        allocated_amount: singleBudgetAmount,
                        group_50_30_20: singleCategoryBudgetOpen.group_50_30_20,
                    },
                ],
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSingleCategoryBudgetOpen(null);
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
    const budgetCategories = statement.budget_categories || [];
    const summary503020 = statement.summary_50_30_20;
    const totalAllocated = statement.total_allocated ?? 0;
    const unallocatedSalary = statement.unallocated_salary ?? Math.max(0, statement.salary_amount - totalAllocated);

    // Sum of editing budgets in modal
    const editingTotalAllocated = useMemo(() => {
        return Object.values(editingBudgets).reduce((acc, curr) => acc + (curr.amount || 0), 0);
    }, [editingBudgets]);

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

            if (statement.month !== 'all' && statement.month) {
                return t.transaction_date.startsWith(statement.month);
            }

            return true;
        });
    }, [expandedCategory, transactions, statement.month]);

    const hasAnyBudgetsSet = budgetCategories.some((c) => c.allocated_amount > 0);

    return (
        <Card className="border-primary/20 bg-card/60 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold tracking-tight">
                            {__('Control de Presupuesto y Salario')}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {__(
                                'Define cuánto gastar por categoría y controla tu dinero disponible en tiempo real',
                            )}
                        </p>
                    </div>
                </div>

                {/* Controles de Período y Botón de Presupuesto */}
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
                        variant="default"
                        size="sm"
                        className="h-8 gap-1.5 text-xs font-semibold"
                        onClick={handleOpenBudgetDialog}
                    >
                        <Sliders className="h-3.5 w-3.5" />
                        {__('Ajustar Presupuestos')}
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
                                        'Ingresa tu salario percibido para presupuestar tus categorías y controlar tus gastos.',
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
                        {/* 4 Métricas clave: Salario, Presupuestado, Gastado Real, Disponible Real */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {/* 1. Salario Ingresado */}
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
                                            setNewSalaryAmount(statement.salary_amount);
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
                                        ? __('Ingresos totales')
                                        : `${__('Base de')} ${statement.month_name}`}
                                </span>
                            </div>

                            {/* 2. Total Presupuestado */}
                            <div className="rounded-xl border bg-background/50 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {__('Presupuesto Asignado')}
                                    </span>
                                    <Target className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div className="mt-1 flex items-baseline gap-1 text-lg font-bold text-primary">
                                    <AmountDisplay
                                        amountInCents={totalAllocated}
                                        currencyCode={currencyCode}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {unallocatedSalary > 0
                                        ? `${__('Por asignar')}: ${currencyCode} ${(unallocatedSalary / 100).toFixed(2)}`
                                        : __('100% de salario asignado')}
                                </span>
                            </div>

                            {/* 3. Gastos Reales del Mes */}
                            <div className="rounded-xl border bg-background/50 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {__('Gastos Reales')}
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
                                    {statement.spent_percentage}% {__('del salario consumido')}
                                </span>
                            </div>

                            {/* 4. Restante Disponible en Cuenta */}
                            <div
                                className={`rounded-xl border p-3 ${
                                    isDeficit
                                        ? 'border-rose-300 bg-rose-50/50 dark:border-rose-950 dark:bg-rose-950/20'
                                        : 'bg-background/50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {__('Disponible Real')}
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
                                        amountInCents={statement.remaining_balance}
                                        currencyCode={currencyCode}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {isDeficit
                                        ? __('Sobregasto este mes')
                                        : __('Saldo actual disponible')}
                                </span>
                            </div>
                        </div>

                        {/* Barra de Progreso del Salario */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-muted-foreground">
                                    {__('Consumo global del ciclo')}
                                </span>
                                <span
                                    className={
                                        isDeficit
                                            ? 'font-bold text-rose-500'
                                            : 'text-muted-foreground'
                                    }
                                >
                                    {statement.spent_percentage}% {__('gastado')}
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
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
                {/* CONTROL Y PLANIFICADOR DE PRESUPUESTO POR CATEGORÍA */}
                {/* ============================================================== */}
                <div className="rounded-2xl border border-border/80 bg-background/60 p-4 shadow-sm backdrop-blur-md sm:p-5">
                    {/* Encabezado del Planificador con Tabs */}
                    <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between border-b">
                        <div>
                            <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                                {__('Presupuesto por Categoría')}
                                <Badge variant="outline" className="text-[10px] font-normal py-0 h-4">
                                    {statement.month_name}
                                </Badge>
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                                {__('Compara lo que planificaste gastar contra lo que realmente has consumido')}
                            </p>
                        </div>

                        {/* Selector de modo: Categorías individuales vs Regla 50/30/20 */}
                        <div className="flex items-center rounded-lg border bg-muted/40 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setTabMode('categories')}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                                    tabMode === 'categories'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Wallet className="h-3.5 w-3.5 text-primary" />
                                <span>{__('Por Categorías')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTabMode('rule_50_30_20')}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                                    tabMode === 'rule_50_30_20'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                <span>{__('Regla 50 / 30 / 20')}</span>
                            </button>
                        </div>
                    </div>

                    {/* VISTA 1: REGLA 50 / 30 / 20 */}
                    {tabMode === 'rule_50_30_20' && summary503020 && (
                        <div className="mt-4 space-y-4">
                            {/* Banner explicativo con botón de preset */}
                            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row">
                                <div className="space-y-0.5">
                                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                        {__('Distribución Recomendada 50/30/20')}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground">
                                        {__('50% Necesidades esenciales, 30% Deseos y ocio, 20% Ahorro e inversión')}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleApply503020Preset}
                                    disabled={isSubmitting}
                                    className="shrink-0 text-xs gap-1.5"
                                >
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                    {__('Aplicar 50/30/20 a mis categorías')}
                                </Button>
                            </div>

                            {/* 3 Tarjetas de la regla 50/30/20 */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                {/* 50% Necesidades */}
                                <div className="rounded-xl border bg-card/90 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                                                <Wallet className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-foreground">
                                                    {__('Necesidades (50%)')}
                                                </span>
                                                <span className="block text-[10px] text-muted-foreground">
                                                    {__('Vivienda, comida, servicios, salud')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{__('Gastado')}:</span>
                                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                <AmountDisplay
                                                    amountInCents={summary503020.needs.spent_amount}
                                                    currencyCode={currencyCode}
                                                />
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{__('Meta (50% de sueldo)')}:</span>
                                            <span className="font-semibold text-foreground">
                                                <AmountDisplay
                                                    amountInCents={summary503020.needs.target_amount}
                                                    currencyCode={currencyCode}
                                                />
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs pt-1 border-t">
                                            <span className="text-muted-foreground">{__('Disponible')}:</span>
                                            <span
                                                className={`font-bold ${
                                                    summary503020.needs.remaining_amount < 0
                                                        ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-emerald-600 dark:text-emerald-400'
                                                }`}
                                            >
                                                <AmountDisplay
                                                    amountInCents={summary503020.needs.remaining_amount}
                                                    currencyCode={currencyCode}
                                                />
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                summary503020.needs.spent_percentage > 100
                                                    ? 'bg-rose-500'
                                                    : 'bg-blue-500'
                                            }`}
                                            style={{
                                                width: `${Math.min(100, summary503020.needs.spent_percentage)}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* 30% Deseos */}
                                <div className="rounded-xl border bg-card/90 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200">
                                                <Sparkles className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-foreground">
                                                    {__('Deseos (30%)')}
                                                </span>
                                                <span className="block text-[10px] text-muted-foreground">
                                                    {__('Ocio, restaurantes, compras, viajes')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{__('Gastado')}:</span>
                                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                <AmountDisplay
                                                    amountInCents={summary503020.wants.spent_amount}
                                                    currencyCode={currencyCode}
                                                />
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{__('Meta (30% de sueldo)')}:</span>
                                            <span className="font-semibold text-foreground">
                                                <AmountDisplay
                                                    amountInCents={summary503020.wants.target_amount}
                                                    currencyCode={currencyCode}
                                                />
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs pt-1 border-t">
                                            <span className="text-muted-foreground">{__('Disponible')}:</span>
                                            <span
                                                className={`font-bold ${
                                                    summary503020.wants.remaining_amount < 0
                                                        ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-emerald-600 dark:text-emerald-400'
                                                }`}
                                            >
                                                <AmountDisplay
                                                    amountInCents={summary503020.wants.remaining_amount}
                                                    currencyCode={currencyCode}
                                                />
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                summary503020.wants.spent_percentage > 100
                                                    ? 'bg-rose-500'
                                                    : 'bg-purple-500'
                                            }`}
                                            style={{
                                                width: `${Math.min(100, summary503020.wants.spent_percentage)}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* 20% Ahorro / Inversión */}
                                <div className="rounded-xl border bg-card/90 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                                                <PiggyBank className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-foreground">
                                                    {__('Ahorro / Inversión (20%)')}
                                                </span>
                                                <span className="block text-[10px] text-muted-foreground">
                                                    {__('Fondo de emergencia, aportes, deudas')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{__('Destinado')}:</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                <AmountDisplay
                                                    amountInCents={summary503020.savings.spent_amount}
                                                    currencyCode={currencyCode}
                                                />
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{__('Meta (20% de sueldo)')}:</span>
                                            <span className="font-semibold text-foreground">
                                                <AmountDisplay
                                                    amountInCents={summary503020.savings.target_amount}
                                                    currencyCode={currencyCode}
                                                />
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs pt-1 border-t">
                                            <span className="text-muted-foreground">{__('Por alcanzar')}:</span>
                                            <span className="font-bold text-primary">
                                                <AmountDisplay
                                                    amountInCents={Math.max(0, summary503020.savings.remaining_amount)}
                                                    currencyCode={currencyCode}
                                                />
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all"
                                            style={{
                                                width: `${Math.min(100, summary503020.savings.spent_percentage)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VISTA 2: POR CATEGORÍAS (LISTA DE LÍMITES Y DISPONIBLE) */}
                    {tabMode === 'categories' && (
                        <div className="mt-4 space-y-3">
                            {/* Banner amigable si aún no hay presupuestos asignados */}
                            {!hasAnyBudgetsSet && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3.5">
                                    <div className="flex items-center gap-2.5">
                                        <Target className="h-4 w-4 text-primary shrink-0" />
                                        <p className="text-xs text-muted-foreground">
                                            {__('Aún no has definido metas para tus categorías en este mes. Define tus límites o aplica la regla 50/30/20.')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleApply503020Preset}
                                            className="h-7 text-xs gap-1"
                                        >
                                            <Sparkles className="h-3 w-3 text-amber-500" />
                                            {__('Auto 50/30/20')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleOpenBudgetDialog}
                                            className="h-7 text-xs gap-1"
                                        >
                                            <Sliders className="h-3 w-3" />
                                            {__('Asignar Metas')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {budgetCategories.length === 0 ? (
                                <p className="text-center py-6 text-xs text-muted-foreground">
                                    {__('No hay transacciones registradas en este período.')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {budgetCategories.map((cat, idx) => {
                                        const isExpanded = expandedCategory === (cat.category_id ?? '__none__');
                                        const Icon = resolveLucideIcon(cat.icon);
                                        const hexColor = getCategoryHex(cat.color);
                                        const colorClasses = getCategoryColorClasses(
                                            (cat.color || 'stone') as CategoryColor,
                                        );

                                        const hasBudget = cat.allocated_amount > 0;
                                        const isOver = cat.is_over_budget;
                                        const pct = cat.spent_percentage;

                                        return (
                                            <div
                                                key={cat.category_id ?? `cat-${idx}`}
                                                className="group rounded-xl border bg-card/80 p-3 transition-all hover:border-primary/40 hover:bg-card"
                                            >
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    {/* Lado Izquierdo: Icono + Nombre + Grupo 50/30/20 */}
                                                    <div
                                                        className="flex min-w-0 items-center gap-3 cursor-pointer flex-1"
                                                        onClick={() =>
                                                            setExpandedCategory(
                                                                isExpanded ? null : (cat.category_id ?? '__none__'),
                                                            )
                                                        }
                                                    >
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
                                                                    variant="outline"
                                                                    className="h-4 px-1.5 text-[9px] uppercase font-normal text-muted-foreground"
                                                                >
                                                                    {cat.group_50_30_20 === 'needs'
                                                                        ? __('Necesidad')
                                                                        : cat.group_50_30_20 === 'wants'
                                                                          ? __('Deseo')
                                                                          : __('Ahorro')}
                                                                </Badge>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {cat.transaction_count}{' '}
                                                                {cat.transaction_count === 1
                                                                    ? __('movimiento')
                                                                    : __('movimientos')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Lado Derecho: Gastado / Presupuesto + Badge Disponible */}
                                                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                                                        <div className="text-right">
                                                            <div className="flex items-baseline gap-1 text-xs">
                                                                <span className="font-bold text-foreground">
                                                                    <AmountDisplay
                                                                        amountInCents={cat.spent_amount}
                                                                        currencyCode={currencyCode}
                                                                    />
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    /
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    {hasBudget ? (
                                                                        <AmountDisplay
                                                                            amountInCents={cat.allocated_amount}
                                                                            currencyCode={currencyCode}
                                                                        />
                                                                    ) : (
                                                                        __('Sin límite')
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Badge de Disponibilidad */}
                                                        {hasBudget ? (
                                                            <Badge
                                                                variant={isOver ? 'destructive' : pct > 85 ? 'secondary' : 'outline'}
                                                                className={`h-6 text-[10px] font-semibold px-2 flex items-center gap-1 ${
                                                                    isOver
                                                                        ? ''
                                                                        : pct > 85
                                                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-300'
                                                                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300'
                                                                }`}
                                                            >
                                                                {isOver ? (
                                                                    <>
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        {__('Sobregiro')}:{' '}
                                                                        <AmountDisplay
                                                                            amountInCents={Math.abs(cat.remaining_amount)}
                                                                            currencyCode={currencyCode}
                                                                        />
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        {__('Quedan')}:{' '}
                                                                        <AmountDisplay
                                                                            amountInCents={cat.remaining_amount}
                                                                            currencyCode={currencyCode}
                                                                        />
                                                                    </>
                                                                )}
                                                            </Badge>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                                                                onClick={() => {
                                                                    setSingleCategoryBudgetOpen(cat);
                                                                    setSingleBudgetAmount(cat.allocated_amount || 0);
                                                                }}
                                                            >
                                                                + {__('Fijar meta')}
                                                            </Button>
                                                        )}

                                                        {/* Botón de edición rápida */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                setSingleCategoryBudgetOpen(cat);
                                                                setSingleBudgetAmount(cat.allocated_amount || 0);
                                                            }}
                                                            title={__('Editar límite de esta categoría')}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>

                                                        {/* Chevron expandir transacciones */}
                                                        <div
                                                            className="text-muted-foreground cursor-pointer"
                                                            onClick={() =>
                                                                setExpandedCategory(
                                                                    isExpanded ? null : (cat.category_id ?? '__none__'),
                                                                )
                                                            }
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Barra de progreso de la categoría */}
                                                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                            isOver
                                                                ? 'bg-rose-500'
                                                                : pct > 85
                                                                  ? 'bg-amber-500'
                                                                  : ''
                                                        }`}
                                                        style={{
                                                            width: hasBudget ? `${Math.min(100, pct)}%` : '100%',
                                                            backgroundColor: isOver
                                                                ? undefined
                                                                : pct > 85
                                                                  ? undefined
                                                                  : hexColor,
                                                        }}
                                                    />
                                                </div>

                                                {/* Transacciones desplegables */}
                                                {isExpanded && (
                                                    <div className="mt-3 border-t pt-2.5">
                                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                                                            {__('Movimientos en')} {cat.name} ({categoryTransactions.length})
                                                        </span>
                                                        {categoryTransactions.length === 0 ? (
                                                            <p className="text-[11px] text-muted-foreground italic">
                                                                {__('No hay transacciones registradas para este período.')}
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
                            )}
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Modal: Editar Salario del Mes */}
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
                                    'Define cuánto ingresaste o percibiste de salario para este mes. El presupuesto y control de gastos se calcularán en base a este monto.',
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
                                    {(currencyCode || account.currency_code || 'USD').toUpperCase()}
                                    )
                                </label>
                                <AmountInput
                                    id="monthly-salary-input"
                                    value={newSalaryAmount}
                                    currencyCode={currencyCode || account.currency_code || 'USD'}
                                    onChange={(val) => setNewSalaryAmount(val || 0)}
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
                                {isSubmitting ? __('Guardando...') : __('Guardar Salario')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Ajustar Presupuesto de una sola categoría */}
            <Dialog
                open={!!singleCategoryBudgetOpen}
                onOpenChange={(open) => !open && setSingleCategoryBudgetOpen(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleSaveSingleCategoryBudget}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                {__('Meta para')} {singleCategoryBudgetOpen?.name}
                            </DialogTitle>
                            <DialogDescription>
                                {__(
                                    'Fija el límite máximo mensual que planeas destinar a esta categoría.',
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="my-6 space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="single-budget-input"
                                    className="text-xs font-medium text-foreground"
                                >
                                    {__('Límite Mensual')} (
                                    {(currencyCode || account.currency_code || 'USD').toUpperCase()}
                                    )
                                </label>
                                <AmountInput
                                    id="single-budget-input"
                                    value={singleBudgetAmount}
                                    currencyCode={currencyCode || account.currency_code || 'USD'}
                                    onChange={(val) => setSingleBudgetAmount(val || 0)}
                                    className="text-lg font-semibold"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSingleCategoryBudgetOpen(null)}
                                disabled={isSubmitting}
                            >
                                {__('Cancelar')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? __('Guardando...') : __('Guardar Meta')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Ajustar Todos los Presupuestos Mensuales */}
            <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <form onSubmit={handleSaveAllBudgets}>
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sliders className="h-5 w-5 text-primary" />
                                    <DialogTitle>
                                        {__('Ajustar Presupuesto Mensual')} ({statement.month_name})
                                    </DialogTitle>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleApply503020Preset}
                                    className="text-xs gap-1"
                                >
                                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                    {__('Auto 50/30/20')}
                                </Button>
                            </div>
                            <DialogDescription>
                                {__(
                                    'Asigna cuánto deseas gastar como máximo en cada categoría. El sistema te avisará en tiempo real cuánto te queda disponible.',
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Barra de progreso de asignación del salario */}
                        <div className="my-4 rounded-xl border bg-muted/30 p-3 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="font-medium text-muted-foreground">{__('Salario del mes')}:</span>
                                <span className="font-bold text-foreground">
                                    <AmountDisplay
                                        amountInCents={statement.salary_amount}
                                        currencyCode={currencyCode}
                                    />
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="font-medium text-muted-foreground">{__('Total Presupuestado')}:</span>
                                <span className="font-bold text-primary">
                                    <AmountDisplay
                                        amountInCents={editingTotalAllocated}
                                        currencyCode={currencyCode}
                                    />
                                </span>
                            </div>
                            <div className="flex justify-between text-xs border-t pt-1">
                                <span className="font-medium text-muted-foreground">{__('Por Asignar')}:</span>
                                <span
                                    className={`font-bold ${
                                        statement.salary_amount - editingTotalAllocated < 0
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-emerald-600 dark:text-emerald-400'
                                    }`}
                                >
                                    <AmountDisplay
                                        amountInCents={statement.salary_amount - editingTotalAllocated}
                                        currencyCode={currencyCode}
                                    />
                                </span>
                            </div>
                        </div>

                        {/* Lista de categorías para asignar montos */}
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                            {(statement.user_categories_options || []).map((cat) => {
                                const Icon = resolveLucideIcon(cat.icon);
                                const currentData = editingBudgets[cat.id] || {
                                    amount: cat.allocated_amount || 0,
                                    group: cat.group_50_30_20,
                                };

                                return (
                                    <div
                                        key={cat.id}
                                        className="flex items-center justify-between gap-3 rounded-lg border bg-card p-2.5"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                                                <Icon className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="truncate text-xs font-semibold text-foreground block">
                                                    {cat.name}
                                                </span>
                                                <select
                                                    value={currentData.group}
                                                    onChange={(e) => {
                                                        const newGroup = e.target.value as 'needs' | 'wants' | 'savings';
                                                        setEditingBudgets((prev) => ({
                                                            ...prev,
                                                            [cat.id]: {
                                                                ...prev[cat.id],
                                                                group: newGroup,
                                                            },
                                                        }));
                                                    }}
                                                    className="mt-0.5 rounded border bg-transparent text-[10px] text-muted-foreground px-1 py-0.5"
                                                >
                                                    <option value="needs">{__('Necesidad (50%)')}</option>
                                                    <option value="wants">{__('Deseo (30%)')}</option>
                                                    <option value="savings">{__('Ahorro (20%)')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="w-[140px] shrink-0">
                                            <AmountInput
                                                value={currentData.amount}
                                                currencyCode={currencyCode || 'USD'}
                                                onChange={(val) => {
                                                    setEditingBudgets((prev) => ({
                                                        ...prev,
                                                        [cat.id]: {
                                                            amount: val || 0,
                                                            group: prev[cat.id]?.group || cat.group_50_30_20,
                                                        },
                                                    }));
                                                }}
                                                className="h-8 text-xs font-semibold text-right"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <DialogFooter className="mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setBudgetDialogOpen(false)}
                                disabled={isSubmitting}
                            >
                                {__('Cancelar')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? __('Guardando...') : __('Guardar Presupuestos')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Extracto Mensual Completo */}
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
                                                        backgroundColor: getCategoryHex(cat.color),
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
                                                    backgroundColor: getCategoryHex(cat.color),
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
