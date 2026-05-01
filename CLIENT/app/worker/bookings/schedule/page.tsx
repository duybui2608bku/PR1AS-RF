"use client";

import { useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { CalendarOutlined } from "@ant-design/icons";
import { Button, DatePicker, Empty, Space, Spin, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { AuthGuard } from "@/lib/components/auth-guard";
import { bookingApi } from "@/lib/api/booking.api";
import type { Booking, BookingQuery } from "@/lib/types/booking";
import { BookingStatus } from "@/lib/types/booking";
import { DATE_FORMAT_ISO } from "@/app/constants/constants";
import { BOOKING_QUERY_KEYS } from "@/app/bookings/constants/bookings-page.constants";
import styles from "./schedule-page.module.scss";

const { Title, Text } = Typography;
const REQUEST_LIMIT = 100;
const NON_BOOKED_STATUSES = new Set<BookingStatus>([
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
  BookingStatus.EXPIRED,
]);

type BookingCountByDate = Record<string, number>;

const normalizeMonth = (value: Dayjs): Dayjs => value.startOf("month");

const getWeekdayNames = (locale: string): string[] => {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const sunday = new Date(Date.UTC(2026, 0, 4));

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(sunday);
    current.setUTCDate(sunday.getUTCDate() + index);
    return formatter.format(current);
  });
};

const getBookingCountByDate = (
  bookings: Booking[],
  selectedMonth: Dayjs
): BookingCountByDate => {
  const monthStart = selectedMonth.startOf("month");
  const monthEndExclusive = monthStart.add(1, "month");
  const countByDate: BookingCountByDate = {};

  for (const booking of bookings) {
    if (NON_BOOKED_STATUSES.has(booking.status)) {
      continue;
    }

    const startTime = dayjs(booking.schedule.start_time);
    const endTime = dayjs(booking.schedule.end_time);

    if (!endTime.isAfter(monthStart) || !startTime.isBefore(monthEndExclusive)) {
      continue;
    }

    let cursor = startTime.startOf("day");
    if (cursor.isBefore(monthStart)) {
      cursor = monthStart;
    }

    while (cursor.isBefore(endTime) && cursor.isBefore(monthEndExclusive)) {
      const dateKey = cursor.format(DATE_FORMAT_ISO);
      countByDate[dateKey] = (countByDate[dateKey] ?? 0) + 1;
      cursor = cursor.add(1, "day");
    }
  }

  return countByDate;
};

const isBookingOnDate = (booking: Booking, date: Dayjs): boolean => {
  if (NON_BOOKED_STATUSES.has(booking.status)) {
    return false;
  }

  const dayStart = date.startOf("day");
  const dayEnd = dayStart.add(1, "day");
  const bookingStart = dayjs(booking.schedule.start_time);
  const bookingEnd = dayjs(booking.schedule.end_time);

  return bookingStart.isBefore(dayEnd) && bookingEnd.isAfter(dayStart);
};

function WorkerBookingScheduleContent() {
  const { t, i18n } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(() =>
    normalizeMonth(dayjs())
  );
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs().startOf("day"));

  const monthStart = selectedMonth.startOf("month");
  const monthEnd = selectedMonth.endOf("month");

  const { data: monthlyBookings = [], isLoading } = useQuery({
    queryKey: [BOOKING_QUERY_KEYS.WORKER_BOOKINGS, "schedule", monthStart.valueOf()],
    queryFn: async () => {
      const allBookings: Booking[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const query: BookingQuery = {
          role: "worker",
          page,
          limit: REQUEST_LIMIT,
          start_date: monthStart.format(DATE_FORMAT_ISO),
          end_date: monthEnd.format(DATE_FORMAT_ISO),
        };

        const response = await bookingApi.getMyBookings(query);
        allBookings.push(...response.data);
        totalPages = response.pagination.totalPages;
        page += 1;
      } while (page <= totalPages);

      return allBookings;
    },
    retry: false,
  });

  const firstDayOffset = monthStart.day();

  const calendarDays = useMemo(() => {
    const days: Dayjs[] = [];
    const daysInMonth = monthEnd.date();

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(monthStart.date(day));
    }

    return days;
  }, [monthEnd, monthStart]);

  const bookingCountByDate = useMemo(
    () => getBookingCountByDate(monthlyBookings, selectedMonth),
    [monthlyBookings, selectedMonth]
  );

  const busyDaysCount = useMemo(
    () => Object.values(bookingCountByDate).filter((count) => count > 0).length,
    [bookingCountByDate]
  );
  const totalBookings = monthlyBookings.length;
  const availableDaysCount = calendarDays.length - busyDaysCount;
  const weekdayNames = useMemo(
    () => getWeekdayNames(i18n.language),
    [i18n.language]
  );
  const todayKey = dayjs().format(DATE_FORMAT_ISO);
  const selectedDateKey = selectedDate.format(DATE_FORMAT_ISO);
  const bookingsOfSelectedDate = useMemo(
    () =>
      monthlyBookings
        .filter((booking) => isBookingOnDate(booking, selectedDate))
        .sort(
          (left, right) =>
            dayjs(left.schedule.start_time).valueOf() -
            dayjs(right.schedule.start_time).valueOf()
        ),
    [monthlyBookings, selectedDate]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Title level={2} className={styles.title}>
            <CalendarOutlined className={styles.titleIcon} />
            {t("booking.worker.schedule.title")}
          </Title>
          <Text type="secondary">{t("booking.worker.schedule.description")}</Text>
        </div>
        <Space wrap>
          <DatePicker
            picker="month"
            value={selectedMonth}
            allowClear={false}
            onChange={(value) => {
              if (value) {
                const normalizedMonth = normalizeMonth(value);
                setSelectedMonth(normalizedMonth);
                setSelectedDate(normalizedMonth);
              }
            }}
          />
          <Button
            onClick={() => {
              const todayMonth = normalizeMonth(dayjs());
              setSelectedMonth(todayMonth);
              setSelectedDate(dayjs().startOf("day"));
            }}
          >
            {t("common.today")}
          </Button>
        </Space>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <Text className={styles.summaryLabel}>
            {t("booking.worker.schedule.summary.totalDays")}
          </Text>
          <Text className={styles.summaryValue}>{calendarDays.length}</Text>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryCardBooked}`}>
          <Text className={styles.summaryLabel}>
            {t("booking.worker.schedule.summary.busyDays")}
          </Text>
          <Text className={styles.summaryValue}>{busyDaysCount}</Text>
        </div>
        <div className={styles.summaryCard}>
          <Text className={styles.summaryLabel}>
            {t("booking.worker.schedule.summary.availableDays")}
          </Text>
          <Text className={styles.summaryValue}>{availableDaysCount}</Text>
        </div>
        <div className={styles.summaryCard}>
          <Text className={styles.summaryLabel}>
            {t("booking.worker.schedule.summary.totalBookings")}
          </Text>
          <Text className={styles.summaryValue}>{totalBookings}</Text>
        </div>
      </div>

      <div className={styles.legendRow}>
        <Tag color="default">{t("booking.worker.schedule.legend.available")}</Tag>
        <Tag color="red">{t("booking.worker.schedule.legend.booked")}</Tag>
        <Tag color="processing">{t("booking.worker.schedule.legend.today")}</Tag>
      </div>

      <div className={styles.weekdayRow}>
        {weekdayNames.map((weekday) => (
          <div key={weekday} className={styles.weekdayCell}>
            {weekday}
          </div>
        ))}
      </div>

      <Spin spinning={isLoading}>
        {calendarDays.length === 0 ? (
          <Empty />
        ) : (
          <div className={styles.calendarGrid}>
            {Array.from({ length: firstDayOffset }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className={`${styles.dayCard} ${styles.emptyCard}`}
              />
            ))}
            {calendarDays.map((date) => {
              const key = date.format(DATE_FORMAT_ISO);
              const bookingCount = bookingCountByDate[key] ?? 0;
              const hasBooking = bookingCount > 0;
              const isToday = key === todayKey;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`${styles.dayCard} ${
                    hasBooking ? styles.bookedDayCard : styles.availableDayCard
                  } ${isToday ? styles.todayCard : ""} ${
                    selectedDateKey === key ? styles.selectedDayCard : ""
                  }`}
                >
                  <div className={styles.dayTop}>
                    <Text className={styles.dayNumber}>{date.date()}</Text>
                    {isToday ? (
                      <Tag className={styles.dayTag} color="processing">
                        {t("booking.worker.schedule.legend.today")}
                      </Tag>
                    ) : null}
                  </div>
                  {hasBooking ? (
                    <Text className={styles.dayMeta}>
                      {bookingCount} {t("booking.worker.schedule.dayBookingUnit")}
                    </Text>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </Spin>

      <div className={styles.selectedDaySection}>
        <Title level={4} className={styles.selectedDayTitle}>
          {t("booking.table.schedule")}: {selectedDate.format("DD/MM/YYYY")}
        </Title>
        {bookingsOfSelectedDate.length === 0 ? (
          <Empty />
        ) : (
          <div className={styles.bookingList}>
            {bookingsOfSelectedDate.map((booking) => (
              <div key={booking._id} className={styles.bookingItem}>
                <div className={styles.bookingItemTop}>
                  <Text strong>
                    {t("booking.table.serviceCode")}: {booking.service_code}
                  </Text>
                  <Tag>{t(`booking.status.${booking.status}`)}</Tag>
                </div>
                <Text type="secondary">
                  {t("booking.table.startTime")}:{" "}
                  {dayjs(booking.schedule.start_time).format("HH:mm DD/MM/YYYY")}
                </Text>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkerBookingSchedulePage() {
  return (
    <AuthGuard>
      <WorkerBookingScheduleContent />
    </AuthGuard>
  );
}
