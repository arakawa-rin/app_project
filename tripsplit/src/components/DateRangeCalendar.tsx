import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

type CalendarMarks = Record<string, Record<string, string | boolean>>;

type DateRangeCalendarProps = {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  title?: string;
  startLabel?: string;
  endLabel?: string;
};

export default function DateRangeCalendar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  title = '日付',
  startLabel = '開始日',
  endLabel = '終了日',
}: DateRangeCalendarProps) {
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'end'>('start');

  const getDateRange = (from: string, to: string) => {
    const dates: string[] = [];
    const current = new Date(from);
    const end = new Date(to);

    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const markedDates: CalendarMarks = (() => {
    if (!startDate && !endDate) {
      return {};
    }

    if (startDate && !endDate) {
      return {
        [startDate]: {
          selected: true,
          startingDay: true,
          endingDay: true,
          color: '#1f6feb',
          textColor: '#fff',
        },
      };
    }

    if (startDate && endDate) {
      if (startDate === endDate) {
        return {
          [startDate]: {
            selected: true,
            startingDay: true,
            endingDay: true,
            color: '#1f6feb',
            textColor: '#fff',
          },
        };
      }

      const range = getDateRange(startDate, endDate);
      return range.reduce<CalendarMarks>((acc, date, index) => {
        if (index === 0) {
          acc[date] = {
            selected: true,
            startingDay: true,
            color: '#1f6feb',
            textColor: '#fff',
          };
        } else if (index === range.length - 1) {
          acc[date] = {
            selected: true,
            endingDay: true,
            color: '#1f6feb',
            textColor: '#fff',
          };
        } else {
          acc[date] = {
            selected: true,
            color: '#cfe2ff',
            textColor: '#1f4fbf',
          };
        }
        return acc;
      }, {});
    }

    return {};
  })();

  const handleDayPress = (day: DateData) => {
    if (calendarTarget === 'start') {
      onStartDateChange(day.dateString);
      if (endDate && day.dateString > endDate) {
        onEndDateChange(day.dateString);
      }
      return;
    }

    if (!startDate) {
      onStartDateChange(day.dateString);
      onEndDateChange(day.dateString);
      return;
    }

    if (day.dateString < startDate) {
      onStartDateChange(day.dateString);
      onEndDateChange(day.dateString);
      setCalendarTarget('end');
      return;
    }

    onEndDateChange(day.dateString);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.dateSummaryRow}>
        <Pressable
          style={[
            styles.dateChip,
            calendarTarget === 'start' && styles.dateChipActive,
          ]}
          onPress={() => setCalendarTarget('start')}
        >
          <Text style={styles.dateChipLabel}>{startLabel}</Text>
          <Text style={startDate ? styles.dateChipValue : styles.dateChipPlaceholder}>
            {startDate || '未選択'}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.dateChip,
            calendarTarget === 'end' && styles.dateChipActive,
          ]}
          onPress={() => setCalendarTarget('end')}
        >
          <Text style={styles.dateChipLabel}>{endLabel}</Text>
          <Text style={endDate ? styles.dateChipValue : styles.dateChipPlaceholder}>
            {endDate || '未選択'}
          </Text>
        </Pressable>
      </View>
      <Calendar
        current={startDate || undefined}
        markingType="period"
        markedDates={markedDates}
        onDayPress={handleDayPress}
        theme={{
          selectedDayBackgroundColor: '#1f6feb',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#ea580c',
          arrowColor: '#1f6feb',
          monthTextColor: '#0f172a',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
        }}
        style={styles.calendar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  dateSummaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccd5e3',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateChipActive: {
    borderColor: '#1f6feb',
    backgroundColor: '#eef4ff',
  },
  dateChipLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 2,
  },
  dateChipValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  dateChipPlaceholder: {
    fontSize: 15,
    color: '#9ca3af',
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingBottom: 6,
    overflow: 'hidden',
  },
});
