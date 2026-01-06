"use client";

import { useState, useMemo } from "react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import styles from "../[id]/worker-detail.module.scss";
import {
  DAYS_OF_WEEK,
  DAY_NAMES_SHORT,
  MONTH_NAMES,
  DayOfWeek,
} from "@/lib/constants/calendar.constants";

interface WorkerCalendarProps {
  selectedDate: Dayjs | null;
  onDateSelect: (date: Dayjs) => void;
}

export function WorkerCalendar({
  selectedDate,
  onDateSelect,
}: WorkerCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const isDateDisabled = (date: Dayjs): boolean => {
    return date.isBefore(dayjs().startOf("day"));
  };

  const isDateSelected = (date: Dayjs): boolean => {
    if (!selectedDate) return false;
    return date.isSame(selectedDate, "day");
  };

  const isDateToday = (date: Dayjs): boolean => {
    return date.isSame(dayjs(), "day");
  };

  const handleDateClick = (date: Dayjs): void => {
    if (!isDateDisabled(date)) {
      onDateSelect(date);
    }
  };

  const handlePreviousMonth = (): void => {
    setCurrentMonth((prev) => prev.subtract(1, "month"));
  };

  const handleNextMonth = (): void => {
    setCurrentMonth((prev) => prev.add(1, "month"));
  };

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

  const renderCalendarGrid = () => {
    const grid: Dayjs[] = [];
    calendarDays.forEach((day) => {
      grid.push(day);
    });
    return grid;
  };

  const gridCells = renderCalendarGrid();

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
          {MONTH_NAMES[currentMonth.month()]} {currentMonth.year()}
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
        {DAYS_OF_WEEK.map((dayIndex) => (
          <div key={dayIndex} className={styles.calendarWeekday}>
            {DAY_NAMES_SHORT[dayIndex]}
          </div>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {gridCells.map((date) => {
          const isDisabled = isDateDisabled(date);
          const isSelected = isDateSelected(date);
          const isToday = isDateToday(date);
          const dayOfWeek = date.day();
          const columnStart = dayOfWeek === 0 ? 1 : dayOfWeek + 1;

          return (
            <button
              key={date.format("YYYY-MM-DD")}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={isDisabled}
              className={`${styles.calendarDay} ${
                isSelected ? styles.calendarDaySelected : ""
              } ${isToday ? styles.calendarDayToday : ""} ${
                isDisabled ? styles.calendarDayDisabled : ""
              }`}
              style={{
                gridColumnStart: columnStart,
              }}
            >
              {date.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
