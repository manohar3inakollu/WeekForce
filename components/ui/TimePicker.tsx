import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerProps {
  label?: string;
  value: string | null;
  onChange: (time: string | null) => void;
}

function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToHhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const [show, setShow] = useState(false);
  const timeDate = value ? hhmmToDate(value) : new Date();
  const displayText = value ? formatDisplay(value) : 'Select time';

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      value: timeDate,
      mode: 'time',
      is24Hour: false,
      onChange: (_: any, selected?: Date) => {
        if (selected) onChange(dateToHhmm(selected));
      },
    });
  };

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={{ color: '#8888A0', fontSize: 14, fontWeight: '500' }}>{label}</Text>
      )}
      <TouchableOpacity
        onPress={Platform.OS === 'android' ? openAndroid : () => setShow(true)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: '#18181C', borderWidth: 1, borderColor: '#2A2A32',
          borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
        }}
      >
        <Text style={{ color: value ? '#E8E8F0' : '#55556A', fontSize: 14 }}>{displayText}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {value && (
            <TouchableOpacity onPress={() => onChange(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#55556A" />
            </TouchableOpacity>
          )}
          <Ionicons name="time-outline" size={18} color="#55556A" />
        </View>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <View style={{ backgroundColor: '#18181C', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { onChange(null); setShow(false); }}>
                  <Text style={{ color: '#EF4444', fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
                <Text style={{ color: '#F0F0F5', fontWeight: '700', fontSize: 16 }}>Select Time</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={{ color: '#5B5EF4', fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={timeDate}
                mode="time"
                display="spinner"
                is24Hour={false}
                onChange={(_: any, selected?: Date) => {
                  if (selected) onChange(dateToHhmm(selected));
                }}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
