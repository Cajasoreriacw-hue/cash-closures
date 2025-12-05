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
	class="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-dark-orange-50/30 px-4 py-6"
>
	<div class="max-w-md w-full animate-fade-in">
		<!-- Logo and Title -->
		<div class="text-center mb-8">
			<div
				class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-soft-lg mb-4 p-4"
			>
				<img src="/icon-512.svg" alt="Logo" class="w-full h-full object-contain" />
			</div>
			<h1 class="text-3xl font-bold text-gray-900 mb-1 squada-one-regular tracking-wide">Monit</h1>
			<p class="text-sm text-gray-500 font-medium">Sistema de Control de Caja</p>
		</div>

		<!-- Login Card -->
		<div class="bg-white/80 backdrop-blur-lg rounded-3xl shadow-soft-xl border border-white/50 p-8">
			<h2 class="text-xl font-bold text-gray-900 mb-6 text-center">Bienvenido de nuevo</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleLogin();
				}}
			>
				<div class="space-y-5">
					<!-- Email Input -->
					<div class="space-y-2">
						<label for="email" class="block text-sm font-semibold text-gray-700">
							Correo Electrónico
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-dark-orange-500/10 focus:border-dark-orange-500 transition-all outline-none text-sm placeholder-gray-400 font-medium"
							placeholder="tu@email.com"
						/>
					</div>

					<!-- Password Input -->
					<div class="space-y-2">
						<label for="password" class="block text-sm font-semibold text-gray-700">
							Contraseña
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							class="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-dark-orange-500/10 focus:border-dark-orange-500 transition-all outline-none text-sm placeholder-gray-400 font-medium"
							placeholder="••••••••"
						/>
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={loading}
						class="w-full h-12 bg-linear-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl focus:ring-4 focus:ring-gray-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] mt-2"
					>
						{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
					</button>
				</div>
			</form>

			<!-- Additional Info -->
			<div class="mt-6 text-center text-sm text-gray-600">
				<p>¿Olvidaste tu contraseña? Contacta al administrador</p>
			</div>
		</div>

		<!-- Footer -->
		<div class="mt-6 md:mt-8 text-center text-xs md:text-sm text-gray-500">
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
