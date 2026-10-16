<x-mail::message>
# {{ __('Hey :name, what held you back?', ['name' => $userName]) }}

{{ __("Hi! It's Víctor and Álvaro, the founders of Finanzas Personales. You finished setting up your account and connected your bank yesterday, but didn't end up continuing. We wanted to reach out personally to understand why.") }}

{{ __('Was it the price? Were you missing a feature? Did something feel confusing or not quite work the way you expected? Honestly, any reason helps us.') }}

{{ __("Just hit reply and tell us in a line or two. There's no form and no survey - your message comes straight to us, and we read and answer every single one.") }}

{{ __("Whatever the reason, knowing it makes Finanzas Personales better for everyone. Thank you for giving it a try.") }}

{{ __('Best,') }}<br>
{{ __('Álvaro & Víctor') }}<br>
{{ __('Founders of Finanzas Personales') }}

<x-slot:subcopy>@include('mail.partials.marketing-unsubscribe')</x-slot:subcopy>
</x-mail::message>
