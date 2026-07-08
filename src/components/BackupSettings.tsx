/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { InternshipInfo, LogEntry } from '../types';
import { User, Building, Calendar, Clipboard, Download, Upload, Trash2, Save, FileSpreadsheet, RefreshCcw, LogOut } from 'lucide-react';

interface BackupSettingsProps {
  info: InternshipInfo;
  logs: LogEntry[];
  onUpdateInfo: (info: InternshipInfo) => void;
  onImportLogs: (importedLogs: LogEntry[], importedInfo?: InternshipInfo) => void;
  onClearLogs: () => void;
  onLogout?: () => void;
}

export default function BackupSettings({
  info,
  logs,
  onUpdateInfo,
  onImportLogs,
  onClearLogs,
  onLogout
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
    <div id="backup-settings-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-black font-sans">
      {/* Profil Magang Form (Left/Center Column) */}
      <div className="lg:col-span-2 bg-white border-4 border-black p-6 md:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-6">
        <div>
          <h3 className="font-display font-black text-black uppercase text-lg tracking-wide">Profil & Informasi Magang</h3>
          <p className="text-xs font-bold text-black/70 leading-relaxed">Atur profil Anda agar tercetak otomatis pada kover laporan PDF dan berkas Excel Anda.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5 border-t-4 border-black pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Student Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Nama Lengkap Mahasiswa</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-black">
                  <User className="w-4 h-4 text-black" />
                </span>
                <input
                  type="text"
                  value={profile.studentName}
                  onChange={(e) => handleProfileChange('studentName', e.target.value)}
                  placeholder="Contoh: Yati Amalia"
                  className="w-full pl-10 pr-3.5 py-2.5 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                />
              </div>
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Institusi / Universitas</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-black">
                  <Clipboard className="w-4 h-4 text-black" />
                </span>
                <input
                  type="text"
                  value={profile.institution}
                  onChange={(e) => handleProfileChange('institution', e.target.value)}
                  placeholder="Contoh: Universitas Indonesia"
                  className="w-full pl-10 pr-3.5 py-2.5 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Perusahaan / Instansi Magang</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-black">
                  <Building className="w-4 h-4 text-black" />
                </span>
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={(e) => handleProfileChange('companyName', e.target.value)}
                  placeholder="Contoh: PT Teknologi Nusantara"
                  className="w-full pl-10 pr-3.5 py-2.5 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                />
              </div>
            </div>

            {/* Internship Role / Position */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Posisi / Peran Magang</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-black">
                  <User className="w-4 h-4 text-black" />
                </span>
                <input
                  type="text"
                  value={profile.position}
                  onChange={(e) => handleProfileChange('position', e.target.value)}
                  placeholder="Contoh: UI/UX Designer Intern"
                  className="w-full pl-10 pr-3.5 py-2.5 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Tanggal Mulai Magang</label>
              <input
                type="date"
                value={profile.startDate}
                onChange={(e) => handleProfileChange('startDate', e.target.value)}
                className="w-full px-3.5 py-2.5 border-2 border-black bg-white text-xs font-mono font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Tanggal Selesai Magang</label>
              <input
                type="date"
                value={profile.endDate}
                onChange={(e) => handleProfileChange('endDate', e.target.value)}
                className="w-full px-3.5 py-2.5 border-2 border-black bg-white text-xs font-mono font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
              />
            </div>
          </div>

          {/* Supervisor / Mentor Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-black uppercase tracking-wider block">Nama Pembimbing Lapangan (Mentor Utama)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-black">
                <User className="w-4 h-4 text-black" />
              </span>
              <input
                type="text"
                value={profile.mentorName}
                onChange={(e) => handleProfileChange('mentorName', e.target.value)}
                placeholder="Contoh: Budi Prasetyo, S.Kom"
                className="w-full pl-10 pr-3.5 py-2.5 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t-2 border-black pt-5">
            <span className="text-xs font-bold text-black/60">Data otomatis disimpan di penyimpanan lokal browser.</span>
            
            <button
              type="submit"
              className={`inline-flex items-center gap-2 px-5 py-2.5 border-2 border-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer ${
                isSaved ? 'bg-[#39FF14] text-black' : 'bg-[#FFDE4D] text-black hover:bg-[#ffe366]'
              }`}
            >
              <Save className="w-4 h-4 text-black" />
              {isSaved ? 'Profil Tersimpan!' : 'Simpan Profil'}
            </button>
          </div>
        </form>
      </div>

      {/* Backup & Slates Column (Right Column) */}
      <div className="space-y-6">
        {/* Backup / Restore Card */}
        <div className="bg-[#FFFDF6] border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-6">
          <div>
            <h3 className="font-display font-black text-black uppercase text-base tracking-wide">Backup & Pemulihan</h3>
            <p className="text-xs font-bold text-black/70 leading-relaxed">Cegah kehilangan data dengan mengekspor salinan cadangan logbook Anda.</p>
          </div>

          <div className="space-y-3 pt-4 border-t-2 border-black">
            {/* Export JSON backup button */}
            <button
              onClick={handleExportBackup}
              className="w-full inline-flex items-center justify-between px-4 py-3 bg-[#C3F2FF] hover:bg-[#a9e4f5] text-black text-xs font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-black" />
                Ekspor Cadangan (.JSON)
              </span>
              <span className="text-[10px] text-black bg-white px-2 py-0.5 border-2 border-black font-mono font-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">BACKUP</span>
            </button>

            {/* Import JSON backup trigger */}
            <label className="w-full inline-flex items-center justify-between px-4 py-3 bg-[#FFDE4D] hover:bg-[#ffe366] text-black text-xs font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer">
              <span className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-black" />
                Impor & Pulihkan Data
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <span className="text-[10px] text-black bg-white px-2 py-0.5 border-2 border-black font-mono font-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">RESTORE</span>
            </label>
          </div>
        </div>

        {/* Logout Card */}
        {onLogout && (
          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-4">
            <div>
              <h3 className="font-display font-black text-black uppercase text-sm tracking-wide">Sesi Pengguna</h3>
              <p className="text-xs font-bold text-black/70">Keluar dari akun Anda saat ini untuk berganti akun lain.</p>
            </div>
            <div className="pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={onLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B6B] hover:bg-[#ff5555] text-black border-2 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-black" />
                Keluar dari Akun
              </button>
            </div>
          </div>
        )}

        {/* Danger Zone Card */}
        <div className="bg-white border-4 border-[#FF6B6B] p-6 shadow-[6px_6px_0px_#FF6B6B] space-y-4">
          <div>
            <h3 className="font-display font-black text-[#FF6B6B] uppercase text-sm tracking-wide">Danger Zone</h3>
            <p className="text-[11px] font-bold text-black/60">Pengaturan ini akan menghapus semua logbook dan riwayat presensi secara permanen.</p>
          </div>

          <div className="pt-3 border-t-2 border-[#FF6B6B]">
            <button
              type="button"
              onClick={handleClearClick}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B6B]/20 hover:bg-[#FF6B6B] border-2 border-black text-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-black" />
              Kosongkan Semua Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
