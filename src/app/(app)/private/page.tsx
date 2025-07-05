
import { redirect } from 'next/navigation';

/**
 * This is an obsolete page. It immediately redirects any traffic
 * to the main project hub, '/beranda'.
 */
export default function ObsoletePrivatePage() {
  redirect('/beranda');
}
