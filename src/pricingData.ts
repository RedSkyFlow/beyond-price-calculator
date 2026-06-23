/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Vertical = 
  | 'Indoor/Outdoor Attractions' 
  | 'Hospitals' 
  | 'Airports' 
  | 'Stadiums & Arenas'
  | 'Hotels'
  | 'Cafe/Bar/Restaurant'
  | 'Retail'
  | 'Shopping Malls'
  | 'Non-ICP'
  | 'MDU'
  | 'Staff WiFi';

export type Package = 'Connect' | 'Capture' | 'Engage';

export interface PricingTier {
  tier: string;
  sizeTier: string;
  measure: string;
  minVal?: number;
  maxVal?: number;
  minApsPerVenue?: number;
  maxApsPerVenue?: number;
  captureAnnual: number | Record<number, number> | 'Contact us';
  captureEnablement: number | string; // amount or percentage
  engageAnnual: number | Record<number, number> | 'Contact us';
  engageEnablement: number | string; // amount or percentage
  successFee?: number; // percentage
}

// Single Venue ICP pricing
// Per PDF Page 6 Guidelines:
// - Capture enablement = 25% of annual charge for ALL verticals and tiers
// - Engage enablement varies: 17.5% to 22.5% depending on tier
// FIX B: Changed from hardcoded GBP values to percentages so add-ons are factored into enablement base
export const SINGLE_VENUE_ICP: Record<string, PricingTier[]> = {
  'Indoor/Outdoor Attractions': [
    { tier: 'Tier 3', sizeTier: '<200k visitors', measure: 'Visitors', maxVal: 200000, captureAnnual: 3125, captureEnablement: '25%', engageAnnual: 4750, engageEnablement: '22.5%' },
    { tier: 'Tier 2', sizeTier: '200k-1m visitors', measure: 'Visitors', minVal: 200000, maxVal: 1000000, captureAnnual: 9750, captureEnablement: '25%', engageAnnual: 14475, engageEnablement: '22.5%' },
    { tier: 'Tier 2', sizeTier: '1m-3m visitors', measure: 'Visitors', minVal: 1000000, maxVal: 3000000, captureAnnual: 14250, captureEnablement: '25%', engageAnnual: 24750, engageEnablement: '17.5%' },
    { tier: 'Tier 1', sizeTier: '>3m visitors', measure: 'Visitors', minVal: 3000000, captureAnnual: 'Contact us', captureEnablement: 'Bespoke', engageAnnual: 'Contact us', engageEnablement: 'Bespoke' },
  ],
  'Hospitals': [
    { tier: 'Tier 3', sizeTier: '<500k sq ft', measure: 'Square Foot', maxVal: 500000, captureAnnual: 9750, captureEnablement: '25%', engageAnnual: 14475, engageEnablement: '22.5%' },
    { tier: 'Tier 2', sizeTier: '500k-1.5m sq ft', measure: 'Square Foot', minVal: 500000, maxVal: 1500000, captureAnnual: 14250, captureEnablement: '25%', engageAnnual: 24750, engageEnablement: '17.5%' },
    { tier: 'Tier 1', sizeTier: '>1.5m sq ft', measure: 'Square Foot', minVal: 1500000, captureAnnual: 'Contact us', captureEnablement: 'Bespoke', engageAnnual: 'Contact us', engageEnablement: 'Bespoke' },
  ],
  'Airports': [
    { tier: 'Tier 3', sizeTier: '<1m passengers', measure: 'Passengers', maxVal: 1000000, captureAnnual: 3125, captureEnablement: '25%', engageAnnual: 4750, engageEnablement: '22.5%' },
    { tier: 'Tier 2', sizeTier: '<5m passengers', measure: 'Passengers', minVal: 1000000, maxVal: 5000000, captureAnnual: 9750, captureEnablement: '25%', engageAnnual: 14475, engageEnablement: '22.5%' },
    { tier: 'Tier 2', sizeTier: '5-10m passengers', measure: 'Passengers', minVal: 5000000, maxVal: 10000000, captureAnnual: 14250, captureEnablement: '25%', engageAnnual: 24750, engageEnablement: '17.5%' },
    { tier: 'Tier 1', sizeTier: '>10m passengers', measure: 'Passengers', minVal: 10000000, captureAnnual: 'Contact us', captureEnablement: 'Bespoke', engageAnnual: 'Contact us', engageEnablement: 'Bespoke' },
  ],
  'Stadiums & Arenas': [
    { tier: 'Tier 3', sizeTier: '<10,000 capacity', measure: 'Capacity', maxVal: 10000, captureAnnual: 3125, captureEnablement: '25%', engageAnnual: 4750, engageEnablement: '22.5%' },
    { tier: 'Tier 2', sizeTier: '<=25,000 capacity', measure: 'Capacity', minVal: 10000, maxVal: 25000, captureAnnual: 9750, captureEnablement: '25%', engageAnnual: 14475, engageEnablement: '22.5%' },
    { tier: 'Tier 2', sizeTier: '>25,000 capacity', measure: 'Capacity', minVal: 25000, captureAnnual: 14250, captureEnablement: '25%', engageAnnual: 24750, engageEnablement: '17.5%' },
    { tier: 'Tier 1', sizeTier: '>1 building', measure: 'Buildings', minVal: 1, captureAnnual: 'Contact us', captureEnablement: 'Bespoke', engageAnnual: 'Contact us', engageEnablement: 'Bespoke' },
  ],
};

export const MULTI_VENUE_ICP: Record<string, PricingTier[]> = {
  'Hotels': [
    { tier: 'Tier 3', sizeTier: 'Small', measure: 'Room', minVal: 3, maxVal: 34, captureAnnual: 8, captureEnablement: 625, engageAnnual: 12, engageEnablement: 998, successFee: 20 },
    { tier: 'Tier 2', sizeTier: 'Medium', measure: 'Room', minVal: 35, maxVal: 75, captureAnnual: 6, captureEnablement: '25%', engageAnnual: 10, engageEnablement: '17.5%', successFee: 20 },
    { tier: 'Tier 1', sizeTier: 'Large', measure: 'Room', minVal: 76, captureAnnual: 'Contact us', captureEnablement: 'Bespoke', engageAnnual: 'Contact us', engageEnablement: 'Bespoke' },
  ],
  'Cafe/Bar/Restaurant': [
    { tier: 'Tier 3', sizeTier: 'Small (1 AP ave)', measure: 'Venue', minVal: 25, maxVal: 149, minApsPerVenue: 1, maxApsPerVenue: 1, captureAnnual: 63, captureEnablement: 625, engageAnnual: 98, engageEnablement: 998, successFee: 20 },
    { tier: 'Tier 2', sizeTier: 'Medium (3-5 AP ave)', measure: 'Venue', minVal: 60, maxVal: 300, minApsPerVenue: 3, maxApsPerVenue: 5, captureAnnual: 150, captureEnablement: '25%', engageAnnual: 238, engageEnablement: '17.5%', successFee: 20 },
    { tier: 'Tier 1', sizeTier: 'Large', measure: 'Venue', minVal: 301, captureAnnual: 'Contact us', captureEnablement: 'Bespoke', engageAnnual: 'Contact us', engageEnablement: 'Bespoke' },
  ],
  'Retail': [
    { tier: 'Tier 3', sizeTier: 'Small (1-5 AP)', measure: 'Store', minVal: 10, maxVal: 200, minApsPerVenue: 1, maxApsPerVenue: 5, captureAnnual: 138, captureEnablement: 625, engageAnnual: 208, engageEnablement: 998, successFee: 20 },
    { tier: 'Tier 2', sizeTier: 'Medium (25-30 AP)', measure: 'Store', minVal: 8, maxVal: 35, minApsPerVenue: 25, maxApsPerVenue: 30, captureAnnual: 1900, captureEnablement: '25%', engageAnnual: 1745, engageEnablement: '17.5%', successFee: 20 },
    { tier: 'Tier 4', sizeTier: 'Big Box (50-75 AP)', measure: 'Store', minVal: 3, maxVal: 15, minApsPerVenue: 50, maxApsPerVenue: 75, captureAnnual: 3750, captureEnablement: '25%', engageAnnual: 4750, engageEnablement: '17.5%', successFee: 20 },
    { tier: 'Tier 5', sizeTier: 'Dept (>75 AP ave)', measure: 'Store', minVal: 2, maxVal: 10, minApsPerVenue: 76, captureAnnual: 4100, captureEnablement: '25%', engageAnnual: 6750, engageEnablement: '17.5%', successFee: 20 },
    { tier: 'Tier 1', sizeTier: 'Other (exceed above)', measure: 'Store', captureAnnual: 'Contact us', captureEnablement: 'Bespoke', engageAnnual: 'Contact us', engageEnablement: 'Bespoke' },
  ],
  'Shopping Malls': [
    { tier: 'Tier 3', sizeTier: 'Small', measure: 'Mall', minVal: 1, maxVal: 1, captureAnnual: 3125, captureEnablement: 625, engageAnnual: 4750, engageEnablement: 998, successFee: 20 },
    { tier: 'Tier 2', sizeTier: 'Medium (<100APs)', measure: 'Mall', minVal: 1, maxVal: 3, captureAnnual: 14750, captureEnablement: '25%', engageAnnual: 21250, engageEnablement: '22.5%', successFee: 20 },
    { tier: 'Tier 2', sizeTier: 'Large (>99 APs)', measure: 'Mall', minVal: 1, maxVal: 2, captureAnnual: 21250, captureEnablement: '25%', engageAnnual: 34750, engageEnablement: '17.5%', successFee: 20 },
    { tier: 'Tier 1', sizeTier: 'Other (mixed use)', measure: 'Mall', captureAnnual: 'Contact us', captureEnablement: 'Bespoke', engageAnnual: 'Contact us', engageEnablement: 'Bespoke' },
  ],
};

export const NON_ICP_PRICING: PricingTier[] = [
  { tier: 'Tier 3', sizeTier: 'Small', measure: 'AP', minVal: 5, maxVal: 100, captureAnnual: 32, captureEnablement: '25%', engageAnnual: 48, engageEnablement: '25%' },
  { tier: 'Tier 2', sizeTier: 'Medium', measure: 'AP', minVal: 101, maxVal: 500, captureAnnual: 30, captureEnablement: '25%', engageAnnual: 45, engageEnablement: '25%' },
  { tier: 'Tier 1', sizeTier: 'Large', measure: 'AP', minVal: 501, captureAnnual: 'Contact us', captureEnablement: 'Bespoke', engageAnnual: 'Contact us', engageEnablement: 'Bespoke' },
];

export const MDU_PRICING: PricingTier[] = [
  { tier: 'Tier 3', sizeTier: '1 to 1,500 APs', measure: 'AP', minVal: 1, maxVal: 1500, captureAnnual: { 1: 7.80, 3: 7.02, 5: 6.60 }, captureEnablement: '10%', engageAnnual: { 1: 7.80, 3: 7.02, 5: 6.60 }, engageEnablement: '10%' },
  { tier: 'Tier 2', sizeTier: '1,501 to 3,000 APs', measure: 'AP', minVal: 1501, maxVal: 3000, captureAnnual: { 1: 6.60, 3: 5.94, 5: 5.58 }, captureEnablement: '10%', engageAnnual: { 1: 6.60, 3: 5.94, 5: 5.58 }, engageEnablement: '10%' },
  { tier: 'Tier 1', sizeTier: '3,001 and above', measure: 'AP', minVal: 3001, captureAnnual: { 1: 5.58, 3: 4.98, 5: 4.74 }, captureEnablement: '10%', engageAnnual: { 1: 5.58, 3: 4.98, 5: 4.74 }, engageEnablement: '10%' },
];

export const STAFF_WIFI_PRICING: PricingTier[] = [
  { tier: 'Tier 3', sizeTier: '25 to 200 staff', measure: 'Staff', minVal: 25, maxVal: 200, captureAnnual: { 1: 11.11, 3: 10.00, 5: 9.40 }, captureEnablement: '10%', engageAnnual: { 1: 11.11, 3: 10.00, 5: 9.40 }, engageEnablement: '10%' },
  { tier: 'Tier 2', sizeTier: '201 to 1,000 staff', measure: 'Staff', minVal: 201, maxVal: 1000, captureAnnual: { 1: 8.33, 3: 7.50, 5: 7.05 }, captureEnablement: '10%', engageAnnual: { 1: 8.33, 3: 7.50, 5: 7.05 }, engageEnablement: '10%' },
  { tier: 'Tier 1', sizeTier: '1,001 and above', measure: 'Staff', minVal: 1001, captureAnnual: { 1: 6.72, 3: 6.00, 5: 5.71 }, captureEnablement: '10%', engageAnnual: { 1: 6.72, 3: 6.00, 5: 5.71 }, engageEnablement: '10%' },
];

export const ADD_ONS = {
  Shield: { capture: 0.33, engage: 0.25 },
  Surveys: { capture: 0, engage: 0.25 },
};
