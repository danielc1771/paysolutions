'use client';

import { Suspense } from 'react';
import ReportsView from '@/components/dashboard/reports/ReportsView';

export default function ReportsPage() {
    return (
        <Suspense fallback={<div>Loading reports...</div>}>
            <ReportsView />
        </Suspense>
    );
}
