
'use client';

import * as React from 'react';
import { FeedView } from '@/components/feed-view';

/**
 * This is the main public feed page, accessible at the '/public' URL.
 * It shows observations that have been shared publicly by other users.
 */
export default function PublicFeedPage() {
  return <FeedView mode="public" />;
}
