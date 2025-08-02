import { useState } from "react";
import {
  Merge,
  Play,
  CheckCircle,
  AlertCircle,
  FileText,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ATXUploader } from "@/components/atx-uploader";
import { CLTUploader } from "@/components/clt-uploader";
import { ChargebackControls } from "@/components/chargeback-controls";
import {
  PlacementControls,
  type PlacementConfig,
} from "@/components/placement-controls";
import {
  processEnhancedCommissionData,
  type DataSource,
  type ChargebackConfig,
  type ProcessingResult,
} from "@/lib/enhanced-commission-processing";

interface EnhancedCommissionUploaderProps {
  onProcessingComplete: (result: ProcessingResult) => void;
}

interface UploadedData {
  data: any[][];
  headers: string[];
  office: "austin" | "charlotte";
  fileName?: string;
  uploadedAt: Date;
}

export function EnhancedCommissionUploader({
  onProcessingComplete,
}: EnhancedCommissionUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedData[]>([]);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [chargebackFromDate, setChargebackFromDate] = useState<
    Date | undefined
  >(undefined);
  const [chargebackToDate, setChargebackToDate] = useState<Date | undefined>(
    undefined
  );
  const [enableChargebacks, setEnableChargebacks] = useState(true);
  const [chargebackDaysLookback, setChargebackDaysLookback] = useState(45);
  const [placementConfig, setPlacementConfig] = useState<PlacementConfig>({
    useCustomDates: false,
    customStartDate: undefined,
    customEndDate: undefined,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const handleDataLoaded = (
    data: any[][],
    headers: string[],
    office: "austin" | "charlotte"
  ) => {
    const newUpload: UploadedData = {
      data,
      headers,
      office,
      uploadedAt: new Date(),
    };

    // Replace existing data for the same office
    setUploadedFiles((prev) => [
      ...prev.filter((f) => f.office !== office),
      newUpload,
    ]);

    setProcessingError(null);
  };

  const getUploadedFileByOffice = (office: "austin" | "charlotte") => {
    return uploadedFiles.find((f) => f.office === office);
  };

  const canProcess = () => {
    return (
      uploadedFiles.length > 0 &&
      paymentDate &&
      (!enableChargebacks ||
        (chargebackFromDate && chargebackToDate) ||
        chargebackDaysLookback > 0)
    );
  };

  const getChargebackConfig = (): ChargebackConfig => {
    if (!enableChargebacks) {
      return { enabled: false };
    }

    if (chargebackFromDate && chargebackToDate) {
      return {
        enabled: true,
        fromDate: chargebackFromDate,
        toDate: chargebackToDate,
      };
    }

    return {
      enabled: true,
      daysLookback: chargebackDaysLookback,
    };
  };

  const handleProcess = async () => {
    if (!canProcess() || !paymentDate) return;

    setIsProcessing(true);
    setProcessingError(null);

    try {
      const dataSources: DataSource[] = uploadedFiles.map((file) => ({
        data: file.data,
        headers: file.headers,
        office: file.office,
      }));

      const config = {
        paymentDate,
        chargebackConfig: getChargebackConfig(),
        placementConfig,
        dataSources,
      };

      const result = processEnhancedCommissionData(config);

      if (result.summary.errors.length > 0) {
        setProcessingError(result.summary.errors.join("; "));
      } else {
        onProcessingComplete(result);
      }
    } catch (error) {
      setProcessingError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during processing"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const removeUploadedFile = (office: "austin" | "charlotte") => {
    setUploadedFiles((prev) => prev.filter((f) => f.office !== office));
  };

  const austinFile = getUploadedFileByOffice("austin");
  const charlotteFile = getUploadedFileByOffice("charlotte");

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Enhanced Commission Processing
        </h2>
        <p className="text-gray-600">
          Upload commission data from both offices and configure processing
          parameters
        </p>
      </div>

      {/* File Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Austin Uploader */}
        <div className="space-y-4">
          {austinFile ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    ATX Data Loaded
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeUploadedFile("austin")}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  <span className="font-medium">Rows:</span>{" "}
                  {austinFile.data.length.toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Columns:</span>{" "}
                  {austinFile.headers.length}
                </p>
                <p>
                  <span className="font-medium">Uploaded:</span>{" "}
                  {austinFile.uploadedAt.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ) : (
            <ATXUploader onDataLoaded={handleDataLoaded} />
          )}
        </div>

        {/* Charlotte Uploader */}
        <div className="space-y-4">
          {charlotteFile ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    CLT Data Loaded
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeUploadedFile("charlotte")}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  <span className="font-medium">Rows:</span>{" "}
                  {charlotteFile.data.length.toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Columns:</span>{" "}
                  {charlotteFile.headers.length}
                </p>
                <p>
                  <span className="font-medium">Uploaded:</span>{" "}
                  {charlotteFile.uploadedAt.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ) : (
            <CLTUploader onDataLoaded={handleDataLoaded} />
          )}
        </div>
      </div>

      {/* Data Merge Status */}
      {uploadedFiles.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Merge className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Data Sources Ready</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">
                {uploadedFiles.length} office
                {uploadedFiles.length !== 1 ? "s" : ""} loaded
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">
                {uploadedFiles
                  .reduce((sum, f) => sum + f.data.length, 0)
                  .toLocaleString()}{" "}
                total rows
              </span>
            </div>
            <div className="text-blue-700">
              <span className="font-medium">Offices:</span>{" "}
              {uploadedFiles.map((f) => f.office.toUpperCase()).join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* Processing Controls */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-6">
          <ChargebackControls
            paymentDate={paymentDate}
            chargebackFromDate={chargebackFromDate}
            chargebackToDate={chargebackToDate}
            enableChargebacks={enableChargebacks}
            chargebackDaysLookback={chargebackDaysLookback}
            onPaymentDateChange={setPaymentDate}
            onChargebackFromDateChange={setChargebackFromDate}
            onChargebackToDateChange={setChargebackToDate}
            onEnableChargebacksChange={setEnableChargebacks}
            onChargebackDaysLookbackChange={setChargebackDaysLookback}
          />

          <PlacementControls
            paymentDate={paymentDate}
            placementConfig={placementConfig}
            onPlacementConfigChange={setPlacementConfig}
          />
        </div>
      )}

      {/* Processing Error */}
      {processingError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Processing Error</h3>
          </div>
          <p className="text-red-700 mt-2 text-sm">{processingError}</p>
        </div>
      )}

      {/* Process Button */}
      {uploadedFiles.length > 0 && (
        <div className="flex justify-center pt-6 border-t border-gray-200">
          <Button
            onClick={handleProcess}
            disabled={!canProcess() || isProcessing}
            size="lg"
            className="px-8 py-3"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing Commission Data...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Process Commission Data
              </>
            )}
          </Button>
        </div>
      )}

      {/* Processing Instructions */}
      {uploadedFiles.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ready to Process Commission Data
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Upload commission data from one or both offices above. The system
            will automatically merge and process the data, handling duplicates
            and applying your chargeback settings.
          </p>
        </div>
      )}
    </div>
  );
}
