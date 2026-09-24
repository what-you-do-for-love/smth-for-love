/**
 * Milestone helpers for the AnniversaryCard.
 *
 * A "milestone" is any celebrable anniversary derived from a start date:
 *   - day-of-month (monthly anniversary, e.g. "8 months")
 *   - day-of-week (weekly anniversary, e.g. "6 weeks")
 *   - day-count (e.g. 100, 200, 500, 1000 days)
 *   - calendar-year anniversary (already provided by BE)
 *
 * Everything is computed purely from `loveStartDate` + current date, so we
 * don't need extra API fields. Strings are kept neutral (the display layer
 * looks them up via the i18n dictionary using `countdownUnit` + `value`).
 */

export type MilestoneKind = 'years' | 'months' | 'weeks' | 'days';

export interface UpcomingMilestone {
    /** Plurality unit for the trailing countdown: "days" / "weeks" / "months" / "years" */
    countdownUnit: MilestoneKind;
    /** Days remaining until this milestone (>=0). 0 means today. */
    daysRemaining: number;
    /** Numeric value of the milestone (e.g. 8 for "8 months", 100 for "100 days"). */
    value: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
    const dayA = startOfDay(a).getTime();
    const dayB = startOfDay(b).getTime();
    return Math.round((dayA - dayB) / ONE_DAY_MS);
}

function addDays(d: Date, n: number): Date {
    const out = new Date(d);
    out.setDate(out.getDate() + n);
    return out;
}

/**
 * Returns the next N anniversaries (yearly) on the calendar.
 * E.g. loveStartDate = 2022-03-18, now = 2024-09-05 → 2025-03-18 is the next.
 */
function nextYearlyAnniversary(loveStartDate: Date, now: Date, count = 1): Date[] {
    const out: Date[] = [];
    const thisYearAnniv = new Date(
        now.getFullYear(),
        loveStartDate.getMonth(),
        loveStartDate.getDate(),
    );
    let target = thisYearAnniv >= startOfDay(now) ? thisYearAnniv : null;
    let yearOffset = target ? 0 : 1;
    while (out.length < count) {
        const d = new Date(
            now.getFullYear() + yearOffset,
            loveStartDate.getMonth(),
            loveStartDate.getDate(),
        );
        out.push(d);
        yearOffset += 1;
    }
    return out;
}

/**
 * Returns the next monthly anniversaries. A "monthly anniversary" lands on
 * the same day-of-month as loveStartDate, advancing by 1 calendar month.
 * Examples: loveStartDate = 2022-01-31 → Feb has no day 31, so we anchor to
 * Feb 28 (last day of that month) and march forward from there.
 */
function nextMonthlyAnniversaries(loveStartDate: Date, now: Date, count = 1): Date[] {
    const out: Date[] = [];
    // Total whole months elapsed between loveStartDate and now.
    let years = now.getFullYear() - loveStartDate.getFullYear();
    let months = now.getMonth() - loveStartDate.getMonth();
    if (now.getDate() < loveStartDate.getDate()) months -= 1;
    if (months < 0) {
        months += 12;
        years -= 1;
    }
    let nextIndex = years * 12 + months + 1; // first one after "now"
    while (out.length < count) {
        const baseY = Math.floor(nextIndex / 12);
        const baseM = ((nextIndex % 12) + 12) % 12;
        const year = loveStartDate.getFullYear() + baseY;
        const monthIdx = baseM;
        // Clamp the day to the last day of that month if the original day is invalid.
        const lastDayOfMonth = new Date(year, monthIdx + 1, 0).getDate();
        const day = Math.min(loveStartDate.getDate(), lastDayOfMonth);
        out.push(new Date(year, monthIdx, day));
        nextIndex += 1;
    }
    return out;
}

/**
 * Returns the next weekly anniversaries. A "weekly anniversary" lands on
 * the same weekday as loveStartDate, +7 days each step.
 */
function nextWeeklyAnniversaries(loveStartDate: Date, now: Date, count = 1): Date[] {
    const dayDiff = diffDays(now, loveStartDate); // can be negative
    let weeksElapsed = Math.ceil(dayDiff / 7);
    if (weeksElapsed < 0) weeksElapsed = 0;
    let nextIndex = weeksElapsed + 1;
    const out: Date[] = [];
    while (out.length < count) {
        out.push(addDays(loveStartDate, nextIndex * 7));
        nextIndex += 1;
    }
    return out;
}

/**
 * Returns the next "round-day" anniversaries, e.g. 100, 200, 500, 1000 days.
 */
function nextRoundDayAnniversaries(loveStartDate: Date, now: Date, count = 1): Date[] {
    const dayDiff = diffDays(now, loveStartDate);
    const rounded = [100, 200, 500, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000];
    const out: Date[] = [];
    for (const n of rounded) {
        if (n > dayDiff) {
            out.push(addDays(loveStartDate, n));
            if (out.length === count) break;
        }
    }
    // Fallback: if no round day is upcoming (we're already past 10000), compute +1000 days.
    if (out.length === 0) {
        const next = Math.ceil((dayDiff + 1) / 1000) * 1000;
        out.push(addDays(loveStartDate, next));
    }
    return out;
}

export function buildUpcomingMilestones(
    loveStartDateIso: string,
    now: Date = new Date(),
    limit = 4,
): UpcomingMilestone[] {
    const start = new Date(loveStartDateIso);
    if (isNaN(start.getTime())) return [];

    const nowDay = startOfDay(now);
    const items: UpcomingMilestone[] = [];

    // Years — only count the first upcoming one (next yearly anniversary)
    const [nextYear] = nextYearlyAnniversary(start, nowDay, 1);
    const yearValue =
        nextYear.getFullYear() - start.getFullYear() +
        (nextYear.getMonth() < start.getMonth() ||
        (nextYear.getMonth() === start.getMonth() && nextYear.getDate() < start.getDate())
            ? 1
            : 0);
    const yearsRemaining = diffDays(nextYear, nowDay);
    if (yearsRemaining >= 0) {
        items.push({
            countdownUnit: 'years',
            daysRemaining: yearsRemaining,
            value: Math.max(yearValue, 1),
        });
    }

    // Next monthly anniversary
    const [nextMonth] = nextMonthlyAnniversaries(start, nowDay, 1);
    const monthValue =
        (nextMonth.getFullYear() - start.getFullYear()) * 12 +
        (nextMonth.getMonth() - start.getMonth());
    const monthsRemaining = diffDays(nextMonth, nowDay);
    if (monthsRemaining >= 0 && monthValue > 0) {
        items.push({
            countdownUnit: 'months',
            daysRemaining: monthsRemaining,
            value: monthValue,
        });
    }

    // Next weekly anniversary (only if it's within ~60 days — otherwise skip;
    // it stops being a meaningful "near future" marker).
    const [nextWeek] = nextWeeklyAnniversaries(start, nowDay, 1);
    const weeksRemaining = diffDays(nextWeek, nowDay);
    if (weeksRemaining >= 0 && weeksRemaining <= 60) {
        const weeksValue = Math.round(diffDays(nextWeek, start) / 7);
        items.push({
            countdownUnit: 'weeks',
            daysRemaining: weeksRemaining,
            value: weeksValue,
        });
    }

    // Next round-day anniversary (only if within ~365 days)
    const [nextRound] = nextRoundDayAnniversaries(start, nowDay, 1);
    const daysRemaining = diffDays(nextRound, nowDay);
    if (daysRemaining >= 0 && daysRemaining <= 365) {
        const daysValue = diffDays(nextRound, start);
        items.push({
            countdownUnit: 'days',
            daysRemaining,
            value: daysValue,
        });
    }

    // Sort by closeness (smallest daysRemaining first), then dedupe by unit.
    items.sort((a, b) => a.daysRemaining - b.daysRemaining);
    const seen = new Set<MilestoneKind>();
    const deduped: UpcomingMilestone[] = [];
    for (const it of items) {
        if (!seen.has(it.countdownUnit)) {
            seen.add(it.countdownUnit);
            deduped.push(it);
        }
    }

    return deduped.slice(0, limit);
}
