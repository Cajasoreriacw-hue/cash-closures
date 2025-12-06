<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale, fly } from 'svelte/transition';
	import { quintOut, elasticOut, backOut } from 'svelte/easing';

	let { onComplete = () => {} } = $props();

	let visible = $state(true);
	let logoLoaded = $state(false);
	let progress = $state(0);
	let showContent = $state(false);

	// Generate random particles with more variety
	const particles = Array.from({ length: 30 }, (_, i) => ({
		id: i,
		size: Math.random() * 10 + 3,
		left: Math.random() * 100,
		top: Math.random() * 100,
		delay: Math.random() * 2,
		duration: Math.random() * 4 + 3,
		opacity: Math.random() * 0.5 + 0.3
	}));

	onMount(() => {
		// Show content with delay for smooth entrance
		setTimeout(() => {
			showContent = true;
		}, 100);

		// Simulate loading progress with realistic feel
		const progressInterval = setInterval(() => {
			progress += Math.random() * 20 + 5;
			if (progress >= 100) {
				progress = 100;
				clearInterval(progressInterval);
			}
		}, 150);

		// Hide splash screen after animation
		const timer = setTimeout(() => {
			visible = false;
			setTimeout(() => {
				onComplete();
			}, 600);
		}, 2500);

		return () => {
			clearTimeout(timer);
			clearInterval(progressInterval);
		};
	});
</script>

{#if visible}
	<div
		class="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-linear-to-br from-fresh-sky-500 via-fresh-sky-600 to-fresh-sky-700 overflow-hidden"
		transition:fade={{ duration: 600 }}
	>
		<!-- Animated Background Waves -->
		<div class="absolute inset-0 overflow-hidden opacity-20">
			<div class="wave wave-1"></div>
			<div class="wave wave-2"></div>
			<div class="wave wave-3"></div>
		</div>

		<!-- Floating Particles with Glow -->
		<div class="absolute inset-0 overflow-hidden">
			{#each particles as particle}
				<div
					class="absolute rounded-full bg-white/30 backdrop-blur-sm animate-float shadow-glow"
					style="
						width: {particle.size}px;
						height: {particle.size}px;
						left: {particle.left}%;
						top: {particle.top}%;
						animation-delay: {particle.delay}s;
						animation-duration: {particle.duration}s;
						opacity: {particle.opacity};
					"
				></div>
			{/each}
		</div>

		<!-- Radial Glow Effect -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div
				class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-white/20 via-fresh-sky-400/10 to-transparent rounded-full blur-3xl animate-pulse-glow"
			></div>
		</div>

		<!-- Main Content -->
		{#if showContent}
			<div class="relative z-10 flex flex-col items-center gap-8">
				<!-- Logo with Bounce Animation -->
				<div class="relative" in:scale={{ duration: 800, easing: elasticOut, start: 0.3 }}>
					<!-- Multiple Glow Rings -->
					<div
						class="absolute inset-0 scale-150 bg-white/20 rounded-full blur-2xl animate-ping-slow"
					></div>
					<div
						class="absolute inset-0 scale-125 bg-white/30 rounded-full blur-xl animate-pulse-glow"
					></div>

					<!-- Logo Container with Glass Effect -->
					<div
						class="relative bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/20"
					>
						<img
							src="/icon-512.svg"
							alt="Monit Logo"
							class="relative w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl animate-float-gentle filter brightness-110"
							onload={() => (logoLoaded = true)}
						/>
					</div>
				</div>

				<!-- App Name with Slide Animation -->
				<div
					class="text-center space-y-3"
					in:fly={{ y: 30, duration: 600, delay: 300, easing: backOut }}
				>
					<h1
						class="text-6xl md:text-7xl font-black text-white tracking-tight drop-shadow-lg"
						style="font-family: 'Poppins', sans-serif; text-shadow: 0 4px 20px rgba(0,0,0,0.3);"
					>
						Monit
					</h1>
					<p class="text-lg md:text-xl text-white/90 font-semibold tracking-wide drop-shadow-md">
						Control de Caja
					</p>
				</div>

				<!-- Modern Loading Indicator -->
				<div class="w-56 md:w-72 mt-6" in:fade={{ duration: 500, delay: 600 }}>
					<!-- Progress Track with Glass Effect -->
					<div
						class="relative h-2 bg-white/20 backdrop-blur-sm rounded-full overflow-hidden border border-white/30 shadow-inner"
					>
						<!-- Progress Fill with Gradient -->
						<div
							class="absolute inset-y-0 left-0 bg-linear-to-r from-white via-fresh-sky-100 to-white rounded-full transition-all duration-300 ease-out shadow-lg"
							style="width: {progress}%"
						>
							<!-- Animated Shimmer -->
							<div
								class="absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent animate-shimmer-fast"
							></div>
						</div>

						<!-- Glow Effect -->
						<div
							class="absolute inset-y-0 left-0 bg-white/50 blur-md rounded-full transition-all duration-300"
							style="width: {progress}%"
						></div>
					</div>

					<!-- Loading Text with Pulse -->
					<div class="flex items-center justify-center gap-2 mt-4">
						<div class="flex gap-1">
							<div class="w-2 h-2 bg-white rounded-full animate-bounce-1"></div>
							<div class="w-2 h-2 bg-white rounded-full animate-bounce-2"></div>
							<div class="w-2 h-2 bg-white rounded-full animate-bounce-3"></div>
						</div>
						<p class="text-sm text-white/90 font-medium">Cargando</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Version Badge with Fade -->
		<div
			class="absolute bottom-8 text-xs text-white/60 font-light tracking-widest"
			in:fade={{ duration: 500, delay: 800 }}
		>
			v1.0.0
		</div>
	</div>
{/if}

<style>
	/* Wave Animation */
	.wave {
		position: absolute;
		width: 200%;
		height: 200%;
		background: linear-gradient(
			45deg,
			rgba(255, 255, 255, 0.1) 0%,
			rgba(255, 255, 255, 0.05) 50%,
			transparent 100%
		);
		animation: wave-move 15s ease-in-out infinite;
	}

	.wave-1 {
		top: -50%;
		left: -50%;
		animation-delay: 0s;
	}

	.wave-2 {
		top: -30%;
		left: -30%;
		animation-delay: 2s;
		animation-duration: 18s;
	}

	.wave-3 {
		top: -40%;
		left: -40%;
		animation-delay: 4s;
		animation-duration: 20s;
	}

	@keyframes wave-move {
		0%,
		100% {
			transform: rotate(0deg) scale(1);
		}
		50% {
			transform: rotate(180deg) scale(1.1);
		}
	}

	/* Float Animation */
	@keyframes float {
		0%,
		100% {
			transform: translateY(0) translateX(0) rotate(0deg);
			opacity: 0.3;
		}
		25% {
			transform: translateY(-30px) translateX(15px) rotate(90deg);
			opacity: 0.7;
		}
		50% {
			transform: translateY(-60px) translateX(-15px) rotate(180deg);
			opacity: 0.4;
		}
		75% {
			transform: translateY(-30px) translateX(15px) rotate(270deg);
			opacity: 0.7;
		}
	}

	/* Gentle Float for Logo */
	@keyframes float-gentle {
		0%,
		100% {
			transform: translateY(0) scale(1);
		}
		50% {
			transform: translateY(-12px) scale(1.02);
		}
	}

	/* Pulse Glow */
	@keyframes pulse-glow {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(1.05);
		}
	}

	/* Ping Slow */
	@keyframes ping-slow {
		0% {
			opacity: 0.8;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(1.5);
		}
	}

	/* Fast Shimmer */
	@keyframes shimmer-fast {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(200%);
		}
	}

	/* Bounce Dots */
	@keyframes bounce-dot {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	.animate-float {
		animation: float 6s ease-in-out infinite;
	}

	.animate-float-gentle {
		animation: float-gentle 3s ease-in-out infinite;
	}

	.animate-pulse-glow {
		animation: pulse-glow 3s ease-in-out infinite;
	}

	.animate-ping-slow {
		animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
	}

	.animate-shimmer-fast {
		animation: shimmer-fast 1.5s ease-in-out infinite;
	}

	.animate-bounce-1 {
		animation: bounce-dot 1s ease-in-out infinite;
		animation-delay: 0s;
	}

	.animate-bounce-2 {
		animation: bounce-dot 1s ease-in-out infinite;
		animation-delay: 0.2s;
	}

	.animate-bounce-3 {
		animation: bounce-dot 1s ease-in-out infinite;
		animation-delay: 0.4s;
	}

	.bg-gradient-radial {
		background: radial-gradient(circle, var(--tw-gradient-stops));
	}

	.shadow-glow {
		box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
	}
</style>
