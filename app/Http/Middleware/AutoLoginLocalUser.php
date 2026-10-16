<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class AutoLoginLocalUser
{
    /**
     * Handle an incoming request.
     *
     * Automatically authenticates as the local user so that the interface
     * is directly accessible without any login, password, or access barrier.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Ensure user is logged in
        if (! Auth::check()) {
            $user = User::query()->first();

            if (! $user) {
                $user = User::create([
                    'name' => 'Usuario Local',
                    'email' => 'local@whisper.money',
                    'password' => Hash::make('local-password'),
                    'currency_code' => 'PEN',
                    'locale' => 'es',
                    'format_locale' => 'es-ES',
                    'email_verified_at' => now(),
                    'onboarded_at' => now(),
                ]);
            } else {
                // Ensure the user has email verified and onboarding done to avoid any redirects
                $needsSave = false;
                if (! $user->email_verified_at) {
                    $user->email_verified_at = now();
                    $needsSave = true;
                }
                if (! $user->onboarded_at) {
                    $user->onboarded_at = now();
                    $needsSave = true;
                }
                if ($needsSave) {
                    $user->save();
                }
            }

            Auth::login($user, remember: true);
            $request->setUserResolver(fn () => $user);
        }

        // 2. If the user hits root '/', login, or register, redirect straight to dashboard
        if ($request->is('/') || $request->is('login') || $request->is('register') || $request->is('forgot-password')) {
            return redirect()->route('dashboard');
        }

        return $next($request);
    }
}
