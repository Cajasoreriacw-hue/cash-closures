<script lang="ts">
	type Props = {
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
	};

	let { currentPage = $bindable(1), totalPages, onPageChange }: Props = $props();

	const goToPage = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			onPageChange(page);
		}
	};

	// Generate page numbers to show
	const pageNumbers = $derived(() => {
		const pages: (number | string)[] = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible) {
			// Show all pages
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Always show first page
			pages.push(1);

			if (currentPage > 3) {
				pages.push('...');
			}

			// Show pages around current
			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}

			if (currentPage < totalPages - 2) {
				pages.push('...');
			}

			// Always show last page
			pages.push(totalPages);
		}

		return pages;
	});
</script>

<div class="flex items-center justify-between gap-2 mt-4 flex-wrap">
	<!-- Previous Button -->
	<button
		type="button"
		onclick={() => goToPage(currentPage - 1)}
		disabled={currentPage === 1}
		class="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
	>
		← Anterior
	</button>

	<!-- Page Numbers -->
	<div class="flex items-center gap-1">
		{#each pageNumbers() as page}
			{#if page === '...'}
				<span class="px-2 text-slate-400 dark:text-slate-500">...</span>
			{:else}
				<button
					type="button"
					onclick={() => goToPage(page as number)}
					class="min-w-10 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    {currentPage === page
						? 'bg-fresh-sky-600 text-white'
						: 'bg-white text-slate-700 border border-slate-300 hover:bg-fresh-sky-50 hover:text-fresh-sky-700 hover:border-fresh-sky-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-fresh-sky-900/20 dark:hover:text-fresh-sky-400 dark:hover:border-fresh-sky-800'}"
				>
					{page}
				</button>
			{/if}
		{/each}
	</div>

	<!-- Next Button -->
	<button
		type="button"
		onclick={() => goToPage(currentPage + 1)}
		disabled={currentPage === totalPages}
		class="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:text-fresh-sky-700 dark:hover:text-fresh-sky-400 hover:border-fresh-sky-200 dark:hover:border-fresh-sky-800"
	>
		Siguiente →
	</button>
</div>

<!-- Page Info -->
<div class="text-center mt-2 text-sm text-slate-600">
	Página {currentPage} de {totalPages}
</div>
