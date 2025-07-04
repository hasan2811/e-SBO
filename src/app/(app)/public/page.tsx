
'use client';

import * as React from 'react';
import { FeedView } from '@/components/feed-view';

/**
 * Renders the public feed of observations that have been shared by users.
 */
export default function PublicFeedPage() {
  return <FeedView mode="public" />;
}
