'use client';

import { PageSkeleton } from '@/components/page-skeleton';

/**
 * This is an obsolete page. It renders a skeleton while the main AppLayout
 * component redirects the user to the correct location (e.g., their first project or /beranda).
 */
export default function ObsoleteTasksPage() {
  return <PageSkeleton withHeader />;
}
