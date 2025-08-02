import { Calendar, CalendarDays, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { useState } from "react";

interface ChargebackControlsProps {
  paymentDate: Date | undefined;
  chargebackFromDate: Date | undefined;
  chargebackToDate: Date | undefined;
  enableChargebacks: boolean;
  chargebackDaysLookback: number;
  onPaymentDateChange: (date: Date | undefined) => void;
  onChargebackFromDateChange: (date: Date | undefined) => void;
  onChargebackToDateChange: (date: Date | undefined) => void;
  onEnableChargebacksChange: (enabled: boolean) => void;
  onChargebackDaysLookbackChange: (days: number) => void;
}

const PRESET_LOOKBACK_PERIODS = [
  { days: 30, label: "30 days" },
  { days: 45, label: "45 days" },
  { days: 60, label: "60 days" },
  { days: 90, label: "90 days" },
  { days: 120, label: "120 days" },
];

export function ChargebackControls({
  paymentDate,
  chargebackFromDate,
  chargebackToDate,
  enableChargebacks,
  chargebackDaysLookback,
  onPaymentDateChange,
  onChargebackFromDateChange,
  onChargebackToDateChange,
  onEnableChargebacksChange,
  onChargebackDaysLookbackChange,
}: ChargebackControlsProps) {
  const [paymentDateOpen, setPaymentDateOpen] = useState(false);
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const calculateDefaultChargebackDates = (
    payDate: Date,
    lookbackDays: number
  ) => {
    const toDate = new Date(payDate);
    const fromDate = new Date(payDate);
    fromDate.setDate(fromDate.getDate() - lookbackDays);
    return { fromDate, toDate };
  };

  const handlePresetLookbackChange = (days: number) => {
    onChargebackDaysLookbackChange(days);

    // If payment date is set, automatically calculate chargeback dates
    if (paymentDate) {
      const { fromDate, toDate } = calculateDefaultChargebackDates(
        paymentDate,
        days
      );
      onChargebackFromDateChange(fromDate);
      onChargebackToDateChange(toDate);
    }
  };

  const handlePaymentDateChange = (date: Date | undefined) => {
    onPaymentDateChange(date);

    // Automatically set chargeback dates based on lookback period
    if (date && enableChargebacks) {
      const { fromDate, toDate } = calculateDefaultChargebackDates(
        date,
        chargebackDaysLookback
      );
      onChargebackFromDateChange(fromDate);
      onChargebackToDateChange(toDate);
    }
  };

  const isDateRangeValid = () => {
    if (!chargebackFromDate || !chargebackToDate) return true;
    return chargebackFromDate <= chargebackToDate;
  };

  const getChargebackPeriodWarning = () => {
    if (!chargebackFromDate || !chargebackToDate) return null;

    const daysDiff = Math.ceil(
      (chargebackToDate.getTime() - chargebackFromDate.getTime()) /
        (1000 * 3600 * 24)
    );

    if (daysDiff > 120) {
      return "Long chargeback periods may include many unrelated policies and affect processing performance.";
    }
    if (daysDiff < 14) {
      return "Short chargeback periods may miss recent policy changes.";
    }
    return null;
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Commission Payment & Chargeback Controls
        </h3>
      </div>

      {/* Payment Date Selection */}
      <div className="space-y-3">
        <Label
          htmlFor="payment-date"
          className="text-sm font-medium text-gray-700"
        >
          Commission Payment Date
        </Label>
        <Popover open={paymentDateOpen} onOpenChange={setPaymentDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-full justify-start text-left font-normal ${
                !paymentDate && "text-muted-foreground"
              }`}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {paymentDate ? (
                format(paymentDate, "PPP")
              ) : (
                <span>Select payment date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={paymentDate}
              onSelect={(date) => {
                handlePaymentDateChange(date);
                setPaymentDateOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-gray-500">
          The date when commissions are being processed for payment.
        </p>
      </div>

      {/* Chargeback Processing Toggle */}
      <div className="flex items-center justify-between py-3 border-t border-gray-200">
        <div className="space-y-1">
          <Label
            htmlFor="enable-chargebacks"
            className="text-sm font-medium text-gray-700"
          >
            Process Chargebacks
          </Label>
          <p className="text-xs text-gray-500">
            Include chargeback calculations for policies that lapsed or were
            cancelled.
          </p>
        </div>
        <Switch
          id="enable-chargebacks"
          checked={enableChargebacks}
          onCheckedChange={onEnableChargebacksChange}
        />
      </div>

      {/* Chargeback Controls (only visible when enabled) */}
      {enableChargebacks && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-purple-600" />
            <h4 className="text-md font-medium text-gray-800">
              Chargeback Lookback Period
            </h4>
          </div>

          {/* Preset Lookback Periods */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Quick Selection
            </Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_LOOKBACK_PERIODS.map((preset) => (
                <Button
                  key={preset.days}
                  variant={
                    chargebackDaysLookback === preset.days
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handlePresetLookbackChange(preset.days)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Select a preset period or use custom dates below.
            </p>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="chargeback-from"
                className="text-sm font-medium text-gray-700"
              >
                Chargeback From Date
              </Label>
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !chargebackFromDate && "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {chargebackFromDate ? (
                      format(chargebackFromDate, "PPP")
                    ) : (
                      <span>Select start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={chargebackFromDate}
                    onSelect={(date) => {
                      onChargebackFromDateChange(date);
                      setFromDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="chargeback-to"
                className="text-sm font-medium text-gray-700"
              >
                Chargeback To Date
              </Label>
              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !chargebackToDate && "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {chargebackToDate ? (
                      format(chargebackToDate, "PPP")
                    ) : (
                      <span>Select end date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={chargebackToDate}
                    onSelect={(date) => {
                      onChargebackToDateChange(date);
                      setToDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Date Range Validation */}
          {!isDateRangeValid() && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600">
                The &apos;From&apos; date must be earlier than or equal to the
                &apos;To&apos; date.
              </p>
            </div>
          )}

          {/* Period Warning */}
          {getChargebackPeriodWarning() && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-600">
                {getChargebackPeriodWarning()}
              </p>
            </div>
          )}

          {/* Summary */}
          {chargebackFromDate && chargebackToDate && isDateRangeValid() && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Chargeback Analysis Period:</span>{" "}
                {format(chargebackFromDate, "MMM d, yyyy")} to{" "}
                {format(chargebackToDate, "MMM d, yyyy")} (
                {Math.ceil(
                  (chargebackToDate.getTime() - chargebackFromDate.getTime()) /
                    (1000 * 3600 * 24)
                )}{" "}
                days)
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Policies with Agent Paid Dates in this range will be checked for
                chargeback triggers.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
