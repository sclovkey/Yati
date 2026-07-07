/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LogEntry {
  id: string;
  date: string; // Format: YYYY-MM-DD
  title: string;
  description: string;
  minutes: number;
  status: 'Selesai' | 'Dalam Proses' | 'Tertunda';
  mentorName?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // Format: YYYY-MM-DD
  clockInTime?: string; // Format: HH:MM:SS
  clockInPhoto?: string; // base64 image data url
  clockInCoords?: { latitude: number; longitude: number };
  clockInDistance?: number; // distance in meters from office
  clockOutTime?: string; // Format: HH:MM:SS
  clockOutPhoto?: string; // base64 image data url
  clockOutCoords?: { latitude: number; longitude: number };
  clockOutDistance?: number; // distance in meters from office
  status?: 'Hadir' | 'Sakit' | 'Izin';
  notes?: string; // Alasan sakit atau izin
}

export interface OfficeLocation {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  name: string;
}

export interface NotificationSettings {
  enabled: boolean;
  time: string; // Format: HH:MM (e.g., "17:00")
  lastNotifiedDate?: string; // Format: YYYY-MM-DD
}

export interface InternshipInfo {
  studentName: string;
  institution: string;
  companyName: string;
  startDate: string;
  endDate: string;
  position: string;
  mentorName: string;
}
