"use client";

import { EnhancedCommissionDashboard } from "@/components/enhanced-commission-dashboard";

export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">
        Enhanced Commission Processing
      </h1>
      <p className="text-gray-600 mb-8">
        Upload commission data from Austin (ATX) and Charlotte (CLT) offices,
        configure chargeback windows, and process your commission data with
        advanced controls.
      </p>

      <EnhancedCommissionDashboard />
    </main>
  );
}
