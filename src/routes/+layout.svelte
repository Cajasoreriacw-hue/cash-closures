<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { goto, invalidateAll } from '$app/navigation';
	import { createBrowserClient } from '@supabase/ssr';
	import { page } from '$app/stores';
	import SplashScreen from '$lib/components/SplashScreen.svelte';
	import { onMount } from 'svelte';

	let { children, data } = $props();
	let { supabase, session, user } = $derived(data);

	let mobileMenuOpen = $state(false);
	let showSplash = $state(true);
	let splashCompleted = $state(false);

	// Check if splash has been shown in this session
	onMount(() => {
		const hasShownSplash = sessionStorage.getItem('splashShown');
		if (hasShownSplash) {
			showSplash = false;
			splashCompleted = true;
		}
	});

	function handleSplashComplete() {
		splashCompleted = true;
		sessionStorage.setItem('splashShown', 'true');
	}

	async function handleLogout() {
		await supabase.auth.signOut();
		await invalidateAll();
		goto('/login');
	}

	$effect(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (session?.expires_at !== data.session?.expires_at) {
				invalidateAll();
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	});

	// Get user display name (email or first part of email)
	const userDisplayName = $derived(data.user?.email?.split('@')[0] || 'Usuario');

	// Close mobile menu when route changes
	$effect(() => {
		if ($page) {
			mobileMenuOpen = false;
		}
	});

	// Navigation items
	const navItems = [
		{
			href: '/',
			label: 'Panel',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
		},
		{
			href: '/closures',
			label: 'Cierres',
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
		},
		{
			href: '/sobres',
			label: 'Sobres',
			icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
		},
		{
			href: '/gastos',
			label: 'Gastos',
			icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
		},
		{
			href: '/informe-diario',
			label: 'Informe',
			icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
		},
		{
			href: '/descuadres',
			label: 'Descuadres',
			icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
		}
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
	/>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
</svelte:head>

<!-- Splash Screen -->
{#if showSplash && !splashCompleted && data.session}
	<SplashScreen onComplete={handleSplashComplete} />
{/if}

<!-- Main App Content (hidden during splash) -->
<div class:hidden={showSplash && !splashCompleted}>
	{#if data.session}
		<!-- Desktop/Tablet Navigation -->
		<nav
			class="hidden md:flex items-center justify-between px-4 lg:px-6 py-3 border-b border-gray-100 bg-white/95 backdrop-blur-lg shadow-soft sticky top-0 z-50"
		>
			<!-- Left: Logo and App Name -->
			<div class="flex items-center gap-2 lg:gap-3">
				<img
					src="/icon-512.svg"
					alt="Logo"
					class="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-xl"
				/>
				<div>
					<h1 class="text-base lg:text-lg font-bold text-gray-900">Monit</h1>
					<p class="text-[8px] lg:text-xs text-gray-500 hidden lg:block">Control de Caja</p>
				</div>
			</div>

			<!-- Center: Navigation Links -->
			<div class="flex items-center gap-1">
				{#each navItems as item}
					<a
						href={item.href}
						class="px-2 lg:px-4 py-2 text-xs lg:text-sm font-medium text-gray-600 hover:text-dark-orange-600 hover:bg-dark-orange-50 rounded-xl transition-all duration-200"
						class:bg-dark-orange-100={$page.url.pathname === item.href}
						class:text-dark-orange-700={$page.url.pathname === item.href}
						class:shadow-soft={$page.url.pathname === item.href}
					>
						{item.label}
					</a>
				{/each}
			</div>

			<!-- Right: User Info and Logout -->
			<div class="flex items-center gap-2 lg:gap-4">
				<div
					class="hidden lg:flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl border border-gray-100"
				>
					<div
						class="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-dark-orange-400 to-dark-orange-500 text-white font-semibold text-sm shadow-soft"
					>
						{userDisplayName.charAt(0).toUpperCase()}
					</div>
					<div>
						<p class="text-sm font-semibold text-gray-900">{userDisplayName}</p>
						<p class="text-xs text-gray-500">{data.user?.email}</p>
					</div>
				</div>
				<button
					type="button"
					onclick={handleLogout}
					class="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 text-xs lg:text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all border border-red-200 hover:border-red-300"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					<span class="hidden lg:inline">Cerrar Sesión</span>
				</button>
			</div>
		</nav>

		<!-- Mobile Top Bar -->
		<nav
			class="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/95 backdrop-blur-lg shadow-soft sticky top-0 z-50"
		>
			<!-- Logo -->
			<div class="flex items-center gap-2">
				<img
					src="/icon-512.svg"
					alt="Logo"
					class="flex items-center justify-center w-9 h-9 rounded-xl"
				/>
				<div>
					<h1 class="text-base font-bold text-gray-900">Monit</h1>
				</div>
			</div>

			<!-- User Avatar & Menu Button -->
			<div class="flex items-center gap-3">
				<div
					class="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-dark-orange-400 to-dark-orange-500 text-white font-semibold text-sm shadow-soft"
				>
					{userDisplayName.charAt(0).toUpperCase()}
				</div>
				<button
					type="button"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="p-2 text-gray-600 hover:bg-dark-orange-50 hover:text-dark-orange-600 rounded-xl transition-all duration-200"
					aria-label="Toggle menu"
				>
					{#if mobileMenuOpen}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					{:else}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
					{/if}
				</button>
			</div>
		</nav>

		<!-- Mobile Dropdown Menu -->
		{#if mobileMenuOpen}
			<div
				class="md:hidden fixed inset-0 top-[57px] bg-black/50 z-40"
				onclick={() => (mobileMenuOpen = false)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						mobileMenuOpen = false;
					}
				}}
				role="button"
				tabindex="0"
				aria-label="Close menu"
			>
				<div
					class="bg-white shadow-lg rounded-b-2xl overflow-hidden"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
					role="dialog"
					aria-label="Navigation menu"
					tabindex="-1"
				>
					<div class="p-4 border-b border-slate-200">
						<p class="text-sm font-semibold text-gray-900">{userDisplayName}</p>
						<p class="text-xs text-gray-500">{data.user?.email}</p>
					</div>
					<div class="p-2">
						{#each navItems as item}
							<a
								href={item.href}
								class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-dark-orange-50 hover:text-dark-orange-600 rounded-xl transition-all duration-200"
								class:bg-dark-orange-100={$page.url.pathname === item.href}
								class:text-dark-orange-700={$page.url.pathname === item.href}
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d={item.icon}
									/>
								</svg>
								{item.label}
							</a>
						{/each}
					</div>
					<div class="p-4 border-t border-slate-200">
						<button
							type="button"
							onclick={handleLogout}
							class="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
							Cerrar Sesión
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Main Content -->
		<main
			class="px-3 md:px-6 py-4 md:py-6 pb-20 md:pb-6 bg-gradient-to-br from-gray-50 to-dark-orange-50/30 min-h-screen"
		>
			{@render children()}
		</main>

		<!-- Mobile Bottom Navigation -->
		<nav
			class="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-soft-lg z-50"
		>
			<div class="flex items-center justify-around px-1 py-2">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 min-w-[50px]"
						class:text-dark-orange-600={$page.url.pathname === item.href}
						class:bg-dark-orange-50={$page.url.pathname === item.href}
						class:text-gray-600={$page.url.pathname !== item.href}
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
						</svg>
						<span class="text-[9px] font-medium">{item.label}</span>
					</a>
				{/each}
			</div>
		</nav>
	{:else}
		{@render children()}
	{/if}
</div>
