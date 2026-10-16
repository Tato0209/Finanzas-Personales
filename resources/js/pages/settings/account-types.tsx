import { CreateAccountTypeDialog } from '@/components/account-types/create-account-type-dialog';
import { DeleteAccountTypeDialog } from '@/components/account-types/delete-account-type-dialog';
import { EditAccountTypeDialog } from '@/components/account-types/edit-account-type-dialog';
import HeadingSmall from '@/components/heading-small';
import { SettingsTable } from '@/components/shared/settings-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import {
    accountIconByType,
    type AccountTypeModel,
} from '@/types/account';
import { __ } from '@/utils/i18n';
import { Head, usePage } from '@inertiajs/react';
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    Row,
    SortingState,
    useReactTable,
    VisibilityState,
} from '@tanstack/react-table';
import { ArrowUpDown, Edit, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: __('Tipos de cuenta'),
        href: '/settings/account-types',
    },
];

function AccountTypeActions({
    accountType,
}: {
    accountType: AccountTypeModel;
}) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        aria-label={__('Open menu')}
                    >
                        <span className="sr-only">{__('Open menu')}</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{__('Acciones')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {__('Editar')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setDeleteOpen(true)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {__('Eliminar')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {editOpen && (
                <EditAccountTypeDialog
                    accountType={accountType}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                />
            )}

            {deleteOpen && (
                <DeleteAccountTypeDialog
                    accountType={accountType}
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                />
            )}
        </>
    );
}

function AccountTypeRow({ row }: { row: Row<AccountTypeModel> }) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const accountType = row.original;

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <TableRow data-state={row.getIsSelected() && 'selected'}>
                        {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                                {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                )}
                            </TableCell>
                        ))}
                    </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {__('Editar')}
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() => setDeleteOpen(true)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {__('Eliminar')}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {editOpen && (
                <EditAccountTypeDialog
                    accountType={accountType}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                />
            )}

            {deleteOpen && (
                <DeleteAccountTypeDialog
                    accountType={accountType}
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                />
            )}
        </>
    );
}

export default function AccountTypes() {
    const { accountTypes = [] } = usePage<{
        accountTypes: AccountTypeModel[];
    }>().props;

    const [sorting, setSorting] = useState<SortingState>([
        { id: 'name', desc: false },
    ]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        {},
    );
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const columns: ColumnDef<AccountTypeModel>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === 'asc')
                        }
                    >
                        {__('Nombre')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const item = row.original;
                const IconComponent = accountIconByType(item.slug, accountTypes);

                return (
                    <div className="flex items-center gap-3 pl-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                            <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="font-medium text-foreground">
                                {item.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {item.slug}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'has_transaction_ledger',
            header: __('Características'),
            cell: ({ row }) => {
                const item = row.original;

                return (
                    <div className="flex flex-wrap gap-1.5">
                        {item.has_transaction_ledger ? (
                            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                {__('Transaccional')}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                                {__('Solo balance')}
                            </Badge>
                        )}
                        {item.supports_invested_amount && (
                            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                                {__('Monto invertido')}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'accounts_count',
            header: __('Cuentas asociadas'),
            cell: ({ row }) => {
                const count = row.original.accounts_count ?? 0;

                return (
                    <span className="text-sm text-muted-foreground">
                        {count === 1
                            ? __('1 cuenta')
                            : __(':count cuentas', { count: count.toString() })}
                    </span>
                );
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => <AccountTypeActions accountType={row.original} />,
        },
    ];

    const table = useReactTable({
        data: accountTypes,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Tipos de cuenta')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <HeadingSmall
                            title={__('Tipos de cuenta')}
                            description={__(
                                'Personaliza, agrega o elimina los tipos de cuenta para adaptarlos a tu gestión financiera.',
                            )}
                        />
                        <CreateAccountTypeDialog
                            open={createDialogOpen}
                            onOpenChange={setCreateDialogOpen}
                            trigger={
                                <Button className="w-full sm:w-auto">
                                    <Plus className="mr-2 h-4 w-4" />
                                    {__('Crear tipo de cuenta')}
                                </Button>
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder={__('Buscar tipo de cuenta...')}
                                value={
                                    (table
                                        .getColumn('name')
                                        ?.getFilterValue() as string) ?? ''
                                }
                                onChange={(event) =>
                                    table
                                        .getColumn('name')
                                        ?.setFilterValue(event.target.value)
                                }
                                className="h-9 w-[180px] sm:w-[260px]"
                            />
                        </div>
                    </div>

                    <SettingsTable
                        table={table}
                        columns={columns}
                        rowComponent={AccountTypeRow}
                    />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
