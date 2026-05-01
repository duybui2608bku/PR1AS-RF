"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Tooltip } from "antd";
import styles from "../[id]/worker-detail.module.scss";
import {
  DAYS_OF_WEEK,
  DayOfWeek,
} from "@/lib/constants/calendar.constants";
import { useI18n } from "@/lib/hooks/use-i18n";

interface WorkerCalendarProps {
  selectedDate: Dayjs | null;
  onDateSelect: (date: Dayjs) => void;
  busyDateMap?: Record<string, number>;
  monthValue?: Dayjs;
  onMonthChange?: (month: Dayjs) => void;
  disableBusyDates?: boolean;
}

export function WorkerCalendar({
  selectedDate,
  onDateSelect,
  busyDateMap = {},
  monthValue,
  onMonthChange,
  disableBusyDates = false,
}: WorkerCalendarProps) {
  const { locale, t } = useI18n();
  const [internalMonth, setInternalMonth] = useState(dayjs().startOf("month"));
  const currentMonth = monthValue ?? internalMonth;

  useEffect(() => {
    if (monthValue) {
      setInternalMonth(monthValue.startOf("month"));
    }
  }, [monthValue]);

  const isDateSelected = useCallback((date: Dayjs): boolean => {
    if (!selectedDate) return false;
    return date.isSame(selectedDate, "day");
  }, [selectedDate]);

  const isDateToday = useCallback((date: Dayjs): boolean => {
    return date.isSame(dayjs(), "day");
  }, []);

  const handleDateClick = useCallback((date: Dayjs): void => {
    onDateSelect(date);
  }, [onDateSelect]);

  const handlePreviousMonth = useCallback((): void => {
    const nextMonth = currentMonth.subtract(1, "month").startOf("month");
    setInternalMonth(nextMonth);
    if (onMonthChange) {
      onMonthChange(nextMonth);
    }
  }, [currentMonth, onMonthChange]);

  const handleNextMonth = useCallback((): void => {
    const nextMonth = currentMonth.add(1, "month").startOf("month");
    setInternalMonth(nextMonth);
    if (onMonthChange) {
      onMonthChange(nextMonth);
    }
  }, [currentMonth, onMonthChange]);

  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf("month");
    const endOfMonth = currentMonth.endOf("month");
    const daysInMonth = endOfMonth.date();
    const days: Dayjs[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(startOfMonth.date(day));
    }

    return days;
  }, [currentMonth]);

  const firstDayOfWeek = currentMonth.startOf("month").day();

  const gridCells = calendarDays;

  const weekdayNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const sunday = new Date(Date.UTC(2026, 0, 4));
    return DAYS_OF_WEEK.map((_, index) => {
      const current = new Date(sunday);
      current.setUTCDate(sunday.getUTCDate() + index);
      return formatter.format(current);
    });
  }, [locale]);

  const monthTitle = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    });
    return formatter.format(currentMonth.toDate());
  }, [currentMonth, locale]);

  const getColumnClassName = (columnStart: number): string => {
    switch (columnStart) {
      case 1:
        return styles.calendarCol1;
      case 2:
        return styles.calendarCol2;
      case 3:
        return styles.calendarCol3;
      case 4:
        return styles.calendarCol4;
      case 5:
        return styles.calendarCol5;
      case 6:
        return styles.calendarCol6;
      default:
        return styles.calendarCol7;
    }
  };

  return (
    <div className={styles.customCalendarCard}>
      <div className={styles.calendarHeader}>
        <button
          type="button"
          onClick={handlePreviousMonth}
          className={styles.calendarNavButton}
          aria-label="Previous month"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className={styles.calendarTitle}>
          {monthTitle}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className={styles.calendarNavButton}
          aria-label="Next month"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.5 5L12.5 10L7.5 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className={styles.calendarWeekdays}>
        {weekdayNames.map((dayName, index) => (
          <div key={`weekday-${index}`} className={styles.calendarWeekday}>
            {dayName}
          </div>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {gridCells.map((date) => {
          const isSelected = isDateSelected(date);
          const isToday = isDateToday(date);
          const hasBooking = (busyDateMap[date.format("YYYY-MM-DD")] ?? 0) > 0;
          const isDisabled = disableBusyDates && hasBooking;
          const dayOfWeek = date.day();
          const columnStart = dayOfWeek === 0 ? 1 : dayOfWeek + 1;

          return (
            <Tooltip
              key={date.format("YYYY-MM-DD")}
              title={
                isDisabled
                  ? t("booking.worker.schedule.busyDayTooltip")
                  : undefined
              }
            >
              <span
                className={`${styles.calendarTooltipWrap} ${getColumnClassName(
                  columnStart
                )}`}
              >
                <button
                  type="button"
                  onClick={() => handleDateClick(date)}
                  disabled={isDisabled}
                  className={`${styles.calendarDay} ${
                    isSelected ? styles.calendarDaySelected : ""
                  } ${isToday ? styles.calendarDayToday : ""} ${
                    hasBooking ? styles.calendarDayBusy : ""
                  } ${isDisabled ? styles.calendarDayDisabled : ""}`}
                >
                  {date.date()}
                </button>
              </span>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
