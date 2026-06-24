/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Calculator, 
  Building2, 
  Users, 
  PlusCircle, 
  CheckCircle2, 
  ArrowRight, 
  Info, 
  Download,
  ShieldCheck,
  ClipboardList,
  Wifi,
  ChevronRight,
  TrendingUp,
  ExternalLink,
  RefreshCcw,
  Loader2,
  LogOut,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Vertical, 
  Package, 
  PricingTier,
  SINGLE_VENUE_ICP, 
  MULTI_VENUE_ICP, 
  NON_ICP_PRICING, 
  MDU_PRICING, 
  STAFF_WIFI_PRICING, 
  ADD_ONS 
} from './pricingData';

export default function App() {
  const auth = useAuth();
  const user = auth?.user;
  const signOut = auth?.signOut || (() => {});
  const [clientName, setClientName] = useState('');
  const [vertical, setVertical] = useState<Vertical>('Indoor/Outdoor Attractions');
  const [measureValue, setMeasureValue] = useState<number>(0);
  const [avgApsPerVenue, setAvgApsPerVenue] = useState<number>(1);
  const [apCount, setApCount] = useState<number>(0);
  const [selectedPackage, setSelectedPackage] = useState<Package>('Capture');
  const [term, setTerm] = useState<number>(3);
  const [addOns, setAddOns] = useState({
    shield: false,
    surveys: false,
  });
  const [exchangeRate, setExchangeRate] = useState<number>(19.0); // ZAR per 1 GBP
  const [hotelRooms, setHotelRooms] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Markup & Profit Margin State
  const [markupPercent, setMarkupPercent] = useState<number>(0);
  const [isMarkupVisible, setIsMarkupVisible] = useState<boolean>(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isMarkupPanelOpen, setIsMarkupPanelOpen] = useState<boolean>(false);

  const handleReset = () => {
    setClientName('');
    setVertical('Indoor/Outdoor Attractions');
    setMeasureValue(0);
    setAvgApsPerVenue(1);
    setApCount(0);
    setSelectedPackage('Capture');
    setTerm(3);
    setAddOns({
      shield: false,
      surveys: false,
    });
    setHotelRooms(0);
    setMarkupPercent(0);
    setIsMarkupVisible(true);
    setIsExportModalOpen(false);
    setIsMarkupPanelOpen(false);
  };

  const verticals: Vertical[] = [
    'Indoor/Outdoor Attractions',
    'Hospitals',
    'Airports',
    'Stadiums & Arenas',
    'Hotels',
    'Cafe/Bar/Restaurant',
    'Retail',
    'Shopping Malls',
    'Non-ICP',
    'MDU',
    'Staff WiFi'
  ];

  const measureLabel = useMemo(() => {
    if (vertical === 'Hotels') return 'Number of Hotels';
    if (vertical === 'Retail') return 'Stores';
    if (vertical === 'Cafe/Bar/Restaurant') return 'Venues';
    if (vertical === 'Shopping Malls') return 'Malls';
    if (vertical === 'MDU') return 'Access Points';
    if (vertical === 'Staff WiFi') return 'Staff Members';
    if (vertical === 'Non-ICP') return 'Access Points';
    
    let label = 'Measure';
    if (vertical in SINGLE_VENUE_ICP) label = SINGLE_VENUE_ICP[vertical][0].measure;
    
    // Pluralize common labels
    if (label === 'Visitor') return 'Visitors';
    if (label === 'Passenger') return 'Passengers';
    if (label === 'Capacity') return 'Capacity';
    if (label === 'Square Foot') return 'Square Feet';
    if (label === 'Building') return 'Buildings';
    return label;
  }, [vertical]);

  const calculation = useMemo(() => {
    let baseAnnual = 0;
    let enablement = 0;
    let success = 0;
    let shieldCost = 0;
    let surveysCost = 0;
    let isContactUs = false;

    if (selectedPackage === 'Connect') {
      return { baseAnnual: 0, enablement: 0, success: 0, shieldCost: 0, surveysCost: 0, totalAnnual: 0, tcv: 0, isContactUs: false };
    }

    // FIX A: Removed isIcpDeal function entirely.
    // Tier 1 entries now participate in normal matching via their own minVal constraints.
    // If no tier matches (including Tier 1), the deal falls to Non-ICP pricing.

    const findIcpTier = (tiers: PricingTier[], val: number, apsPerVenue?: number): PricingTier | null => {
      // Try ALL tiers in order (including Tier 1) — no longer filtering Tier 1 out
      for (const t of tiers) {
        const matchesMeasure = (t.minVal === undefined || val >= t.minVal) && 
                               (t.maxVal === undefined || val <= t.maxVal);
        let matchesAps = true;
        if (apsPerVenue !== undefined) {
          if (t.minApsPerVenue !== undefined && apsPerVenue < t.minApsPerVenue) matchesAps = false;
          if (t.maxApsPerVenue !== undefined && apsPerVenue > t.maxApsPerVenue) matchesAps = false;
        }
        if (matchesMeasure && matchesAps) return t;
      }
      // No tier matched — will fall back to Non-ICP in calling code
      return null;
    };

    const findNonIcpTier = (tiers: PricingTier[], val: number): PricingTier | null => {
      return tiers.find(t => {
        if (t.minVal !== undefined && t.maxVal !== undefined) return val >= t.minVal && val <= t.maxVal;
        if (t.minVal !== undefined) return val >= t.minVal;
        if (t.maxVal !== undefined) return val <= t.maxVal;
        return true;
      }) || tiers[0];
    };

    let tier: PricingTier | null = null;
    let isNonICP = false;
    const totalAps = vertical === 'Hotels' ? hotelRooms : (vertical in MULTI_VENUE_ICP ? (measureValue * avgApsPerVenue) : apCount);

    // FIX C: MDU must be priced in blocks of 100
    const mduEffectiveAps = vertical === 'MDU' ? Math.ceil(measureValue / 100) * 100 : measureValue;

    if (measureValue <= 0 && apCount <= 0 && hotelRooms <= 0) return null;

    if (vertical in SINGLE_VENUE_ICP) {
      tier = findIcpTier(SINGLE_VENUE_ICP[vertical], measureValue);
      if (!tier && measureValue > 0) {
        isNonICP = true;
        tier = findNonIcpTier(NON_ICP_PRICING, apCount);
      }
    } else if (vertical in MULTI_VENUE_ICP) {
      tier = findIcpTier(MULTI_VENUE_ICP[vertical], measureValue, avgApsPerVenue);
      
      if (!tier && measureValue > 0) {
        // FIX A: Deal doesn't match any ICP tier (including Tier 1) -> fall back to Non-ICP
        isNonICP = true;
        tier = findNonIcpTier(NON_ICP_PRICING, totalAps);
      }
    } else if (vertical === 'Non-ICP') {
      isNonICP = true;
      tier = findNonIcpTier(NON_ICP_PRICING, apCount);
    } else if (vertical === 'MDU') {
      tier = findNonIcpTier(MDU_PRICING, mduEffectiveAps);
    } else if (vertical === 'Staff WiFi') {
      tier = findNonIcpTier(STAFF_WIFI_PRICING, measureValue);
    }

    if (!tier) return null;

    const getAnnualPrice = (price: number | Record<number, number> | 'Contact us') => {
      if (price === 'Contact us') return 'Contact us';
      if (typeof price === 'number') return price;
      // For records (MDU/Staff WiFi term-based pricing)
      if (price[term]) return price[term];
      const terms = Object.keys(price).map(Number).sort((a, b) => b - a);
      const closest = terms.find(t => term >= t) || terms[terms.length - 1];
      return price[closest];
    };

    const annualPrice = getAnnualPrice(selectedPackage === 'Capture' ? tier.captureAnnual : tier.engageAnnual);
    const enablementPrice = selectedPackage === 'Capture' ? tier.captureEnablement : tier.engageEnablement;

    if (annualPrice === 'Contact us') {
      isContactUs = true;
    } else {
      // Base Annual Calculation
      if (isNonICP) {
        const effectiveAps = vertical in MULTI_VENUE_ICP ? (measureValue * avgApsPerVenue) : apCount;
        baseAnnual = annualPrice * effectiveAps;
      } else if (vertical === 'Hotels') {
        baseAnnual = annualPrice * hotelRooms;
      } else if (vertical in MULTI_VENUE_ICP) {
        baseAnnual = annualPrice * measureValue;
      } else if (vertical === 'MDU') {
        // FIX C: Use block-of-100 rounded AP count for MDU
        baseAnnual = annualPrice * mduEffectiveAps;
      } else if (vertical === 'Staff WiFi') {
        baseAnnual = annualPrice * measureValue;
      } else {
        // Single Venue ICP - flat annual fee
        baseAnnual = annualPrice;
      }

      // Add-ons
      if (addOns.shield) {
        const shieldPct = selectedPackage === 'Capture' ? ADD_ONS.Shield.capture : ADD_ONS.Shield.engage;
        shieldCost = baseAnnual * shieldPct;
      }
      if (addOns.surveys && selectedPackage === 'Engage') {
        surveysCost = baseAnnual * ADD_ONS.Surveys.engage;
      }

      // Enablement Calculation
      // Per PDF: "based on the overall Annual price (Sales Packs & Modules - not including Success)"
      // FIX B: Now uses percentage-based enablement for Single Venue too,
      // so add-ons (Shield, Surveys) are included in the enablement base
      const annualForEnablement = baseAnnual + shieldCost + surveysCost;
      if (typeof enablementPrice === 'number') {
        enablement = enablementPrice;
      } else if (typeof enablementPrice === 'string' && enablementPrice.endsWith('%')) {
        const pct = parseFloat(enablementPrice) / 100;
        enablement = annualForEnablement * pct;
      }

      // Success Fee - 20% of base annual, Engage only
      // Per PDF: "flat percentage fee of 20% based on the overall Annual price, 
      // only applicable for Engage customers"
      if (selectedPackage === 'Engage') {
        success = baseAnnual * 0.20;
      }
    }

    const totalAnnual = baseAnnual + success + shieldCost + surveysCost;
    const tcv = (totalAnnual * term) + enablement;

    const totalMonthly = totalAnnual / 12;
    const totalDaily = totalAnnual / 365;
    
    // Determine venue count for "per venue" metrics
    const venueCount = vertical === 'Hotels' ? (hotelRooms || 1) 
      : vertical === 'MDU' ? (mduEffectiveAps || 1)
      : ((vertical in MULTI_VENUE_ICP) ? (measureValue || 1) : 1);
    
    const perVenueAnnual = totalAnnual / venueCount;
    const perVenueMonthly = totalMonthly / venueCount;
    const perVenueDaily = totalDaily / venueCount;

    // Markup Calculations
    const markedUpBaseAnnual = baseAnnual * (1 + markupPercent / 100);
    const markedUpSuccess = success * (1 + markupPercent / 100);
    const markedUpShield = shieldCost * (1 + markupPercent / 100);
    const markedUpSurveys = surveysCost * (1 + markupPercent / 100);
    const markedUpTotalAnnual = totalAnnual * (1 + markupPercent / 100);
    const markedUpEnablement = enablement * (1 + markupPercent / 100);
    const markedUpTcv = tcv * (1 + markupPercent / 100);

    const markedUpTotalMonthly = markedUpTotalAnnual / 12;
    const markedUpTotalDaily = markedUpTotalAnnual / 365;

    const markedUpPerVenueAnnual = markedUpTotalAnnual / venueCount;
    const markedUpPerVenueMonthly = markedUpTotalMonthly / venueCount;
    const markedUpPerVenueDaily = markedUpTotalDaily / venueCount;

    const totalGpAmount = markedUpTcv - tcv;
    const gpMarginPercent = markedUpTcv > 0 ? (totalGpAmount / markedUpTcv) * 100 : 0;
    const annualGpAmount = markedUpTotalAnnual - totalAnnual;

    return {
      baseAnnual,
      enablement,
      success,
      shieldCost,
      surveysCost,
      totalAnnual,
      totalMonthly,
      totalDaily,
      perVenueAnnual,
      perVenueMonthly,
      perVenueDaily,
      venueCount,
      tcv,
      tier: isNonICP ? `${tier.tier} (Non-ICP)` : tier.tier,
      sizeTier: tier.sizeTier,
      measure: tier.measure,
      isContactUs,
      isNonICP,
      // Markup variables
      markedUpBaseAnnual,
      markedUpSuccess,
      markedUpShield,
      markedUpSurveys,
      markedUpTotalAnnual,
      markedUpEnablement,
      markedUpTcv,
      markedUpTotalMonthly,
      markedUpTotalDaily,
      markedUpPerVenueAnnual,
      markedUpPerVenueMonthly,
      markedUpPerVenueDaily,
      totalGpAmount,
      gpMarginPercent,
      annualGpAmount
    };
  }, [vertical, measureValue, avgApsPerVenue, apCount, selectedPackage, addOns, term, hotelRooms, markupPercent]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val);
  };

  const formatZar = (val: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val * exchangeRate);
  };

  const handleExportProposal = async (exportMode: 'client' | 'internal' | 'cost' = 'cost') => {
    if (!calculation) return;
    
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const p = {
        baseAnnual: exportMode === 'client' ? calculation.markedUpBaseAnnual : calculation.baseAnnual,
        success: exportMode === 'client' ? calculation.markedUpSuccess : calculation.success,
        shieldCost: exportMode === 'client' ? calculation.markedUpShield : calculation.shieldCost,
        surveysCost: exportMode === 'client' ? calculation.markedUpSurveys : calculation.surveysCost,
        totalAnnual: exportMode === 'client' ? calculation.markedUpTotalAnnual : calculation.totalAnnual,
        enablement: exportMode === 'client' ? calculation.markedUpEnablement : calculation.enablement,
        tcv: exportMode === 'client' ? calculation.markedUpTcv : calculation.tcv,
        totalMonthly: exportMode === 'client' ? calculation.markedUpTotalMonthly : calculation.totalMonthly,
        totalDaily: exportMode === 'client' ? calculation.markedUpTotalDaily : calculation.totalDaily,
        perVenueMonthly: exportMode === 'client' ? calculation.markedUpPerVenueMonthly : calculation.perVenueMonthly,
        perVenueDaily: exportMode === 'client' ? calculation.markedUpPerVenueDaily : calculation.perVenueDaily,
      };
      
      // Header Background
      doc.setFillColor(27, 32, 60); // #1B203C
      doc.rect(0, 0, pageWidth, 30, 'F'); // Reduced height from 40 to 30
      
      // Load logo image
      const loadLogo = () => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.src = '/beyond-logo.png';
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
      const logoImg = await loadLogo().catch(() => null);

      // Header Logo / Text
      if (logoImg) {
        const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight || 3.06;
        const logoHeight = 7.5; // 25% smaller logo to fit in 30px strip
        const logoWidth = logoHeight * aspectRatio;
        doc.addImage(logoImg, 'PNG', 15, 6, logoWidth, logoHeight); // Centered vertically in 30px strip
      } else {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Beyond', 15, 17);
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Preferred Purple Partner', 15, 23);
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Purple Price Proposal', pageWidth - 15, 17, { align: 'right' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 15, 23, { align: 'right' });
      
      // Client Info Section (Starting higher up at y = 42 instead of 55)
      doc.setTextColor(27, 32, 60);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(clientName || 'Client Proposal', 15, 42);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Vertical: ${vertical}`, 15, 50);
      doc.text(`Package: ${selectedPackage}`, 15, 56);
      doc.text(`Term: ${term} year${term > 1 ? 's' : ''}`, 15, 62);
      doc.text(`Exchange Rate: 1 GBP = ${exchangeRate} ZAR`, 15, 68);
      
      // Tier Badge (Starting higher at y=39 with height 12)
      doc.setFillColor(99, 33, 255, 20);
      doc.roundedRect(pageWidth - 80, 39, 65, 12, 2, 2, 'F');
      doc.setTextColor(99, 33, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${calculation.tier} - ${calculation.sizeTier}`, pageWidth - 47.5, 47, { align: 'center' });
      
      // TCV Highlight (ZAR as primary)
      if (exportMode === 'internal') {
        doc.setFillColor(248, 249, 252);
        doc.roundedRect(15, 76, pageWidth - 30, 30, 2, 2, 'F');
        
        doc.setTextColor(99, 33, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL CONTRACT VALUE (TCV) COMPARISON', 25, 84);
        
        doc.setFontSize(13);
        doc.text(`Client Price: ${formatZar(calculation.markedUpTcv)}  (${formatCurrency(calculation.markedUpTcv)})`, 25, 93);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text(`Cost Price:   ${formatZar(calculation.tcv)}  (${formatCurrency(calculation.tcv)})`, 25, 100);
      } else {
        doc.setFillColor(248, 249, 252);
        doc.roundedRect(15, 76, pageWidth - 30, 30, 2, 2, 'F');
        
        doc.setTextColor(99, 33, 255); // #6321FF
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(exportMode === 'client' ? 'TOTAL CONTRACT VALUE (CLIENT PRICE)' : 'TOTAL CONTRACT VALUE (TCV)', 25, 84);
        
        doc.setFontSize(20);
        doc.text(formatZar(p.tcv), 25, 96); // ZAR is primary (large)
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(11);
        doc.text(formatCurrency(p.tcv), pageWidth - 25, 96, { align: 'right' }); // GBP is secondary (small)
      }
      
      const summaryLabel = vertical === 'Hotels' 
        ? `${measureValue} Hotels/Venues with ${hotelRooms} Total Rooms`
        : `${calculation.isNonICP ? (vertical in MULTI_VENUE_ICP ? measureValue * avgApsPerVenue : apCount) : measureValue} ${calculation.measure}(s)`;
      
      doc.setFontSize(7.5);
      doc.text(summaryLabel, pageWidth - 25, 101, { align: 'right' });
      
      // Cost Breakdown Table
      autoTable(doc, {
        startY: 112,
        head: exportMode === 'internal'
          ? [['Item', 'Type', 'Cost Price (ZAR / GBP)', 'Client Price (ZAR / GBP)']]
          : [['Item', 'Type', 'Annual Price (ZAR)', 'Annual Price (GBP)']],
        body: exportMode === 'internal' ? [
          [`${selectedPackage} License`, 'License', 
            `${formatZar(calculation.baseAnnual)} / ${formatCurrency(calculation.baseAnnual)}`, 
            `${formatZar(calculation.markedUpBaseAnnual)} / ${formatCurrency(calculation.markedUpBaseAnnual)}`],
          ...(calculation.success > 0 ? [[
            'Success (Managed Service)', 'Service', 
            `${formatZar(calculation.success)} / ${formatCurrency(calculation.success)}`, 
            `${formatZar(calculation.markedUpSuccess)} / ${formatCurrency(calculation.markedUpSuccess)}`]] : []),
          ...(calculation.shieldCost > 0 ? [[
            'Shield Module', 'Add-on', 
            `${formatZar(calculation.shieldCost)} / ${formatCurrency(calculation.shieldCost)}`, 
            `${formatZar(calculation.markedUpShield)} / ${formatCurrency(calculation.markedUpShield)}`]] : []),
          ...(calculation.surveysCost > 0 ? [[
            'Surveys Module', 'Add-on', 
            `${formatZar(calculation.surveysCost)} / ${formatCurrency(calculation.surveysCost)}`, 
            `${formatZar(calculation.markedUpSurveys)} / ${formatCurrency(calculation.markedUpSurveys)}`]] : []),
          [{ content: 'Total Annual Recurring', colSpan: 2, styles: { fontStyle: 'bold' } }, 
           { content: `${formatZar(calculation.totalAnnual)} / ${formatCurrency(calculation.totalAnnual)}`, styles: { fontStyle: 'bold', textColor: [99, 33, 255] } },
           { content: `${formatZar(calculation.markedUpTotalAnnual)} / ${formatCurrency(calculation.markedUpTotalAnnual)}`, styles: { fontStyle: 'bold', textColor: [99, 33, 255] } }]
        ] : [
          [`${selectedPackage} License`, 'License', formatZar(p.baseAnnual), formatCurrency(p.baseAnnual)],
          ...(p.success > 0 ? [['Success (Managed Service)', 'Service', formatZar(p.success), formatCurrency(p.success)]] : []),
          ...(p.shieldCost > 0 ? [['Shield Module', 'Add-on', formatZar(p.shieldCost), formatCurrency(p.shieldCost)]] : []),
          ...(p.surveysCost > 0 ? [['Surveys Module', 'Add-on', formatZar(p.surveysCost), formatCurrency(p.surveysCost)]] : []),
          [{ content: 'Total Annual Recurring', colSpan: 2, styles: { fontStyle: 'bold' } }, 
           { content: formatZar(p.totalAnnual), styles: { fontStyle: 'bold', textColor: [99, 33, 255] } },
           { content: formatCurrency(p.totalAnnual), styles: { fontStyle: 'bold', textColor: [99, 33, 255] } }]
        ],
        theme: 'striped',
        headStyles: { fillColor: [27, 32, 60], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' }
        }
      });
      
      // One-off Enablement (directly below Cost Breakdown Table)
      const enablementY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(15, enablementY, pageWidth - 30, 14, 2, 2, 'F');
      
      doc.setTextColor(27, 32, 60);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('One-off Enablement Fee:', 25, enablementY + 9.5);
      
      const enablementText = exportMode === 'internal'
        ? `Cost: ${formatZar(calculation.enablement)} / ${formatCurrency(calculation.enablement)}   ->   Client: ${formatZar(calculation.markedUpEnablement)} / ${formatCurrency(calculation.markedUpEnablement)}`
        : `${formatZar(p.enablement)} / ${formatCurrency(p.enablement)}`;
      
      doc.text(enablementText, pageWidth - 25, enablementY + 9.5, { align: 'right' });

      // Cost Analysis Section (below One-off Enablement)
      const costAnalysisY = enablementY + 14 + 10;
      doc.setFontSize(12.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(27, 32, 60);
      doc.text('Cost Analysis', 15, costAnalysisY);
      
      autoTable(doc, {
        startY: costAnalysisY + 3,
        head: [['Analysis Level', exportMode === 'internal' ? 'Cost (ZAR / GBP)' : 'Monthly Cost', exportMode === 'internal' ? 'Client (ZAR / GBP)' : 'Daily Cost']],
        body: exportMode === 'internal' ? [
          [`Per ${calculation.measure}`, `${formatZar(calculation.perVenueMonthly)} / ${formatCurrency(calculation.perVenueMonthly)}`, `${formatZar(calculation.markedUpPerVenueMonthly)} / ${formatCurrency(calculation.markedUpPerVenueMonthly)}`],
          [`Total Deal`, `${formatZar(calculation.totalMonthly)} / ${formatCurrency(calculation.totalMonthly)}`, `${formatZar(calculation.markedUpTotalMonthly)} / ${formatCurrency(calculation.markedUpTotalMonthly)}`]
        ] : [
          [`Per ${calculation.measure}`, `${formatZar(p.perVenueMonthly)} / ${formatCurrency(p.perVenueMonthly)}`, `${formatZar(p.perVenueDaily)} / ${formatCurrency(p.perVenueDaily)}`],
          [`Total Deal (${vertical === 'Hotels' ? `${measureValue} Hotels / ${hotelRooms} Rooms` : `${calculation.venueCount} ${calculation.measure}s`})`, `${formatZar(p.totalMonthly)} / ${formatCurrency(p.totalMonthly)}`, `${formatZar(p.totalDaily)} / ${formatZar(p.totalDaily)}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [99, 33, 255], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 4 }
      });

      // Internal GP margin block
      if (exportMode === 'internal') {
        const gpY = (doc as any).lastAutoTable.finalY + 8;
        doc.setFillColor(236, 253, 245); // light green background
        doc.roundedRect(15, gpY, pageWidth - 30, 14, 2, 2, 'F');
        
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Internal GP Margin: ${calculation.gpMarginPercent.toFixed(2)}% (${markupPercent}% markup)`, 25, gpY + 9.5);
        
        const gpText = `Total GP: ${formatZar(calculation.totalGpAmount)} / ${formatCurrency(calculation.totalGpAmount)}`;
        doc.text(gpText, pageWidth - 25, gpY + 9.5, { align: 'right' });
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('Prices are list and exclude VAT. This proposal is valid for 30 days.', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });
      
      doc.save(`Purple_Proposal_${(clientName || 'Client').replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#1B203C] font-sans selection:bg-[#6321FF]/20">
      {/* Header */}
      <header className="bg-[#1B203C] text-white py-4 px-4 md:px-8 flex justify-between items-center sticky top-0 z-50 shadow-lg border-b border-white/5">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex flex-col items-stretch justify-center">
            <img 
              src="/beyond-logo.png" 
              alt="Beyond" 
              className="h-7 md:h-8 w-auto object-contain self-start" 
              referrerPolicy="no-referrer" 
            />
            <span className="text-[6px] md:text-[7px] text-[#8E9299] font-extrabold uppercase tracking-[0.16em] mt-1 block whitespace-nowrap">Preferred Purple Partner</span>
          </div>
          <div className="h-8 w-[1px] bg-white/20 hidden md:block mx-2" />
          <div className="flex flex-col">
            <h1 className="text-base md:text-lg font-black tracking-tight text-white uppercase leading-none">
              Purple
            </h1>
            <span className="text-[10px] md:text-xs font-medium text-slate-400 mt-1">
              Price Calculator 2026
            </span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex gap-4 text-sm font-medium text-[#8E9299]">
            <a href="https://1drv.ms/b/c/0516035f125d5ddd/IQCgXwfgaBQdTK_0CGMEWAo5AQWXz7QzNxDKUfELMuAPRnw" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Purple Price Book</a>
            <a href="https://support.purple.ai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Purple Support</a>
          </nav>
          <Badge variant="outline" className="text-[#6321FF] border-[#6321FF] bg-[#6321FF]/10 px-3 py-1">
            GBP/ZAR v2026.1
          </Badge>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="hidden lg:inline">{user?.email}</span>
          </div>
          <button 
            onClick={handleReset}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Reset Calculator"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={signOut}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-red-400"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Purple Branding Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-slate-100"
        >
          <img 
            src="/purple-logo.svg" 
            alt="Purple" 
            className="h-10 w-auto object-contain" 
            referrerPolicy="no-referrer" 
          />
          <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />
          <p className="text-sm text-slate-600 leading-relaxed font-medium max-w-3xl">
            <span className="font-bold text-[#6321FF]">Purple:</span> The world's leading provider of enterprise-grade WiFi solutions, trusted by major venues across the globe.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-none shadow-xl shadow-blue-900/5">
              <CardHeader className="bg-white border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#6321FF]" />
                  Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Client Name</Label>
                  <Input 
                    placeholder="Enter client name" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Industry Vertical</Label>
                  <Select value={vertical} onValueChange={(v) => { setVertical(v as Vertical); setMeasureValue(0); setApCount(0); setHotelRooms(0); setAvgApsPerVenue(1); }}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {verticals.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    {measureLabel}
                    {vertical === 'MDU' && (
                      <span className="text-[10px] text-amber-600 font-normal">(Priced in blocks of 100)</span>
                    )}
                  </Label>
                  <Input 
                    type="number" 
                    value={vertical === 'Non-ICP' ? apCount : measureValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (vertical === 'Non-ICP') {
                        setApCount(val);
                      } else {
                        setMeasureValue(val);
                      }
                    }}
                    className="border-slate-200"
                    min={0}
                  />
                  {vertical === 'MDU' && measureValue > 0 && (
                    <p className="text-[10px] text-slate-500">
                      Billed as {Math.ceil(measureValue / 100) * 100} APs (rounded up to nearest 100)
                    </p>
                  )}
                </div>

                {/* Hotel-specific: Total Rooms */}
                {vertical === 'Hotels' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 pt-2"
                  >
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      Total Rooms (across all hotels)
                    </Label>
                    <Input 
                      type="number" 
                      value={hotelRooms}
                      onChange={(e) => setHotelRooms(Number(e.target.value))}
                      className="border-slate-200"
                      min={0}
                    />
                  </motion.div>
                )}

                {/* Multi-Venue: APs per venue */}
                {vertical in MULTI_VENUE_ICP && vertical !== 'Hotels' && vertical !== 'Shopping Malls' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-2"
                  >
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        Average APs per Venue
                      </Label>
                      <Input 
                        type="number" 
                        value={avgApsPerVenue}
                        onChange={(e) => setAvgApsPerVenue(Number(e.target.value))}
                        className="border-slate-200"
                        min={1}
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-medium text-slate-500">Total Access Points:</span>
                      <span className="text-sm font-bold text-[#6321FF]">{measureValue * avgApsPerVenue}</span>
                    </div>

                    {calculation?.isNonICP && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] py-0 h-4 border-amber-200 text-amber-600 bg-amber-50">Non-ICP Fallback</Badge>
                          <span className="text-[10px] font-bold text-amber-700 uppercase">Outside ICP Criteria</span>
                        </div>
                        <p className="text-[10px] text-amber-600 leading-tight">
                          This deal does not fit the ICP tier criteria for {vertical}. Pricing has defaulted to Non-ICP (per AP) based on {measureValue * avgApsPerVenue} total APs.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">
                      Contract Term
                      {(vertical === 'MDU' || vertical === 'Staff WiFi') && (
                        <span className="text-[9px] text-slate-400 block font-normal">months range</span>
                      )}
                    </Label>
                    <Select value={term.toString()} onValueChange={(v) => setTerm(Number(v))}>
                      <SelectTrigger className="border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{(vertical === 'MDU' || vertical === 'Staff WiFi') ? '12-35 months' : '1 Year'}</SelectItem>
                        <SelectItem value="3">{(vertical === 'MDU' || vertical === 'Staff WiFi') ? '36-59 months' : '3 Years'}</SelectItem>
                        <SelectItem value="5">{(vertical === 'MDU' || vertical === 'Staff WiFi') ? '60+ months' : '5 Years'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">GBP/ZAR Rate</Label>
                    <Input 
                      type="number" 
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value))}
                      className="border-slate-200"
                      step={0.1}
                      min={1}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="border-none shadow-xl shadow-blue-900/5">
              <CardHeader className="bg-white border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#6321FF]" />
                  Plan & Add-ons
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <Tabs value={selectedPackage} onValueChange={(v) => setSelectedPackage(v as Package)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl">
                    <TabsTrigger value="Connect" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Connect</TabsTrigger>
                    <TabsTrigger value="Capture" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Capture</TabsTrigger>
                    <TabsTrigger value="Engage" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Engage</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Shield</p>
                        <p className="text-xs text-slate-500">DNS-based content filtering</p>
                      </div>
                    </div>
                    <Switch 
                      checked={addOns.shield} 
                      onCheckedChange={(v) => setAddOns(prev => ({ ...prev, shield: v }))}
                    />
                  </div>

                  <div className={`flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 ${selectedPackage !== 'Engage' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <ClipboardList className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Surveys</p>
                        <p className="text-xs text-slate-500">Tailored visitor surveys</p>
                      </div>
                    </div>
                    <Switch 
                      checked={addOns.surveys} 
                      onCheckedChange={(v) => setAddOns(prev => ({ ...prev, surveys: v }))}
                      disabled={selectedPackage !== 'Engage'}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Results */}
        <div ref={resultsRef} className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {!calculation ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50 h-full flex flex-col items-center justify-center p-6 md:p-12 text-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6">
                    <Calculator className="w-6 h-6 md:w-8 md:h-8 text-slate-300" />
                  </div>
                  <CardTitle className="text-lg md:text-xl text-slate-400">Ready to Calculate</CardTitle>
                  <CardDescription className="text-base max-w-xs mt-2">
                    Enter the client details and measurement to see the pricing breakdown.
                  </CardDescription>
                </Card>
              </motion.div>
            ) : calculation.isContactUs ? (
              <motion.div
                key="contact-us"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-2 border-dashed border-[#6321FF]/30 bg-[#6321FF]/5 h-full flex flex-col items-center justify-center p-6 md:p-12 text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-xl mb-6">
                    <Users className="w-8 h-8 md:w-10 md:h-10 text-[#6321FF]" />
                  </div>
                  <CardTitle className="text-xl md:text-2xl mb-2">Tier 1 Bespoke Pricing</CardTitle>
                  <CardDescription className="text-base max-w-md">
                    This opportunity falls into our Tier 1 category. Please contact your Partner Representative for a bespoke quote tailored to this scope.
                  </CardDescription>
                  <button className="mt-8 bg-[#6321FF] text-white px-8 py-3 rounded-full font-bold hover:bg-[#4E1AD4] transition-all shadow-lg shadow-[#6321FF]/20 flex items-center gap-2 group">
                    Contact Partner Rep
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Card>
              </motion.div>
            ) : selectedPackage === 'Connect' ? (
              <motion.div
                key="connect-info"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-2 border-dashed border-emerald-200 bg-emerald-50/50 h-full flex flex-col items-center justify-center p-6 md:p-12 text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-xl mb-6">
                    <Wifi className="w-8 h-8 md:w-10 md:h-10 text-emerald-500" />
                  </div>
                  <CardTitle className="text-xl md:text-2xl mb-2 text-emerald-700">Connect Pack</CardTitle>
                  <CardDescription className="text-base max-w-md text-emerald-600">
                    Free solution on a monthly rolling contract. Provides a professional, secure captive portal with a branded splash page. Only available for ICP markets.
                  </CardDescription>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Main Results Card */}
                <Card className="border-none shadow-xl shadow-blue-900/5 bg-white overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-[#1B203C] to-[#2d3354] text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          {clientName || 'Client'} — Pricing Summary
                        </CardTitle>
                        <CardDescription className="text-slate-300 mt-1">
                          {vertical} · {selectedPackage} · {term} Year{term > 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="border-white/30 text-white text-[10px]">
                          {calculation?.tier}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{calculation?.sizeTier}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* TCV Highlight */}
                    <div className="bg-gradient-to-r from-[#6321FF]/5 to-[#6321FF]/10 p-6 rounded-2xl border border-[#6321FF]/10 mb-6">
                      {markupPercent > 0 && isMarkupVisible ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="border-r border-[#6321FF]/25 pr-4">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-[#6321FF] mb-2">Client Price (TCV)</p>
                            <p className="text-2.5xl md:text-3.5xl font-black text-[#6321FF] leading-none">
                              {formatZar(calculation?.markedUpTcv || 0)}
                            </p>
                            <p className="text-sm font-bold text-slate-500 mt-2">
                              {formatCurrency(calculation?.markedUpTcv || 0)}
                            </p>
                          </div>
                          <div className="pl-2">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Cost Price (TCV)</p>
                            <p className="text-2.5xl md:text-3.5xl font-black text-slate-600 leading-none">
                              {formatZar(calculation?.tcv || 0)}
                            </p>
                            <p className="text-sm font-bold text-slate-400 mt-2">
                              {formatCurrency(calculation?.tcv || 0)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-[#6321FF] mb-2">Total Contract Value (TCV)</p>
                          <div className="flex items-baseline justify-between">
                            <p className="text-3xl md:text-4xl font-black text-[#6321FF]">
                              {formatZar(calculation?.tcv || 0)}
                            </p>
                            <p className="text-lg font-bold text-slate-500">
                              {formatCurrency(calculation?.tcv || 0)}
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-3 font-medium">
                        ({term} year{term > 1 ? 's' : ''} annual recurring + one-off enablement)
                      </p>
                    </div>

                    {/* Breakdown Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold">Item</TableHead>
                          <TableHead className="text-right font-bold">Annual (ZAR)</TableHead>
                          <TableHead className="text-right font-bold">Annual (GBP)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">{selectedPackage} License</TableCell>
                          <TableCell className="text-right text-slate-900 font-bold">
                            {markupPercent > 0 && isMarkupVisible ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-slate-900">{formatZar(calculation?.markedUpBaseAnnual || 0)}</span>
                                <span className="text-[10px] text-slate-400 font-normal">Cost: {formatZar(calculation?.baseAnnual || 0)}</span>
                              </div>
                            ) : (
                              formatZar(calculation?.baseAnnual || 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {markupPercent > 0 && isMarkupVisible ? (
                              <div className="flex flex-col items-end text-slate-400">
                                <span>{formatCurrency(calculation?.markedUpBaseAnnual || 0)}</span>
                                <span className="text-[9px]">Cost: {formatCurrency(calculation?.baseAnnual || 0)}</span>
                              </div>
                            ) : (
                              formatCurrency(calculation?.baseAnnual || 0)
                            )}
                          </TableCell>
                        </TableRow>
                        {(calculation?.success || 0) > 0 && (
                          <TableRow>
                            <TableCell className="font-medium">
                              Success (Managed Service)
                              <span className="text-[10px] text-slate-400 ml-1">20%</span>
                            </TableCell>
                            <TableCell className="text-right text-slate-900 font-bold">
                              {markupPercent > 0 && isMarkupVisible ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-slate-900">{formatZar(calculation?.markedUpSuccess || 0)}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Cost: {formatZar(calculation?.success || 0)}</span>
                                </div>
                              ) : (
                                formatZar(calculation?.success || 0)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-slate-500">
                              {markupPercent > 0 && isMarkupVisible ? (
                                <div className="flex flex-col items-end text-slate-400">
                                  <span>{formatCurrency(calculation?.markedUpSuccess || 0)}</span>
                                  <span className="text-[9px]">Cost: {formatCurrency(calculation?.success || 0)}</span>
                                </div>
                              ) : (
                                formatCurrency(calculation?.success || 0)
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                        {(calculation?.shieldCost || 0) > 0 && (
                          <TableRow>
                            <TableCell className="font-medium">
                              Shield Module
                              <span className="text-[10px] text-slate-400 ml-1">{selectedPackage === 'Capture' ? '33%' : '25%'}</span>
                            </TableCell>
                            <TableCell className="text-right text-slate-900 font-bold">
                              {markupPercent > 0 && isMarkupVisible ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-slate-900">{formatZar(calculation?.markedUpShield || 0)}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Cost: {formatZar(calculation?.shieldCost || 0)}</span>
                                </div>
                              ) : (
                                formatZar(calculation?.shieldCost || 0)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-slate-500">
                              {markupPercent > 0 && isMarkupVisible ? (
                                <div className="flex flex-col items-end text-slate-400">
                                  <span>{formatCurrency(calculation?.markedUpShield || 0)}</span>
                                  <span className="text-[9px]">Cost: {formatCurrency(calculation?.shieldCost || 0)}</span>
                                </div>
                              ) : (
                                formatCurrency(calculation?.shieldCost || 0)
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                        {(calculation?.surveysCost || 0) > 0 && (
                          <TableRow>
                            <TableCell className="font-medium">
                              Surveys Module
                              <span className="text-[10px] text-slate-400 ml-1">25%</span>
                            </TableCell>
                            <TableCell className="text-right text-slate-900 font-bold">
                              {markupPercent > 0 && isMarkupVisible ? (
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-slate-900">{formatZar(calculation?.markedUpSurveys || 0)}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Cost: {formatZar(calculation?.surveysCost || 0)}</span>
                                </div>
                              ) : (
                                formatZar(calculation?.surveysCost || 0)
                              )}
                            </TableCell>
                            <TableCell className="text-right text-slate-500">
                              {markupPercent > 0 && isMarkupVisible ? (
                                <div className="flex flex-col items-end text-slate-400">
                                  <span>{formatCurrency(calculation?.markedUpSurveys || 0)}</span>
                                  <span className="text-[9px]">Cost: {formatCurrency(calculation?.surveysCost || 0)}</span>
                                </div>
                              ) : (
                                formatCurrency(calculation?.surveysCost || 0)
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow className="border-t-2 border-[#6321FF]/20">
                          <TableCell className="font-bold text-[#6321FF]">Total Annual Recurring</TableCell>
                          <TableCell className="text-right font-bold text-[#6321FF] text-base">
                            {markupPercent > 0 && isMarkupVisible ? (
                              <div className="flex flex-col items-end">
                                <span>{formatZar(calculation?.markedUpTotalAnnual || 0)}</span>
                                <span className="text-[10px] text-[#6321FF]/60 font-normal">Cost: {formatZar(calculation?.totalAnnual || 0)}</span>
                              </div>
                            ) : (
                              formatZar(calculation?.totalAnnual || 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-[#6321FF]/70">
                            {markupPercent > 0 && isMarkupVisible ? (
                              <div className="flex flex-col items-end text-[#6321FF]/50">
                                <span>{formatCurrency(calculation?.markedUpTotalAnnual || 0)}</span>
                                <span className="text-[9px] font-normal">Cost: {formatCurrency(calculation?.totalAnnual || 0)}</span>
                              </div>
                            ) : (
                              formatCurrency(calculation?.totalAnnual || 0)
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {/* Enablement One-off */}
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold">One-off Enablement Fee</p>
                        <p className="text-[10px] text-slate-500">Scoping, configuration, deployment & onboarding</p>
                      </div>
                      <div className="text-right">
                        {markupPercent > 0 && isMarkupVisible ? (
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-slate-900">{formatZar(calculation?.markedUpEnablement || 0)}</span>
                            <span className="text-[10px] text-slate-500 font-normal">Cost: {formatZar(calculation?.enablement || 0)}</span>
                            <span className="text-[11px] text-slate-400 font-semibold mt-0.5">({formatCurrency(calculation?.markedUpEnablement || 0)} / Cost: {formatCurrency(calculation?.enablement || 0)})</span>
                          </div>
                        ) : (
                          <div>
                            <p className="text-lg font-black text-slate-900">{formatZar(calculation?.enablement || 0)}</p>
                            <p className="text-[10px] font-bold text-slate-400">{formatCurrency(calculation?.enablement || 0)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-3">
                    <button 
                      onClick={() => {
                        if (markupPercent > 0) {
                          setIsExportModalOpen(true);
                        } else {
                          handleExportProposal('cost');
                        }
                      }}
                      disabled={isExporting}
                      className="bg-[#6321FF] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#4E1AD4] transition-all shadow-lg shadow-[#6321FF]/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {isExporting ? 'Generating PDF...' : 'Export Proposal'}
                    </button>
                  </CardFooter>
                </Card>

                {/* Gross Profit Summary Card */}
                {markupPercent > 0 && isMarkupVisible && (
                  <Card className="border-none shadow-xl shadow-blue-900/5 bg-white overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Gross Profit (GP) & Margin Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider mb-1">Total Gross Profit (GP)</p>
                          <p className="text-2xl font-black text-emerald-700">{formatZar(calculation?.totalGpAmount || 0)}</p>
                          <p className="text-xs font-bold text-emerald-600/80 mt-1">{formatCurrency(calculation?.totalGpAmount || 0)}</p>
                        </div>
                        <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                          <p className="text-[10px] text-teal-800 uppercase font-bold tracking-wider mb-1">Profit Margin</p>
                          <p className="text-2xl font-black text-teal-700">{calculation?.gpMarginPercent.toFixed(2)}%</p>
                          <p className="text-xs text-teal-600 mt-1 font-medium">({markupPercent}% markup applied)</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-wider mb-1">Annual GP Contribution</p>
                          <p className="text-xl font-bold text-slate-700">{formatZar(calculation?.annualGpAmount || 0)} / yr</p>
                          <p className="text-xs text-slate-500 mt-1">{formatCurrency(calculation?.annualGpAmount || 0)} / yr</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cost Analysis Card */}
                <Card className="border-none shadow-xl shadow-blue-900/5 bg-white overflow-hidden">
                  <CardHeader className="border-b border-slate-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-[#6321FF]" />
                      Cost Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Per Venue Analysis */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <h4 className="text-sm font-bold text-slate-700">Per {calculation?.measure}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Monthly</p>
                            {markupPercent > 0 && isMarkupVisible ? (
                              <div className="flex flex-col">
                                <span className="text-base font-black text-slate-900">{formatZar(calculation?.markedUpPerVenueMonthly || 0)}</span>
                                <span className="text-[9px] text-slate-400 font-semibold">Cost: {formatZar(calculation?.perVenueMonthly || 0)}</span>
                                <span className="text-[9px] text-slate-500/80 font-bold mt-0.5">({formatCurrency(calculation?.markedUpPerVenueMonthly || 0)} / Cost: {formatCurrency(calculation?.perVenueMonthly || 0)})</span>
                              </div>
                            ) : (
                              <div>
                                <p className="text-lg font-black text-slate-900">{formatZar(calculation?.perVenueMonthly || 0)}</p>
                                <p className="text-[10px] font-bold text-slate-400">{formatCurrency(calculation?.perVenueMonthly || 0)}</p>
                              </div>
                            )}
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Daily</p>
                            {markupPercent > 0 && isMarkupVisible ? (
                              <div className="flex flex-col">
                                <span className="text-base font-black text-slate-900">{formatZar(calculation?.markedUpPerVenueDaily || 0)}</span>
                                <span className="text-[9px] text-slate-400 font-semibold">Cost: {formatZar(calculation?.perVenueDaily || 0)}</span>
                                <span className="text-[9px] text-slate-500/80 font-bold mt-0.5">({formatCurrency(calculation?.markedUpPerVenueDaily || 0)} / Cost: {formatCurrency(calculation?.perVenueDaily || 0)})</span>
                              </div>
                            ) : (
                              <div>
                                <p className="text-lg font-black text-slate-900">{formatZar(calculation?.perVenueDaily || 0)}</p>
                                <p className="text-[10px] font-bold text-slate-400">{formatCurrency(calculation?.perVenueDaily || 0)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Total Deal Analysis */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
                          <Users className="w-4 h-4 text-slate-400" />
                          <h4 className="text-sm font-bold text-slate-700">
                            Total Deal ({vertical === 'Hotels' ? `${measureValue} Hotels / ${hotelRooms} Rooms` : `${calculation?.venueCount} ${calculation?.measure}s`})
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-[#6321FF]/5 rounded-xl border border-[#6321FF]/10">
                            <p className="text-[10px] text-[#6321FF] uppercase font-bold tracking-wider mb-1">Monthly</p>
                            {markupPercent > 0 && isMarkupVisible ? (
                              <div className="flex flex-col">
                                <span className="text-base font-black text-[#6321FF]">{formatZar(calculation?.markedUpTotalMonthly || 0)}</span>
                                <span className="text-[9px] text-[#6321FF]/60 font-semibold">Cost: {formatZar(calculation?.totalMonthly || 0)}</span>
                                <span className="text-[9px] text-[#6321FF]/50 font-bold mt-0.5">({formatCurrency(calculation?.markedUpTotalMonthly || 0)} / Cost: {formatCurrency(calculation?.totalMonthly || 0)})</span>
                              </div>
                            ) : (
                              <div>
                                <p className="text-lg font-black text-[#6321FF]">{formatZar(calculation?.totalMonthly || 0)}</p>
                                <p className="text-[10px] font-bold text-[#6321FF]/60">{formatCurrency(calculation?.totalMonthly || 0)}</p>
                              </div>
                            )}
                          </div>
                          <div className="p-3 bg-[#6321FF]/5 rounded-xl border border-[#6321FF]/10">
                            <p className="text-[10px] text-[#6321FF] uppercase font-bold tracking-wider mb-1">Daily</p>
                            {markupPercent > 0 && isMarkupVisible ? (
                              <div className="flex flex-col">
                                <span className="text-base font-black text-[#6321FF]">{formatZar(calculation?.markedUpTotalDaily || 0)}</span>
                                <span className="text-[9px] text-[#6321FF]/60 font-semibold">Cost: {formatZar(calculation?.totalDaily || 0)}</span>
                                <span className="text-[9px] text-[#6321FF]/50 font-bold mt-0.5">({formatCurrency(calculation?.markedUpTotalDaily || 0)} / Cost: {formatCurrency(calculation?.totalDaily || 0)})</span>
                              </div>
                            ) : (
                              <div>
                                <p className="text-lg font-black text-[#6321FF]">{formatZar(calculation?.totalDaily || 0)}</p>
                                <p className="text-[10px] font-bold text-[#6321FF]/60">{formatCurrency(calculation?.totalDaily || 0)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Multi-Venue / Non-ICP Note */}
                {calculation && (vertical in MULTI_VENUE_ICP || calculation.isNonICP) && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                    <Wifi className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>{calculation.isNonICP ? 'Non-ICP' : 'Multi-Venue'} Calculation:</strong> Pricing is based on {calculation.isNonICP ? (vertical in MULTI_VENUE_ICP ? (measureValue * avgApsPerVenue) : apCount) : measureValue} {calculation.measure}(s). 
                      Annual price = {formatZar((calculation.baseAnnual || 0) / (calculation.isNonICP ? (vertical in MULTI_VENUE_ICP ? (measureValue * avgApsPerVenue || 1) : (apCount || 1)) : (measureValue || 1)))} ({formatCurrency((calculation.baseAnnual || 0) / (calculation.isNonICP ? (vertical in MULTI_VENUE_ICP ? (measureValue * avgApsPerVenue || 1) : (apCount || 1)) : (measureValue || 1)))}) per {calculation.measure} x {calculation.isNonICP ? (vertical in MULTI_VENUE_ICP ? (measureValue * avgApsPerVenue) : apCount) : measureValue}.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-white/5 py-12 px-8 bg-[#1B203C] text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6">
            <img 
              src="/purple-logo-white.svg" 
              alt="Purple" 
              className="h-8 w-auto object-contain" 
              referrerPolicy="no-referrer" 
            />
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium tracking-tight">
              <span className="text-white font-bold">Purple:</span> The world's leading provider of enterprise-grade WiFi solutions, trusted by major venues across the globe.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-slate-500">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="https://purpleportal.net" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Purple Portal</a></li>
              <li><a href="https://1drv.ms/f/c/0516035f125d5ddd/IgBLAV579mUVQITRBr3ipcBBAf68AOBOuscSHrLzBfXlfyE?e=XKIQBh" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Marketing and Sales Assets</a></li>
              <li><a href="https://support.purple.ai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Purple Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-slate-500">Contact</h4>
            <p className="text-sm text-slate-400">
              <a href="mailto:hello@beyondwifi.xyz" className="hover:text-white transition-colors">hello@beyondwifi.xyz</a>
            </p>
            <p className="text-sm text-slate-400 mt-1">
              <a href="https://www.beyondwifi.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">www.beyondwifi.xyz</a>
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          <p>&copy; 2026 Beyond. Private and Confidential.</p>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>

      {/* Floating Markup & Profit Margin settings (Detached Box) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isMarkupPanelOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-80 md:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100/80 overflow-hidden"
            >
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#6321FF]" />
                  <span className="font-bold text-slate-800">Markup & Margin Tools</span>
                </div>
                <button 
                  onClick={() => setIsMarkupPanelOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 max-w-[70%]">
                    <Label className="text-sm font-semibold text-slate-700">Add Margin Markup (%)</Label>
                    <p className="text-xs text-slate-400 leading-tight">Enter a markup rate to calculate your client-facing pricing and gross profit (GP).</p>
                  </div>
                  <div className="relative w-28">
                    <Input 
                      type="number" 
                      value={isMarkupVisible ? markupPercent : ''} 
                      placeholder={!isMarkupVisible ? '••••' : '0'}
                      disabled={!isMarkupVisible}
                      onChange={(e) => {
                        if (isMarkupVisible) {
                          setMarkupPercent(Math.max(0, Number(e.target.value)));
                        }
                      }}
                      className="border-slate-200 pr-6 text-right font-bold text-slate-800"
                      min={0}
                      max={500}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                  </div>
                </div>

                {markupPercent > 0 && (
                  <div className="flex items-center justify-between p-3 bg-[#6321FF]/5 rounded-xl border border-[#6321FF]/10 text-xs font-semibold text-[#6321FF]">
                    <span>Mask Pricing Mode (Hide from client view)</span>
                    <Switch 
                      checked={!isMarkupVisible} 
                      onCheckedChange={(checked) => {
                        setIsMarkupVisible(!checked);
                        if (checked) {
                          // Auto collapse floating panel when user turns on mask pricing
                          setIsMarkupPanelOpen(false);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating action button (FAB) */}
        {isMarkupVisible ? (
          /* Normal Purple circular button when unmasked */
          <button
            onClick={() => setIsMarkupPanelOpen(!isMarkupPanelOpen)}
            className="w-12 h-12 rounded-full bg-[#6321FF] text-white hover:bg-[#4E1AD4] shadow-lg shadow-[#6321FF]/30 flex items-center justify-center transition-all cursor-pointer relative group"
            title="Markup & Margin Settings"
          >
            <TrendingUp className="w-5 h-5" />
            {markupPercent > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full border border-white">
                +{markupPercent}%
              </span>
            )}
            <span className="absolute right-14 bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity font-medium pointer-events-none whitespace-nowrap shadow-md">
              Markup Settings
            </span>
          </button>
        ) : (
          /* Completely generic grey gear button when masked (screenshare safe) */
          <button
            onClick={() => setIsMarkupPanelOpen(!isMarkupPanelOpen)}
            className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-350 shadow-md flex items-center justify-center transition-all cursor-pointer opacity-30 hover:opacity-100 group"
            title="System Settings"
          >
            <Settings className="w-5 h-5" />
            <span className="absolute right-12 bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity font-medium pointer-events-none whitespace-nowrap shadow-md">
              System Settings
            </span>
          </button>
        )}
      </div>

      {/* Export Mode Selection Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 mx-4"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">Export Proposal PDF</h3>
            <p className="text-xs text-slate-500 mb-6">This deal includes a markup. Choose which pricing version you would like to export to the proposal document.</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setIsExportModalOpen(false);
                  handleExportProposal('client');
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#6321FF] hover:bg-[#6321FF]/5 transition-all flex items-start gap-3 group"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-[#6321FF]/10 text-[#6321FF] shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Client Proposal (Marked-up Only)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Shows marked-up prices only. Hides original costs and GP. Safe to share with client.</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  setIsExportModalOpen(false);
                  handleExportProposal('internal');
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 transition-all flex items-start gap-3 group"
              >
                <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 text-emerald-700 shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Internal Proposal (Cost vs. Client + GP)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Shows side-by-side comparison of costs, client prices, and total Gross Profit (GP).</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  setIsExportModalOpen(false);
                  handleExportProposal('cost');
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-start gap-3 group"
              >
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700 shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Standard Proposal (Cost Only)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Ignores the markup entirely. Exports only the base cost prices.</p>
                </div>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
