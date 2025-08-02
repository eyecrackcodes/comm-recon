import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  TrendingUp,
  Users,
  DollarSign,
  Building2,
  Filter,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnhancedCommissionUploader } from "@/components/enhanced-commission-uploader";
import AgentDashboard from "@/components/agent-dashboard";
import { type ProcessingResult } from "@/lib/enhanced-commission-processing";

export function EnhancedCommissionDashboard() {
  const [processingResult, setProcessingResult] =
    useState<ProcessingResult | null>(null);
  const [showUploader, setShowUploader] = useState(true);
  const [showAgentDashboard, setShowAgentDashboard] = useState(false);

  const handleProcessingComplete = (result: ProcessingResult) => {
    setProcessingResult(result);
    setShowUploader(false);
  };

  const handleNewUpload = () => {
    setProcessingResult(null);
    setShowUploader(true);
  };

  const exportToCSV = () => {
    if (!processingResult) return;

    const headers = Object.keys(processingResult.cleanedData[0] || {});
    const csvContent = [
      headers.join(","),
      ...processingResult.cleanedData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission-processing-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (showUploader) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <EnhancedCommissionUploader
          onProcessingComplete={handleProcessingComplete}
        />
      </div>
    );
  }

  if (!processingResult) return null;

  const { summary } = processingResult;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Commission Processing Results
          </h1>
          <p className="text-gray-600 mt-2">
            Processing completed with{" "}
            {summary.totalPoliciesProcessed.toLocaleString()} policies
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleNewUpload}>
            New Upload
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-center">
        <div className="bg-gray-100 p-1 rounded-lg flex">
          <button
            onClick={() => setShowAgentDashboard(false)}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${
              !showAgentDashboard
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Summary View
          </button>
          <button
            onClick={() => setShowAgentDashboard(true)}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${
              showAgentDashboard
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Filter className="w-4 h-4" />
            Agent & Site Filtering
          </button>
        </div>
      </div>

      {/* Conditional Content Based on View */}
      {showAgentDashboard ? (
        <AgentDashboard
          processedData={processingResult.cleanedData}
          rosterData={[]} // Could be enhanced to include roster data if available
        />
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Policies
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.totalPoliciesProcessed.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Commission
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    $
                    {summary.totalCommissionAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Agents Affected
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.agentsAffected}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Chargebacks
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.processingStats.chargebackPolicies}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Office Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Austin Call Center
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Policies:</span>
                  <span className="font-medium">
                    {summary.breakdownByOffice.austin.policies.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Commission:</span>
                  <span className="font-medium text-green-600">
                    $
                    {summary.breakdownByOffice.austin.commission.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Agents:</span>
                  <span className="font-medium">
                    {summary.breakdownByOffice.austin.agents}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Charlotte Call Center
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Policies:</span>
                  <span className="font-medium">
                    {summary.breakdownByOffice.charlotte.policies.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Commission:</span>
                  <span className="font-medium text-green-600">
                    $
                    {summary.breakdownByOffice.charlotte.commission.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Agents:</span>
                  <span className="font-medium">
                    {summary.breakdownByOffice.charlotte.agents}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Display */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Processing Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </h4>
                <p className="text-lg font-semibold text-gray-900">
                  {processingResult.summary.configuration.paymentDate.toLocaleDateString()}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Placement Period
                </h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-900">
                    {processingResult.summary.configuration.placementPeriod.startDate.toLocaleDateString()}{" "}
                    -{" "}
                    {processingResult.summary.configuration.placementPeriod.endDate.toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {processingResult.summary.configuration.placementPeriod
                      .isCustom
                      ? "Custom dates"
                      : "Auto-calculated"}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Chargeback Window
                </h4>
                <div className="space-y-1">
                  {processingResult.summary.configuration.chargebackConfig
                    .enabled ? (
                    <>
                      {processingResult.summary.configuration.chargebackConfig
                        .fromDate &&
                      processingResult.summary.configuration.chargebackConfig
                        .toDate ? (
                        <p className="text-sm text-gray-900">
                          {processingResult.summary.configuration.chargebackConfig.fromDate.toLocaleDateString()}{" "}
                          -{" "}
                          {processingResult.summary.configuration.chargebackConfig.toDate.toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-900">
                          {
                            processingResult.summary.configuration
                              .chargebackConfig.daysLookback
                          }{" "}
                          days lookback
                        </p>
                      )}
                      <p className="text-xs text-gray-500">Enabled</p>
                    </>
                  ) : (
                    <p className="text-sm text-red-600">Disabled</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Data Sources & Processing Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Data Sources
              </h3>
              <div className="space-y-3">
                {summary.breakdownBySource.austin.originalRows > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Austin Data:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {summary.breakdownBySource.austin.originalRows.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">original rows</div>
                    </div>
                  </div>
                )}
                {summary.breakdownBySource.charlotte.originalRows > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Charlotte Data:
                    </span>
                    <div className="text-right">
                      <div className="font-medium">
                        {summary.breakdownBySource.charlotte.originalRows.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">original rows</div>
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Duplicates Removed:
                    </span>
                    <span className="font-medium text-red-600">
                      {summary.breakdownBySource.merged.duplicatesRemoved}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Unique Policies:
                    </span>
                    <span className="font-medium text-green-600">
                      {summary.breakdownBySource.merged.totalUnique.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Processing Pipeline
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Original Rows:</span>
                  <span className="font-medium">
                    {summary.processingStats.originalRows.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    After Date Filter:
                  </span>
                  <span className="font-medium">
                    {summary.processingStats.afterDateFilter.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    After Status Filter:
                  </span>
                  <span className="font-medium">
                    {summary.processingStats.afterStatusFilter.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    After Reconciliation:
                  </span>
                  <span className="font-medium">
                    {summary.processingStats.afterReconciliation.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Final Output:</span>
                  <span className="font-medium text-green-600">
                    {summary.processingStats.afterDuplicateRemoval.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Quality & Warnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Data Quality
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Missing Agents:</span>
                  <span
                    className={`font-medium ${
                      summary.dataQuality.missingAgents > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {summary.dataQuality.missingAgents}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Missing Policies:
                  </span>
                  <span
                    className={`font-medium ${
                      summary.dataQuality.missingPolicies > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {summary.dataQuality.missingPolicies}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Missing Premiums:
                  </span>
                  <span
                    className={`font-medium ${
                      summary.dataQuality.missingPremiums > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {summary.dataQuality.missingPremiums}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Unknown Carriers:
                  </span>
                  <span
                    className={`font-medium ${
                      summary.dataQuality.unknownCarriers > 0
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {summary.dataQuality.unknownCarriers}
                  </span>
                </div>
              </div>
            </div>

            {summary.warnings.length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Processing Warnings
                </h3>
                <div className="space-y-2">
                  {summary.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Commission Data Table Preview */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Commission Data Preview
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing first 10 rows of processed commission data
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Carrier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Premium
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Office
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processingResult.cleanedData
                    .slice(0, 10)
                    .map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row["Agent"] || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row["Policy"] || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row["Carrier"] || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          $
                          {parseFloat(
                            row["Annual Premium"] || 0
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <span
                            className={
                              row.Chargeback ? "text-red-600" : "text-green-600"
                            }
                          >
                            $
                            {parseFloat(
                              row["Commission After Reconciliation"] || 0
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              row._sourceOffice === "austin"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {row._sourceOffice?.toUpperCase() || "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.Chargeback && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              Chargeback
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {processingResult.cleanedData.length > 10 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-600">
                  Showing 10 of{" "}
                  {processingResult.cleanedData.length.toLocaleString()} total
                  records
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
