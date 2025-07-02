
import { redirect } from 'next/navigation';

/**
 * This page now acts as a server-side redirect to the /beranda (Project Hub) page,
 * which is a more logical entry point for this dashboard application.
 */
export default function RootPage() {
  redirect('/beranda');
}
