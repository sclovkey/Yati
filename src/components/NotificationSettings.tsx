/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NotificationSettings as SettingsType } from '../types';
import {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  triggerTestNotification,
  playNotificationSound
} from '../utils/notification';
import { Bell, BellOff, Volume2, ShieldCheck, ShieldAlert, Shield, Info, HelpCircle, Laptop } from 'lucide-react';

interface NotificationSettingsProps {
  settings: SettingsType;
  onUpdateSettings: (settings: SettingsType) => void;
}

export default function NotificationSettings({ settings, onUpdateSettings }: NotificationSettingsProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [simulatedReminder, setSimulatedReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('17:00');

  useEffect(() => {
    setSupported(isNotificationSupported());
    setPermission(getNotificationPermissionStatus());
    setReminderTime(settings.time || '17:00');
  }, [settings]);

  const handleRequestPermission = async () => {
    const status = await requestNotificationPermission();
    setPermission(status);
    if (status === 'granted') {
      // Automatically enable settings if permission is granted
      onUpdateSettings({
        ...settings,
        enabled: true
      });
      triggerTestNotification();
    }
  };

  const handleToggleEnabled = () => {
    const nextEnabled = !settings.enabled;
    
    if (nextEnabled && permission !== 'granted') {
      handleRequestPermission();
    } else {
      onUpdateSettings({
        ...settings,
        enabled: nextEnabled
      });
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = e.target.value;
    setReminderTime(nextTime);
    onUpdateSettings({
      ...settings,
      time: nextTime
    });
  };

  const handleTestNotification = () => {
    if (permission === 'granted') {
      triggerTestNotification();
    } else {
      // Fallback: Show an in-app simulated notification & play sound
      playNotificationSound();
      setSimulatedReminder(true);
      setTimeout(() => setSimulatedReminder(false), 5000);
    }
  };

  return (
    <div id="notification-settings" className="space-y-6 max-w-2xl mx-auto">
      {/* simulated feedback popup inside app if real browser alerts are blocked */}
      {simulatedReminder && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-gray-900 border border-gray-800 text-white rounded-xl p-4 shadow-xl flex gap-3 animate-bounce">
          <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-lg">📝</div>
          <div className="space-y-1">
            <h4 className="font-bold text-xs text-white">Yati Magang (Simulasi Pengingat)</h4>
            <p className="text-[10px] text-gray-400">Notifikasi diaktifkan! Ini adalah simulasi suara chime dan pengingat harian logbook Anda.</p>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${settings.enabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {settings.enabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900">Sistem Pengingat Logbook (Push Notification)</h3>
            <p className="text-xs text-gray-500">Mengingatkan Anda secara otomatis setiap akhir hari kerja agar logbook terisi teratur.</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 space-y-6">
          {/* Section: Feature Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Aktifkan Pengingat Harian</span>
              <span className="text-[11px] text-gray-400 block max-w-md">Kirimkan notifikasi suara dan pop-up pengingat di jam kepulangan kantor Anda.</span>
            </div>
            
            <button
              id="toggle-reminder-btn"
              onClick={handleToggleEnabled}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.enabled ? 'bg-gray-950' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  settings.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Section: Settings parameters */}
          {settings.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/50 p-5 rounded-xl border border-gray-100 animate-fadeIn">
              {/* Parameter: Timepicker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Waktu Pengingat</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={handleTimeChange}
                  className="px-3.5 py-2 border border-gray-200 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
                <span className="text-[10px] text-gray-400 block">Direkomendasikan di akhir jam kerja (misal: 17:00).</span>
              </div>

              {/* Parameter: Test Action */}
              <div className="space-y-2 flex flex-col justify-end">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Uji Coba Pengingat</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                    Test Suara & Notifikasi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section: Browser Permission Status */}
          <div className="border-t border-gray-100 pt-6 space-y-4">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Status Izin Browser</h4>
            
            {!supported ? (
              <div className="flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100/50">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Browser Tidak Mendukung Push Notification</p>
                  <p className="text-red-600/80 leading-relaxed">Browser yang Anda gunakan saat ini tidak mendukung fitur desktop notification. Mohon gunakan Chrome, Firefox, atau Edge versi desktop.</p>
                </div>
              </div>
            ) : permission === 'granted' ? (
              <div className="flex items-start gap-3 bg-green-50 text-green-700 p-4 rounded-xl border border-green-100/50">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Izin Notifikasi Aktif</p>
                  <p className="text-green-600/80 leading-relaxed">Sistem sudah diberi izin untuk mengirim notifikasi push ke perangkat Anda. Pengingat harian akan beroperasi di latar belakang.</p>
                </div>
              </div>
            ) : permission === 'denied' ? (
              <div className="flex items-start gap-3 bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-100/50">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <div className="text-xs space-y-1.5">
                  <p className="font-semibold">Izin Notifikasi Diblokir</p>
                  <p className="text-amber-600/80 leading-relaxed">
                    Anda telah memblokir izin notifikasi. Untuk menerima pengingat harian, silakan buka pengaturan browser Anda dan izinkan notifikasi untuk website ini.
                  </p>
                  <button
                    onClick={handleRequestPermission}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-[10px] font-bold text-amber-800 rounded-md hover:bg-amber-100/50"
                  >
                    Minta Izin Ulang
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-gray-50 text-gray-600 p-4 rounded-xl border border-gray-100">
                <Shield className="w-5 h-5 shrink-0" />
                <div className="text-xs space-y-1.5 flex-1">
                  <p className="font-semibold text-gray-800">Menunggu Persetujuan Izin</p>
                  <p className="text-gray-500 leading-relaxed">Website memerlukan izin browser Anda untuk dapat memicu pengingat harian. Klik tombol di bawah ini untuk mengizinkan.</p>
                  <button
                    onClick={handleRequestPermission}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-950 text-white text-[10px] font-bold rounded-lg hover:bg-gray-800 cursor-pointer"
                  >
                    Beri Izin Notifikasi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Guidelines on Iframe restrictions */}
          <div className="bg-gray-50 border border-gray-200/50 rounded-xl p-4 flex gap-3 text-xs text-gray-500 leading-relaxed">
            <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-gray-700">Catatan Penting Pratinjau (Iframe Constraint)</p>
              <p>
                Karena aplikasi ini berjalan di dalam frame pratinjau AI Studio, beberapa browser mungkin memblokir permintaan izin notifikasi desktop demi keamanan.
              </p>
              <p className="font-medium text-gray-700">
                Untuk hasil terbaik, harap buka aplikasi di tab baru (klik tombol &quot;Open in New Tab&quot; di kanan atas panel preview) agar notifikasi dapat terdaftar secara optimal!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
