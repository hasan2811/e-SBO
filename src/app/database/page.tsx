'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';

export default function DatabasePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Database Observasi</h2>
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground min-h-[400px] flex flex-col justify-center items-center">
            <Database className="w-16 h-16 mb-4 text-primary/50" />
            <h3 className="text-xl font-semibold">Fitur Database Ditunda</h3>
            <p className="mt-2 max-w-md">
                Halaman ini dinonaktifkan sementara untuk menyelesaikan masalah build yang sedang terjadi. Fitur akan segera dikembalikan setelah sistem stabil.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}