import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Info, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as UICalendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { calculateCycleInfo } from "@/lib/cycle-validation";

export interface PlacementConfig {
  useCustomDates: boolean;
  customStartDate?: Date;
  customEndDate?: Date;
}

interface PlacementControlsProps {
  paymentDate?: Date;
  placementConfig: PlacementConfig;
  onPlacementConfigChange: (config: PlacementConfig) => void;
}

export function PlacementControls({
  paymentDate,
  placementConfig,
  onPlacementConfigChange,
}: PlacementControlsProps) {
  const [defaultStartDate, setDefaultStartDate] = useState<Date | undefined>();
  const [defaultEndDate, setDefaultEndDate] = useState<Date | undefined>();

  // Calculate default placement dates when payment date changes
  useEffect(() => {
    if (paymentDate) {
      const cycleInfo = calculateCycleInfo(paymentDate);
      setDefaultStartDate(cycleInfo.placementStartDate);
      setDefaultEndDate(cycleInfo.placementEndDate);
    }
  }, [paymentDate]);

  const handleUseCustomDatesChange = (useCustom: boolean) => {
    if (useCustom) {
      // Initialize with default dates when switching to custom
      onPlacementConfigChange({
        useCustomDates: true,
        customStartDate: defaultStartDate,
        customEndDate: defaultEndDate,
      });
    } else {
      // Clear custom dates when switching back to auto
      onPlacementConfigChange({
        useCustomDates: false,
        customStartDate: undefined,
        customEndDate: undefined,
      });
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    onPlacementConfigChange({
      ...placementConfig,
      customStartDate: date,
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onPlacementConfigChange({
      ...placementConfig,
      customEndDate: date,
    });
  };

  const isDateRangeValid = () => {
    if (!placementConfig.useCustomDates) return true;
    if (!placementConfig.customStartDate || !placementConfig.customEndDate)
      return false;
    return placementConfig.customStartDate <= placementConfig.customEndDate;
  };

  const getPlacementPeriodSummary = () => {
    if (!placementConfig.useCustomDates && defaultStartDate && defaultEndDate) {
      const days =
        Math.round(
          (defaultEndDate.getTime() - defaultStartDate.getTime()) /
            (1000 * 3600 * 24)
        ) + 1;
      return `Auto: ${format(defaultStartDate, "MMM d")} - ${format(
        defaultEndDate,
        "MMM d, yyyy"
      )} (${days} days)`;
    }

    if (
      placementConfig.useCustomDates &&
      placementConfig.customStartDate &&
      placementConfig.customEndDate
    ) {
      const days =
        Math.round(
          (placementConfig.customEndDate.getTime() -
            placementConfig.customStartDate.getTime()) /
            (1000 * 3600 * 24)
        ) + 1;
      return `Custom: ${format(
        placementConfig.customStartDate,
        "MMM d"
      )} - ${format(
        placementConfig.customEndDate,
        "MMM d, yyyy"
      )} (${days} days)`;
    }

    return "Please configure dates";
  };

  const getPlacementPeriodWarning = () => {
    if (!placementConfig.useCustomDates) return null;

    if (!isDateRangeValid()) {
      return "Invalid date range: Start date must be before end date";
    }

    if (placementConfig.customStartDate && placementConfig.customEndDate) {
      const days =
        Math.round(
          (placementConfig.customEndDate.getTime() -
            placementConfig.customStartDate.getTime()) /
            (1000 * 3600 * 24)
        ) + 1;

      if (days > 45) {
        return "Warning: Placement period longer than 45 days may include policies from multiple cycles";
      }
      if (days < 7) {
        return "Warning: Very short placement period may miss policies";
      }
    }

    return null;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-green-50/30 border-green-200">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Placement Period Configuration
        </h3>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="custom-placement-dates"
          checked={placementConfig.useCustomDates}
          onCheckedChange={handleUseCustomDatesChange}
        />
        <Label htmlFor="custom-placement-dates" className="font-medium">
          Use Custom Placement Dates
        </Label>
      </div>

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-200">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-800">Placement Period Logic:</p>
            <p>
              Policies are included if they are <strong>Inforce</strong> or{" "}
              <strong>TERM Inforce</strong> with{" "}
              <strong>no Agent Paid Date or Agent Chargeback Date</strong> and
              have an <strong>Effective Date or Submitted Date</strong> within
              the placement period.
            </p>
          </div>
        </div>
      </div>

      {!placementConfig.useCustomDates && (
        <div className="text-sm text-gray-600">
          <p>
            <strong>Automatic Mode:</strong> Placement dates are calculated from
            the selected payment date using commission cycle rules.
          </p>
          {defaultStartDate && defaultEndDate && (
            <p className="mt-1 text-green-700 font-medium">
              Current period: {format(defaultStartDate, "MMM d")} -{" "}
              {format(defaultEndDate, "MMM d, yyyy")}
            </p>
          )}
        </div>
      )}

      {placementConfig.useCustomDates && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Placement Start Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !placementConfig.customStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {placementConfig.customStartDate ? (
                    format(placementConfig.customStartDate, "PPP")
                  ) : (
                    <span>Select start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white shadow-lg border">
                <UICalendar
                  mode="single"
                  selected={placementConfig.customStartDate}
                  onSelect={handleStartDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Placement End Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !placementConfig.customEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {placementConfig.customEndDate ? (
                    format(placementConfig.customEndDate, "PPP")
                  ) : (
                    <span>Select end date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white shadow-lg border">
                <UICalendar
                  mode="single"
                  selected={placementConfig.customEndDate}
                  onSelect={handleEndDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Summary Display */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <div className="text-sm">
          <span className="font-medium text-gray-700">Selected Period: </span>
          <span
            className={isDateRangeValid() ? "text-gray-900" : "text-red-600"}
          >
            {getPlacementPeriodSummary()}
          </span>
        </div>

        {getPlacementPeriodWarning() && (
          <div className="mt-2 text-sm text-amber-600 flex items-start gap-1">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{getPlacementPeriodWarning()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
