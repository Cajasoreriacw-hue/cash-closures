<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { quintOut, elasticOut } from 'svelte/easing';

	let { onComplete = () => {} } = $props();

	let visible = $state(true);
	let logoLoaded = $state(false);
	let progress = $state(0);

	// Generate random particles
	const particles = Array.from({ length: 20 }, (_, i) => ({
		id: i,
		size: Math.random() * 8 + 4,
		left: Math.random() * 100,
		top: Math.random() * 100,
		delay: Math.random() * 2,
		duration: Math.random() * 3 + 2
	}));

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
		}, 1500);

		return () => {
			clearTimeout(timer);
			clearInterval(progressInterval);
		};
	});
</script>

{#if visible}
	<div
		class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-linear-to-br from-dark-orange-50 via-orange-50 to-dark-orange-100 overflow-hidden"
		transition:fade={{ duration: 500 }}
	>
		<!-- Floating Particles -->
		<div class="absolute inset-0 overflow-hidden">
			{#each particles as particle}
				<div
					class="absolute rounded-full bg-linear-to-br from-dark-orange-300/20 to-dark-orange-400/20 animate-float"
					style="
						width: {particle.size}px;
						height: {particle.size}px;
						left: {particle.left}%;
						top: {particle.top}%;
						animation-delay: {particle.delay}s;
						animation-duration: {particle.duration}s;
					"
				></div>
			{/each}
		</div>

		<!-- Subtle Background Glow -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div
				class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-dark-orange-200/20 via-dark-orange-300/10 to-transparent rounded-full blur-3xl animate-pulse-slow"
			></div>
		</div>

		<!-- Main Content -->
		<div class="relative z-10 flex flex-col items-center gap-6">
			<!-- Logo - Clean and Minimal -->
			<div class="relative" in:scale={{ duration: 600, easing: quintOut, start: 0.8 }}>
				<!-- Subtle Glow Behind Logo -->
				<div
					class="absolute inset-0 scale-110 bg-linear-to-br from-dark-orange-300/30 to-dark-orange-400/30 rounded-full blur-2xl animate-pulse-slow"
				></div>

				<!-- Logo Image - No Background Box -->
				<img
					src="/icon-512.svg"
					alt="Monit Logo"
					class="relative w-28 h-28 md:w-36 md:h-36 drop-shadow-2xl animate-float-gentle"
					onload={() => (logoLoaded = true)}
				/>
			</div>

			<!-- App Name with Modern Typography -->
			<div class="text-center space-y-2" in:fade={{ duration: 500, delay: 200 }}>
				<h1
					class="text-5xl md:text-6xl font-bold bg-linear-to-r from-dark-orange-600 via-dark-orange-500 to-dark-orange-600 bg-clip-text text-transparent tracking-tight"
					style="font-family: 'Poppins', sans-serif; font-weight: 700;"
				>
					Monit
				</h1>
				<p class="text-base md:text-lg text-gray-500 font-medium tracking-wide">Control de Caja</p>
			</div>

			<!-- Minimal Loading Bar -->
			<div class="w-48 md:w-64 mt-4" in:fade={{ duration: 400, delay: 400 }}>
				<!-- Progress Track -->
				<div class="relative h-1 bg-gray-200/50 rounded-full overflow-hidden backdrop-blur-sm">
					<!-- Progress Fill -->
					<div
						class="absolute inset-y-0 left-0 bg-linear-to-r from-dark-orange-500 to-dark-orange-600 rounded-full transition-all duration-300 ease-out"
						style="width: {progress}%"
					>
						<!-- Shimmer Effect -->
						<div
							class="absolute inset-0 bg-linear-to-r from-transparent via-white/50 to-transparent animate-shimmer"
						></div>
					</div>
				</div>

				<!-- Loading Text -->
				<p class="text-xs text-gray-400 font-medium text-center mt-3 animate-pulse">Cargando...</p>
			</div>
		</div>

		<!-- Minimal Version Badge -->
		<div
			class="absolute bottom-6 text-[10px] md:text-xs text-gray-400/80 font-light tracking-wider"
			in:fade={{ duration: 400, delay: 600 }}
		>
			v1.0.0
		</div>
	</div>
{/if}

<style>
	@keyframes float {
		0%,
		100% {
			transform: translateY(0) translateX(0);
			opacity: 0.3;
		}
		25% {
			transform: translateY(-20px) translateX(10px);
			opacity: 0.6;
		}
		50% {
			transform: translateY(-40px) translateX(-10px);
			opacity: 0.3;
		}
		75% {
			transform: translateY(-20px) translateX(10px);
			opacity: 0.6;
		}
	}

	@keyframes float-gentle {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	@keyframes pulse-slow {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.6;
		}
	}

	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(200%);
		}
	}

	.animate-float {
		animation: float 5s ease-in-out infinite;
	}

	.animate-float-gentle {
		animation: float-gentle 3s ease-in-out infinite;
	}

	.animate-pulse-slow {
		animation: pulse-slow 4s ease-in-out infinite;
	}

	.animate-shimmer {
		animation: shimmer 2s ease-in-out infinite;
	}

	.bg-gradient-radial {
		background: radial-gradient(circle, var(--tw-gradient-stops));
	}
</style>
