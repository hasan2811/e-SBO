
'use client';

import * as React from 'react';
import { AppLogo } from '@/components/app-logo';
import { Loader2 } from 'lucide-react';

export function AppLoadingScreen() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] bg-background">
            <AppLogo className="h-16 w-16 mb-4" />
            <div className="flex items-center gap-3 text-lg text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Memuat Data Aplikasi...</span>
            </div>
        </div>
    );
}
