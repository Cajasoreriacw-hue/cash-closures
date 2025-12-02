import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const supabase: Handle = async ({ event, resolve }) => {
    event.locals.supabase = createServerClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll: () => event.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        event.cookies.set(name, value, { ...options, path: '/' });
                    });
                }
            }
        }
    );

    event.locals.safeGetSession = async () => {
        const {
            data: { user },
            error
        } = await event.locals.supabase.auth.getUser();

        if (error || !user) {
            return { session: null, user: null };
        }

        // Return only the authenticated user, no session object needed
        return { session: null, user };
    };

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range' || name === 'x-supabase-api-version';
        }
    });
};

const authGuard: Handle = async ({ event, resolve }) => {
    const { session, user } = await event.locals.safeGetSession();
    event.locals.session = session;
    event.locals.user = user;

    // Protect all routes except login and public assets
    // Check for user instead of session since we use getUser() for auth
    if (!user && event.url.pathname !== '/login' && !event.url.pathname.startsWith('/api')) {
        throw redirect(303, '/login');
    }

    // Redirect to home if already logged in and trying to access login
    if (user && event.url.pathname === '/login') {
        throw redirect(303, '/');
    }

    return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
