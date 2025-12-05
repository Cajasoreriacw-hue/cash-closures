<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Toast } from 'flowbite-svelte';

	let { data } = $props();
	let { supabase } = $derived(data);

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleLogin() {
		loading = true;
		error = '';

		const { error: signInError } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (signInError) {
			error = signInError.message;
			loading = false;
		} else {
			// Force reload of server data to ensure session is recognized
			await invalidateAll();
			goto('/');
		}
	}
</script>

<svelte:head>
	<title>Login - Monit</title>
</svelte:head>

<div class="fixed top-0 left-0 right-0 z-50 w-full p-4">
	{#if error}
		<Toast color="red">
			<span class="font-medium">Error:</span>
			{error}
		</Toast>
	{/if}
</div>

<div
	class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 py-6 transition-colors duration-300"
>
	<div class="max-w-md w-full animate-fade-in">
		<!-- Logo and Title -->
		<div class="text-center mb-8">
			<div
				class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-soft-lg mb-4 p-4 transition-all"
			>
				<img src="/icon-512.svg" alt="Logo" class="w-full h-full object-contain" />
			</div>
			<h1
				class="text-3xl font-bold text-gray-900 dark:text-white mb-1 squada-one-regular tracking-wide"
			>
				Monit
			</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Sistema de Control de Caja</p>
		</div>

		<!-- Login Card -->
		<div
			class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-soft-xl dark:shadow-none dark:border dark:border-slate-700 border border-white/50 p-8 transition-all"
		>
			<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
				Bienvenido de nuevo
			</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleLogin();
				}}
			>
				<div class="space-y-5">
					<!-- Email Input -->
					<div class="space-y-2">
						<label for="email" class="block text-sm font-semibold text-gray-700 dark:text-gray-300">
							Correo Electrónico
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-600
								bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white
								focus:bg-white dark:focus:bg-slate-700
								focus:ring-4 focus:ring-fresh-sky-500/10 focus:border-fresh-sky-500
								transition-all outline-none text-sm placeholder-gray-400 dark:placeholder-gray-500 font-medium"
							placeholder="tu@email.com"
						/>
					</div>

					<!-- Password Input -->
					<div class="space-y-2">
						<label
							for="password"
							class="block text-sm font-semibold text-gray-700 dark:text-gray-300"
						>
							Contraseña
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							class="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-600
								bg-white/50 dark:bg-slate-700/50 text-gray-900 dark:text-white
								focus:bg-white dark:focus:bg-slate-700
								focus:ring-4 focus:ring-fresh-sky-500/10 focus:border-fresh-sky-500
								transition-all outline-none text-sm placeholder-gray-400 dark:placeholder-gray-500 font-medium"
							placeholder="••••••••"
						/>
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={loading}
						class="w-full h-12 bg-fresh-sky-600 hover:bg-fresh-sky-700 text-white text-sm font-bold rounded-xl shadow-soft hover:shadow-soft-lg focus:ring-4 focus:ring-fresh-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] mt-2"
					>
						{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
					</button>
				</div>
			</form>

			<!-- Additional Info -->
			<div class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
				<p>¿Olvidaste tu contraseña? Contacta al administrador</p>
			</div>
		</div>

		<!-- Footer -->
		<div class="mt-6 md:mt-8 text-center text-xs md:text-sm text-gray-500 dark:text-gray-500">
			<p>© 2025 Monit. Todos los derechos reservados.</p>
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
