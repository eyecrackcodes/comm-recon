"use client";

import React from "react";
import { Policy } from "@/lib/commission-processing";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  Users,
  DollarSign,
  Calendar,
} from "lucide-react";

interface ValidationResult {
  category: string;
  status: "pass" | "warning" | "error" | "info";
  message: string;
  count?: number;
  details?: string[];
}

interface ValidationDashboardProps {
  processedData: Policy[];
  rawDataCount: number;
  cycleInfo: {
    paymentDate: Date;
    placementStartDate: Date;
    placementEndDate: Date;
    isValidPaymentDate: boolean;
  };
  processingStats: {
    originalRows: number;
    afterDateFilter: number;
    afterStatusFilter: number;
    afterReconciliation: number;
    afterDuplicateRemoval: number;
  };
}

const ValidationDashboard: React.FC<ValidationDashboardProps> = ({
  processedData,
  rawDataCount,
  cycleInfo,
  processingStats,
}) => {
  const validationResults = React.useMemo(() => {
    const results: ValidationResult[] = [];

    // 1. Data Volume Validation
    const expectedPolicyRange = { min: 10, max: 100 }; // Typical range for a commission cycle
    if (processedData.length < expectedPolicyRange.min) {
      results.push({
        category: "Data Volume",
        status: "warning",
        message: `Low policy count: ${processedData.length} policies (expected ${expectedPolicyRange.min}-${expectedPolicyRange.max})`,
        count: processedData.length,
      });
    } else if (processedData.length > expectedPolicyRange.max) {
      results.push({
        category: "Data Volume",
        status: "warning",
        message: `High policy count: ${processedData.length} policies (expected ${expectedPolicyRange.min}-${expectedPolicyRange.max})`,
        count: processedData.length,
      });
    } else {
      results.push({
        category: "Data Volume",
        status: "pass",
        message: `Policy count within expected range: ${processedData.length} policies`,
        count: processedData.length,
      });
    }

    // 2. Date Range Validation
    if (cycleInfo.isValidPaymentDate) {
      results.push({
        category: "Commission Cycle",
        status: "pass",
        message: `Valid payment date: ${cycleInfo.paymentDate.toLocaleDateString()}`,
      });
    } else {
      results.push({
        category: "Commission Cycle",
        status: "error",
        message: `Invalid payment date: ${cycleInfo.paymentDate.toLocaleDateString()}`,
      });
    }

    // 3. Data Filtering Efficiency
    const filteringEfficiency = (processedData.length / rawDataCount) * 100;
    if (filteringEfficiency > 20) {
      results.push({
        category: "Data Filtering",
        status: "warning",
        message: `High filtering rate: ${filteringEfficiency.toFixed(
          1
        )}% of original data retained`,
        details: [
          `Original: ${rawDataCount.toLocaleString()} rows`,
          `Processed: ${processedData.length.toLocaleString()} rows`,
        ],
      });
    } else if (filteringEfficiency < 0.1) {
      results.push({
        category: "Data Filtering",
        status: "warning",
        message: `Very low filtering rate: ${filteringEfficiency.toFixed(
          1
        )}% of original data retained`,
        details: [
          `Original: ${rawDataCount.toLocaleString()} rows`,
          `Processed: ${processedData.length.toLocaleString()} rows`,
        ],
      });
    } else {
      results.push({
        category: "Data Filtering",
        status: "pass",
        message: `Filtering rate looks normal: ${filteringEfficiency.toFixed(
          1
        )}% retained`,
        details: [
          `Original: ${rawDataCount.toLocaleString()} rows`,
          `Processed: ${processedData.length.toLocaleString()} rows`,
        ],
      });
    }

    // 4. Required Fields Validation
    const requiredFields = [
      "Agent",
      "Policy",
      "Annual Premium",
      "Effective Date",
      "Carrier",
    ];
    const missingFieldCounts: Record<string, number> = {};

    requiredFields.forEach((field) => {
      const missing = processedData.filter(
        (p) => !p[field] || p[field] === ""
      ).length;
      missingFieldCounts[field] = missing;

      if (missing > 0) {
        results.push({
          category: "Data Quality",
          status: missing > processedData.length * 0.1 ? "error" : "warning",
          message: `Missing ${field}: ${missing} policies`,
          count: missing,
        });
      }
    });

    // 5. Commission Amount Validation
    const commissionAmounts = processedData.map(
      (p) => p["Target Premium"] || 0
    );
    const totalCommission = commissionAmounts.reduce(
      (sum, amt) => sum + amt,
      0
    );
    const avgCommission = totalCommission / processedData.length;
    const negativeCommissions = commissionAmounts.filter(
      (amt) => amt < 0
    ).length;
    const zeroCommissions = commissionAmounts.filter((amt) => amt === 0).length;

    if (totalCommission <= 0) {
      results.push({
        category: "Commission Amounts",
        status: "error",
        message: `Total commission is ${
          totalCommission <= 0 ? "zero or negative" : "very low"
        }: $${totalCommission.toFixed(2)}`,
      });
    } else {
      results.push({
        category: "Commission Amounts",
        status: "pass",
        message: `Total commission: $${totalCommission.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })}`,
      });
    }

    if (negativeCommissions > 0) {
      results.push({
        category: "Commission Amounts",
        status: "info",
        message: `Chargebacks detected: ${negativeCommissions} policies with negative amounts`,
        count: negativeCommissions,
      });
    }

    if (zeroCommissions > processedData.length * 0.1) {
      results.push({
        category: "Commission Amounts",
        status: "warning",
        message: `High number of zero commissions: ${zeroCommissions} policies`,
        count: zeroCommissions,
      });
    }

    // 6. Policy Number Validation
    const policyNumbers: Record<string, number> = {};
    const agentPolicyMap: Record<string, string[]> = {};

    processedData.forEach((p) => {
      const policyNumber = p.Policy || "Unknown";
      const agent = p.Agent || "Unknown";

      // Count policy numbers
      policyNumbers[policyNumber] = (policyNumbers[policyNumber] || 0) + 1;

      // Track which policies each agent has
      if (!agentPolicyMap[agent]) {
        agentPolicyMap[agent] = [];
      }
      agentPolicyMap[agent].push(policyNumber);
    });

    const duplicatePolicyNumbers = Object.entries(policyNumbers).filter(
      ([, count]) => count > 1
    ).length;

    if (duplicatePolicyNumbers > 0) {
      const duplicateExamples = Object.entries(policyNumbers)
        .filter(([, count]) => count > 1)
        .slice(0, 3)
        .map(([policy, count]) => `${policy} (${count}x)`)
        .join(", ");

      results.push({
        category: "Policy Duplicates",
        status: "error",
        message: `Found ${duplicatePolicyNumbers} duplicate policy numbers`,
        count: duplicatePolicyNumbers,
        details: [`Examples: ${duplicateExamples}`],
      });
    } else {
      results.push({
        category: "Policy Duplicates",
        status: "pass",
        message: `All policy numbers are unique`,
      });
    }

    // 7. Agent Distribution Validation
    const agentCounts: Record<string, number> = {};
    processedData.forEach((p) => {
      const agent = p.Agent || "Unknown";
      agentCounts[agent] = (agentCounts[agent] || 0) + 1;
    });

    const uniqueAgents = Object.keys(agentCounts).length;
    const avgPoliciesPerAgent = processedData.length / uniqueAgents;
    const agentsWithMultiplePolicies = Object.values(agentCounts).filter(
      (count) => count > 1
    ).length;

    results.push({
      category: "Agent Distribution",
      status: "info",
      message: `${uniqueAgents} unique agents, avg ${avgPoliciesPerAgent.toFixed(
        1
      )} policies per agent`,
    });

    if (agentsWithMultiplePolicies > uniqueAgents * 0.1) {
      const multiPolicyAgents = Object.entries(agentCounts)
        .filter(([, count]) => count > 1)
        .slice(0, 3)
        .map(([agent, count]) => `${agent} (${count} policies)`)
        .join(", ");

      results.push({
        category: "Agent Distribution",
        status: "warning",
        message: `${agentsWithMultiplePolicies} agents have multiple policies`,
        count: agentsWithMultiplePolicies,
        details: [`Examples: ${multiPolicyAgents}`],
      });
    }

    // 8. Carrier Distribution Validation
    const carrierCounts: Record<string, number> = {};
    processedData.forEach((p) => {
      const carrier = p.Carrier || "Unknown";
      carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
    });

    const topCarriers = Object.entries(carrierCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([carrier, count]) => `${carrier}: ${count}`)
      .join(", ");

    results.push({
      category: "Carrier Distribution",
      status: "info",
      message: `Top carriers: ${topCarriers}`,
    });

    return results;
  }, [processedData, rawDataCount, cycleInfo, processingStats]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "info":
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pass":
        return "border-green-200 bg-green-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "info":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const passCount = validationResults.filter((r) => r.status === "pass").length;
  const warningCount = validationResults.filter(
    (r) => r.status === "warning"
  ).length;
  const errorCount = validationResults.filter(
    (r) => r.status === "error"
  ).length;
  const infoCount = validationResults.filter((r) => r.status === "info").length;

  const confidenceScore = Math.round(
    (passCount / (passCount + warningCount + errorCount)) * 100
  );

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Validation Dashboard
        </h2>
        <div className="flex items-center space-x-4">
          <div
            className={`px-4 py-2 rounded-lg ${
              confidenceScore >= 90
                ? "bg-green-100 text-green-800"
                : confidenceScore >= 70
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <span className="font-semibold">
              Confidence: {confidenceScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-900">{passCount}</div>
          <div className="text-sm text-green-700">Passed</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-yellow-900">
            {warningCount}
          </div>
          <div className="text-sm text-yellow-700">Warnings</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-900">{errorCount}</div>
          <div className="text-sm text-red-700">Errors</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-900">{infoCount}</div>
          <div className="text-sm text-blue-700">Info</div>
        </div>
      </div>

      {/* Validation Results */}
      <div className="space-y-4">
        {validationResults.map((result, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
          >
            <div className="flex items-start space-x-3">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    {result.category}
                  </h3>
                  {result.count !== undefined && (
                    <span className="text-sm font-medium text-gray-600">
                      Count: {result.count.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                {result.details && (
                  <ul className="text-xs text-gray-600 mt-2 list-disc list-inside">
                    {result.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Processing Pipeline Summary */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Processing Pipeline Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-700">Original Data</div>
            <div className="text-2xl font-bold text-gray-900">
              {processingStats.originalRows.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Date Filtered</div>
            <div className="text-2xl font-bold text-blue-900">
              {processingStats.afterDateFilter.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Status Filtered</div>
            <div className="text-2xl font-bold text-purple-900">
              {processingStats.afterStatusFilter.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Reconciled</div>
            <div className="text-2xl font-bold text-orange-900">
              {processingStats.afterReconciliation.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Final</div>
            <div className="text-2xl font-bold text-green-900">
              {processingStats.afterDuplicateRemoval.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationDashboard;
