"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface RosterEntry {
  agent: string;
  office: "Austin" | "Charlotte";
}

interface RosterUploaderProps {
  onRosterData: (data: RosterEntry[]) => void;
}

const RosterUploader: React.FC<RosterUploaderProps> = ({ onRosterData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rosterData, setRosterData] = useState<RosterEntry[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const processRosterData = (data: any[][], headers: string[]) => {
    if (data.length === 0) {
      throw new Error("No data found in file");
    }

    // Look for agent and office columns (case insensitive)
    const agentColIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("agent") ||
        h.toLowerCase().includes("name") ||
        h.toLowerCase().includes("employee")
    );

    const officeColIndex = headers.findIndex(
      (h) =>
        h.toLowerCase().includes("office") ||
        h.toLowerCase().includes("location") ||
        h.toLowerCase().includes("city")
    );

    if (agentColIndex === -1) {
      throw new Error(
        'Could not find agent/name column. Expected columns containing "agent", "name", or "employee"'
      );
    }

    if (officeColIndex === -1) {
      throw new Error(
        'Could not find office/location column. Expected columns containing "office", "location", or "city"'
      );
    }

    const processedData: RosterEntry[] = [];
    const skippedRows: string[] = [];

    data.forEach((row, index) => {
      if (index === 0) return; // Skip header row

      const agent = row[agentColIndex]?.toString().trim();
      const officeRaw = row[officeColIndex]?.toString().trim().toLowerCase();

      if (!agent) {
        skippedRows.push(`Row ${index + 1}: Missing agent name`);
        return;
      }

      let office: "Austin" | "Charlotte";
      if (officeRaw.includes("austin")) {
        office = "Austin";
      } else if (officeRaw.includes("charlotte")) {
        office = "Charlotte";
      } else {
        skippedRows.push(
          `Row ${
            index + 1
          }: Office "${officeRaw}" not recognized (must contain "Austin" or "Charlotte")`
        );
        return;
      }

      processedData.push({ agent, office });
    });

    if (processedData.length === 0) {
      throw new Error(
        "No valid roster entries found. Please check your data format."
      );
    }

    if (skippedRows.length > 0) {
      console.warn("Skipped rows:", skippedRows);
    }

    return processedData;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsLoading(true);
      setError(null);
      setFileName(file.name);

      try {
        const fileExtension = file.name.split(".").pop()?.toLowerCase();

        if (fileExtension === "csv") {
          // Parse CSV
          Papa.parse(file, {
            complete: (results) => {
              try {
                const headers = results.data[0] as string[];
                const processedData = processRosterData(
                  results.data as any[][],
                  headers
                );
                setRosterData(processedData);
                onRosterData(processedData);
                setIsLoading(false);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to process CSV file"
                );
                setIsLoading(false);
              }
            },
            error: (error) => {
              setError(`CSV parsing error: ${error.message}`);
              setIsLoading(false);
            },
            header: false,
            skipEmptyLines: true,
          });
        } else if (fileExtension === "xlsx" || fileExtension === "xls") {
          // Parse Excel
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as any[][];

          const headers = jsonData[0] as string[];
          const processedData = processRosterData(jsonData, headers);
          setRosterData(processedData);
          onRosterData(processedData);
          setIsLoading(false);
        } else {
          throw new Error(
            "Unsupported file format. Please upload CSV, XLS, or XLSX files."
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file");
        setIsLoading(false);
      }
    },
    [onRosterData]
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
    multiple: false,
  });

  const austinCount = rosterData.filter((r) => r.office === "Austin").length;
  const charlotteCount = rosterData.filter(
    (r) => r.office === "Charlotte"
  ).length;

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Agent Roster Upload
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload a CSV or Excel file containing agent names and office
        assignments. Expected columns: Agent/Name and Office/Location (Austin or
        Charlotte).
      </p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? "Drop roster file here..." : "Upload Agent Roster"}
        </p>
        <p className="text-sm text-gray-500">
          Drag & drop or click to select CSV, XLS, or XLSX files
        </p>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Processing roster file...
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start space-x-2 text-red-600">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Upload Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {rosterData.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Roster loaded successfully!</span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Total Agents:</span>
                <div className="text-lg font-bold text-gray-900">
                  {rosterData.length}
                </div>
              </div>
              <div>
                <span className="font-medium text-pink-600">Austin:</span>
                <div className="text-lg font-bold text-pink-600">
                  {austinCount}
                </div>
              </div>
              <div>
                <span className="font-medium text-blue-600">Charlotte:</span>
                <div className="text-lg font-bold text-blue-600">
                  {charlotteCount}
                </div>
              </div>
            </div>
          </div>

          {fileName && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>File: {fileName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RosterUploader;
