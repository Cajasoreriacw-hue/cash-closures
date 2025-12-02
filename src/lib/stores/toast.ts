import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		add: (message: string, type: ToastType = 'info', duration: number = 3000) => {
			const id = `toast-${Date.now()}-${Math.random()}`;
			const toast: Toast = { id, message, type, duration };

			update((toasts) => [...toasts, toast]);

			// Auto-remove after duration
			setTimeout(() => {
				update((toasts) => toasts.filter((t) => t.id !== id));
			}, duration);
		},
		remove: (id: string) => {
			update((toasts) => toasts.filter((t) => t.id !== id));
		},
		success: (message: string, duration?: number) => {
			createToastStore().add(message, 'success', duration);
		},
		error: (message: string, duration?: number) => {
			createToastStore().add(message, 'error', duration);
		},
		warning: (message: string, duration?: number) => {
			createToastStore().add(message, 'warning', duration);
		},
		info: (message: string, duration?: number) => {
			createToastStore().add(message, 'info', duration);
		}
	};
}

export const toasts = createToastStore();
