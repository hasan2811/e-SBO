
import { redirect } from 'next/navigation';

/**
 * This page is being phased out to simplify the user experience.
 * It now acts as a server-side redirect to the /beranda (Project Hub) page.
 */
export default function TasksRedirectPage() {
  redirect('/beranda');
}
