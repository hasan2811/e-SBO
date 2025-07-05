
import { redirect } from 'next/navigation';

/**
 * The root app page. It now acts as a simple, server-side redirector.
 * It ensures that any authenticated user trying to access the root '/'
 * is immediately sent to their main project hub at '/beranda'.
 *
 * This simplifies the app's routing logic and removes complex,
 * performance-harming client-side redirection from the main layout.
 */
export default function RootPage() {
  redirect('/beranda');
}
