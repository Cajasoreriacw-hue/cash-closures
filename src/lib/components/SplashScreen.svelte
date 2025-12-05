<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { quintOut, elasticOut } from 'svelte/easing';

	let { onComplete = () => {} } = $props();

	let visible = $state(true);
	let logoLoaded = $state(false);
	let progress = $state(0);

	onMount(() => {
		// Simulate loading progress
		const progressInterval = setInterval(() => {
			progress += Math.random() * 15;
			if (progress >= 100) {
				progress = 100;
				clearInterval(progressInterval);
			}
		}, 100);

		// Hide splash screen after animation
		const timer = setTimeout(() => {
			visible = false;
			setTimeout(() => {
				onComplete();
			}, 500);
		}, 2500);

		return () => {
			clearTimeout(timer);
			clearInterval(progressInterval);
		};
	});
</script>

{#if visible}
	<div
		class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50"
		transition:fade={{ duration: 500 }}
	>
		<!-- Animated Background Circles -->
		<div class="absolute inset-0 overflow-hidden">
			<div
				class="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl animate-pulse"
				style="animation-duration: 3s;"
			></div>
			<div
				class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl animate-pulse"
				style="animation-duration: 4s; animation-delay: 0.5s;"
			></div>
		</div>

		<!-- Logo Container -->
		<div class="relative z-10 flex flex-col items-center gap-8">
			<!-- Logo with Animation -->
			<div class="relative" in:scale={{ duration: 800, easing: elasticOut, start: 0.5 }}>
				<!-- Glow Effect -->
				<div
					class="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl blur-2xl opacity-50 animate-pulse"
				></div>

				<!-- Logo -->
				<div class="relative bg-white rounded-3xl p-8 shadow-2xl border border-amber-100">
					<img
						src="/icon-512.svg"
						alt="Monit Logo"
						class="w-32 h-32 md:w-40 md:h-40 animate-bounce-slow"
						style="animation-duration: 2s;"
						onload={() => (logoLoaded = true)}
					/>
				</div>
			</div>

			<!-- App Name -->
			<div class="text-center" in:fade={{ duration: 600, delay: 300 }}>
				<h1
					class="text-5xl md:text-6xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent squada-one-regular mb-2"
				>
					Monit
				</h1>
				<p class="text-lg md:text-xl text-gray-600 font-medium">Control de Caja</p>
			</div>

			<!-- Loading Bar -->
			<div
				class="w-64 md:w-80 bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner"
				in:fade={{ duration: 400, delay: 600 }}
			>
				<div
					class="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
					style="width: {progress}%"
				>
					<!-- Shimmer Effect -->
					<div
						class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
					></div>
				</div>
			</div>

			<!-- Loading Text -->
			<p
				class="text-sm text-gray-500 font-medium animate-pulse"
				in:fade={{ duration: 400, delay: 800 }}
			>
				Cargando...
			</p>
		</div>

		<!-- Version Badge -->
		<div
			class="absolute bottom-8 text-xs text-gray-400 font-medium"
			in:fade={{ duration: 400, delay: 1000 }}
		>
			v1.0.0 • Sistema ERP
		</div>
	</div>
{/if}

<style>
	@keyframes bounce-slow {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	.animate-bounce-slow {
		animation: bounce-slow 2s ease-in-out infinite;
	}

	.animate-shimmer {
		animation: shimmer 2s ease-in-out infinite;
	}

	/* Ensure Squada One font is loaded */
	:global(.squada-one-regular) {
		font-family: 'Squada One', cursive;
	}
</style>
