/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `cache-${version}`;
const ASSETS = [...build, ...files];

// Install event - cache all assets
sw.addEventListener('install', (event) => {
    async function addFilesToCache() {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(ASSETS);
    }

    event.waitUntil(addFilesToCache());
});

// Activate event - clean up old caches
sw.addEventListener('activate', (event) => {
    async function deleteOldCaches() {
        for (const key of await caches.keys()) {
            if (key !== CACHE_NAME) await caches.delete(key);
        }
    }

    event.waitUntil(deleteOldCaches());
});

// Fetch event - serve from cache, fallback to network
sw.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    async function respond() {
        const url = new URL(event.request.url);
        const cache = await caches.open(CACHE_NAME);

        // Try to serve from cache first
        if (ASSETS.includes(url.pathname)) {
            const cachedResponse = await cache.match(url.pathname);
            if (cachedResponse) {
                return cachedResponse;
            }
        }

        // For everything else, try network first, then cache
        try {
            const response = await fetch(event.request);

            // Cache successful responses
            if (response.status === 200) {
                cache.put(event.request, response.clone());
            }

            return response;
        } catch {
            // If network fails, try cache
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }

            // Return a custom offline page or error
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        }
    }

    event.respondWith(respond());
});
