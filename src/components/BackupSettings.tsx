/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { InternshipInfo, LogEntry } from '../types';
import { User, Building, Calendar, Clipboard, Download, Upload, Trash2, Save, FileSpreadsheet, RefreshCcw } from 'lucide-react';

interface BackupSettingsProps {
  info: InternshipInfo;
  logs: LogEntry[];
  onUpdateInfo: (info: InternshipInfo) => void;
  onImportLogs: (importedLogs: LogEntry[], importedInfo?: InternshipInfo) => void;
  onClearLogs: () => void;
}

export default function BackupSettings({
  info,
  logs,
  onUpdateInfo,
  onImportLogs,
  onClearLogs
}: BackupSettingsProps) {
  // Local profile state
  const [profile, setProfile] = useState<InternshipInfo>({ ...info });
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileChange = (key: keyof InternshipInfo, value: string) => {
    setProfile(prev => ({
      ...prev,
      [key]: value
    }));
    setIsSaved(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateInfo(profile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Export full JSON Backup
  const handleExportBackup = () => {
    try {
      const backupData = {
        app: 'yati-magang-logbook',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        info: profile,
        logs: logs
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Backup_YatiMagang_${profile.studentName.replace(/\s+/g, '_') || 'Logbook'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Gagal mengekspor backup data: ' + e);
    }
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        // Simple validation
        if (data.app !== 'yati-magang-logbook' || !Array.isArray(data.logs)) {
          alert('Format berkas backup tidak valid. Harap gunakan file JSON hasil export dari Yati Magang.');
          return;
        }

        if (confirm(`Ditemukan ${data.logs.length} catatan logbook dan informasi profil dalam file backup. Apakah Anda yakin ingin memulihkan data ini? Data saat ini di browser Anda akan tertimpa.`)) {
          onImportLogs(data.logs, data.info);
          if (data.info) {
            setProfile(data.info);
          }
          alert('Data logbook berhasil dipulihkan!');
        }
      } catch (err) {
        alert('Gagal membaca berkas backup. Pastikan berkas berformat JSON yang valid.');
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow the same file to be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearClick = () => {
    if (confirm('PERINGATAN: Tindakan ini akan menghapus semua catatan logbook dan riwayat presensi Anda secara permanen dari browser ini. Apakah Anda yakin ingin mengosongkan semua data?')) {
      onClearLogs();
      alert('Semua data logbook dan riwayat presensi telah dibersihkan.');
    }
  };

  return (
    <div id="backup-settings-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Profil Magang Form (Left/Center Column) */}
      <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Profil & Informasi Magang</h3>
          <p className="text-xs text-gray-400">Atur profil Anda agar tercetak otomatis pada kover laporan PDF dan berkas Excel Anda.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5 border-t border-gray-100 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Student Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Nama Lengkap Mahasiswa</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={profile.studentName}
                  onChange={(e) => handleProfileChange('studentName', e.target.value)}
                  placeholder="Contoh: Yati Amalia"
                  className="w-full pl-10 pr-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Institusi / Universitas</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Clipboard className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={profile.institution}
                  onChange={(e) => handleProfileChange('institution', e.target.value)}
                  placeholder="Contoh: Universitas Indonesia"
                  className="w-full pl-10 pr-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Perusahaan / Instansi Magang</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Building className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={(e) => handleProfileChange('companyName', e.target.value)}
                  placeholder="Contoh: PT Teknologi Nusantara"
                  className="w-full pl-10 pr-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            {/* Internship Role / Position */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Posisi / Peran Magang</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={profile.position}
                  onChange={(e) => handleProfileChange('position', e.target.value)}
                  placeholder="Contoh: UI/UX Designer Intern"
                  className="w-full pl-10 pr-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Tanggal Mulai Magang</label>
              <input
                type="date"
                value={profile.startDate}
                onChange={(e) => handleProfileChange('startDate', e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Tanggal Selesai Magang</label>
              <input
                type="date"
                value={profile.endDate}
                onChange={(e) => handleProfileChange('endDate', e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Supervisor / Mentor Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Nama Pembimbing Lapangan (Mentor Utama)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                <User className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={profile.mentorName}
                onChange={(e) => handleProfileChange('mentorName', e.target.value)}
                placeholder="Contoh: Budi Prasetyo, S.Kom"
                className="w-full pl-10 pr-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-5">
            <span className="text-xs text-gray-400">Data otomatis disimpan di penyimpanan lokal browser.</span>
            
            <button
              type="submit"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSaved ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {isSaved ? 'Profil Tersimpan!' : 'Simpan Profil'}
            </button>
          </div>
        </form>
      </div>

      {/* Backup & Slates Column (Right Column) */}
      <div className="space-y-6">
        {/* Backup / Restore Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Backup & Pemulihan</h3>
            <p className="text-xs text-gray-400">Cegah kehilangan data dengan mengekspor salinan cadangan logbook Anda.</p>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100">
            {/* Export JSON backup button */}
            <button
              onClick={handleExportBackup}
              className="w-full inline-flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-gray-500" />
                Ekspor Cadangan (.JSON)
              </span>
              <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100 font-mono">BACKUP</span>
            </button>

            {/* Import JSON backup trigger */}
            <label className="w-full inline-flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-colors cursor-pointer">
              <span className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-gray-500" />
                Impor & Pulihkan Data
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100 font-mono">RESTORE</span>
            </label>
          </div>
        </div>

        {/* Danger Zone Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-red-600">Danger Zone</h3>
            <p className="text-[11px] text-gray-400">Pengaturan ini akan menghapus semua logbook dan riwayat presensi secara permanen.</p>
          </div>

          <div className="pt-3 border-t border-red-50">
            <button
              type="button"
              onClick={handleClearClick}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200/40 text-red-600 hover:text-red-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Kosongkan Semua Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
