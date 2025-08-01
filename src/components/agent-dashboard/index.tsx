"use client";

import React from "react";
import { Policy } from "@/lib/commission-processing";

interface AgentMetrics {
  agent: string;
  office: "Austin" | "Charlotte" | "Unknown";
  totalPolicies: number;
  totalCommission: number;
  avgCommissionPerPolicy: number;
  lookbackPolicies: number;
  chargebackAmount: number;
  carriers: string[];
}

interface AgentDashboardProps {
  processedData: Policy[];
  rosterData?: { agent: string; office: "Austin" | "Charlotte" }[];
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({
  processedData,
  rosterData = [],
}) => {
  const [selectedAgent, setSelectedAgent] = React.useState<string | null>(null);
  // Create roster lookup for office assignments
  const rosterLookup = React.useMemo(() => {
    const lookup: Record<string, "Austin" | "Charlotte"> = {};
    rosterData.forEach((entry) => {
      lookup[entry.agent.toLowerCase().trim()] = entry.office;
    });
    return lookup;
  }, [rosterData]);

  // Calculate agent metrics
  const agentMetrics = React.useMemo(() => {
    const metricsMap: Record<string, AgentMetrics> = {};

    processedData.forEach((policy) => {
      const agent = policy.Agent || "Unknown Agent";
      const agentKey = agent.toLowerCase();

      if (!metricsMap[agentKey]) {
        // Determine office from roster or fallback to Agent/Manager field
        let office: "Austin" | "Charlotte" | "Unknown" = "Unknown";
        if (rosterLookup[agentKey]) {
          office = rosterLookup[agentKey];
        } else {
          // Primary: Check agent name for office codes (ACC = Austin Call Center, CCC = Charlotte Call Center)
          if (agent.includes(" ACC")) {
            office = "Austin";
          } else if (agent.includes(" CCC")) {
            office = "Charlotte";
          } else if (policy.Manager) {
            const manager = policy.Manager;
            // Fallback: Check manager field for office codes
            if (manager.includes("ACC")) {
              office = "Austin";
            } else if (manager.includes("CCC")) {
              office = "Charlotte";
            } else if (manager.toLowerCase().includes("austin")) {
              office = "Austin";
            } else if (manager.toLowerCase().includes("charlotte")) {
              office = "Charlotte";
            }
          }
        }

        metricsMap[agentKey] = {
          agent,
          office,
          totalPolicies: 0,
          totalCommission: 0,
          avgCommissionPerPolicy: 0,
          lookbackPolicies: 0,
          chargebackAmount: 0,
          carriers: [],
        };
      }

      const metrics = metricsMap[agentKey];
      metrics.totalPolicies++;

      // Add commission after reconciliation (handle both positive and negative)
      const commission =
        policy["Commission After Reconciliation"] ||
        policy["Target Premium"] ||
        0;
      metrics.totalCommission += commission;

      // Track lookback policies
      if (policy._isLookbackPolicy) {
        metrics.lookbackPolicies++;
      }

      // Track chargeback amounts (negative commissions)
      if (commission < 0) {
        metrics.chargebackAmount += Math.abs(commission);
      }

      // Track unique carriers
      const carrier = policy.Carrier || "Unknown";
      if (!metrics.carriers.includes(carrier)) {
        metrics.carriers.push(carrier);
      }
    });

    // Calculate averages
    Object.values(metricsMap).forEach((metrics) => {
      metrics.avgCommissionPerPolicy =
        metrics.totalPolicies > 0
          ? metrics.totalCommission / metrics.totalPolicies
          : 0;
    });

    return Object.values(metricsMap).sort(
      (a, b) => b.totalCommission - a.totalCommission
    );
  }, [processedData, rosterLookup]);

  // Get filtered policies for selected agent
  const filteredPolicies = React.useMemo(() => {
    if (!selectedAgent) return [];
    return processedData.filter((policy) => {
      const agent = policy.Agent || "Unknown Agent";
      return agent.toLowerCase() === selectedAgent.toLowerCase();
    });
  }, [processedData, selectedAgent]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getOfficeColor = (office: string) => {
    switch (office) {
      case "Austin":
        return "bg-pink-50 border-pink-200";
      case "Charlotte":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const totalAgents = agentMetrics.length;
  const austinAgents = agentMetrics.filter((a) => a.office === "Austin").length;
  const charlotteAgents = agentMetrics.filter(
    (a) => a.office === "Charlotte"
  ).length;
  const totalCommission = agentMetrics.reduce(
    (sum, a) => sum + a.totalCommission,
    0
  );

  if (processedData.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Agent Dashboard
        </h2>
        <p className="text-gray-500">
          No commission data available. Please upload and process data first.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Agent Commission Dashboard
      </h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Total Agents</div>
          <div className="text-2xl font-bold text-gray-900">{totalAgents}</div>
        </div>
        <div className="bg-pink-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Austin Agents</div>
          <div className="text-2xl font-bold text-pink-600">{austinAgents}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">
            Charlotte Agents
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {charlotteAgents}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">
            Total Commission
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalCommission)}
          </div>
        </div>
      </div>

      {/* Agent Filter Controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label
            htmlFor="agent-select"
            className="text-sm font-medium text-gray-700"
          >
            Filter by Agent:
          </label>
          <select
            id="agent-select"
            value={selectedAgent || ""}
            onChange={(e) => setSelectedAgent(e.target.value || null)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Agents</option>
            {agentMetrics.map((agent) => (
              <option key={agent.agent} value={agent.agent}>
                {agent.agent} ({agent.office}) - {agent.totalPolicies} policies
              </option>
            ))}
          </select>
        </div>
        {selectedAgent && (
          <button
            onClick={() => setSelectedAgent(null)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Conditional Content Based on Filter */}
      {selectedAgent ? (
        <>
          {/* Selected Agent Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedAgent} - Individual Policy Details
            </h3>

            {/* Agent Summary */}
            {(() => {
              const agentData = agentMetrics.find(
                (a) => a.agent === selectedAgent
              );
              if (!agentData) return null;

              return (
                <div
                  className={`rounded-lg border p-4 mb-4 ${getOfficeColor(
                    agentData.office
                  )}`}
                >
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Office</div>
                      <div className="text-lg font-bold">
                        {agentData.office}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">
                        Total Policies
                      </div>
                      <div className="text-lg font-bold">
                        {agentData.totalPolicies}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">
                        Total Commission
                      </div>
                      <div className="text-lg font-bold">
                        {formatCurrency(agentData.totalCommission)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">
                        Avg per Policy
                      </div>
                      <div className="text-lg font-bold">
                        {formatCurrency(agentData.avgCommissionPerPolicy)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">
                        Chargebacks
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        {formatCurrency(agentData.chargebackAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Individual Policies Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Carrier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Annual Premium
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission After Reconciliation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Effective Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPolicies.map((policy, index) => {
                    const commission =
                      policy["Commission After Reconciliation"] ||
                      policy["Target Premium"] ||
                      0;
                    const isChargeback = commission < 0;
                    const isLookback = (policy as any)._isLookbackPolicy;

                    return (
                      <tr
                        key={index}
                        className={`${
                          isLookback
                            ? "bg-yellow-50 border-l-4 border-l-yellow-400"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {policy.Policy || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy.Carrier || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(policy["Annual Premium"] || 0)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            isChargeback ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {formatCurrency(commission)}
                          {isChargeback && (
                            <span className="ml-1 text-xs">(Chargeback)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy["Effective Date"] || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <span>{policy["Contract Status"] || "N/A"}</span>
                            {isLookback && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Lookback
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredPolicies.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No policies found for {selectedAgent}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Agent Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Office
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Policies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg per Policy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lookback
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chargebacks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carriers
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agentMetrics.map((metrics, index) => (
                  <tr
                    key={index}
                    className={`hover:bg-gray-50 ${getOfficeColor(
                      metrics.office
                    )}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {metrics.agent}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          metrics.office === "Austin"
                            ? "bg-pink-100 text-pink-800"
                            : metrics.office === "Charlotte"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {metrics.office}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.totalPolicies}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span
                        className={
                          metrics.totalCommission >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {formatCurrency(metrics.totalCommission)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(metrics.avgCommissionPerPolicy)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metrics.lookbackPolicies > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          {metrics.lookbackPolicies}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {metrics.chargebackAmount > 0 &&
                        formatCurrency(metrics.chargebackAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {metrics.carriers.slice(0, 3).map((carrier, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            {carrier}
                          </span>
                        ))}
                        {metrics.carriers.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{metrics.carriers.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {agentMetrics.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No agent data found in processed commission data.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AgentDashboard;
