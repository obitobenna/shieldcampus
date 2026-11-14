import type { VendorCategory } from "@/lib/database.types";

// Shared by server and client.
export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  food: "Food",
  printing: "Printing & photocopy",
  data: "Data & airtime",
  barber: "Barber & salon",
  fashion: "Fashion & tailoring",
  stationery: "Stationery",
  transport: "Transport",
  other: "Other",
};
