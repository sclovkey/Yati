/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LogEntry, InternshipInfo } from '../types';
import { formatDateIndonesian, exportToExcel, exportToPDF } from '../utils/export';
import { Search, Calendar, FileDown, Eye, FilterX, Edit2, ChevronDown, RefreshCw, Plus } from 'lucide-react';

interface LogbookListProps {
  logs: LogEntry[];
  info: InternshipInfo;
  onEditLog: (log: LogEntry) => void;
  onAddLog: () => void;
}

const STATUSES = ['Semua Status', 'Selesai', 'Dalam Proses', 'Tertunda'];

export default function LogbookList({ logs, info, onEditLog, onAddLog }: LogbookListProps) {
  // Helpers to format minutes to nice readable text
  const formatDurationDesktop = (log: LogEntry) => {
    const hours = Math.floor(log.minutes / 60);
    const mins = log.minutes % 60;
    const durationStr = hours > 0 
      ? (mins > 0 ? `${hours} Jam ${mins} Menit` : `${hours} Jam`)
      : `${mins} Menit`;
      
    if (log.startTime && log.endTime) {
      return (
        <div className="flex flex-col items-center">
          <span className="font-semibold text-gray-800 text-xs">{durationStr}</span>
          <span className="text-[10px] text-gray-400 font-medium font-mono mt-0.5">{log.startTime} - {log.endTime}</span>
        </div>
      );
    }
    return <span className="font-semibold text-gray-800 text-xs">{durationStr}</span>;
  };

  const formatDurationMobile = (log: LogEntry) => {
    const hours = Math.floor(log.minutes / 60);
    const mins = log.minutes % 60;
    const durationStr = hours > 0 
      ? (mins > 0 ? `${hours} Jam ${mins} Menit` : `${hours} Jam`)
      : `${mins} Menit`;
      
    if (log.startTime && log.endTime) {
      return `${durationStr} (${log.startTime} - ${log.endTime})`;
    }
    return `${durationStr} Kerja`;
  };

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Semua Status');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown states for mobile UI or actions
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('Semua Status');
    setStartDate('');
    setEndDate('');
  };

  // Filter logs logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Search Query Match
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        log.title.toLowerCase().includes(searchLower) ||
        log.description.toLowerCase().includes(searchLower) ||
        (log.notes && log.notes.toLowerCase().includes(searchLower)) ||
        (log.mentorName && log.mentorName.toLowerCase().includes(searchLower));

      // 2. Status Match
      const matchesStatus = selectedStatus === 'Semua Status' || log.status === selectedStatus;

      // 3. Date Range Match
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && log.date >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && log.date <= endDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => b.date.localeCompare(a.date)); // Sort Date Descending
  }, [logs, searchQuery, selectedStatus, startDate, endDate]);

  // Calculations for filtered set
  const filteredMinutes = useMemo(() => {
    return filteredLogs.reduce((sum, l) => sum + l.minutes, 0);
  }, [filteredLogs]);

  // Export handlers
  const handleExportExcelAll = () => {
    exportToExcel(logs, info);
    setShowExportMenu(false);
  };

  const handleExportExcelFiltered = () => {
    exportToExcel(filteredLogs, info);
    setShowExportMenu(false);
  };

  const handleExportPDFAll = () => {
    exportToPDF(logs, info);
    setShowExportMenu(false);
  };

  const handleExportPDFFiltered = () => {
    exportToPDF(filteredLogs, info);
    setShowExportMenu(false);
  };

  return (
    <div id="logbook-list-container" className="space-y-6 text-black font-sans">
      {/* Header with quick stats & export action */}
      <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-black text-black uppercase tracking-wide">Riwayat Kegiatan Logbook</h2>
          <p className="text-xs font-bold text-black/70 font-mono mt-1 leading-relaxed">
            Ditemukan <strong className="text-black font-extrabold bg-[#39FF14] px-1 py-0.5 border border-black">{filteredLogs.length} hari</strong> aktivitas
            {filteredLogs.length !== logs.length && ` (dari total ${logs.length} hari)`} dengan akumulasi{' '}
            <strong className="text-black font-extrabold bg-[#FFDE4D] px-1 py-0.5 border border-black">{filteredMinutes} Menit Kerja</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
          <button
            onClick={onAddLog}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6B6B] hover:bg-[#ff5555] text-black border-3 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Logbook
          </button>

          {/* Export Buttons */}
          <div className="relative">
            <button
              id="export-dropdown-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFDE4D] hover:bg-[#ffe259] text-black border-3 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              Ekspor Laporan (.XLSX / .PDF)
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

          {showExportMenu && (
            <>
              {/* Overlay background to dismiss menu */}
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
              <div className="absolute right-0 mt-2 w-64 bg-white border-3 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] z-20 overflow-hidden divide-y-2 divide-black">
                <div className="py-1">
                  <span className="block px-4 py-1.5 text-[10px] font-black text-black bg-[#C3F2FF] border-b-2 border-black uppercase tracking-wider">Format Excel (.xlsx)</span>
                  <button
                    onClick={handleExportExcelFiltered}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-black hover:bg-black/5 flex items-center justify-between"
                  >
                    <span>Sesuai Filter ({filteredLogs.length} Log)</span>
                    <span className="text-[10px] text-black bg-[#FFDE4D] border border-black px-1.5 py-0.5 rounded-none font-mono font-black uppercase">Excel</span>
                  </button>
                  <button
                    onClick={handleExportExcelAll}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-black hover:bg-black/5 flex items-center justify-between"
                  >
                    <span>Seluruh Data ({logs.length} Log)</span>
                    <span className="text-[10px] text-black bg-[#FFDE4D] border border-black px-1.5 py-0.5 rounded-none font-mono font-black uppercase">Semua</span>
                  </button>
                </div>

                <div className="py-1">
                  <span className="block px-4 py-1.5 text-[10px] font-black text-black bg-[#C3F2FF] border-b-2 border-black border-t-2 uppercase tracking-wider">Format PDF (.pdf)</span>
                  <button
                    onClick={handleExportPDFFiltered}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-black hover:bg-black/5 flex items-center justify-between"
                  >
                    <span>Sesuai Filter ({filteredLogs.length} Log)</span>
                    <span className="text-[10px] text-black bg-[#FFDE4D] border border-black px-1.5 py-0.5 rounded-none font-mono font-black uppercase">PDF</span>
                  </button>
                  <button
                    onClick={handleExportPDFAll}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-black hover:bg-black/5 flex items-center justify-between"
                  >
                    <span>Seluruh Laporan (Cover + TTD)</span>
                    <span className="text-[10px] text-black bg-[#FF6B6B] border border-black px-1.5 py-0.5 rounded-none font-mono font-black uppercase">Utama</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

      {/* Dynamic Filters Form */}
      <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Filter 1: Search Query */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-black uppercase tracking-wider block font-display">Cari Aktivitas</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-black">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kata kunci pencarian..."
                className="w-full pl-9 pr-3 py-2 border-2 border-black bg-[#FFFDF6] text-xs font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all"
              />
            </div>
          </div>

          {/* Filter 2: Status Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-black uppercase tracking-wider block font-display">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black bg-[#FFFDF6] text-xs font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
            >
              {STATUSES.map((stat, idx) => (
                <option key={idx} value={stat}>{stat.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Filter 3: Date Range Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-black uppercase tracking-wider block font-display">Rentang Tanggal</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-2 border-2 border-black bg-[#FFFDF6] text-[10px] font-mono font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="Mulai"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-2 border-2 border-black bg-[#FFFDF6] text-[10px] font-mono font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all"
                placeholder="Selesai"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters / Actions bar */}
        {(searchQuery || selectedStatus !== 'Semua Status' || startDate || endDate) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-[#FF6B6B] hover:underline decoration-2 transition-all cursor-pointer"
            >
              <FilterX className="w-4 h-4" />
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Logbook Items Grid / Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-[#FFFDF6] border-4 border-black py-12 px-6 text-center space-y-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
          <div className="w-14 h-14 bg-[#FFDE4D] border-3 border-black flex items-center justify-center mx-auto text-black shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <Eye className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-black text-black uppercase text-sm">Tidak Menemukan Catatan</h3>
            <p className="text-xs font-bold text-black/60 max-w-sm mx-auto leading-relaxed">
              Tidak ada catatan logbook yang sesuai dengan kriteria filter Anda saat ini. Silakan coba atur ulang filter pencarian Anda.
            </p>
          </div>
          <div className="flex justify-center flex-wrap gap-3">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-black bg-[#39FF14] hover:bg-[#2adb10] text-black px-4 py-2.5 border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Setel Ulang Filter
            </button>
            <button
              onClick={onAddLog}
              className="inline-flex items-center gap-1.5 text-xs font-black bg-[#FF6B6B] hover:bg-[#ff5555] text-black px-4 py-2.5 border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Logbook
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table view (Hidden on mobile) */}
          <div className="hidden md:block bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#FFDE4D] border-b-4 border-black text-[10px] font-black text-black uppercase tracking-wider">
                  <th className="px-6 py-4 w-12 text-center">No</th>
                  <th className="px-6 py-4 w-48">Hari & Tanggal</th>
                  <th className="px-6 py-4">Aktivitas Utama & Deskripsi</th>
                  <th className="px-6 py-4 w-28 text-center">Durasi</th>
                  <th className="px-6 py-4 w-32">Status</th>
                  <th className="px-6 py-4 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {filteredLogs.map((log, index) => {
                  let statusBadgeClass = '';
                  if (log.status === 'Selesai') {
                    statusBadgeClass = 'bg-[#39FF14] text-black border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]';
                  } else if (log.status === 'Dalam Proses') {
                    statusBadgeClass = 'bg-[#FFDE4D] text-black border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]';
                  } else {
                    statusBadgeClass = 'bg-gray-100 text-black/60 border-black/30';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-[#C3F2FF]/20 transition-colors">
                      <td className="px-6 py-4 text-center font-mono font-black border-r-2 border-black/10 text-black/60 bg-gray-50">{index + 1}</td>
                      <td className="px-6 py-4 font-black border-r-2 border-black/10 text-black uppercase bg-[#FFFDF6]/40">
                        {formatDateIndonesian(log.date)}
                      </td>
                      <td className="px-6 py-4 space-y-2 border-r-2 border-black/10">
                        <div className="font-display font-extrabold text-black text-sm uppercase tracking-tight">{log.title}</div>
                        <div className="text-black/80 font-medium font-sans leading-relaxed">{log.description}</div>
                        {log.notes && (
                          <div className="text-[10px] font-bold font-mono text-black italic mt-1 bg-purple-50 border border-black px-2.5 py-1 inline-block max-w-full">
                            Catatan: {log.notes}
                          </div>
                        )}
                        {log.mentorName && (
                          <div className="text-[10px] font-bold text-black block font-mono">
                            Ditinjau oleh: <span className="bg-[#C3F2FF] border border-black px-1.5 py-0.5 text-black uppercase">{log.mentorName}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-black border-r-2 border-black/10">
                        {formatDurationDesktop(log)}
                      </td>
                      <td className="px-6 py-4 border-r-2 border-black/10">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border-2 text-[10px] font-black uppercase tracking-wide ${statusBadgeClass}`}>
                          <span className="w-2 h-2 rounded-full bg-black"></span>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => onEditLog(log)}
                          className="inline-flex items-center justify-center p-2 border-2 border-black bg-[#39FF14] hover:bg-[#2adb10] text-black hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
                          title="Edit Catatan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card view (Hidden on desktop) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredLogs.map((log, index) => {
              let statusBadgeClass = '';
              if (log.status === 'Selesai') {
                statusBadgeClass = 'bg-[#39FF14] text-black border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]';
              } else if (log.status === 'Dalam Proses') {
                statusBadgeClass = 'bg-[#FFDE4D] text-black border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]';
              } else {
                statusBadgeClass = 'bg-gray-100 text-black/60 border-black/30';
              }

              return (
                <div key={log.id} className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-black bg-[#C3F2FF] px-2 py-0.5 border border-black">#{(filteredLogs.length - index)}</span>
                    <span className="text-xs font-black font-mono text-black uppercase">
                      {log.date.split('-').reverse().join('/')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display font-black text-black text-base uppercase leading-tight tracking-tight">{log.title}</h3>
                    <p className="text-xs font-bold text-black/70 leading-relaxed font-sans">{log.description}</p>
                    {log.notes && (
                      <p className="text-[10px] font-bold text-black/60 italic bg-purple-50 border border-black p-2 shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                        Catatan: {log.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 border-t-2 border-black pt-3 text-xs font-bold">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-black text-xs font-black bg-[#C3F2FF] border border-black px-1.5 py-0.5">
                        {formatDurationMobile(log)}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 border-2 text-[9px] font-black uppercase ${statusBadgeClass}`}>
                        {log.status}
                      </span>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onEditLog(log)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border-2 border-black bg-[#39FF14] text-[10px] font-black uppercase tracking-wide text-black hover:bg-[#2adb10] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Catatan
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
