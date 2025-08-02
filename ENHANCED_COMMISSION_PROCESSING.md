# Enhanced Commission Processing System

## Overview

The Enhanced Commission Processing System allows for sophisticated commission data handling with support for multiple office uploads (ATX/CLT), configurable chargeback windows, and intelligent data merging capabilities.

## Features

### 1. Office-Specific File Uploads

- **ATX Uploader**: Dedicated uploader for Austin Call Center data with office-specific validation
- **CLT Uploader**: Dedicated uploader for Charlotte Call Center data with office-specific validation
- **Intelligent Validation**: Each uploader validates that the data contains appropriate office indicators

### 2. Enhanced Chargeback Controls

- **Flexible Date Ranges**: Set custom "from" and "to" dates for chargeback analysis
- **Preset Lookback Periods**: Quick selection for 30, 45, 60, 90, or 120-day lookbacks
- **Smart Defaults**: Automatic date calculation based on payment date and selected period
- **Validation Warnings**: Alerts for unusually long or short chargeback periods

### 3. Data Merging & Duplicate Resolution

- **Cross-Office Merging**: Automatically combines data from multiple offices
- **Intelligent Duplicate Handling**: Resolves duplicates by prioritizing records with:
  - Payment data over non-payment data
  - More complete data (fewer missing fields)
  - Newer statement dates
- **Source Tracking**: Maintains office source information for all records

### 4. Enhanced Processing Pipeline

- **Configurable Windows**: Use either custom date ranges or lookback periods for chargebacks
- **Multi-Source Support**: Process data from one or both offices simultaneously
- **Comprehensive Validation**: Validates configuration before processing begins

## Component Structure

### Core Components

#### `EnhancedCommissionUploader`

Main orchestrator component that coordinates:

- File uploads from both offices
- Chargeback configuration
- Data processing trigger
- Results display

#### `ATXUploader` / `CLTUploader`

Office-specific upload components with:

- File validation and parsing
- Office-specific data validation
- Upload status display
- Error handling

#### `ChargebackControls`

Comprehensive control panel for:

- Payment date selection
- Chargeback enable/disable toggle
- Preset lookback period selection
- Custom date range selection
- Configuration validation

#### `EnhancedCommissionDashboard`

Complete results dashboard showing:

- Key metrics and totals
- Office-wise breakdowns
- Data source statistics
- Processing pipeline stats
- Data quality metrics
- Commission data preview

### Processing Library

#### `enhanced-commission-processing.ts`

Core processing engine that handles:

- Multi-source data merging
- Configurable chargeback windows
- Enhanced duplicate resolution
- Comprehensive reporting

## Usage Examples

### Basic Single Office Processing

```tsx
import { EnhancedCommissionUploader } from "@/components/enhanced-commission-uploader";
import { ProcessingResult } from "@/lib/enhanced-commission-processing";

function SingleOfficeExample() {
  const handleProcessingComplete = (result: ProcessingResult) => {
    console.log("Processing completed:", result.summary);
    // Handle results...
  };

  return (
    <EnhancedCommissionUploader
      onProcessingComplete={handleProcessingComplete}
    />
  );
}
```

### Multi-Office Processing with Custom Chargeback Window

```tsx
function MultiOfficeExample() {
  const [result, setResult] = useState(null);

  return (
    <div>
      {!result ? (
        <EnhancedCommissionUploader onProcessingComplete={setResult} />
      ) : (
        <EnhancedCommissionDashboard result={result} />
      )}
    </div>
  );
}
```

## Configuration Options

### Chargeback Configuration

#### Option 1: Custom Date Range

```typescript
const chargebackConfig = {
  enabled: true,
  fromDate: new Date("2024-01-01"),
  toDate: new Date("2024-03-31"),
};
```

#### Option 2: Lookback Period

```typescript
const chargebackConfig = {
  enabled: true,
  daysLookback: 45,
};
```

#### Option 3: Disabled

```typescript
const chargebackConfig = {
  enabled: false,
};
```

### Data Source Structure

```typescript
const dataSources = [
  {
    data: austinData,
    headers: austinHeaders,
    office: "austin",
  },
  {
    data: charlotteData,
    headers: charlotteHeaders,
    office: "charlotte",
  },
];
```

## Processing Logic

### 1. Data Merging

- Combines data from all uploaded sources
- Adds source office tracking to each record
- Maintains separate statistics for each source

### 2. Date Filtering

- **Placement Period**: Includes policies with Effective/Submitted dates in the commission cycle
- **Chargeback Window**: Includes policies with chargeback triggers and Agent Paid Dates within the configured window

### 3. Status Filtering

- **Pending Commissions**: Policies without Agent Paid Date and with active status
- **Chargeback Policies**: Policies marked for chargeback processing

### 4. Duplicate Resolution

Priority order for duplicates:

1. Records with payment data vs. no payment data
2. Records with more complete data (fewer missing fields)
3. Cross-office comparison for data completeness
4. Newer statement dates

### 5. Chargeback Application

- Applies chargeback triggers based on Policy/Contract Status
- Uses configurable date windows for chargeback eligibility
- Marks eligible policies with negative commission amounts

## Data Quality Features

### Validation Checks

- **Required Columns**: Ensures all necessary fields are present
- **Data Completeness**: Identifies missing critical values
- **Date Format Validation**: Checks date field formats
- **Numeric Validation**: Validates premium amounts
- **Office Validation**: Warns if uploaded data doesn't match expected office

### Quality Reporting

- Missing data percentages
- Unknown carrier identification
- Cross-office data comparison
- Processing pipeline statistics

## Best Practices

### File Preparation

1. **Consistent Headers**: Ensure both offices use the same column names
2. **Clean Data**: Remove empty rows and invalid characters
3. **Date Formats**: Use consistent date formats (MM/DD/YYYY or YYYY-MM-DD)
4. **Office Codes**: Include office codes in agent names (ACC/CCC) for automatic detection

### Chargeback Configuration

1. **Reasonable Windows**: Use 30-90 day windows for most scenarios
2. **Payment Date Alignment**: Set payment date before configuring chargeback windows
3. **Custom Ranges**: Use custom date ranges for specific policy periods
4. **Testing**: Start with shorter windows and expand as needed

### Data Processing

1. **Sequential Upload**: Upload ATX data first, then CLT for consistent processing
2. **Validation Review**: Check validation warnings before processing
3. **Result Review**: Examine data quality metrics in results
4. **Export**: Always export processed data for records

## Troubleshooting

### Common Issues

#### "File doesn't appear to contain [Office] data"

- **Cause**: Office detection based on agent names or manager fields
- **Solution**: Ensure agent names include office codes (ACC/CCC) or manager field contains office information

#### "Chargeback date range invalid"

- **Cause**: From date is later than To date
- **Solution**: Verify date selection order in chargeback controls

#### "No data after processing"

- **Cause**: Filters may be too restrictive or dates outside commission cycle
- **Solution**: Check payment date and chargeback window settings

#### "High duplicate count"

- **Cause**: Same policies appearing in both office files
- **Solution**: Normal behavior - system automatically resolves duplicates

### Performance Considerations

- **Large Files**: Files over 25,000 rows may take longer to process
- **Multiple Sources**: Processing time increases with number of offices
- **Chargeback Windows**: Longer windows require more data analysis
- **Browser Memory**: Very large datasets may require browser refresh

## Migration from Legacy System

### Key Differences

1. **File Upload**: Now requires office-specific uploaders instead of single uploader
2. **Chargeback Logic**: Enhanced with configurable windows instead of fixed 30-day period
3. **Duplicate Handling**: Improved cross-office duplicate resolution
4. **Results Display**: Comprehensive dashboard with office breakdowns

### Migration Steps

1. Replace `CommissionUploader` with `EnhancedCommissionUploader`
2. Update processing function calls to use `processEnhancedCommissionData`
3. Modify result handling to accommodate new summary structure
4. Update any custom chargeback logic to use new configuration options

## API Reference

### Types

```typescript
interface DataSource {
  data: any[][];
  headers: string[];
  office: "austin" | "charlotte";
}

interface ChargebackConfig {
  enabled: boolean;
  fromDate?: Date;
  toDate?: Date;
  daysLookback?: number;
}

interface ProcessingConfig {
  paymentDate: Date;
  chargebackConfig: ChargebackConfig;
  dataSources: DataSource[];
}

interface ProcessingResult {
  cleanedData: Policy[];
  summary: {
    totalPoliciesProcessed: number;
    totalCommissionAmount: number;
    agentsAffected: number;
    breakdownByOffice: {
      austin: { policies: number; commission: number; agents: number };
      charlotte: { policies: number; commission: number; agents: number };
    };
    breakdownBySource: {
      austin: { originalRows: number; processedRows: number };
      charlotte: { originalRows: number; processedRows: number };
      merged: { duplicatesRemoved: number; totalUnique: number };
    };
    processingStats: ProcessingStats;
    dataQuality: DataQuality;
    errors: string[];
    warnings: string[];
  };
}
```

### Functions

```typescript
function processEnhancedCommissionData(
  config: ProcessingConfig
): ProcessingResult;
```

Primary processing function that handles the complete commission processing pipeline with enhanced features.

## Support

For technical support or feature requests related to the Enhanced Commission Processing System, please refer to the development team or create an issue in the project repository.
