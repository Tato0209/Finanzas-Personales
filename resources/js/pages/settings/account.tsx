import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit as accountEdit } from '@/routes/account';
import { send } from '@/routes/verification';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { LANGUAGE_OPTIONS } from '@/types/language';
import { formatLocaleOptions } from '@/utils/format-locale';
import { __ } from '@/utils/i18n';
import { Transition } from '@headlessui/react';
import { Form, Head, Link, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

/**
 * One labelled dropdown in the profile form. Three of these sit in a row —
 * currency, language, region — and they were the same twenty-five lines three
 * times over until they were not.
 */
function PreferenceSelect({
    name,
    label,
    placeholder,
    defaultValue,
    options,
    error,
    required = false,
}: {
    name: string;
    label: string;
    placeholder: string;
    defaultValue?: string;
    options: readonly { code: string; label: string }[];
    error?: string;
    required?: boolean;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>

            <Select name={name} defaultValue={defaultValue} required={required}>
                <SelectTrigger
                    className="mt-1 w-full"
                    data-testid={`${name.replaceAll('_', '-')}-select`}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <InputError className="mt-2" message={error} />
        </div>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bank accounts',
        href: accountEdit().url,
    },
];

export default function Account({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
}) {
    const { auth, currencies, formatLocales } = usePage<SharedData>().props;
    const locale = useLocale();
    // Each row carries a live example, so a reader picks by what it does to
    // their money rather than by guessing what a tag means.
    const formatOptions = useMemo(
        () =>
            formatLocaleOptions(formatLocales, auth.user.currency_code, locale),
        [formatLocales, auth.user.currency_code, locale],
    );
    const currencyOptions = useMemo(
        () =>
            currencies.profile.map((currency) => ({
                code: currency.code,
                label: `${currency.code} - ${currency.name}`,
            })),
        [currencies.profile],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={__('Bank accounts')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title={__('Profile information')}
                        description={__('Update your name and email address')}
                    />

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-6"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">{__('Name')}</Label>

                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder={__('Name')}
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">
                                        {__('Email address')}
                                    </Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder={__('Email address')}
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.email}
                                    />
                                </div>

                                <PreferenceSelect
                                    name="currency_code"
                                    label={__('Currency')}
                                    placeholder={__('Select currency')}
                                    defaultValue={auth.user.currency_code}
                                    options={currencyOptions}
                                    error={errors.currency_code}
                                    required
                                />

                                <PreferenceSelect
                                    name="locale"
                                    label={__('Language')}
                                    placeholder={__('Select language')}
                                    defaultValue={auth.user.locale ?? undefined}
                                    options={LANGUAGE_OPTIONS}
                                    error={errors.locale}
                                />

                                <PreferenceSelect
                                    name="format_locale"
                                    label={__('Number and date format')}
                                    placeholder={__('Select a region')}
                                    defaultValue={
                                        auth.user.format_locale ?? undefined
                                    }
                                    options={formatOptions}
                                    error={errors.format_locale}
                                />

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                {__(
                                                    'Your email address is unverified.',
                                                )}{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    {__(
                                                        'Click here to resend the\n                                                    verification email.',
                                                    )}
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    {__(
                                                        'A new verification link has\n                                                    been sent to your email\n                                                    address.',
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        {__('Save')}
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">
                                            {__('Saved')}
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
