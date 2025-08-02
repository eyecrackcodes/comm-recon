import { Upload, Building2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface ATXUploaderProps {
  onDataLoaded: (data: any[][], headers: string[], office: "austin") => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dataQualityScore: number;
}

const REQUIRED_COLUMNS = [
  "Agent",
  "Contract Status",
  "Policy Status",
  "Carrier",
  "Policy",
  "Product",
  "Annual Premium",
  "Submitted Date",
  "Effective Date",
  "Statement Date",
  "Manager",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_ROWS = 50000;

export function ATXUploader({ onDataLoaded }: ATXUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateData = (headers: string[], data: any[][]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 100;

    // Check file size and row count
    if (data.length > MAX_ROWS) {
      errors.push(
        `File contains ${
          data.length
        } rows, exceeding the maximum of ${MAX_ROWS.toLocaleString()} rows.`
      );
    }

    // Check required columns
    const missingColumns = REQUIRED_COLUMNS.filter(
      (col) =>
        !headers.some((header) =>
          header.toLowerCase().includes(col.toLowerCase())
        )
    );

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(", ")}`);
      qualityScore -= missingColumns.length * 10;
    }

    // Austin-specific validations
    const sampleSize = Math.min(1000, data.length);
    let austinAgentCount = 0;
    let emptyValues = 0;
    let invalidDates = 0;
    let invalidNumbers = 0;

    for (let i = 0; i < sampleSize; i++) {
      const row = data[i];

      // Check for Austin office codes in agent names
      const agentIndex = headers.findIndex((h) =>
        h.toLowerCase().includes("agent")
      );
      if (agentIndex >= 0 && row[agentIndex]) {
        const agent = String(row[agentIndex]);
        if (agent.includes(" ACC") || agent.toLowerCase().includes("austin")) {
          austinAgentCount++;
        }
      }

      // Check for empty critical values
      const policyIndex = headers.findIndex((h) =>
        h.toLowerCase().includes("policy")
      );
      const premiumIndex = headers.findIndex((h) =>
        h.toLowerCase().includes("annual premium")
      );

      if (agentIndex >= 0 && !row[agentIndex]) emptyValues++;
      if (policyIndex >= 0 && !row[policyIndex]) emptyValues++;
      if (premiumIndex >= 0 && !row[premiumIndex]) emptyValues++;

      // Check date formats
      const dateColumns = [
        "Submitted Date",
        "Effective Date",
        "Statement Date",
      ];
      dateColumns.forEach((col) => {
        const index = headers.findIndex((h) =>
          h.toLowerCase().includes(col.toLowerCase())
        );
        if (index >= 0 && row[index] && isNaN(Date.parse(row[index]))) {
          invalidDates++;
        }
      });

      // Check numeric values
      if (
        premiumIndex >= 0 &&
        row[premiumIndex] &&
        isNaN(parseFloat(row[premiumIndex]))
      ) {
        invalidNumbers++;
      }
    }

    // Warn if file doesn't appear to contain Austin data
    const austinPercentage = (austinAgentCount / sampleSize) * 100;
    if (austinPercentage < 50) {
      warnings.push(
        `Only ${austinPercentage.toFixed(
          1
        )}% of sampled records appear to be Austin agents. Please verify this is the correct ATX file.`
      );
    }

    const emptyPercentage = (emptyValues / (sampleSize * 3)) * 100;
    const invalidDatePercentage = (invalidDates / sampleSize) * 100;
    const invalidNumberPercentage = (invalidNumbers / sampleSize) * 100;

    if (emptyPercentage > 10) {
      warnings.push(
        `${emptyPercentage.toFixed(1)}% of critical fields are empty`
      );
      qualityScore -= Math.min(20, emptyPercentage);
    }

    if (invalidDatePercentage > 5) {
      warnings.push(
        `${invalidDatePercentage.toFixed(1)}% of dates are in invalid format`
      );
      qualityScore -= Math.min(15, invalidDatePercentage);
    }

    if (invalidNumberPercentage > 5) {
      warnings.push(
        `${invalidNumberPercentage.toFixed(1)}% of premium values are invalid`
      );
      qualityScore -= Math.min(15, invalidNumberPercentage);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      dataQualityScore: Math.max(0, Math.round(qualityScore)),
    };
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      setValidation(null);
      setIsUploading(true);

      if (acceptedFiles.length === 0) {
        setIsUploading(false);
        return;
      }

      const file = acceptedFiles[0];

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        setError(
          `File size ${(file.size / 1024 / 1024).toFixed(
            1
          )}MB exceeds the maximum allowed size of ${
            MAX_FILE_SIZE / 1024 / 1024
          }MB.`
        );
        setIsUploading(false);
        return;
      }

      const reader = new FileReader();

      const processData = (headers: string[], data: any[][]) => {
        const validationResult = validateData(headers, data);
        setValidation(validationResult);

        if (validationResult.isValid) {
          onDataLoaded(data, headers, "austin");
        } else {
          setError(`Validation failed: ${validationResult.errors.join("; ")}`);
        }
        setIsUploading(false);
      };

      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            if (!text) {
              setError("Failed to read CSV file.");
              setIsUploading(false);
              return;
            }

            Papa.parse(text, {
              complete: (results) => {
                if (results.errors.length > 0) {
                  setError(`CSV parsing error: ${results.errors[0].message}`);
                  setIsUploading(false);
                  return;
                }

                const data = results.data as any[][];
                if (data.length > 0) {
                  const headers = data[0].map(String);
                  const rows = data
                    .slice(1)
                    .filter((row) => row.some((cell) => cell !== ""));
                  processData(headers, rows);
                } else {
                  setError("The CSV file is empty or invalid.");
                  setIsUploading(false);
                }
              },
              header: false,
              skipEmptyLines: true,
            });
          } catch (e) {
            setError(
              "Error processing CSV file. Please ensure it is a valid CSV file."
            );
            setIsUploading(false);
            console.error(e);
          }
        };
        reader.readAsText(file);
      } else {
        reader.onload = (event) => {
          try {
            const binaryStr = event.target?.result;
            if (!binaryStr) {
              setError("Failed to read Excel file.");
              setIsUploading(false);
              return;
            }
            const workbook = XLSX.read(binaryStr, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[][] = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
            });

            if (json.length > 0) {
              const headers = json[0].map(String);
              const data = json
                .slice(1)
                .filter((row) =>
                  row.some((cell) => cell !== null && cell !== "")
                );
              processData(headers, data);
            } else {
              setError("The Excel file is empty or invalid.");
              setIsUploading(false);
            }
          } catch (e) {
            setError(
              "Error processing Excel file. Please ensure it is a valid Excel file."
            );
            setIsUploading(false);
            console.error(e);
          }
        };
        reader.readAsBinaryString(file);
      }

      reader.onerror = () => {
        setError("Failed to read file.");
        setIsUploading(false);
      };
    },
    [onDataLoaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Building2 className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Austin Call Center (ATX) Commission Data
        </h3>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : isUploading
            ? "border-gray-200 bg-gray-50"
            : "border-blue-300 hover:border-blue-400 bg-blue-50/30"
        } ${isUploading ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Upload
              className={`w-10 h-10 ${
                isUploading ? "text-gray-400" : "text-blue-500"
              }`}
            />
            <Building2
              className={`w-6 h-6 ${
                isUploading ? "text-gray-400" : "text-blue-500"
              }`}
            />
          </div>
          {isUploading ? (
            <p className="text-lg text-gray-600">Processing ATX file...</p>
          ) : isDragActive ? (
            <p className="text-lg text-blue-600">Drop the ATX file here...</p>
          ) : (
            <div>
              <p className="text-gray-600 font-medium">
                Upload Austin Commission Data
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop a CSV or Excel file here, or click to select
              </p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            .csv, .xls, .xlsx files are supported (max{" "}
            {MAX_FILE_SIZE / 1024 / 1024}MB, {MAX_ROWS.toLocaleString()} rows)
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          {validation && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md text-left max-w-md w-full">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-block w-3 h-3 rounded-full ${
                    validation.isValid ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="font-medium text-sm">
                  ATX Data Quality Score: {validation.dataQualityScore}/100
                </span>
              </div>
              {validation.errors.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-red-600 mb-1">
                    Errors:
                  </p>
                  <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                    {validation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-1">
                    Warnings:
                  </p>
                  <ul className="text-xs text-yellow-600 list-disc list-inside space-y-1">
                    {validation.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
