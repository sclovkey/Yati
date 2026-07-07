/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogEntry, InternshipInfo } from '../types';
import { Calendar, Clock, Award, CheckCircle2, TrendingUp, AlertCircle, Sparkles, LogOut, ChevronRight } from 'lucide-react';

interface DashboardProps {
  logs: LogEntry[];
  info: InternshipInfo;
  onNavigateToForm: (initialDate?: string) => void;
  onNavigateToList: () => void;
}

export default function Dashboard({ logs, info, onNavigateToForm, onNavigateToList }: DashboardProps) {
  // 1. Calculations
  const totalDays = logs.length;
  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  
  // Calculate average minutes per day
  const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;

  // Calculate completion rate
  const completedLogs = logs.filter(l => l.status === 'Selesai').length;
  const completionRate = totalDays > 0 ? Math.round((completedLogs / totalDays) * 100) : 0;

  // Check if today is logged
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = logs.find(log => log.date === todayStr);

  // Calculate Streak
  const calculateStreak = (): number => {
    if (logs.length === 0) return 0;
    
    // Sort unique log dates descending
    const logDates = Array.from(new Set(logs.map(l => l.date))).sort().reverse();
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let streak = 0;
    let checkDate = new Date(today);

    // If today has no log, check if yesterday had a log to continue the streak
    const hasToday = logDates.includes(todayStr);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const hasYesterday = logDates.includes(yesterdayStr);

    if (!hasToday && !hasYesterday) {
      return 0; // Streak is broken
    }

    if (!hasToday && hasYesterday) {
      // Start checking from yesterday
      checkDate = yesterday;
    }

    // Go backwards day by day and see if logged
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const dayOfWeek = checkDate.getDay();
      
      // Skip weekends for streak if desired, or count all days.
      // Usually, work days are Mon-Fri, so skipping weekend gap makes sense for internship
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Just go to previous day without breaking streak
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }

      if (logDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break; // Streak ends
      }

      // Safeguard to prevent infinite loop
      if (streak > 365) break;
    }

    return streak;
  };

  const streak = calculateStreak();

  // 2. Weekly minutes distribution (last 5 workdays or standard M-F this week)
  const getWeeklyDistribution = () => {
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    const currentWeekLogs = days.map((dayName, idx) => {
      // Find date of that weekday in the current week
      const d = new Date();
      const currentDay = d.getDay(); // 0 is Sun, 1 is Mon
      const distance = (idx + 1) - currentDay; // Distance to desired weekday (Mon=1, etc.)
      const targetDate = new Date(d);
      targetDate.setDate(d.getDate() + distance);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const logForDay = logs.find(l => l.date === targetDateStr);
      return {
        day: dayName,
        minutes: logForDay ? logForDay.minutes : 0,
        title: logForDay ? logForDay.title : null
      };
    });
    return currentWeekLogs;
  };

  const weeklyData = getWeeklyDistribution();
  const maxWeeklyMinutes = Math.max(...weeklyData.map(d => d.minutes), 480); // scale bar height (default 480 mins)

  return (
    <div id="dashboard-container" className="space-y-8">
      {/* Header Profile Summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1 rounded-full">
            <Sparkles className="w-3 h-3 text-gray-500" />
            <span>Dashboard Magang Mahasiswa</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
            Halo, {info.studentName || 'Mahasiswa Magang'}!
          </h1>
          <p className="text-sm text-gray-500">
            {info.position ? `${info.position} ` : ''} 
            {info.companyName ? `di ${info.companyName}` : 'Pencatatan Logbook Harian'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            id="quick-add-log-btn"
            onClick={() => onNavigateToForm()}
            className="inline-flex items-center justify-center bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer shadow-xs"
          >
            + Tambah Logbook
          </button>
          <button
            id="view-all-logs-btn"
            onClick={onNavigateToList}
            className="inline-flex items-center justify-center bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
          >
            Lihat Semua Log
          </button>
        </div>
      </div>

      {/* Grid Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Hours */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-start gap-4">
          <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Total Durasi</span>
            <span className="text-2xl font-semibold text-gray-900">{totalMinutes} <span className="text-sm font-normal text-gray-500">Menit</span></span>
            <span className="text-[10px] text-gray-400 block">Rerata {avgMinutes} menit / hari</span>
          </div>
        </div>

        {/* Stat 2: Total Active Days */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-start gap-4">
          <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Hari Tercatat</span>
            <span className="text-2xl font-semibold text-gray-900">{totalDays} <span className="text-sm font-normal text-gray-500">Hari</span></span>
            <span className="text-[10px] text-gray-400 block">Dari target periode</span>
          </div>
        </div>

        {/* Stat 3: Streak */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-start gap-4">
          <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
            <Award className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Streak Mengisi</span>
            <span className="text-2xl font-semibold text-gray-900">{streak} <span className="text-sm font-normal text-gray-500">Hari</span></span>
            <span className="text-[10px] text-gray-400 block">Berturut-turut (Senen-Jumat)</span>
          </div>
        </div>

        {/* Stat 4: Completion Rate */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-start gap-4">
          <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Penyelesaian</span>
            <span className="text-2xl font-semibold text-gray-900">{completionRate}%</span>
            <span className="text-[10px] text-gray-400 block">{completedLogs} dari {totalDays} tugas selesai</span>
          </div>
        </div>
      </div>

      {/* Main Panel Content: Today Status & Weekly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column Left: Today Action Card & Activity Categories */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today Status Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-900"></span>
              Status Hari Ini ({new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })})
            </h2>

            {todayLog ? (
              <div className="bg-gray-50 border border-gray-200/50 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Logbook Hari Ini Sudah Terisi
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base">{todayLog.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{todayLog.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Durasi: <strong>{todayLog.minutes} Menit</strong></span>
                    <span>•</span>
                    <span>Status: <strong>{todayLog.status}</strong></span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToForm(todayStr)}
                  className="text-xs font-medium text-gray-900 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  Edit Catatan
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-gray-800 text-sm">Anda Belum Mengisi Logbook Hari Ini</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Segera catat pencatatan kegiatan magang Anda untuk menjaga integritas laporan dan mempertahankan streak harian Anda!
                  </p>
                </div>
                <button
                  onClick={() => onNavigateToForm(todayStr)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Isi Logbook Sekarang
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Column Right: Weekly hours chart & Quick Guidance */}
        <div className="space-y-6">
          {/* Weekly chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-1 mb-6">
              <h2 className="text-base font-semibold text-gray-900">Grafik Durasi Kerja Minggu Ini</h2>
              <p className="text-[11px] text-gray-400">Distribusi durasi kerja harian dari Senin hingga Jumat</p>
            </div>

            {/* Minimalist Visual Bars */}
            <div className="flex items-end justify-between h-36 px-4 border-b border-gray-100 pb-2">
              {weeklyData.map((data, idx) => {
                const heightPercentage = Math.min((data.minutes / maxWeeklyMinutes) * 100, 100);
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-sm">
                      {data.minutes > 0 ? `${data.minutes} Menit: ${data.title}` : 'Belum terisi'}
                    </div>

                    <div className="w-7 bg-gray-100 rounded-t-md overflow-hidden h-28 flex items-end">
                      <div 
                        className={`w-full transition-all duration-500 rounded-t-md ${data.minutes > 0 ? 'bg-gray-900' : 'bg-gray-200'}`}
                        style={{ height: `${heightPercentage}%` }}
                      ></div>
                    </div>
                    
                    <span className="text-[10px] text-gray-400 font-medium mt-2">{data.day.substring(0, 3)}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-4 text-[11px] text-gray-400 px-2">
              <span>Total Minggu Ini: <strong>{weeklyData.reduce((sum, d) => sum + d.minutes, 0)} Menit</strong></span>
              <span>Target ideal: 2400 Menit</span>
            </div>
          </div>

          {/* Clean Guidance card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">Petunjuk Pengisian Logbook</h3>
            <ul className="text-xs text-gray-500 space-y-2.5">
              <li className="flex gap-2">
                <span className="font-mono text-gray-400 font-bold">01.</span>
                <span>Catat setiap kegiatan magang secara jujur dan berikan deskripsi yang cukup jelas.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-gray-400 font-bold">02.</span>
                <span>Masukkan durasi waktu pengerjaan dalam satuan menit agar kalkulasi durasi terekam akurat.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-gray-400 font-bold">03.</span>
                <span>Aktifkan notifikasi pengingat harian agar Anda tidak lupa mengisi di jam kepulangan kantor.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-gray-400 font-bold">04.</span>
                <span>Gunakan menu <strong>Ekspor Data</strong> di akhir minggu atau bulan untuk mencetak logbook resmi dalam format Excel atau PDF bertandatangan.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
