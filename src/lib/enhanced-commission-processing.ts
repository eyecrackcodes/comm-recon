import { getPolicyFee } from "./policy-fees";
import { calculateCycleInfo } from "./cycle-validation";

export interface Policy {
  [key: string]: any;
  _sourceOffice?: "austin" | "charlotte";
  _isChargebackPolicy?: boolean;
  _isLookbackPolicy?: boolean;
}

export interface DataSource {
  data: any[][];
  headers: string[];
  office: "austin" | "charlotte";
}

export interface ChargebackConfig {
  enabled: boolean;
  fromDate?: Date;
  toDate?: Date;
  daysLookback?: number;
}

export interface PlacementConfig {
  useCustomDates: boolean;
  customStartDate?: Date;
  customEndDate?: Date;
}

export interface ProcessingConfig {
  paymentDate: Date;
  chargebackConfig: ChargebackConfig;
  placementConfig: PlacementConfig;
  dataSources: DataSource[];
}

export interface ProcessingResult {
  cleanedData: Policy[];
  summary: {
    totalPoliciesProcessed: number;
    totalCommissionAmount: number;
    agentsAffected: number;
    configuration: {
      paymentDate: Date;
      placementPeriod: {
        startDate: Date;
        endDate: Date;
        isCustom: boolean;
      };
      chargebackConfig: ChargebackConfig;
    };
    breakdownByOffice: {
      austin: { policies: number; commission: number; agents: number };
      charlotte: { policies: number; commission: number; agents: number };
    };
    breakdownBySource: {
      austin: { originalRows: number; processedRows: number };
      charlotte: { originalRows: number; processedRows: number };
      merged: { duplicatesRemoved: number; totalUnique: number };
    };
    processingStats: {
      originalRows: number;
      afterDateFilter: number;
      afterStatusFilter: number;
      afterReconciliation: number;
      afterDuplicateRemoval: number;
      lookbackPolicies: number;
      chargebackPolicies: number;
    };
    dataQuality: {
      missingAgents: number;
      missingPolicies: number;
      missingPremiums: number;
      unknownCarriers: number;
    };
    errors: string[];
    warnings: string[];
  };
}

function mergeDataSources(dataSources: DataSource[]): {
  policies: Policy[];
  sourceStats: any;
} {
  const allPolicies: Policy[] = [];
  const sourceStats: any = {
    austin: { originalRows: 0, processedRows: 0 },
    charlotte: { originalRows: 0, processedRows: 0 },
  };

  dataSources.forEach((source) => {
    const { data, headers, office } = source;
    sourceStats[office].originalRows = data.length;

    const officePolicies: Policy[] = data.map((row) => {
      const policy: Policy = { _sourceOffice: office };
      headers.forEach((header, index) => {
        policy[header] = row[index];
      });
      return policy;
    });

    sourceStats[office].processedRows = officePolicies.length;
    allPolicies.push(...officePolicies);
  });

  return { policies: allPolicies, sourceStats };
}

function validateChargebackConfig(config: ChargebackConfig): string[] {
  const errors: string[] = [];

  if (config.enabled) {
    if (config.fromDate && config.toDate) {
      if (config.fromDate > config.toDate) {
        errors.push("Chargeback 'from' date must be earlier than 'to' date");
      }

      const daysDiff = Math.ceil(
        (config.toDate.getTime() - config.fromDate.getTime()) /
          (1000 * 3600 * 24)
      );

      if (daysDiff > 365) {
        errors.push(
          "Chargeback period exceeds 365 days, which may cause performance issues"
        );
      }
    } else if (!config.daysLookback || config.daysLookback <= 0) {
      errors.push(
        "Invalid chargeback configuration: either specify date range or valid lookback days"
      );
    }
  }

  return errors;
}

export function processEnhancedCommissionData(
  config: ProcessingConfig
): ProcessingResult {
  const { paymentDate, chargebackConfig, placementConfig, dataSources } =
    config;

  // Validate configuration
  const configErrors = validateChargebackConfig(chargebackConfig);
  if (configErrors.length > 0) {
    return {
      cleanedData: [],
      summary: {
        totalPoliciesProcessed: 0,
        totalCommissionAmount: 0,
        agentsAffected: 0,
        configuration: {
          paymentDate,
          placementPeriod: {
            startDate: paymentDate,
            endDate: paymentDate,
            isCustom: placementConfig.useCustomDates,
          },
          chargebackConfig,
        },
        breakdownByOffice: {
          austin: { policies: 0, commission: 0, agents: 0 },
          charlotte: { policies: 0, commission: 0, agents: 0 },
        },
        breakdownBySource: {
          austin: { originalRows: 0, processedRows: 0 },
          charlotte: { originalRows: 0, processedRows: 0 },
          merged: { duplicatesRemoved: 0, totalUnique: 0 },
        },
        processingStats: {
          originalRows: 0,
          afterDateFilter: 0,
          afterStatusFilter: 0,
          afterReconciliation: 0,
          afterDuplicateRemoval: 0,
          lookbackPolicies: 0,
          chargebackPolicies: 0,
        },
        dataQuality: {
          missingAgents: 0,
          missingPolicies: 0,
          missingPremiums: 0,
          unknownCarriers: 0,
        },
        errors: configErrors,
        warnings: [],
      },
    };
  }

  // Merge data from multiple sources
  const { policies, sourceStats } = mergeDataSources(dataSources);

  // Calculate placement period - use custom dates if provided, otherwise use cycle calculation
  let placementStartDate: Date;
  let placementEndDate: Date;

  if (
    placementConfig.useCustomDates &&
    placementConfig.customStartDate &&
    placementConfig.customEndDate
  ) {
    placementStartDate = placementConfig.customStartDate;
    placementEndDate = placementConfig.customEndDate;
  } else {
    const cycleInfo = calculateCycleInfo(paymentDate);
    placementStartDate = cycleInfo.placementStartDate;
    placementEndDate = cycleInfo.placementEndDate;
  }

  // Define chargeback triggers
  const chargebackTriggers = [
    "FEX Cancelled",
    "FEX Declined",
    "FEX Terminated",
    "FEX Not Taken",
    "IP Return",
    "Lapsed",
    "Withdrawn",
  ];

  // Step 1: Date filtering - SIMPLIFIED based on business requirements
  const filteredByDate = policies.filter((row) => {
    const effectiveDateStr = row["Effective Date"];
    const effectiveDate = effectiveDateStr ? new Date(effectiveDateStr) : null;

    // ONLY include policies with Effective Date within the placement period
    // This is for positive commission activity during the cycle
    const inPlacementPeriod =
      effectiveDate &&
      effectiveDate >= placementStartDate &&
      effectiveDate <= placementEndDate;

    // Include policies within placement period
    if (inPlacementPeriod) {
      return true;
    }

    // Also include policies that are potential chargebacks from previous periods
    // Chargebacks are based on Agent Paid Date + 30 days, not placement period
    if (chargebackConfig.enabled) {
      const agentPaidDateStr = row["Agent Paid Date"];
      const agentChargebackDateStr = row["Agent Chargeback Date"];
      const policyStatus = row["Policy Status"] || "";

      // Check if this could be a chargeback:
      // 1. Has Agent Paid Date (was previously paid)
      // 2. No Agent Chargeback Date (hasn't been charged back yet)
      // 3. Has a bad policy status
      if (
        agentPaidDateStr &&
        agentPaidDateStr.trim() !== "" &&
        (!agentChargebackDateStr || agentChargebackDateStr.trim() === "")
      ) {
        const agentPaidDate = new Date(agentPaidDateStr);
        const badStatuses = [
          "lapsed",
          "fex terminated",
          "ip return",
          "fex not taken",
          "withdrawn",
        ];
        const hasBadStatus = badStatuses.some((status) =>
          policyStatus.toLowerCase().includes(status)
        );

        if (hasBadStatus) {
          // Check if Agent Paid Date is within the configured chargeback lookback period
          let withinChargebackWindow = false;

          if (chargebackConfig.fromDate && chargebackConfig.toDate) {
            // Use the specified chargeback date range from the UI
            withinChargebackWindow =
              agentPaidDate >= chargebackConfig.fromDate &&
              agentPaidDate <= chargebackConfig.toDate;
          } else if (chargebackConfig.daysLookback) {
            // Fallback: Use lookback period from payment date
            const daysSincePaid =
              (paymentDate.getTime() - agentPaidDate.getTime()) /
              (1000 * 3600 * 24);
            withinChargebackWindow =
              daysSincePaid >= 0 && daysSincePaid <= chargebackConfig.daysLookback;
          }

          if (withinChargebackWindow) {
            row._isChargebackPolicy = true;
            return true;
          }
        }
      }
    }

    return false;
  });

  // Step 2: Contract Status and Policy Status Filtering
  const filteredByContractStatus = filteredByDate.filter((row) => {
    const contractStatus = row["Contract Status"]?.toLowerCase();
    const policyStatus = row["Policy Status"]?.toLowerCase();
    const agentPaidDate = row["Agent Paid Date"];

    // For pending commission payments
    const isPendingCommission =
      (!agentPaidDate || agentPaidDate.trim() === "") &&
      (policyStatus === "inforce" ||
        policyStatus === "term inforce" ||
        policyStatus === "fex inforce" ||
        policyStatus === "fex awaiting funds future month" ||
        policyStatus === "fex awaiting carrier review" ||
        policyStatus === "pending decision");

    if (isPendingCommission) {
      return true;
    }

    // Include chargeback policies
    if (row._isChargebackPolicy) {
      return true;
    }

    return false;
  });

  // Step 3: Paid & Chargeback Reconciliation
  const reconciledData = filteredByContractStatus.filter((row) => {
    const paidDateStr = row["Agent Paid Date"];
    const chargebackDateStr = row["Agent Chargeback Date"];

    const hasPaidDate = paidDateStr && paidDateStr.trim() !== "";
    const hasChargebackDate =
      chargebackDateStr && chargebackDateStr.trim() !== "";

    // Skip policies that have BOTH paid and chargeback dates (already reconciled)
    if (hasPaidDate && hasChargebackDate) {
      return false;
    }

    return true;
  });

  // Step 4: Enhanced Duplicate Policy Removal with cross-office logic
  const uniquePolicies = new Map<string, Policy>();
  let duplicatesRemoved = 0;

  reconciledData.forEach((row) => {
    const policyNumber = row["Policy"];
    if (!policyNumber) return;

    const existing = uniquePolicies.get(policyNumber);
    if (!existing) {
      uniquePolicies.set(policyNumber, row);
    } else {
      duplicatesRemoved++;

      // Enhanced duplicate resolution logic
      const existingDate = new Date(existing["Statement Date"]);
      const newDate = new Date(row["Statement Date"]);

      const existingHasPaymentData =
        existing["Agent Paid Date"] &&
        existing["Agent Paid Date"].trim() !== "";
      const newHasPaymentData =
        row["Agent Paid Date"] && row["Agent Paid Date"].trim() !== "";

      // Prefer records with payment data, then newer dates
      let shouldReplaceExisting = false;

      if (!existingHasPaymentData && newHasPaymentData) {
        shouldReplaceExisting = true;
      } else if (existingHasPaymentData && !newHasPaymentData) {
        shouldReplaceExisting = false;
      } else if (newDate > existingDate) {
        shouldReplaceExisting = true;
      }

      // Cross-office duplicate handling: prefer source office data
      if (existing._sourceOffice !== row._sourceOffice) {
        // If offices differ, prefer the one with more complete data
        const existingCompleteness = [
          existing["Agent"],
          existing["Annual Premium"],
          existing["Carrier"],
        ].filter(Boolean).length;

        const newCompleteness = [
          row["Agent"],
          row["Annual Premium"],
          row["Carrier"],
        ].filter(Boolean).length;

        if (newCompleteness > existingCompleteness) {
          shouldReplaceExisting = true;
        }
      }

      if (shouldReplaceExisting) {
        uniquePolicies.set(policyNumber, row);
      }
    }
  });

  const cleanedData = Array.from(uniquePolicies.values());

  // Step 5: Apply chargeback logic
  let dataForProcessing = [...cleanedData];

  if (chargebackConfig.enabled) {
    dataForProcessing = dataForProcessing.map((row) => {
      const contractStatus = row["Contract Status"] || "";
      const policyStatus = row["Policy Status"] || "";

      const hasChargebackTrigger = chargebackTriggers.some(
        (trigger) =>
          contractStatus.toLowerCase().includes(trigger.toLowerCase()) ||
          policyStatus.toLowerCase().includes(trigger.toLowerCase())
      );

      const agentPaidDateStr = row["Agent Paid Date"];
      const agentChargebackDateStr = row["Agent Chargeback Date"];
      const hasPaidDate = agentPaidDateStr && agentPaidDateStr.trim() !== "";
      const hasChargebackDate =
        agentChargebackDateStr && agentChargebackDateStr.trim() !== "";

      if (hasChargebackTrigger && hasPaidDate && !hasChargebackDate) {
        const agentPaidDate = new Date(agentPaidDateStr);

        let withinChargebackWindow = false;

        if (chargebackConfig.fromDate && chargebackConfig.toDate) {
          withinChargebackWindow =
            agentPaidDate >= chargebackConfig.fromDate &&
            agentPaidDate <= chargebackConfig.toDate;
        } else if (chargebackConfig.daysLookback) {
          const daysSincePaid =
            (paymentDate.getTime() - agentPaidDate.getTime()) /
            (1000 * 3600 * 24);
          withinChargebackWindow =
            daysSincePaid <= chargebackConfig.daysLookback;
        }

        if (withinChargebackWindow) {
          return { ...row, Chargeback: true };
        }
      }
      return row;
    });
  }

  // Step 6: Calculate commissions with policy fees
  const cleanedDataWithPremiums = dataForProcessing.map((row) => {
    const policyFee = getPolicyFee(row);
    const annualPremium = parseFloat(row["Annual Premium"]) || 0;
    let targetPremium = annualPremium - policyFee;
    let commissionAfterReconciliation = targetPremium;

    if (row.Chargeback) {
      targetPremium = -Math.abs(targetPremium);
      commissionAfterReconciliation = targetPremium;
    }

    return {
      ...row,
      "Policy Fee": policyFee,
      "Target Premium": targetPremium,
      "Commission After Reconciliation": commissionAfterReconciliation,
    };
  });

  // Step 7: Generate comprehensive summary
  const totalPoliciesProcessed = cleanedDataWithPremiums.length;
  const totalCommissionAmount = cleanedDataWithPremiums.reduce(
    (acc, row) => acc + (row["Commission After Reconciliation"] || 0),
    0
  );

  const allAgents = new Set(
    cleanedDataWithPremiums.map((p) => (p as any)["Agent"]).filter(Boolean)
  );

  // Enhanced office breakdown
  const austinPolicies = cleanedDataWithPremiums.filter((p) => {
    const agent = (p as any)["Agent"];
    const manager = (p as any)["Manager"];

    if (p._sourceOffice === "austin") return true;
    if (agent && agent.includes(" ACC")) return true;
    if (agent && agent.includes(" CCC")) return false;
    if (manager) {
      if (manager.includes("ACC")) return true;
      if (manager.includes("CCC")) return false;
      if (manager.toLowerCase().includes("austin")) return true;
      if (manager.toLowerCase() === "chad") return true;
    }
    return false;
  });

  const charlottePolicies = cleanedDataWithPremiums.filter((p) => {
    const agent = (p as any)["Agent"];
    const manager = (p as any)["Manager"];

    if (p._sourceOffice === "charlotte") return true;
    if (agent && agent.includes(" CCC")) return true;
    if (agent && agent.includes(" ACC")) return false;
    if (manager) {
      if (manager.includes("CCC")) return true;
      if (manager.includes("ACC")) return false;
      if (manager.toLowerCase().includes("charlotte")) return true;
      if (manager.toLowerCase() === "trent") return true;
    }
    return false;
  });

  const austinCommission = austinPolicies.reduce(
    (acc, row) => acc + (row["Commission After Reconciliation"] || 0),
    0
  );
  const charlotteCommission = charlottePolicies.reduce(
    (acc, row) => acc + (row["Commission After Reconciliation"] || 0),
    0
  );

  const austinAgents = new Set(
    austinPolicies.map((p) => (p as any)["Agent"]).filter(Boolean)
  );
  const charlotteAgents = new Set(
    charlottePolicies.map((p) => (p as any)["Agent"]).filter(Boolean)
  );

  // Processing statistics
  const lookbackPolicies = cleanedDataWithPremiums.filter(
    (p) => p._isLookbackPolicy
  ).length;
  const chargebackPolicies = cleanedDataWithPremiums.filter(
    (p) => (p as any).Chargeback
  ).length;

  // Data quality analysis
  const missingAgents = cleanedDataWithPremiums.filter(
    (p) => !(p as any)["Agent"]
  ).length;
  const missingPolicies = cleanedDataWithPremiums.filter(
    (p) => !(p as any)["Policy"]
  ).length;
  const missingPremiums = cleanedDataWithPremiums.filter(
    (p) =>
      !(p as any)["Annual Premium"] ||
      parseFloat((p as any)["Annual Premium"]) <= 0
  ).length;

  const knownZeroFeeCarriers = [
    "American Amicable",
    "Americo",
    "Ameritas",
    "Assurity",
    "Gerber",
    "Great Western",
    "Royal Neighbors",
  ];
  const unknownCarriers = cleanedDataWithPremiums.filter(
    (p) =>
      p["Policy Fee"] === 0 &&
      (p as any)["Carrier"] &&
      !knownZeroFeeCarriers.some((known) =>
        (p as any)["Carrier"].toLowerCase().includes(known.toLowerCase())
      )
  ).length;

  // Generate warnings
  const warnings: string[] = [];
  if (dataSources.length > 1) {
    warnings.push(
      `Data merged from ${dataSources.length} sources (${dataSources
        .map((s) => s.office.toUpperCase())
        .join(", ")})`
    );
  }
  if (duplicatesRemoved > 0) {
    warnings.push(
      `${duplicatesRemoved} duplicate policies found and resolved across data sources`
    );
  }
  if (lookbackPolicies > 0) {
    warnings.push(
      `${lookbackPolicies} policies from 14-day lookback period - review recommended`
    );
  }
  if (chargebackPolicies > 0) {
    const windowDesc =
      chargebackConfig.fromDate && chargebackConfig.toDate
        ? `custom date range`
        : `${chargebackConfig.daysLookback}-day lookback`;
    warnings.push(
      `${chargebackPolicies} policies flagged for chargeback using ${windowDesc}`
    );
  }
  if (missingPremiums > 0) {
    warnings.push(
      `${missingPremiums} policies with missing or zero premium amounts`
    );
  }
  if (unknownCarriers > 0) {
    warnings.push(
      `${unknownCarriers} policies from unknown carriers (using $0 policy fee)`
    );
  }

  return {
    cleanedData: cleanedDataWithPremiums,
    summary: {
      totalPoliciesProcessed,
      totalCommissionAmount,
      agentsAffected: allAgents.size,
      configuration: {
        paymentDate,
        placementPeriod: {
          startDate: placementStartDate,
          endDate: placementEndDate,
          isCustom: placementConfig.useCustomDates,
        },
        chargebackConfig,
      },
      breakdownByOffice: {
        austin: {
          policies: austinPolicies.length,
          commission: austinCommission,
          agents: austinAgents.size,
        },
        charlotte: {
          policies: charlottePolicies.length,
          commission: charlotteCommission,
          agents: charlotteAgents.size,
        },
      },
      breakdownBySource: {
        ...sourceStats,
        merged: {
          duplicatesRemoved,
          totalUnique: cleanedData.length,
        },
      },
      processingStats: {
        originalRows: policies.length,
        afterDateFilter: filteredByDate.length,
        afterStatusFilter: filteredByContractStatus.length,
        afterReconciliation: reconciledData.length,
        afterDuplicateRemoval: cleanedData.length,
        lookbackPolicies,
        chargebackPolicies,
      },
      dataQuality: {
        missingAgents,
        missingPolicies,
        missingPremiums,
        unknownCarriers,
      },
      errors: [],
      warnings,
    },
  };
}
