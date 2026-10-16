<x-mail::message>
# A Personal Thank You & What's Next for Finanzas Personales

Hi {{ $user->name }},

It's Víctor here, the solo developer behind Finanzas Personales. I'm writing from my personal email because I wanted to reach out and share some exciting news with you.

## We're Growing! 🎉

Since launching, Finanzas Personales has already reached [**+240 stars on GitHub**](https://github.com/finanzas-personales/finanzas-personales) – which is honestly massive for a privacy-first finance app!

Even more meaningful: we now have our first paying users. This means I need to keep improving the product to earn your trust every day.

## I Need Your Help

Finanzas Personales is a small project built by one person (me!), but it can become something amazing with your input. Here's how you can help shape the future:

<x-mail::panel>
**Join our Discord community** – Share ideas, report bugs, or just chat about privacy-first finance. [Join our comminity](https://discord.gg/m8hUhx6D9D).

**Check our Roadmap** – See what's coming next and vote on features you care about:
[feedback.finanzaspersonales.local/roadmap](https://feedback.finanzaspersonales.local/roadmap)

**Request Features** – Have an idea? I want to hear it:
[feedback.finanzaspersonales.local](https://feedback.finanzaspersonales.local/)
</x-mail::panel>

## Why This Matters

Building a privacy-first alternative to mainstream finance apps is a big challenge. Every star on GitHub, every feature request, every Discord message helps me understand what you need. And because this is a solo project, your feedback directly shapes what gets built next.

**Feel free to reply to this email** – I read every message personally.

Thank you for trusting Finanzas Personales with your financial data. Your privacy is my priority, always.

<x-mail::button :url="'https://discord.gg/m8hUhx6D9D'">
Join the Discord Comminity
</x-mail::button>

Víctor Falcón Ruíz</br></br>
Founder & Solo Developer, Finanzas Personales

<x-slot:subcopy>@include('mail.partials.marketing-unsubscribe')</x-slot:subcopy>
</x-mail::message>
