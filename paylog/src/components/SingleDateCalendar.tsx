import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

type SingleDateCalendarProps = {
  date: string;
  onDateChange: (value: string) => void;
  title?: string;
  label?: string;
};

export default function SingleDateCalendar({
  date,
  onDateChange,
  title = '日付',
  label = '選択日',
}: SingleDateCalendarProps) {
  const markedDates = date
    ? {
        [date]: {
          selected: true,
          color: '#1f6feb',
          textColor: '#fff',
        },
      }
    : {};

  const handleDayPress = (day: DateData) => {
    onDateChange(day.dateString);
  };

  return (
    <View style={styles.wrapper}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.dateChip}>
        {label ? <Text style={styles.dateChipLabel}>{label}</Text> : null}
        <Text style={date ? styles.dateChipValue : styles.dateChipPlaceholder}>
          {date || '未選択'}
        </Text>
      </View>
      <Calendar
        current={date || undefined}
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  dateChip: {
    borderWidth: 1,
    borderColor: '#ccd5e3',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
