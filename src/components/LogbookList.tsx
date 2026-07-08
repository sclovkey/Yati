/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LogEntry, InternshipInfo } from '../types';
import { formatDateIndonesian, exportToExcel, exportToPDF } from '../utils/export';
import { Search, Calendar, FileDown, Eye, FilterX, Edit2, ChevronDown, RefreshCw } from 'lucide-react';

interface LogbookListProps {
  logs: LogEntry[];
  info: InternshipInfo;
  onEditLog: (log: LogEntry) => void;
}

const STATUSES = ['Semua Status', 'Selesai', 'Dalam Proses', 'Tertunda'];

export default function LogbookList({ logs, info, onEditLog }: LogbookListProps) {
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
    <div id="logbook-list-container" className="space-y-6">
      {/* Header with quick stats & export action */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Kegiatan Logbook</h2>
          <p className="text-xs text-gray-500">
            Ditemukan <strong className="text-gray-800 font-semibold">{filteredLogs.length} hari</strong> aktivitas
            {filteredLogs.length !== logs.length && ` (dari total ${logs.length} hari)`} dengan akumulasi{' '}
            <strong className="text-gray-800 font-semibold">{filteredMinutes} Menit Kerja</strong>.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="relative self-start md:self-center">
          <button
            id="export-dropdown-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            Ekspor Laporan (.XLSX / .PDF)
            <ChevronDown className="w-3 h-3" />
          </button>

          {showExportMenu && (
            <>
              {/* Overlay background to dismiss menu */}
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-gray-100">
                <div className="py-1">
                  <span className="block px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Format Excel (.xlsx)</span>
                  <button
                    onClick={handleExportExcelFiltered}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Sesuai Filter ({filteredLogs.length} Log)</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">Excel</span>
                  </button>
                  <button
                    onClick={handleExportExcelAll}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Seluruh Data ({logs.length} Log)</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">Semua</span>
                  </button>
                </div>

                <div className="py-1">
                  <span className="block px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Format PDF (.pdf)</span>
                  <button
                    onClick={handleExportPDFFiltered}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Sesuai Filter ({filteredLogs.length} Log)</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">PDF</span>
                  </button>
                  <button
                    onClick={handleExportPDFAll}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Seluruh Laporan (Cover + TTD)</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono font-bold">Utama</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Filters Form */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Filter 1: Search Query */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Cari Aktivitas</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kata kunci..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
          </div>

          {/* Filter 2: Status Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            >
              {STATUSES.map((stat, idx) => (
                <option key={idx} value={stat}>{stat}</option>
              ))}
            </select>
          </div>

          {/* Filter 3: Date Range Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Rentang Tanggal</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-[10px] focus:outline-none"
                placeholder="Mulai"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-xl text-[10px] focus:outline-none"
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
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Logbook Items Grid / Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-12 px-6 text-center space-y-4">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Eye className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-800 text-sm">Tidak Menemukan Catatan</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Tidak ada catatan logbook yang sesuai dengan kriteria filter Anda saat ini. Silakan coba atur ulang filter pencarian Anda.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-1.5 rounded-lg transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Setel Ulang Filter
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table view (Hidden on mobile) */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4 w-12 text-center">No</th>
                  <th className="px-6 py-4 w-48">Hari & Tanggal</th>
                  <th className="px-6 py-4">Aktivitas Utama & Deskripsi</th>
                  <th className="px-6 py-4 w-24 text-center">Durasi</th>
                  <th className="px-6 py-4 w-28">Status</th>
                  <th className="px-6 py-4 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log, index) => {
                  let statusBadgeClass = '';
                  if (log.status === 'Selesai') {
                    statusBadgeClass = 'bg-green-50 text-green-700 border-green-100';
                  } else if (log.status === 'Dalam Proses') {
                    statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                  } else {
                    statusBadgeClass = 'bg-gray-50 text-gray-600 border-gray-100';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-center font-mono text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {formatDateIndonesian(log.date)}
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="font-semibold text-gray-800 text-sm">{log.title}</div>
                        <div className="text-gray-500 line-clamp-2 leading-relaxed">{log.description}</div>
                        {log.notes && (
                          <div className="text-[11px] text-gray-400 italic mt-1 bg-gray-50 px-2.5 py-1 rounded-md inline-block max-w-full truncate">
                            Catatan: {log.notes}
                          </div>
                        )}
                        {log.mentorName && (
                          <div className="text-[10px] text-gray-400 font-medium block">
                            Ditinjau oleh: <span className="text-gray-600">{log.mentorName}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-medium text-gray-700">
                        {formatDurationDesktop(log)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusBadgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            log.status === 'Selesai' ? 'bg-green-500' : log.status === 'Dalam Proses' ? 'bg-amber-500' : 'bg-gray-400'
                          }`}></span>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => onEditLog(log)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:text-gray-900 transition-all text-gray-500 cursor-pointer"
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
                statusBadgeClass = 'bg-green-50 text-green-700 border-green-100';
              } else if (log.status === 'Dalam Proses') {
                statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
              } else {
                statusBadgeClass = 'bg-gray-50 text-gray-600 border-gray-100';
              }

              return (
                <div key={log.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-400">#{(filteredLogs.length - index)}</span>
                    <span className="text-xs font-semibold text-gray-500">
                      {log.date.split('-').reverse().join('/')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-800 text-sm leading-snug">{log.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{log.description}</p>
                    {log.notes && (
                      <p className="text-[10px] text-gray-400 italic bg-gray-50 p-2 rounded">
                        Catatan: {log.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-medium font-mono text-gray-700 text-xs">
                        {formatDurationMobile(log)}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadgeClass}`}>
                        {log.status}
                      </span>
                    </div>

                    <button
                      onClick={() => onEditLog(log)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
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
