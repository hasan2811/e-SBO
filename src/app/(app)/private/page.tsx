
'use client';

import * as React from 'react';
import { FeedView } from '@/components/feed-view';

export default function PrivateFeedPage() {
  return (
    <FeedView 
      mode="private" 
      title="Feed Pribadi"
      description="Semua laporan pribadi Anda yang tidak terikat pada proyek."
    />
  );
}
