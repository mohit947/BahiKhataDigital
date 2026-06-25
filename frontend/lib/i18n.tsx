"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "en" | "hi";

const T = {
  en: {
    // Nav
    nav_dashboard: "Dashboard", nav_newBill: "New Bill", nav_allBills: "All Bills",
    nav_customers: "Customers", nav_inventory: "Inventory", nav_reports: "Reports",
    nav_signOut: "Sign Out", nav_billing: "Billing", nav_records: "Records", nav_main: "Main",
    // Common actions
    save: "Save", cancel: "Cancel", edit: "Edit", delete: "Delete",
    search: "Search", add: "Add", close: "Close", print: "Print",
    savePDF: "Save PDF", share: "Share", whatsapp: "WhatsApp",
    exportCSV: "Export CSV", apply: "Apply", today: "Today", thisMonth: "This Month",
    viewAll: "View all", loading: "Loading...", update: "Update", saving: "Saving…",
    // Dashboard
    dashboard: "Dashboard", welcomeBack: "Welcome back",
    totalRevenue: "Total Revenue", totalBills: "Total Bills",
    todayRevenue: "Today's Revenue", todayBills: "bills today",
    pendingAmount: "Pending", unpaidPartial: "Unpaid / partial",
    recentBills: "Recent Bills", topProducts: "Top Products",
    noBillsYet: "No bills yet", createFirstBill: "Create your first bill →",
    noDataYet: "No data yet", walkin: "Walk-in",
    // Bills list
    bills: "Bills", newBill: "New Bill", allBills: "All Bills",
    billNo: "Bill No.", customer: "Customer", date: "Date", method: "Method",
    amount: "Amount", status: "Status", allStatus: "All Status",
    searchBills: "Search bill no., customer, phone…", noBillsFound: "No bills found",
    // Bill detail
    billNumber: "Bill Number", grandTotal: "Grand Total",
    amountPaid: "Amount Paid", balanceDue: "Balance Due", totalBilled: "Total Billed",
    viewProfile: "View profile →",
    recordPayment: "Record Payment", duplicateBill: "Duplicate Bill",
    cancelBill: "Cancel Bill", cancellingBill: "Cancelling…",
    cancelConfirm: "Cancel this bill? This cannot be undone.",
    cancelledMsg: "This bill has been cancelled.",
    recreateBill: "Re-create Bill",
    paymentHistory: "Payment History", totalCollected: "Total Collected",
    invoicePreview: "Invoice Preview · Click Print to print or save as PDF",
    // Status
    paid: "Paid", pendingStatus: "Pending", partial: "Partial", cancelled: "Cancelled",
    // Bill form
    createBill: "Create Bill", duplicateBillTitle: "Duplicate Bill",
    searchProductsDesc: "Search products and generate invoice",
    editDuplicateDesc: "Edit the pre-filled details and save as a new bill",
    selectExistingCustomer: "Select Existing Customer", orFillManually: "or fill manually",
    name: "Name", phone: "Phone", address: "Address", gstin: "GSTIN",
    billItems: "Bill Items", addRow: "Add Row",
    product: "Product", unit: "Unit", qty: "Qty", rate: "Rate (₹)",
    discPct: "Disc%", gstPct: "GST%",
    subtotal: "Subtotal", discount: "Discount", gst: "GST",
    payment: "Payment", paymentMethod: "Method", paymentStatus: "Status",
    amountPaidLabel: "Amount Paid (₹)", notes: "Notes",
    creating: "Creating…", addAtLeastOne: "Add at least one item",
    // Payment modal
    total: "Total", balance: "Balance",
    fullyPaid: "This bill is fully paid!",
    paymentAmountLabel: "Payment Amount (₹)", payFullBalance: "Pay full balance",
    paymentMethodLabel: "Payment Method", noteOptional: "Note (optional)",
    recordingPayment: "Recording…", enterValidAmount: "Enter a valid amount",
    // Customers
    customers: "Customers", addCustomer: "Add Customer", editCustomer: "Edit Customer",
    searchCustomers: "Search by name, phone, email…",
    noCustomersYet: "No customers yet", addFirstCustomer: "Add your first customer →",
    contact: "Contact", since: "Since", nameRequired: "Name *",
    // Inventory
    inventory: "Inventory", addProduct: "Add Product", editProduct: "Edit Product",
    searchInventory: "Search by name, SKU, category…",
    noProductsYet: "No products yet", addFirstProduct: "Add your first product →",
    productName: "Product Name *", sku: "SKU / Code", category: "Category",
    gstRate: "GST Rate", hsnCode: "HSN Code", description: "Description", active: "Active",
    // Reports
    revenueReports: "Revenue Reports", dayByDayDesc: "Day-by-day billing and collection summary",
    dateFrom: "From", dateTo: "To",
    totalCollectedStat: "Total Collected", outstanding: "Outstanding",
    collectionByMethod: "Collection by Method", dailyCollection: "Daily Collection",
    noBillsRange: "No bills found in this date range",
  },
  hi: {
    // Nav
    nav_dashboard: "डैशबोर्ड", nav_newBill: "नया बिल", nav_allBills: "सभी बिल",
    nav_customers: "ग्राहक", nav_inventory: "भंडार", nav_reports: "रिपोर्ट",
    nav_signOut: "लॉग आउट", nav_billing: "बिलिंग", nav_records: "रिकॉर्ड", nav_main: "मुख्य",
    // Common actions
    save: "सहेजें", cancel: "रद्द करें", edit: "संपादित करें", delete: "हटाएं",
    search: "खोजें", add: "जोड़ें", close: "बंद करें", print: "प्रिंट",
    savePDF: "PDF सहेजें", share: "शेयर करें", whatsapp: "व्हाट्सएप",
    exportCSV: "CSV निर्यात", apply: "लागू करें", today: "आज", thisMonth: "इस महीने",
    viewAll: "सभी देखें", loading: "लोड हो रहा है...", update: "अपडेट करें", saving: "सहेजा जा रहा है…",
    // Dashboard
    dashboard: "डैशबोर्ड", welcomeBack: "वापस स्वागत है",
    totalRevenue: "कुल आय", totalBills: "कुल बिल",
    todayRevenue: "आज की आय", todayBills: "आज के बिल",
    pendingAmount: "बकाया", unpaidPartial: "अदत्त / आंशिक",
    recentBills: "हाल के बिल", topProducts: "शीर्ष उत्पाद",
    noBillsYet: "अभी कोई बिल नहीं", createFirstBill: "पहला बिल बनाएं →",
    noDataYet: "अभी कोई डेटा नहीं", walkin: "सामान्य ग्राहक",
    // Bills list
    bills: "बिल", newBill: "नया बिल", allBills: "सभी बिल",
    billNo: "बिल नं.", customer: "ग्राहक", date: "दिनांक", method: "तरीका",
    amount: "राशि", status: "स्थिति", allStatus: "सभी स्थिति",
    searchBills: "बिल नं., ग्राहक, फोन खोजें…", noBillsFound: "कोई बिल नहीं मिला",
    // Bill detail
    billNumber: "बिल नंबर", grandTotal: "कुल राशि",
    amountPaid: "भुगतान राशि", balanceDue: "शेष राशि", totalBilled: "कुल बिलिंग",
    viewProfile: "प्रोफाइल देखें →",
    recordPayment: "भुगतान दर्ज करें", duplicateBill: "बिल की प्रति",
    cancelBill: "बिल रद्द करें", cancellingBill: "रद्द हो रहा है…",
    cancelConfirm: "इस बिल को रद्द करें? यह पूर्ववत नहीं होगा।",
    cancelledMsg: "यह बिल रद्द कर दिया गया है।",
    recreateBill: "बिल दोबारा बनाएं",
    paymentHistory: "भुगतान इतिहास", totalCollected: "कुल वसूली",
    invoicePreview: "इनवॉइस प्रीव्यू · प्रिंट या PDF सहेजने के लिए क्लिक करें",
    // Status
    paid: "भुगतान हुआ", pendingStatus: "बकाया", partial: "आंशिक", cancelled: "रद्द",
    // Bill form
    createBill: "बिल बनाएं", duplicateBillTitle: "बिल की प्रति",
    searchProductsDesc: "उत्पाद खोजें और इनवॉइस बनाएं",
    editDuplicateDesc: "पहले से भरे विवरण संपादित करें और नया बिल सेव करें",
    selectExistingCustomer: "मौजूदा ग्राहक चुनें", orFillManually: "या मैन्युअल भरें",
    name: "नाम", phone: "फोन", address: "पता", gstin: "जीएसटीआईएन",
    billItems: "बिल आइटम", addRow: "पंक्ति जोड़ें",
    product: "उत्पाद", unit: "इकाई", qty: "मात्रा", rate: "दर (₹)",
    discPct: "छूट%", gstPct: "जीएसटी%",
    subtotal: "उप-योग", discount: "छूट", gst: "जीएसटी",
    payment: "भुगतान", paymentMethod: "तरीका", paymentStatus: "स्थिति",
    amountPaidLabel: "भुगतान राशि (₹)", notes: "नोट्स",
    creating: "बन रहा है…", addAtLeastOne: "कम से कम एक आइटम जोड़ें",
    // Payment modal
    total: "कुल", balance: "शेष",
    fullyPaid: "यह बिल पूरी तरह से भुगतान हो गया है!",
    paymentAmountLabel: "भुगतान राशि (₹)", payFullBalance: "पूरी राशि का भुगतान करें",
    paymentMethodLabel: "भुगतान तरीका", noteOptional: "नोट (वैकल्पिक)",
    recordingPayment: "दर्ज हो रहा है…", enterValidAmount: "मान्य राशि दर्ज करें",
    // Customers
    customers: "ग्राहक", addCustomer: "ग्राहक जोड़ें", editCustomer: "ग्राहक संपादित करें",
    searchCustomers: "नाम, फोन, ईमेल से खोजें…",
    noCustomersYet: "अभी कोई ग्राहक नहीं", addFirstCustomer: "पहला ग्राहक जोड़ें →",
    contact: "संपर्क", since: "कब से", nameRequired: "नाम *",
    // Inventory
    inventory: "भंडार", addProduct: "उत्पाद जोड़ें", editProduct: "उत्पाद संपादित करें",
    searchInventory: "नाम, SKU, श्रेणी से खोजें…",
    noProductsYet: "अभी कोई उत्पाद नहीं", addFirstProduct: "पहला उत्पाद जोड़ें →",
    productName: "उत्पाद नाम *", sku: "SKU / कोड", category: "श्रेणी",
    gstRate: "जीएसटी दर", hsnCode: "HSN कोड", description: "विवरण", active: "सक्रिय",
    // Reports
    revenueReports: "आय रिपोर्ट", dayByDayDesc: "दिन-दर-दिन बिलिंग और वसूली सारांश",
    dateFrom: "से", dateTo: "तक",
    totalCollectedStat: "कुल वसूली", outstanding: "बकाया",
    collectionByMethod: "तरीके अनुसार वसूली", dailyCollection: "दैनिक वसूली",
    noBillsRange: "इस तारीख सीमा में कोई बिल नहीं मिला",
  },
} as const;

export type TKey = keyof typeof T.en;

type ContextValue = { lang: Lang; setLang: (l: Lang) => void };
const LanguageContext = createContext<ContextValue>({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("vt_lang") as Lang | null;
    if (stored === "en" || stored === "hi") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("vt_lang", l);
  };

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useT() {
  const { lang, setLang } = useContext(LanguageContext);
  const t = (key: TKey): string => T[lang][key] ?? T.en[key];
  return { t, lang, setLang };
}
