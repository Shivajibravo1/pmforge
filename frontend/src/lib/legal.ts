import { TOTAL_DAYS } from "./pricing";

/** Single source of truth for policy facts that appear on more than one page. */
export const LEGAL_UPDATED = "20 November 2026";
export const CONTACT_EMAIL = "contact.pmforge@gmail.com";
export const REFUND_WINDOW_DAYS = 7;
export const REFUND_COMPLETION_PERCENT = 30;
/** Lessons at or above which a refund is no longer available (30% of the program). */
export const REFUND_LESSON_THRESHOLD = Math.ceil((TOTAL_DAYS * REFUND_COMPLETION_PERCENT) / 100);
export const REFUND_RESPONSE_BUSINESS_DAYS = 5;
export const PRIVACY_RESPONSE_DAYS = 30;
