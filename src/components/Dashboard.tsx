/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogEntry, InternshipInfo, AttendanceRecord } from '../types';
import { Calendar, Clock, Award, CheckCircle2, TrendingUp, AlertCircle, Sparkles, LogOut, ChevronRight, UserCheck } from 'lucide-react';

interface DashboardProps {
  logs: LogEntry[];
  info: InternshipInfo;
  attendanceLogs?: AttendanceRecord[];
  onNavigateToForm: (initialDate?: string) => void;
  onNavigateToList: () => void;
}

export default function Dashboard({ logs, info, attendanceLogs = [], onNavigateToForm, onNavigateToList }: DashboardProps) {
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

  // Calculate attendance total
  const totalAttendance = attendanceLogs.length;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Total Hours */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-200 cursor-default">
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
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-200 cursor-default">
          <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Hari Tercatat</span>
            <span className="text-2xl font-semibold text-gray-900">{totalDays} <span className="text-sm font-normal text-gray-500">Hari</span></span>
            <span className="text-[10px] text-gray-400 block">Dari target periode</span>
          </div>
        </div>

        {/* Stat 3: Kehadiran */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-200 cursor-default">
          <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Kehadiran</span>
            <span className="text-2xl font-semibold text-gray-900">{totalAttendance} <span className="text-sm font-normal text-gray-500">Hari</span></span>
            <span className="text-[10px] text-gray-400 block">Sejak awal periode magang</span>
          </div>
        </div>

        {/* Stat 4: Completion Rate */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-200 cursor-default">
          <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Penyelesaian</span>
            <span className="text-2xl font-semibold text-gray-900 block">{completionRate}%</span>
            {/* Thin progressive progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-gray-900 rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-gray-400 block pt-0.5">{completedLogs} dari {totalDays} tugas selesai</span>
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
              <div className="bg-gray-50 border border-gray-200/50 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-300 transition-colors duration-200">
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
                  className="text-xs font-medium text-gray-900 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap cursor-pointer transition-all"
                >
                  Edit Catatan
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-50 to-white border border-dashed border-gray-300/80 rounded-2xl p-8 text-center space-y-4 hover:border-gray-400 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-gray-400 border border-gray-100 shadow-xs">
                  <Calendar className="w-7 h-7 text-gray-400" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="font-semibold text-gray-800 text-sm">Belum Ada Catatan Hari Ini</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Yuk, catat aktivitas magangmu hari ini! Pengisian teratur membantu memantau progres harian dan mempermudah ekspor laporan di akhir periode.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateToForm(todayStr)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Mulai Isi Logbook Sekarang
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Column Right: Weekly hours chart & Quick Guidance */}
        <div className="space-y-6">
          {/* Weekly chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-300">
            <div className="space-y-1 mb-6">
              <h2 className="text-base font-semibold text-gray-900">Grafik Durasi Kerja Minggu Ini</h2>
              <p className="text-[11px] text-gray-400">Distribusi durasi kerja harian dari Senin hingga Jumat</p>
            </div>

            {/* Minimalist Visual Bars or Beautiful Empty Placeholder */}
            {weeklyData.every(d => d.minutes === 0) ? (
              <div className="relative h-36 flex items-center justify-center border-b border-gray-100 pb-2">
                {/* Ghost background bars for layout placeholder */}
                <div className="absolute inset-0 flex items-end justify-between px-4 pb-2 opacity-10 pointer-events-none">
                  {[40, 60, 30, 80, 50].map((h, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div className="w-7 bg-gray-400 rounded-t-md" style={{ height: `${h}%` }}></div>
                      <div className="w-6 h-1 bg-gray-300 mt-2 rounded"></div>
                    </div>
                  ))}
                </div>
                
                {/* Visual indicator card */}
                <div className="z-10 text-center space-y-2 p-4 bg-white/95 backdrop-blur-xs rounded-xl shadow-xs border border-gray-100/50 max-w-[200px]">
                  <TrendingUp className="w-5 h-5 text-gray-400 mx-auto" />
                  <p className="text-[10px] font-medium text-gray-600 leading-normal">
                    Belum ada data durasi kerja minggu ini.
                  </p>
                  <button
                    onClick={() => onNavigateToForm()}
                    className="text-[10px] font-extrabold text-gray-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    Mulai Catat →
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-end justify-between h-36 px-4 border-b border-gray-100 pb-2">
                {weeklyData.map((data, idx) => {
                  const heightPercentage = Math.min((data.minutes / maxWeeklyMinutes) * 100, 100);
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-sm z-20">
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
            )}

            <div className="flex justify-between items-center mt-4 text-[11px] text-gray-400 px-2">
              <span>Total Minggu Ini: <strong>{weeklyData.reduce((sum, d) => sum + d.minutes, 0)} Menit</strong></span>
              <span>Target ideal: 2400 Menit</span>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
