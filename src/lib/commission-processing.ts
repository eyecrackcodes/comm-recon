import { getPolicyFee } from "./policy-fees";
import { calculateCycleInfo } from "./cycle-validation";

export interface Policy {
  [key: string]: any;
}

export interface ProcessingResult {
  cleanedData: Policy[];
  summary: {
    totalPoliciesProcessed: number;
    totalCommissionAmount: number;
    agentsAffected: number;
    breakdownByOffice: {
      austin: { policies: number; commission: number };
      charlotte: { policies: number; commission: number };
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

export function processCommissionData(
  data: any[][],
  headers: string[],
  paymentDate: Date,
  processChargebacks: boolean
): ProcessingResult {
  const policies: Policy[] = data.map((row) => {
    const policy: Policy = {};
    headers.forEach((header, index) => {
      policy[header] = row[index];
    });
    return policy;
  });

  // Step 1 & 2: Calculate placement period based on payment date
  const cycleInfo = calculateCycleInfo(paymentDate);
  const { placementStartDate, placementEndDate, lookbackStartDate } = cycleInfo;

  // Date range information now available in validation dashboard

  // Define chargeback triggers for use in date filtering
  const chargebackTriggers = [
    "FEX Cancelled",
    "FEX Declined",
    "FEX Terminated",
    "FEX Not Taken",
    "IP Return",
    "Lapsed",
    "Withdrawn",
  ];

  // Debug: Check if GTL6163838 is in the initial data
  const targetPolicy = policies.find((p) => p["Policy"] === "GTL6163838");
  if (targetPolicy) {
    console.log("DEBUG: Found GTL6163838 in initial data:", targetPolicy);
    console.log("DEBUG: GTL6163838 keys:", Object.keys(targetPolicy));
  } else {
    console.log("DEBUG: GTL6163838 NOT found in initial data");
    console.log(
      "DEBUG: Sample policies:",
      policies.slice(0, 3).map((p) => p["Policy"])
    );
  }

  const filteredByDate = policies.filter((row) => {
    const effectiveDateStr = row["Effective Date"];
    const submittedDateStr = row["Submitted Date"];

    // Parse dates safely
    const effectiveDate = effectiveDateStr ? new Date(effectiveDateStr) : null;
    const submittedDate = submittedDateStr ? new Date(submittedDateStr) : null;

    // Primary filter: Include if Effective Date OR Submitted Date is within placement period
    const inPlacementPeriod =
      (effectiveDate &&
        effectiveDate >= placementStartDate &&
        effectiveDate <= placementEndDate) ||
      (submittedDate &&
        submittedDate >= placementStartDate &&
        submittedDate <= placementEndDate);

    // Check if this is a potential chargeback policy
    const contractStatus = row["Contract Status"] || "";
    const policyStatus = row["Policy Status"] || "";
    const hasPotentialChargeback = chargebackTriggers.some(
      (trigger) =>
        contractStatus.toLowerCase().includes(trigger.toLowerCase()) ||
        policyStatus.toLowerCase().includes(trigger.toLowerCase())
    );

    // Include policies that are either:
    // 1. In the placement period, OR
    // 2. Have chargeback trigger status AND Agent Paid Date within the cycle period
    if (inPlacementPeriod) {
      return true;
    } else if (hasPotentialChargeback) {
      // Only include chargeback policies if their Agent Paid Date is within the last 45 days
      // This captures chargebacks for recently paid agents
      const agentPaidDateStr = row["Agent Paid Date"];
      if (agentPaidDateStr && agentPaidDateStr.trim() !== "") {
        const agentPaidDate = new Date(agentPaidDateStr);
        const currentDate = new Date("2025-07-27");
        const daysSincePaid =
          (currentDate.getTime() - agentPaidDate.getTime()) /
          (1000 * 3600 * 24);

        if (daysSincePaid <= 45) {
          // Include chargebacks for agents paid within last 45 days
          row._isChargebackPolicy = true; // Mark for identification
          return true;
        }
      }
    }

    return false;
  });

  // Debug: Check if GTL6163838 survived date filtering
  const afterDateFilter = filteredByDate.find(
    (p) => p["Policy"] === "GTL6163838"
  );
  console.log(
    "DEBUG: GTL6163838 after date filtering:",
    afterDateFilter ? "FOUND" : "REMOVED"
  );

  // Debug: Check Policy Status values before filtering
  const jremekyo_beforeStatus = filteredByDate.filter((p) =>
    p["Agent"]?.includes("Jremekyo")
  );
  const all_policyStatuses = [
    ...new Set(jremekyo_beforeStatus.map((p) => p["Policy Status"])),
  ];
  console.log(
    "DEBUG: All Jremekyo Policy Status values before status filtering:",
    all_policyStatuses
  );
  console.log(
    "DEBUG: Jremekyo policies before status filter:",
    jremekyo_beforeStatus.length
  );

  // Debug: Show unique policy numbers before status filtering
  const uniquePolicyNumbersBeforeStatus = [
    ...new Set(jremekyo_beforeStatus.map((p) => p["Policy"])),
  ];
  console.log(
    "DEBUG: Unique Jremekyo policy numbers before status filter:",
    uniquePolicyNumbersBeforeStatus.length,
    uniquePolicyNumbersBeforeStatus
  );

  // Step 3: Contract Status and Policy Status Filtering
  const filteredByContractStatus = filteredByDate.filter((row) => {
    const contractStatus = row["Contract Status"]?.toLowerCase();
    const policyStatus = row["Policy Status"]?.toLowerCase();
    const agentPaidDate = row["Agent Paid Date"];

    // For pending commission payments: Agent Paid Date is NULL AND Policy Status indicates active policy
    const isPendingCommission =
      (!agentPaidDate || agentPaidDate.trim() === "") &&
      (policyStatus === "inforce" ||
        policyStatus === "term inforce" ||
        policyStatus === "fex inforce" ||
        policyStatus === "fex awaiting funds future month" ||
        policyStatus === "fex awaiting carrier review" ||
        policyStatus === "pending decision");

    // Include if it's a pending commission payment
    if (isPendingCommission) {
      return true;
    }

    // Also include chargeback policies (they may not be inforce but need to be reconciled)
    if (row._isChargebackPolicy) {
      return true;
    }

    return false;
  });

  // Debug: Check if GTL6163838 survived contract status filtering
  const afterStatusFilter = filteredByContractStatus.find(
    (p) => p["Policy"] === "GTL6163838"
  );
  console.log(
    "DEBUG: GTL6163838 after status filtering:",
    afterStatusFilter ? "FOUND" : "REMOVED"
  );

  // Debug: Check Policy Status values for Jremekyo to understand filtering
  const jremekyo_afterStatus = filteredByContractStatus.filter((p) =>
    p["Agent"]?.includes("Jremekyo")
  );
  const jremekyo_policyStatuses = [
    ...new Set(jremekyo_afterStatus.map((p) => p["Policy Status"])),
  ];
  console.log(
    "DEBUG: Jremekyo Policy Status values after filtering:",
    jremekyo_policyStatuses
  );
  console.log(
    "DEBUG: Jremekyo policies after status filter:",
    jremekyo_afterStatus.length
  );

  // Step 4: Paid & Chargeback Reconciliation
  const reconciledData = filteredByContractStatus.filter((row) => {
    const paidDateStr = row["Agent Paid Date"];
    const chargebackDateStr = row["Agent Chargeback Date"];

    const hasPaidDate = paidDateStr && paidDateStr.trim() !== "";
    const hasChargebackDate =
      chargebackDateStr && chargebackDateStr.trim() !== "";

    // Debug logging for Jremekyo policies to see what's being filtered out
    if (row["Agent"]?.includes("Jremekyo")) {
      console.log(`DEBUG Reconciliation - ${row["Policy"]}:`, {
        policy: row["Policy"],
        policyStatus: row["Policy Status"],
        hasPaidDate,
        hasChargebackDate,
        agentPaidDate: paidDateStr,
        agentChargebackDate: chargebackDateStr,
        included: !(hasPaidDate && hasChargebackDate),
      });
    }

    // Skip policies that have BOTH paid and chargeback dates (already fully reconciled)
    if (hasPaidDate && hasChargebackDate) {
      return false;
    }

    // Include policies that either:
    // 1. Have no paid date (new policies to be paid this cycle)
    // 2. Have paid date but no chargeback date (potential chargebacks to process)
    return true;
  });

  // Debug: Check Jremekyo policies after reconciliation
  const jremekyo_afterReconciliation = reconciledData.filter((p) =>
    p["Agent"]?.includes("Jremekyo")
  );
  console.log(
    "DEBUG: Jremekyo policies after reconciliation:",
    jremekyo_afterReconciliation.length
  );

  // Debug: Show unique policy numbers at this step
  const uniquePolicyNumbers = [
    ...new Set(jremekyo_afterReconciliation.map((p) => p["Policy"])),
  ];
  console.log(
    "DEBUG: Unique Jremekyo policy numbers after reconciliation:",
    uniquePolicyNumbers
  );

  // Step 5: Duplicate Policy Removal
  const uniquePolicies = new Map<string, Policy>();
  reconciledData.forEach((row) => {
    const policyNumber = row["Policy"];
    if (!policyNumber) return;

    const existing = uniquePolicies.get(policyNumber);
    if (!existing) {
      uniquePolicies.set(policyNumber, row);
      // Debug for Jremekyo policies
      if (row["Agent"]?.includes("Jremekyo")) {
        console.log(`DEBUG Duplicate Check - ADDED ${policyNumber}:`, {
          policy: policyNumber,
          statementDate: row["Statement Date"],
          policyStatus: row["Policy Status"],
          agentPaidDate: row["Agent Paid Date"],
        });
      }
    } else {
      const existingDate = new Date(existing["Statement Date"]);
      const newDate = new Date(row["Statement Date"]);

      // Prioritize records with payment/chargeback data over just newer dates
      const existingHasPaymentData =
        existing["Agent Paid Date"] &&
        existing["Agent Paid Date"].trim() !== "";
      const newHasPaymentData =
        row["Agent Paid Date"] && row["Agent Paid Date"].trim() !== "";

      let shouldReplaceExisting = false;
      let replaceReason = "";

      if (!existingHasPaymentData && newHasPaymentData) {
        // New record has payment data, existing doesn't - keep new
        shouldReplaceExisting = true;
        replaceReason = "new has payment data";
      } else if (existingHasPaymentData && !newHasPaymentData) {
        // Existing has payment data, new doesn't - keep existing
        shouldReplaceExisting = false;
        replaceReason = "existing has payment data, keeping it";
      } else if (
        !existingHasPaymentData &&
        !newHasPaymentData &&
        newDate > existingDate
      ) {
        // Neither has payment data - use date comparison
        shouldReplaceExisting = true;
        replaceReason = "neither has payment data, using newer date";
      } else if (
        existingHasPaymentData &&
        newHasPaymentData &&
        newDate > existingDate
      ) {
        // Both have payment data - use date comparison
        shouldReplaceExisting = true;
        replaceReason = "both have payment data, using newer date";
      }

      // Debug for Jremekyo policies
      if (row["Agent"]?.includes("Jremekyo")) {
        console.log(`DEBUG Duplicate Check - ${policyNumber}:`, {
          policy: policyNumber,
          existingDate: existing["Statement Date"],
          existingPaidDate: existing["Agent Paid Date"],
          newDate: row["Statement Date"],
          newPaidDate: row["Agent Paid Date"],
          existingHasPayment: existingHasPaymentData,
          newHasPayment: newHasPaymentData,
          shouldReplace: shouldReplaceExisting,
          reason: replaceReason,
        });
      }

      if (shouldReplaceExisting) {
        uniquePolicies.set(policyNumber, row);
        if (row["Agent"]?.includes("Jremekyo")) {
          console.log(
            `DEBUG Duplicate Check - REPLACED ${policyNumber}: ${replaceReason}`
          );
        }
      } else {
        if (row["Agent"]?.includes("Jremekyo")) {
          console.log(
            `DEBUG Duplicate Check - KEPT EXISTING ${policyNumber}: ${replaceReason}`
          );
        }
      }
    }
  });
  const cleanedData = Array.from(uniquePolicies.values());

  // Debug: Check Jremekyo policies after duplicate removal
  const jremekyo_afterDuplicates = cleanedData.filter((p) =>
    p["Agent"]?.includes("Jremekyo")
  );
  console.log(
    "DEBUG: Jremekyo policies after duplicate removal:",
    jremekyo_afterDuplicates.length
  );

  let dataForProcessing = [...cleanedData];

  // Apply chargeback logic ONLY to data within commission cycle ranges
  if (processChargebacks) {
    // Use the chargeback triggers defined earlier

    dataForProcessing = dataForProcessing.map((row) => {
      const contractStatus = row["Contract Status"] || "";
      const policyStatus = row["Policy Status"] || "";
      const policyNumber = row["Policy"] || "";

      // Check if this policy has a chargeback trigger status (check both Contract Status and Policy Status)
      const hasChargebackTrigger = chargebackTriggers.some(
        (trigger) =>
          contractStatus.toLowerCase().includes(trigger.toLowerCase()) ||
          policyStatus.toLowerCase().includes(trigger.toLowerCase())
      );

      // Debug logging for the specific policy GTL6163838
      if (policyNumber === "GTL6163838") {
        console.log("DEBUG GTL6163838 - All Fields:", row);
        console.log("DEBUG GTL6163838 - Status Check:", {
          contractStatus,
          policyStatus,
          hasChargebackTrigger,
          effectiveDate: row["Effective Date"],
          agentPaidDate: row["Agent Paid Date"],
          agentChargebackDate: row["Agent Chargeback Date"],
          agent: row["Agent"],
          eligibleForChargeback:
            hasChargebackTrigger &&
            row["Agent Paid Date"] &&
            row["Agent Paid Date"].trim() !== "" &&
            !(
              row["Agent Chargeback Date"] &&
              row["Agent Chargeback Date"].trim() !== ""
            ),
        });
      }

      // Check chargeback window based on Agent Paid Date
      // Only process chargebacks for policies that:
      // 1. Have chargeback trigger status
      // 2. Have Agent Paid Date (agent was paid)
      // 3. Don't have Agent Chargeback Date (not yet reconciled)
      const agentPaidDateStr = row["Agent Paid Date"];
      const agentChargebackDateStr = row["Agent Chargeback Date"];
      const hasPaidDate = agentPaidDateStr && agentPaidDateStr.trim() !== "";
      const hasChargebackDate =
        agentChargebackDateStr && agentChargebackDateStr.trim() !== "";

      if (hasChargebackTrigger && hasPaidDate && !hasChargebackDate) {
        const agentPaidDate = new Date(agentPaidDateStr);
        const currentDate = new Date("2025-07-27"); // Use fixed current date for consistent results
        const daysSinceAgentPaid =
          (currentDate.getTime() - agentPaidDate.getTime()) /
          (1000 * 3600 * 24);

        // Debug logging for the specific policy
        if (policyNumber === "GTL6163838") {
          console.log("DEBUG GTL6163838 chargeback check:", {
            agentPaidDate,
            currentDate,
            daysSinceAgentPaid,
            agentPaidDateStr,
            effectiveDate: row["Effective Date"],
            withinWindow: daysSinceAgentPaid <= 30,
          });
        }

        // Only chargeback if policy lapsed/cancelled within 30 days of agent paid date
        if (daysSinceAgentPaid <= 30) {
          if (policyNumber === "GTL6163838") {
            console.log("DEBUG GTL6163838: MARKED AS CHARGEBACK!");
          }
          return { ...row, Chargeback: true };
        } else {
          if (policyNumber === "GTL6163838") {
            console.log(
              "DEBUG GTL6163838: Outside 30-day window, no chargeback"
            );
          }
        }
      }
      return row;
    });
  }

  // Debug: Count policies for Jremekyo
  const jremekyo_policies = dataForProcessing.filter((p) =>
    p["Agent"]?.includes("Jremekyo")
  );
  console.log(
    "DEBUG: Jremekyo policies before commission calc:",
    jremekyo_policies.length
  );
  console.log(
    "DEBUG: Jremekyo chargeback policies:",
    jremekyo_policies
      .filter((p) => p.Chargeback)
      .map((p) => ({
        policy: p["Policy"],
        effectiveDate: p["Effective Date"],
        paidDate: p["Agent Paid Date"],
        policyStatus: p["Policy Status"],
      }))
  );

  const cleanedDataWithPremiums = dataForProcessing.map((row) => {
    const policyFee = getPolicyFee(row);
    const annualPremium = parseFloat(row["Annual Premium"]) || 0;
    let targetPremium = annualPremium - policyFee;
    let commissionAfterReconciliation = targetPremium;

    if (row.Chargeback) {
      targetPremium = -Math.abs(targetPremium);
      commissionAfterReconciliation = targetPremium; // Negative amount for chargebacks
    }

    return {
      ...row,
      "Policy Fee": policyFee,
      "Target Premium": targetPremium,
      "Commission After Reconciliation": commissionAfterReconciliation,
    };
  });

  // Final Step: Comprehensive Summary Report
  const totalPoliciesProcessed = cleanedDataWithPremiums.length;
  const totalCommissionAmount = cleanedDataWithPremiums.reduce(
    (acc, row) => acc + (row["Commission After Reconciliation"] || 0),
    0
  );

  const agents = new Set(
    cleanedDataWithPremiums.map((p) => (p as any)["Agent"])
  );

  // Office breakdown with commission amounts
  const austinPolicies = cleanedDataWithPremiums.filter((p) => {
    const agent = (p as any)["Agent"];
    const manager = (p as any)["Manager"];

    // Primary: Check agent name for office codes (ACC = Austin Call Center, CCC = Charlotte Call Center)
    if (agent && agent.includes(" ACC")) return true;
    if (agent && agent.includes(" CCC")) return false;

    // Fallback: Check manager field for office codes
    if (manager) {
      if (manager.includes("ACC")) return true;
      if (manager.includes("CCC")) return false;
      // Text-based detection
      if (manager.toLowerCase().includes("austin")) return true;
      if (manager.toLowerCase() === "chad") return true; // Legacy check
    }
    return false;
  });

  const charlottePolicies = cleanedDataWithPremiums.filter((p) => {
    const agent = (p as any)["Agent"];
    const manager = (p as any)["Manager"];

    // Primary: Check agent name for office codes (ACC = Austin Call Center, CCC = Charlotte Call Center)
    if (agent && agent.includes(" CCC")) return true;
    if (agent && agent.includes(" ACC")) return false;

    // Fallback: Check manager field for office codes
    if (manager) {
      if (manager.includes("CCC")) return true;
      if (manager.includes("ACC")) return false;
      // Text-based detection
      if (manager.toLowerCase().includes("charlotte")) return true;
      if (manager.toLowerCase() === "trent") return true; // Legacy check
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

  // Processing statistics
  const lookbackPolicies = cleanedDataWithPremiums.filter(
    (p) => (p as any)._isLookbackPolicy
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

  // Count unknown carriers (those with $0 policy fee that aren't in our known $0 list)
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
      (p as any)["Policy Fee"] === 0 &&
      (p as any)["Carrier"] &&
      !knownZeroFeeCarriers.some((known) =>
        (p as any)["Carrier"].toLowerCase().includes(known.toLowerCase())
      )
  ).length;

  // Generate warnings
  const warnings: string[] = [];
  if (lookbackPolicies > 0) {
    warnings.push(
      `${lookbackPolicies} policies from 14-day lookback period - review recommended`
    );
  }
  if (chargebackPolicies > 0) {
    warnings.push(
      `${chargebackPolicies} policies flagged for chargeback (lapsed/cancelled within 30 days of effective date)`
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
      agentsAffected: agents.size,
      breakdownByOffice: {
        austin: {
          policies: austinPolicies.length,
          commission: austinCommission,
        },
        charlotte: {
          policies: charlottePolicies.length,
          commission: charlotteCommission,
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
