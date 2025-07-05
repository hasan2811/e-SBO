'use client';

import { PageSkeleton } from '@/components/page-skeleton';

/**
 * The root app page. It now acts as a loading placeholder.
 * Redirection logic is handled centrally and consistently by the AppLayout
 * based on the user's authentication and project status.
 */
export default function RootPage() {
  // The layout will handle redirection, so we just show a loading state
  // until the redirection logic in the layout completes.
  return <PageSkeleton withHeader />;
}
