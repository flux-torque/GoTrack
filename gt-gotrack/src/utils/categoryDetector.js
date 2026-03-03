/**
 * @file categoryDetector.js
 * @description Keyword-based auto-categorizer for bank statement transaction descriptions.
 * Maps common UPI/merchant name patterns found in Indian bank statements to GoTrack categories.
 * Falls back to 'other' if no keyword matches.
 */

import logger from './logger';

// ---------------------------------------------------------------------------
// Keyword → Category mapping
// Keys are uppercase substrings to match against the description (case-insensitive).
// Order matters: first match wins, so put more specific terms first.
// ---------------------------------------------------------------------------

/** @type {Array<{ keywords: string[], categoryId: string }>} */
const KEYWORD_RULES = [
  // Food & Dining
  {
    keywords: [
      'ZOMATO', 'SWIGGY', 'BLINKIT', 'DUNZO', 'ZEPTO',
      'RESTAURANT', 'CAFE', 'FOOD', 'PIZZA', 'BURGER',
      'DOMINOS', 'MCDONALDS', 'KFC', 'STARBUCKS', 'HOTEL',
      'DINING', 'BIRYANI', 'BAKERY', 'CANTEEN', 'KITCHEN',
      'GROFER', 'BIGBASKET', 'JIOMART',
    ],
    categoryId: 'food',
  },

  // Transport
  {
    keywords: [
      'UBER', 'OLA', 'RAPIDO', 'NAMMA METRO', 'METRO',
      'IRCTC', 'RAILWAY', 'FUEL', 'PETROL', 'DIESEL',
      'SHELL', 'HPCL', 'BPCL', 'IOC', 'AIRTEL',
      'INDIGO', 'SPICEJET', 'AIRINDIA', 'MAKEMYTRIP',
      'GOIBIBO', 'YATRA', 'REDBUS', 'BUS', 'CAB', 'AUTO',
      'PARKING', 'FASTTAG', 'HIGHWAY', 'TOLL',
    ],
    categoryId: 'transport',
  },

  // Shopping
  {
    keywords: [
      'AMAZON', 'FLIPKART', 'MYNTRA', 'MEESHO', 'NYKAA',
      'AJIO', 'SNAPDEAL', 'SHOPCLUES', 'RELIANCE',
      'CROMA', 'VIJAYSALES', 'IKEA', 'DECATHLON',
      'APPLE', 'SAMSUNG', 'ONEPLUS', 'SHOPIFY',
      'RETAIL', 'MART', 'STORE', 'MALL',
    ],
    categoryId: 'shopping',
  },

  // Entertainment
  {
    keywords: [
      'NETFLIX', 'HOTSTAR', 'PRIME VIDEO', 'DISNEY',
      'SPOTIFY', 'WYNK', 'GAANA', 'JIOSAVAN',
      'YOUTUBE', 'BOOKMYSHOW', 'PVR', 'INOX',
      'STEAM', 'GAMING', 'PLAYSTATION', 'XBOX',
      'ZEE5', 'SONYLIV', 'VOOT', 'ALTBALAJI',
    ],
    categoryId: 'entertainment',
  },

  // Health
  {
    keywords: [
      'PHARMACY', 'MEDPLUS', 'APOLLO', 'FORTIS',
      'MANIPAL', 'NARAYANA', 'HOSPITAL', 'CLINIC',
      'DOCTOR', 'MEDICAL', 'MEDICINE', 'PHARMA',
      'NETMEDS', 'TATA1MG', '1MG', 'PRACTO',
      'GYM', 'FITNESS', 'CULT', 'CROSSFIT',
      'DIAGNOSTIC', 'LAB', 'PATHOLOGY',
    ],
    categoryId: 'health',
  },

  // Utilities
  {
    keywords: [
      'ELECTRICITY', 'BESCOM', 'TATA POWER', 'ADANI ELECTRICITY',
      'MSEDCL', 'BSES', 'TNEB', 'WESCO', 'RELIANCE ENERGY',
      'GAS', 'MAHANAGAR GAS', 'IGL', 'MGL', 'PIPED GAS',
      'WATER', 'BWSSB', 'JIO', 'AIRTEL', 'VI ', 'VODAFONE',
      'BSNL', 'INTERNET', 'ACT ', 'HATHWAY', 'TIKONA',
      'MOBILE', 'RECHARGE', 'POSTPAID', 'DTH', 'TATA SKY',
      'DISH TV', 'SUN DIRECT', 'MUNICIPAL',
    ],
    categoryId: 'utilities',
  },

  // Rent & Housing
  {
    keywords: [
      'RENT', 'RENTAL', 'HOUSING', 'SOCIETY',
      'MAINTENANCE', 'FLAT', 'APARTMENT', 'LANDLORD',
      'NOBROKER', 'MAGICBRICKS', 'HOUSING.COM',
    ],
    categoryId: 'rent',
  },

  // Education
  {
    keywords: [
      'UDEMY', 'COURSERA', 'UNACADEMY', 'BYJUS', 'VEDANTU',
      'SCHOOL', 'COLLEGE', 'UNIVERSITY', 'TUITION',
      'BOOKS', 'EDUCATION', 'COURSE', 'TRAINING',
      'EXAM', 'NEET', 'JEE', 'UPSC',
    ],
    categoryId: 'education',
  },

  // Savings / Income (common salary/transfer keywords)
  {
    keywords: [
      'SALARY', 'NEFT CR', 'NEFT CREDIT',
      'INTEREST CREDIT', 'FD INTEREST',
      'DIVIDEND', 'BONUS',
    ],
    categoryId: 'savings',
  },
];

// ---------------------------------------------------------------------------
// Detector
// ---------------------------------------------------------------------------

/**
 * Detects a GoTrack category from a bank transaction description string.
 * Matches are case-insensitive and partial (substring).
 *
 * @param {string} description - Raw transaction remarks / narration from bank
 * @returns {string} Category id from CATEGORIES constants (falls back to 'other')
 */
export function detectCategory(description) {
  if (!description || typeof description !== 'string') return 'other';

  const upper = description.toUpperCase();

  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (upper.includes(keyword)) {
        logger.debug(`[categoryDetector] "${keyword}" → ${rule.categoryId}`);
        return rule.categoryId;
      }
    }
  }

  logger.debug(`[categoryDetector] No match for: "${description.slice(0, 40)}" → other`);
  return 'other';
}
