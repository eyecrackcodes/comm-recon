import { ProcessingResult } from "@/lib/commission-processing";

interface SummaryReportProps {
  summary: ProcessingResult["summary"];
}

export function SummaryReport({ summary }: SummaryReportProps) {
  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="bg-white shadow-md rounded-lg p-6 space-y-6">
      <h3 className="text-xl font-bold">Processing Summary</h3>

      {/* Main Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">
            Total Policies Processed
          </p>
          <p className="text-2xl font-bold text-blue-900">
            {summary.totalPoliciesProcessed.toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600 font-medium">
            Total Commission Amount
          </p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(summary.totalCommissionAmount)}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium">
            Number of Agents
          </p>
          <p className="text-2xl font-bold text-purple-900">
            {summary.agentsAffected}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 font-medium">
            Processing Pipeline
          </p>
          <p className="text-sm text-gray-700">
            {summary.processingStats.originalRows.toLocaleString()} →{" "}
            {summary.totalPoliciesProcessed.toLocaleString()} rows
          </p>
        </div>
      </div>

      {/* Office Breakdown */}
      <div>
        <h4 className="text-lg font-semibold mb-3">Office Breakdown</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-pink-50 border border-pink-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
              <span className="font-semibold text-pink-900">
                Austin Call Center (ACC)
              </span>
            </div>
            <p className="text-sm text-pink-700">
              {summary.breakdownByOffice.austin.policies} policies •{" "}
              {formatCurrency(summary.breakdownByOffice.austin.commission)}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="font-semibold text-blue-900">
                Charlotte Call Center (CCC)
              </span>
            </div>
            <p className="text-sm text-blue-700">
              {summary.breakdownByOffice.charlotte.policies} policies •{" "}
              {formatCurrency(summary.breakdownByOffice.charlotte.commission)}
            </p>
          </div>
        </div>
      </div>

      {/* Processing Statistics */}
      <div>
        <h4 className="text-lg font-semibold mb-3">
          Processing Pipeline Details
        </h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Original rows:</span>
              <span className="ml-2 font-medium">
                {summary.processingStats.originalRows.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">After date filtering:</span>
              <span className="ml-2 font-medium">
                {summary.processingStats.afterDateFilter.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">After status filtering:</span>
              <span className="ml-2 font-medium">
                {summary.processingStats.afterStatusFilter.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">After reconciliation:</span>
              <span className="ml-2 font-medium">
                {summary.processingStats.afterReconciliation.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">After duplicate removal:</span>
              <span className="ml-2 font-medium">
                {summary.processingStats.afterDuplicateRemoval.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Final processed:</span>
              <span className="ml-2 font-medium text-green-700">
                {summary.totalPoliciesProcessed.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Special Cases */}
      {(summary.processingStats.lookbackPolicies > 0 ||
        summary.processingStats.chargebackPolicies > 0) && (
        <div>
          <h4 className="text-lg font-semibold mb-3">Special Cases</h4>
          <div className="grid grid-cols-2 gap-4">
            {summary.processingStats.lookbackPolicies > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span className="font-medium text-yellow-800">
                    Lookback Policies
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  {summary.processingStats.lookbackPolicies} policies from
                  6-month safety net
                </p>
              </div>
            )}
            {summary.processingStats.chargebackPolicies > 0 && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  <span className="font-medium text-red-800">
                    Chargeback Policies
                  </span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  {summary.processingStats.chargebackPolicies} policies flagged
                  for chargeback
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Quality */}
      {(summary.dataQuality.missingAgents > 0 ||
        summary.dataQuality.missingPolicies > 0 ||
        summary.dataQuality.missingPremiums > 0 ||
        summary.dataQuality.unknownCarriers > 0) && (
        <div>
          <h4 className="text-lg font-semibold mb-3">Data Quality Issues</h4>
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {summary.dataQuality.missingAgents > 0 && (
                <div>
                  <span className="text-orange-600">Missing agents:</span>{" "}
                  <span className="font-medium">
                    {summary.dataQuality.missingAgents}
                  </span>
                </div>
              )}
              {summary.dataQuality.missingPolicies > 0 && (
                <div>
                  <span className="text-orange-600">
                    Missing policy numbers:
                  </span>{" "}
                  <span className="font-medium">
                    {summary.dataQuality.missingPolicies}
                  </span>
                </div>
              )}
              {summary.dataQuality.missingPremiums > 0 && (
                <div>
                  <span className="text-orange-600">
                    Missing/zero premiums:
                  </span>{" "}
                  <span className="font-medium">
                    {summary.dataQuality.missingPremiums}
                  </span>
                </div>
              )}
              {summary.dataQuality.unknownCarriers > 0 && (
                <div>
                  <span className="text-orange-600">Unknown carriers:</span>{" "}
                  <span className="font-medium">
                    {summary.dataQuality.unknownCarriers}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3 text-yellow-700">
            Warnings
          </h4>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
              {summary.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Errors */}
      {summary.errors.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3 text-red-700">Errors</h4>
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
              {summary.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
