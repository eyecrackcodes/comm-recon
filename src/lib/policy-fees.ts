import { Policy } from "./commission-processing";

interface PolicyFeeRule {
  carrier: string;
  product_condition?: (policy: Policy) => boolean;
  fee: number;
}

const policyFeeRules: PolicyFeeRule[] = [
  {
    carrier: "Aetna",
    product_condition: (p) => p["Product"]?.startsWith("ACC"),
    fee: 42.0,
  },
  {
    carrier: "Aflac",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("final expense"),
    fee: 50.4,
  },
  {
    carrier: "AIG",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("term") &&
      parseFloat(p["Face Amount"]) >= 250000,
    fee: 64.92,
  },
  { carrier: "American Amicable", fee: 0.0 },
  { carrier: "Americo", fee: 0.0 },
  { carrier: "Ameritas", fee: 0.0 },
  {
    carrier: "ANICO",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("term"),
    fee: 62.21,
  },
  {
    carrier: "Assurity",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("term"),
    fee: 73.08,
  },
  {
    carrier: "Assurity",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("critical illness"),
    fee: 26.16,
  },
  {
    carrier: "Assurity",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("acci-flex"),
    fee: 0.0,
  },
  {
    carrier: "AXA",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("term"),
    fee: 108.0,
  },
  {
    carrier: "Banner",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("term"),
    fee: 91.8,
  },
  {
    carrier: "Combined-Chubb",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("final expense"),
    fee: 50.0,
  },
  {
    carrier: "Fidelity",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("rapid decision final expense"),
    fee: 52.2,
  },
  {
    carrier: "Fidelity",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("rapid decision life term"),
    fee: 67.8,
  },
  {
    carrier: "Fidelity",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("rapid decision senior life"),
    fee: 0.0,
  },
  {
    carrier: "Fidelity",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("accidental death"),
    fee: 57.36,
  },
  {
    carrier: "Foresters",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("medical term"),
    fee: 73.56,
  },
  {
    carrier: "Foresters",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("plan right"),
    fee: 0.0,
  },
  { carrier: "Gerber", fee: 0.0 },
  { carrier: "Great Western", fee: 0.0 },
  {
    carrier: "Guarantee Trust",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("heritage"),
    fee: 54.0,
  },
  {
    carrier: "Guarantee Trust",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("turbo term"),
    fee: 36.0,
  },
  {
    carrier: "John Hancock",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("term") &&
      parseFloat(p["Face Amount"]) >= 2000000,
    fee: 166.08,
  },
  {
    carrier: "John Hancock",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("term") &&
      parseFloat(p["Face Amount"]) < 2000000,
    fee: 98.64,
  },
  {
    carrier: "John Hancock",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("term"),
    fee: 72.6,
  },
  {
    carrier: "Lincoln Financial",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("term accel") &&
      parseFloat(p["Face Amount"]) >= 100000 &&
      parseFloat(p["Face Amount"]) <= 249999,
    fee: 84.0,
  },
  {
    carrier: "Lincoln Financial",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("term accel") &&
      parseFloat(p["Face Amount"]) >= 250000 &&
      parseFloat(p["Face Amount"]) <= 999999,
    fee: 92.88,
  },
  {
    carrier: "Lincoln Financial",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("term accel") &&
      parseFloat(p["Face Amount"]) >= 1000000 &&
      parseFloat(p["Face Amount"]) <= 2500000,
    fee: 72.24,
  },
  {
    carrier: "Lincoln Financial",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("term elements"),
    fee: 94.56,
  },
  {
    carrier: "Mutual of Omaha",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("term life answers") &&
      parseFloat(p["Face Amount"]) >= 250000,
    fee: 64.56,
  },
  {
    carrier: "North American",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("term"),
    fee: 68.64,
  },
  {
    carrier: "Penn Mutual",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("term"),
    fee: 70.0,
  },
  {
    carrier: "Phoenix",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("remembrance"),
    fee: 49.68,
  },
  { carrier: "Principal", fee: 75.0 },
  {
    carrier: "Prosperity Life",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("vista"),
    fee: 21.6,
  },
  { carrier: "Protective", fee: 66.3 },
  {
    carrier: "Prudential",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("term essential"),
    fee: 89.28,
  },
  { carrier: "Royal Neighbors", fee: 0.0 },
  {
    carrier: "Sagicor",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("term"),
    fee: 73.56,
  },
  {
    carrier: "SBLI",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("accelerated underwriting") &&
      parseFloat(p["Face Amount"]) >= 750000,
    fee: 72.0,
  },
  {
    carrier: "SBLI",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("full underwriting") &&
      parseFloat(p["Face Amount"]) > 750000,
    fee: 60.0,
  },
  {
    carrier: "SBLI FEX",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("final expense"),
    fee: 48.0,
  },
  {
    carrier: "U S Life",
    product_condition: (p) =>
      p["Product"]?.toLowerCase().includes("fully underwritten") &&
      parseFloat(p["Face Amount"]) >= 250000,
    fee: 66.48,
  },
  {
    carrier: "William Penn",
    product_condition: (p) => p["Product"]?.toLowerCase().includes("term"),
    fee: 81.6,
  },
];

export function getPolicyFee(policy: Policy): number {
  const carrier = policy["Carrier"]?.toLowerCase();
  if (!carrier) return 0;

  for (const rule of policyFeeRules) {
    if (rule.carrier.toLowerCase() === carrier) {
      if (rule.product_condition) {
        if (rule.product_condition(policy)) {
          return rule.fee;
        }
      } else {
        return rule.fee;
      }
    }
  }

  return 0; // Default fee if no match found
}
