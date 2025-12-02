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
	class="min-h-screen flex items-center justify-center bg-linear-to-br from-stone-50 to-neutral-50 px-4 py-6"
>
	<div class="max-w-md w-full">
		<!-- Logo and Title -->
		<div class="text-center mb-6 md:mb-8">
			<div
				class="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl shadow-lg"
			>
				<img src="/icon-512.svg" alt="Logo" class="" />
			</div>
			<h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-1 squada-one-regular">Monit</h1>
			<p class="text-sm md:text-base text-gray-600">Sistema de Control de Caja</p>
		</div>

		<!-- Login Card -->
		<div class="bg-white rounded-2xl shadow-xl p-6 md:p-6 border border-gray-100">
			<h2 class="text-xl md:text-2xl font-semibold text-gray-900 mb-4">Iniciar Sesión</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleLogin();
				}}
			>
				<div class="space-y-5">
					<!-- Email Input -->
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
							Correo Electrónico
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="w-full px-4 py-3 md:py-3.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all outline-none text-base"
							placeholder="tu@email.com"
						/>
					</div>

					<!-- Password Input -->
					<div>
						<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
							Contraseña
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							class="w-full px-4 py-3 md:py-3.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all outline-none text-base"
							placeholder="••••••••"
						/>
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={loading}
						class="w-full bg-linear-to-r from-orange-300 to-amber-400 text-white font-semibold py-3.5 md:py-4 px-4 rounded-lg hover:from-amber-500 hover:to-amber-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-[0.98] text-base"
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
