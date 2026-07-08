/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogEntry, InternshipInfo, AttendanceRecord, OfficeLocation } from '../types';
import { Calendar, Clock, Award, CheckCircle2, TrendingUp, AlertCircle, Sparkles, LogOut, ChevronRight, UserCheck } from 'lucide-react';

interface DashboardProps {
  logs: LogEntry[];
  info: InternshipInfo;
  attendanceLogs?: AttendanceRecord[];
  onNavigateToForm: (initialDate?: string) => void;
  onNavigateToList: () => void;
  onNavigateToPresensi: () => void;
  officeLoc: OfficeLocation;
}

export default function Dashboard({ logs, info, attendanceLogs = [], onNavigateToForm, onNavigateToList, onNavigateToPresensi, officeLoc }: DashboardProps) {
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

  const isOfficeConfigured = officeLoc && (officeLoc.latitude !== 0 || officeLoc.longitude !== 0);

  return (
    <div id="dashboard-container" className="space-y-8 text-black font-sans">
      {/* Guideline banner for new registrants */}
      {!isOfficeConfigured && (
        <div id="new-user-office-setup-banner" className="bg-[#FFDE4D] border-4 border-black p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#39FF14] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <AlertCircle className="w-5 h-5 text-black" />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-extrabold text-[#A259FF] bg-purple-100 border border-black px-1.5 py-0.5 rounded-sm uppercase">PANDUAN PENDAFTAR BARU</span>
              <h4 className="text-sm font-display font-black text-black uppercase">Atur Koordinat Posisi Kantor Terlebih Dahulu</h4>
              <p className="text-xs font-bold text-black/80 font-sans leading-relaxed">
                Sebagai pendaftar baru, silakan atur titik koordinat lokasi kantor magang Anda terlebih dahulu agar sistem Geofencing presensi dapat melacak jarak swafoto Anda secara presisi.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToPresensi}
            className="w-full md:w-auto inline-flex items-center justify-center bg-[#39FF14] hover:bg-[#2adb10] text-black text-xs font-black uppercase tracking-wider px-5 py-3 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer whitespace-nowrap"
          >
            Atur Posisi Kantor Sekarang →
          </button>
        </div>
      )}

      {/* Header Profile Summary */}
      <div className="bg-[#FFDE4D] border-4 border-black p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-white text-black text-xs font-black border-2 border-black px-3 py-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-black shrink-0" />
            <span>Dashboard Magang Mahasiswa</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight text-black">
            HALO, {info.studentName || 'MAHASISWA MAGANG'}!
          </h1>
          <p className="text-sm font-bold text-black/80 font-mono">
            {info.position ? `${info.position.toUpperCase()} ` : ''} 
            {info.companyName ? `DI ${info.companyName.toUpperCase()}` : 'PENCATATAN LOGBOOK HARIAN'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            id="quick-add-log-btn"
            onClick={() => onNavigateToForm()}
            className="inline-flex items-center justify-center bg-[#FF6B6B] hover:bg-[#ff5555] text-black text-xs font-black uppercase tracking-wider px-5 py-3 border-3 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
          >
            + Tambah Logbook
          </button>
          <button
            id="view-all-logs-btn"
            onClick={onNavigateToList}
            className="inline-flex items-center justify-center bg-[#C3F2FF] hover:bg-[#b0ebff] text-black text-xs font-black uppercase tracking-wider px-5 py-3 border-3 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
          >
            Lihat Semua Log
          </button>
        </div>
      </div>

      {/* Grid Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Total Hours */}
        <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-start gap-4 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-default">
          <div className="p-3 bg-[#DFCCFB] border-2 border-black text-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-display font-black text-black/60 uppercase tracking-wider block">Total Durasi</span>
            <span className="text-2xl font-display font-black text-black">{totalMinutes} <span className="text-sm font-bold font-mono text-black/70">Menit</span></span>
            <span className="text-[10px] font-bold font-mono text-black/60 block">Rerata {avgMinutes} menit / hari</span>
          </div>
        </div>

        {/* Stat 2: Total Active Days */}
        <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-start gap-4 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-default">
          <div className="p-3 bg-[#C3F2FF] border-2 border-black text-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-display font-black text-black/60 uppercase tracking-wider block">Hari Tercatat</span>
            <span className="text-2xl font-display font-black text-black">{totalDays} <span className="text-sm font-bold font-mono text-black/70">Hari</span></span>
            <span className="text-[10px] font-bold font-mono text-black/60 block">Dari target periode</span>
          </div>
        </div>

        {/* Stat 3: Kehadiran */}
        <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-start gap-4 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-default">
          <div className="p-3 bg-[#39FF14]/30 border-2 border-black text-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-display font-black text-black/60 uppercase tracking-wider block">Kehadiran</span>
            <span className="text-2xl font-display font-black text-black">{totalAttendance} <span className="text-sm font-bold font-mono text-black/70">Hari</span></span>
            <span className="text-[10px] font-bold font-mono text-black/60 block">Sejak awal periode magang</span>
          </div>
        </div>

        {/* Stat 4: Completion Rate */}
        <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-start gap-4 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-default">
          <div className="p-3 bg-[#FF6B6B]/30 border-2 border-black text-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <span className="text-xs font-display font-black text-black/60 uppercase tracking-wider block">Penyelesaian</span>
            <span className="text-2xl font-display font-black text-black block">{completionRate}%</span>
            {/* Thick neobrutalist progress bar */}
            <div className="w-full h-3.5 bg-[#FFFDF6] border-2 border-black overflow-hidden mt-1 shadow-[1px_1px_0px_rgba(0,0,0,1)]">
              <div 
                className="h-full bg-[#FF5C8A] transition-all duration-500" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-bold font-mono text-black/60 block pt-0.5">{completedLogs} dari {totalDays} tugas selesai</span>
          </div>
        </div>
      </div>

      {/* Main Panel Content: Today Status & Weekly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column Left: Today Action Card & Activity Categories */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today Status Card */}
          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-display font-black text-black mb-4 flex items-center gap-2 uppercase tracking-wide">
              <span className="w-3.5 h-3.5 border-2 border-black bg-black"></span>
              STATUS HARI INI ({new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()})
            </h2>

            {todayLog ? (
              <div className="bg-[#C3F2FF] border-3 border-black p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 bg-[#39FF14] text-black text-xs font-black px-2.5 py-1.5 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-black border border-white"></span>
                    Logbook Hari Ini Sudah Terisi
                  </div>
                  <h3 className="font-display font-extrabold text-black text-lg uppercase tracking-tight">{todayLog.title}</h3>
                  <p className="text-sm font-bold text-black/70 font-sans line-clamp-2">{todayLog.description}</p>
                  <div className="flex gap-4 text-xs font-mono font-bold text-black">
                    <span>Durasi: <strong>{todayLog.minutes} Menit</strong></span>
                    <span>•</span>
                    <span>Status: <strong className="bg-white border border-black px-1.5 py-0.5 uppercase">{todayLog.status}</strong></span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToForm(todayStr)}
                  className="text-xs font-extrabold text-black bg-white border-2 border-black px-4 py-2 hover:bg-black/5 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
                >
                  Edit Catatan
                </button>
              </div>
            ) : (
              <div className="bg-[#FFFDF6] border-3 border-dashed border-black p-8 text-center space-y-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                <div className="w-14 h-14 border-3 border-black bg-[#FFDE4D] flex items-center justify-center mx-auto text-black shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                  <Calendar className="w-7 h-7 text-black" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="font-display font-black text-black text-sm uppercase">Belum Ada Catatan Hari Ini</h3>
                  <p className="text-xs font-bold text-black/60 leading-relaxed font-sans">
                    Yuk, catat aktivitas magangmu hari ini! Pengisian teratur membantu memantau progres harian dan mempermudah ekspor laporan di akhir periode.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateToForm(todayStr)}
                  className="inline-flex items-center gap-2 text-xs font-black text-black bg-[#FF6B6B] border-3 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all px-5 py-3 uppercase cursor-pointer"
                >
                  Mulai Isi Logbook Sekarang
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Column Right: Weekly hours chart */}
        <div className="space-y-6">
          {/* Weekly chart */}
          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between">
            <div className="space-y-1 mb-6">
              <h2 className="text-base font-display font-black text-black uppercase tracking-wide">Grafik Durasi Minggu Ini</h2>
              <p className="text-[11px] font-bold font-mono text-black/50">Distribusi durasi kerja harian dari Senin hingga Jumat</p>
            </div>

            {/* Visual Bars */}
            {weeklyData.every(d => d.minutes === 0) ? (
              <div className="relative h-36 flex items-center justify-center border-b-2 border-black pb-2">
                {/* Ghost background bars for layout placeholder */}
                <div className="absolute inset-0 flex items-end justify-between px-4 pb-2 opacity-10 pointer-events-none">
                  {[40, 60, 30, 80, 50].map((h, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div className="w-7 bg-black rounded-t-none border-2 border-black" style={{ height: `${h}%` }}></div>
                      <div className="w-6 h-1 bg-black mt-2"></div>
                    </div>
                  ))}
                </div>
                
                {/* Visual indicator card */}
                <div className="z-10 text-center space-y-2 p-4 bg-[#FFFDF6] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] max-w-[200px]">
                  <TrendingUp className="w-5 h-5 text-black mx-auto" />
                  <p className="text-[10px] font-black text-black uppercase leading-normal">
                    Belum ada data durasi kerja minggu ini.
                  </p>
                  <button
                    onClick={() => onNavigateToForm()}
                    className="text-[10px] font-black uppercase text-[#A259FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    Mulai Catat →
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-end justify-between h-36 px-4 border-b-2 border-black pb-2">
                {weeklyData.map((data, idx) => {
                  const heightPercentage = Math.min((data.minutes / maxWeeklyMinutes) * 100, 100);
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 bg-[#FFDE4D] border-2 border-black text-black text-[10px] font-bold px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-[2px_2px_0px_rgba(0,0,0,1)] z-20">
                        {data.minutes > 0 ? `${data.minutes} Menit: ${data.title}` : 'Belum terisi'}
                      </div>

                      <div className="w-7 bg-[#FFFDF6] border-2 border-black h-28 flex items-end shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                        <div 
                          className={`w-full transition-all duration-500 border-t-2 border-black ${data.minutes > 0 ? 'bg-[#A259FF]' : 'bg-[#FFFDF6]'}`}
                          style={{ height: `${heightPercentage}%` }}
                        ></div>
                      </div>
                      
                      <span className="text-[10px] font-bold font-mono mt-2 text-black">{data.day.substring(0, 3).toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center mt-4 text-[11px] font-bold font-mono text-black px-2">
              <span>Total: <strong>{weeklyData.reduce((sum, d) => sum + d.minutes, 0)} Min</strong></span>
              <span className="bg-[#FFDE4D] border border-black px-1.5 py-0.5">Target: 2400 Min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
