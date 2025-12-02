import { createBrowserClient } from '@supabase/ssr';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('supabase:auth');

	const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;

	const supabase = createBrowserClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
		global: {
			fetch
		}
	});

	// On the client, we can safely use getSession() to get the session
	// The user data comes from the server (via getUser()) which is secure
	const {
		data: { session }
	} = await supabase.auth.getSession();

	return { supabase, session, user: data.user };
};
