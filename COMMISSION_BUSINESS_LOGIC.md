# Commission Processing Business Logic

## 📋 **Definitions & Terms**

### **Commission Payment Date**

- **Definition**: The date when commissions are being processed for payment
- **Example**: August 8th, 2025
- **Purpose**: Reference point for the commission cycle and calculations
- **Usage**: Used to calculate default placement periods and as fallback for chargeback calculations

### **Placement Period**

- **Definition**: The date range for policies that earn **positive commissions**
- **Logic**: Only policies with `Effective Date` within this range get commission payments
- **Key Rule**: `Submitted Date` is **IGNORED** - only `Effective Date` matters
- **Status Filter**: Policies must be "Inforce" or "TERM Inforce"
- **Payment Filter**: Must NOT have `Agent Paid Date` or `Agent Chargeback Date` (new business only)

### **Chargeback Lookback Period**

- **Definition**: The date range for checking previously paid policies that went bad
- **Logic**: Policies with `Agent Paid Date` in this range are checked for chargeback triggers
- **Example**: Jun 24, 2025 to Jul 25, 2025 (31 days)
- **Key Rule**: Only applies to policies that were **previously paid** (have `Agent Paid Date`)

---

## 🔄 **Processing Logic Flow**

### **Step 1: Placement Period Filtering**

```
Include policy if:
✅ Effective Date >= Placement Start Date
✅ Effective Date <= Placement End Date
✅ Status is "Inforce" or "TERM Inforce"
✅ NO Agent Paid Date (new business)
✅ NO Agent Chargeback Date
```

### **Step 2: Chargeback Filtering**

```
Include policy if:
✅ Agent Paid Date >= Chargeback From Date
✅ Agent Paid Date <= Chargeback To Date
✅ Policy Status = "Lapsed", "FEX Terminated", "IP Return", "FEX Not Taken", or "Withdrawn"
✅ NO Agent Chargeback Date (not already charged back)
✅ Policy will be marked as negative commission (deduction)
```

---

## 🎯 **Real-World Example**

### **Scenario**:

- **Commission Payment Date**: August 8th, 2025
- **Placement Period**: July 14th - July 25th, 2025 (11 days)
- **Chargeback Period**: June 24th - July 25th, 2025 (31 days)

### **Policy Examples**:

| Policy | Effective Date | Agent Paid Date | Policy Status | Result                     | Reason                                 |
| ------ | -------------- | --------------- | ------------- | -------------------------- | -------------------------------------- |
| GTL001 | 07/18/2025     | -               | Inforce       | ✅ **Positive Commission** | Within placement period                |
| GTL002 | 08/01/2025     | -               | Inforce       | ❌ **Excluded**            | Outside placement period               |
| GTL003 | 06/15/2025     | 07/01/2025      | Lapsed        | ✅ **Chargeback**          | Paid in chargeback window + bad status |
| GTL004 | 05/10/2025     | 05/15/2025      | Lapsed        | ❌ **Excluded**            | Paid outside chargeback window         |

---

## 🛡️ **Foolproof Validation Rules**

### **Date Validation**:

- Placement period cannot be longer than 60 days
- Chargeback period cannot be longer than 365 days
- Placement start date cannot be in the future
- Chargeback end date cannot be in the future

### **Data Quality Checks**:

- Warn if > 5% of policies have missing Effective Dates
- Warn if > 10% of policies have missing Agent names
- Alert if no policies found in placement period
- Alert if chargeback rate > 25%

### **Business Logic Validation**:

- A policy cannot be both new business AND a chargeback
- Chargebacks must have Agent Paid Date
- New business must NOT have Agent Paid Date
- Policy Status must be valid enum value

---

## 📊 **UI Controls Mapping**

### **Commission Payment & Chargeback Controls**

- `Commission Payment Date` → Used for default calculations
- `Process Chargebacks` toggle → Enables/disables chargeback logic

### **Placement Period Controls**

- `Use Custom Dates` toggle → Manual vs auto-calculated placement period
- `Custom Start/End Date` → Direct placement period control

### **Chargeback Lookback Period**

- `Quick Selection` buttons (30, 45, 60, 90, 120 days) → Pre-calculated from payment date
- `Custom From/To Dates` → Manual chargeback period control
- `Analysis Period Summary` → Shows final chargeback window

---

## 🚀 **Customer Success Tips**

### **For Accurate Results**:

1. **Set placement period to match your commission cycle** (usually 2-4 weeks)
2. **Set chargeback period to company policy** (typically 30-90 days)
3. **Verify effective dates are properly formatted** in source data
4. **Check policy statuses match expected values** before processing

### **Common Mistakes to Avoid**:

- ❌ Making placement period too long (includes old policies)
- ❌ Making chargeback period too short (misses valid chargebacks)
- ❌ Confusing Effective Date with Submitted Date
- ❌ Processing data with inconsistent date formats

### **Troubleshooting**:

- **Too many policies**: Narrow placement period
- **Missing chargebacks**: Expand chargeback lookback period
- **Wrong effective dates**: Check source data formatting
- **Duplicate policies**: Verify office-specific uploads are correct
