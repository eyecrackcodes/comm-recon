"use client";

import { CommissionUploader } from "@/components/commission-uploader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  processCommissionData,
  ProcessingResult,
} from "@/lib/commission-processing";
import {
  calculateCycleInfo,
  validateCycleDate,
  getUpcomingCycles,
  formatCyclePeriod,
  CycleInfo,
} from "@/lib/cycle-validation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { SummaryReport } from "@/components/summary-report";
import AgentDashboard from "@/components/agent-dashboard";
import RosterUploader from "@/components/roster-uploader";
import ValidationDashboard from "@/components/validation-dashboard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export default function Home() {
  const [rawData, setRawData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [processedResult, setProcessedResult] =
    useState<ProcessingResult | null>(null);
  const [cycleEndDate, setCycleEndDate] = useState<Date | undefined>(
    getUpcomingCycles(1)[0] // Default to next upcoming cycle
  );
  const [isLoading, setIsLoading] = useState(false);
  const [processChargebacks, setProcessChargebacks] = useState(true);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [cycleValidation, setCycleValidation] = useState<any>(null);
  const [rosterData, setRosterData] = useState<
    { agent: string; office: "Austin" | "Charlotte" }[]
  >([]);
  const [showAgentDashboard, setShowAgentDashboard] = useState(false);
  const [showValidationDashboard, setShowValidationDashboard] = useState(false);

  // Initialize cycle validation on mount
  useEffect(() => {
    if (cycleEndDate) {
      handleCycleEndDateChange(cycleEndDate);
    }
  }, []); // Only run on mount

  const handleDataLoaded = (loadedData: any[][], loadedHeaders: string[]) => {
    setRawData(loadedData);
    setHeaders(loadedHeaders);
    setProcessedResult(null);
  };

  const handleCycleEndDateChange = (date: Date | undefined) => {
    setCycleEndDate(date);
    if (date) {
      const info = calculateCycleInfo(date);
      const validation = validateCycleDate(date);
      setCycleInfo(info);
      setCycleValidation(validation);
    } else {
      setCycleInfo(null);
      setCycleValidation(null);
    }
  };

  const handleProcessData = () => {
    if (rawData.length > 0 && cycleEndDate) {
      setIsLoading(true);
      // Simulate processing delay for large files
      setTimeout(() => {
        const result = processCommissionData(
          rawData,
          headers,
          cycleEndDate,
          processChargebacks
        );
        setProcessedResult(result);
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleExportExcel = () => {
    if (processedResult) {
      const worksheet = XLSX.utils.json_to_sheet(processedResult.cleanedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");
      XLSX.writeFile(workbook, "commission_recon_processed.xlsx");
    }
  };

  const handleExportCSV = () => {
    if (processedResult) {
      const csv = Papa.unparse(processedResult.cleanedData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "commission_recon_processed.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRosterData = (
    data: { agent: string; office: "Austin" | "Charlotte" }[]
  ) => {
    setRosterData(data);
  };

  const dataToDisplay = processedResult
    ? processedResult.cleanedData
    : rawData.slice(0, 10);
  const headersToDisplay = processedResult
    ? Object.keys(processedResult.cleanedData[0] || {})
    : headers;

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Commission Processing</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">1. Upload Data</h2>
          <CommissionUploader onDataLoaded={handleDataLoaded} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            2. Select Payment Date
          </h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !cycleEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {cycleEndDate ? (
                  format(cycleEndDate, "PPP")
                ) : (
                  <span>Select payment date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white shadow-lg border">
              <Calendar
                mode="single"
                selected={cycleEndDate}
                onSelect={handleCycleEndDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Cycle Validation Display */}
          {cycleValidation && (
            <div
              className={`mt-4 p-3 rounded-md ${
                cycleValidation.isValid
                  ? "bg-green-50 border border-green-200"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {cycleValidation.isValid ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
                <span
                  className={`text-sm font-medium ${
                    cycleValidation.isValid
                      ? "text-green-800"
                      : "text-yellow-800"
                  }`}
                >
                  {cycleValidation.message}
                </span>
              </div>
              {cycleInfo && (
                <div className="mt-2 text-sm text-gray-600">
                  <div>Placement Period: {formatCyclePeriod(cycleInfo)}</div>
                  <div>
                    Approval Deadline:{" "}
                    {cycleInfo.approvalDeadline.toLocaleDateString("en-US", {
                      month: "numeric",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                  <div>
                    Processing Window:{" "}
                    {cycleInfo.processingWindow.start.toLocaleDateString(
                      "en-US",
                      {
                        month: "numeric",
                        day: "2-digit",
                        year: "numeric",
                      }
                    )}{" "}
                    -{" "}
                    {cycleInfo.processingWindow.end.toLocaleDateString(
                      "en-US",
                      {
                        month: "numeric",
                        day: "2-digit",
                        year: "numeric",
                      }
                    )}
                  </div>
                </div>
              )}
              {!cycleValidation.isValid && cycleValidation.suggestedDate && (
                <button
                  onClick={() =>
                    handleCycleEndDateChange(cycleValidation.suggestedDate)
                  }
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Use suggested date:{" "}
                  {cycleValidation.suggestedDate.toLocaleDateString()}
                </button>
              )}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">3. Process Data</h2>
            <Button
              onClick={handleProcessData}
              disabled={rawData.length === 0 || !cycleEndDate || isLoading}
            >
              {isLoading ? "Processing..." : "Process Data"}
            </Button>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">4. Options</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="chargeback-toggle"
                checked={processChargebacks}
                onCheckedChange={setProcessChargebacks}
              />
              <Label htmlFor="chargeback-toggle">Process Chargebacks</Label>
            </div>

            <div className="mt-6">
              <RosterUploader onRosterData={handleRosterData} />
            </div>
          </div>
        </div>
      </div>

      {processedResult && (
        <div className="mt-8 space-y-6">
          <SummaryReport summary={processedResult.summary} />

          {/* Export Options */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Export Data
            </h3>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleExportExcel}
                className="flex items-center gap-2"
              >
                📊 Export to Excel
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center gap-2"
              >
                📄 Export to CSV
              </Button>
              <Button
                onClick={() => setShowAgentDashboard(!showAgentDashboard)}
                variant={showAgentDashboard ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                👥 {showAgentDashboard ? "Hide" : "Show"} Agent Dashboard
              </Button>
              <Button
                onClick={() =>
                  setShowValidationDashboard(!showValidationDashboard)
                }
                variant={showValidationDashboard ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                ✅ {showValidationDashboard ? "Hide" : "Show"} Validation
              </Button>
            </div>
          </div>

          {/* Validation Dashboard */}
          {showValidationDashboard && cycleInfo && (
            <ValidationDashboard
              processedData={processedResult.cleanedData}
              rawDataCount={rawData.length}
              cycleInfo={{
                paymentDate: cycleInfo.paymentDate,
                placementStartDate: cycleInfo.placementStartDate,
                placementEndDate: cycleInfo.placementEndDate,
                isValidPaymentDate: cycleInfo.isValidPaymentDate,
              }}
              processingStats={processedResult.summary.processingStats}
            />
          )}

          {/* Agent Dashboard */}
          {showAgentDashboard && (
            <AgentDashboard
              processedData={processedResult.cleanedData}
              rosterData={rosterData}
            />
          )}
        </div>
      )}

      {dataToDisplay.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              {processedResult
                ? "Processed Data"
                : "Data Preview (First 10 Rows)"}
            </h2>

            {processedResult && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-pink-100 border border-pink-200 rounded"></span>
                  <span>Austin Call Center (ACC)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 border-l-4 border-l-yellow-400 bg-white"></span>
                  <span>Lookback Policy</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-100 border border-red-200 rounded"></span>
                  <span>Chargeback</span>
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headersToDisplay.map((header, index) => (
                    <th
                      key={index}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dataToDisplay.map((row, rowIndex) => {
                  const rowData = row as any; // Type assertion for processed data
                  const isAustinOffice = (() => {
                    const agent = rowData.Agent;
                    const manager = rowData.Manager;

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
                  })();
                  const isLookbackPolicy = rowData._isLookbackPolicy;

                  return (
                    <tr
                      key={rowIndex}
                      className={`${
                        isAustinOffice
                          ? "bg-pink-50 hover:bg-pink-100"
                          : "hover:bg-gray-50"
                      } ${
                        isLookbackPolicy ? "border-l-4 border-l-yellow-400" : ""
                      }`}
                    >
                      {headersToDisplay.map((header, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isAustinOffice ? "text-pink-900" : "text-gray-500"
                          }`}
                        >
                          {header === "Manager" && isAustinOffice ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                              {rowData[header]} (ACC)
                            </span>
                          ) : header === "Target Premium" &&
                            rowData.Chargeback ? (
                            <span className="text-red-600 font-medium">
                              {typeof rowData[header] === "number"
                                ? rowData[header].toLocaleString("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                  })
                                : rowData[header]}
                            </span>
                          ) : (
                            rowData[header]
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
