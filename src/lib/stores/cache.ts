import { writable } from 'svelte/store';

type CacheEntry<T> = {
	data: T;
	timestamp: number;
	expiresIn: number; // milliseconds
};

class DataCache {
	private cache = new Map<string, CacheEntry<any>>();

	set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000) {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			expiresIn
		});
	}

	get<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
		if (isExpired) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	invalidate(key: string) {
		this.cache.delete(key);
	}

	invalidateAll() {
		this.cache.clear();
	}

	invalidatePattern(pattern: string) {
		const keys = Array.from(this.cache.keys());
		keys.forEach((key) => {
			if (key.includes(pattern)) {
				this.cache.delete(key);
			}
		});
	}
}

export const dataCache = new DataCache();

// Store para cashiers y stores (datos que cambian raramente)
export const cashiersStore = writable<string[]>([]);
export const storesStore = writable<string[]>([]);
