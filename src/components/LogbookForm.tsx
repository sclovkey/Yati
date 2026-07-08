/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { Save, X, Trash2, ArrowLeft, HelpCircle } from 'lucide-react';

interface LogbookFormProps {
  editingLog?: LogEntry | null;
  initialDate?: string;
  defaultMentorName?: string;
  onSave: (log: Omit<LogEntry, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

export default function LogbookForm({
  editingLog,
  initialDate,
  defaultMentorName = '',
  onSave,
  onDelete,
  onCancel
}: LogbookFormProps) {
  // Local states
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [minutes, setMinutes] = useState(480);
  const [status, setStatus] = useState<'Selesai' | 'Dalam Proses' | 'Tertunda'>('Selesai');
  const [description, setDescription] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});


  // Reset or populate form based on editingLog
  useEffect(() => {
    if (editingLog) {
      setDate(editingLog.date);
      setTitle(editingLog.title);
      setMinutes(editingLog.minutes);
      setStatus(editingLog.status);
      setDescription(editingLog.description);
      setMentorName(editingLog.mentorName || '');
      setNotes(editingLog.notes || '');
      
      // Load or calculate start and end times
      if (editingLog.startTime && editingLog.endTime) {
        setStartTime(editingLog.startTime);
        setEndTime(editingLog.endTime);
      } else {
        setStartTime('08:00');
        const endMin = 8 * 60 + editingLog.minutes;
        const endH = Math.floor(endMin / 60) % 24;
        const endM = endMin % 60;
        setEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
      }
    } else {
      // Create mode
      const todayStr = new Date().toISOString().split('T')[0];
      setDate(initialDate || todayStr);
      setTitle('');
      setStartTime('08:00');
      setEndTime('16:00');
      setMinutes(480);
      setStatus('Selesai');
      setDescription('');
      setMentorName(defaultMentorName);
      setNotes('');
    }
    setErrors({});
  }, [editingLog, initialDate, defaultMentorName]);

  // Dynamically calculate minutes from startTime and endTime
  useEffect(() => {
    if (!startTime || !endTime) return;
    try {
      const [startHours, startMins] = startTime.split(':').map(Number);
      const [endHours, endMins] = endTime.split(':').map(Number);
      
      if (isNaN(startHours) || isNaN(startMins) || isNaN(endHours) || isNaN(endMins)) return;
      
      let diffMins = (endHours * 60 + endMins) - (startHours * 60 + startMins);
      if (diffMins < 0) {
        // Assume crossing to the next day
        diffMins += 24 * 60;
      }
      setMinutes(diffMins);
    } catch (e) {
      // safe fallback
    }
  }, [startTime, endTime]);

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!date) tempErrors.date = 'Tanggal wajib diisi';
    if (!title.trim()) tempErrors.title = 'Aktivitas utama wajib diisi';
    if (!description.trim()) tempErrors.description = 'Deskripsi detail wajib diisi';
    if (!startTime) tempErrors.startTime = 'Jam mulai wajib diisi';
    if (!endTime) tempErrors.endTime = 'Jam selesai wajib diisi';
    if (minutes <= 0 || minutes > 1440) tempErrors.minutes = 'Durasi harus di antara 1 - 1440 menit';
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onSave({
      id: editingLog?.id,
      date,
      title: title.trim(),
      minutes: Number(minutes),
      status,
      description: description.trim(),
      mentorName: mentorName.trim() || undefined,
      notes: notes.trim() || undefined,
      startTime,
      endTime
    });
  };

  const handleDeleteClick = () => {
    if (editingLog && confirm('Apakah Anda yakin ingin menghapus catatan logbook tanggal ini?')) {
      onDelete(editingLog.id);
    }
  };

  return (
    <div id="logbook-form-container" className="max-w-2xl mx-auto bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Header Form */}
      <div className="bg-[#FFFDF6] border-b-4 border-black px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 border-2 border-black bg-white hover:bg-[#FF6B6B] transition-all cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
          </button>
          <div>
            <h2 className="text-base font-display font-black text-black uppercase tracking-wide">
              {editingLog ? 'Edit Catatan Logbook' : 'Tambah Catatan Logbook Baru'}
            </h2>
            <p className="text-xs font-bold text-black/60 font-mono">
              {editingLog ? 'Perbarui aktivitas magang yang sudah dicatat' : 'Catat riwayat dan rincian aktivitas magang harian Anda'}
            </p>
          </div>
        </div>
        
        {editingLog && (
          <button
            type="button"
            id="delete-log-btn"
            onClick={handleDeleteClick}
            className="inline-flex items-center gap-1.5 text-xs text-black font-black uppercase bg-[#FF6B6B] hover:bg-[#ff5555] px-3.5 py-2 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hapus</span>
          </button>
        )}
      </div>

      {/* Main Form Fields */}
      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        {/* Field: Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-display font-black text-black uppercase tracking-wider block">Tanggal Kegiatan <span className="text-red-500">*</span></label>
          <input
            type="date"
            id="log-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-3.5 py-2.5 border-2 border-black bg-[#FFFDF6] text-sm font-mono font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all ${
              errors.date ? 'border-red-500 shadow-[2px_2px_0px_rgba(239,68,68,1)]' : ''
            }`}
          />
          {errors.date && <p className="text-[11px] text-red-500 font-bold">{errors.date}</p>}
        </div>

        {/* Field: Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-display font-black text-black uppercase tracking-wider block">Nama Aktivitas / Kegiatan Utama <span className="text-red-500">*</span></label>
          <input
            type="text"
            id="log-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Merancang mock-up landing page, Memperbaiki bug checkout..."
            className={`w-full px-3.5 py-2.5 border-2 border-black bg-[#FFFDF6] text-sm font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all ${
              errors.title ? 'border-red-500 shadow-[2px_2px_0px_rgba(239,68,68,1)]' : ''
            }`}
          />
          {errors.title && <p className="text-[11px] text-red-500 font-bold">{errors.title}</p>}
        </div>

        {/* Column Group: Waktu & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Field: Waktu Kerja */}
          <div className="space-y-1.5 col-span-1">
            <label className="text-xs font-display font-black text-black uppercase tracking-wider block">Waktu Kerja <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-4">
              {/* Mulai */}
              <div className="flex-1">
                <span className="text-[10px] text-black/60 font-black uppercase block mb-1">Mulai</span>
                <input
                  type="time"
                  id="log-start-time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full px-3 py-2 border-2 border-black bg-[#FFFDF6] text-sm font-mono font-black text-black text-center shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all ${
                    errors.startTime ? 'border-red-500 shadow-[2px_2px_0px_rgba(239,68,68,1)]' : ''
                  }`}
                  title="Jam Mulai"
                />
                {errors.startTime && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.startTime}</p>}
              </div>

              <span className="text-black font-black text-xs uppercase self-end mb-2.5">s/d</span>

              {/* Selesai */}
              <div className="flex-1">
                <span className="text-[10px] text-black/60 font-black uppercase block mb-1">Selesai</span>
                <input
                  type="time"
                  id="log-end-time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`w-full px-3 py-2 border-2 border-black bg-[#FFFDF6] text-sm font-mono font-black text-black text-center shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all ${
                    errors.endTime ? 'border-red-500 shadow-[2px_2px_0px_rgba(239,68,68,1)]' : ''
                  }`}
                  title="Jam Selesai"
                />
                {errors.endTime && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.endTime}</p>}
              </div>
            </div>
            
            {/* Real-time calculated duration box */}
            <div className="mt-2.5 bg-[#C3F2FF] border-2 border-black px-3 py-2.5 flex items-center justify-between shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <span className="text-xs text-black font-black uppercase">Durasi Terhitung:</span>
              <span className="text-xs font-black text-black bg-white border-2 border-black px-2.5 py-1">
                {Math.floor(minutes / 60)} Jam {minutes % 60} Menit
              </span>
            </div>
            {errors.minutes && <p className="text-[11px] text-red-500 font-bold mt-1">{errors.minutes}</p>}
          </div>

          {/* Field: Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-display font-black text-black uppercase tracking-wider block">Status Progres</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Selesai', 'Dalam Proses', 'Tertunda'] as const).map((statusVal) => {
                const isActive = status === statusVal;
                let colorClass = '';
                if (isActive) {
                  if (statusVal === 'Selesai') colorClass = 'bg-[#39FF14] text-black border-2 border-black font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]';
                  else if (statusVal === 'Dalam Proses') colorClass = 'bg-[#FFDE4D] text-black border-2 border-black font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]';
                  else colorClass = 'bg-[#FF6B6B] text-black border-2 border-black font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]';
                } else {
                  colorClass = 'bg-white text-black/70 border-2 border-black hover:bg-black/5 font-bold';
                }

                return (
                  <button
                    key={statusVal}
                    type="button"
                    onClick={() => setStatus(statusVal)}
                    className={`px-2 py-3.5 text-xs uppercase tracking-wide transition-all cursor-pointer text-center ${colorClass}`}
                  >
                    {statusVal}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Field: Description Detail */}
        <div className="space-y-1.5">
          <label className="text-xs font-display font-black text-black uppercase tracking-wider block">Deskripsi Detail Kegiatan <span className="text-red-500">*</span></label>
          <textarea
            id="log-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan secara detail apa yang Anda kerjakan, teknologi/alat yang digunakan, serta hasil yang dicapai..."
            className={`w-full px-3.5 py-2.5 border-2 border-black bg-[#FFFDF6] text-sm font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all ${
              errors.description ? 'border-red-500 shadow-[2px_2px_0px_rgba(239,68,68,1)]' : ''
            }`}
          ></textarea>
          {errors.description && <p className="text-[11px] text-red-500 font-bold">{errors.description}</p>}
        </div>

        {/* Field: Custom Mentor Override */}
        <div className="space-y-1.5">
          <label className="text-xs font-display font-black text-black uppercase tracking-wider block flex items-center gap-1.5">
            Nama Mentor / Supervisor Peninjau
            <span className="text-[10px] text-black/50 font-bold lowercase">(Opsional)</span>
          </label>
          <input
            type="text"
            id="log-mentor"
            value={mentorName}
            onChange={(e) => setMentorName(e.target.value)}
            placeholder={defaultMentorName ? `Default: ${defaultMentorName}` : "Nama pembimbing lapangan untuk hari ini"}
            className="w-full px-3.5 py-2.5 border-2 border-black bg-[#FFFDF6] text-sm font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all"
          />
        </div>

        {/* Field: Notes / Reflections */}
        <div className="space-y-1.5">
          <label className="text-xs font-display font-black text-black uppercase tracking-wider block flex items-center gap-1.5">
            Catatan Tambahan & Refleksi Belajar
            <span className="text-[10px] text-black/50 font-bold lowercase">(Opsional)</span>
          </label>
          <textarea
            id="log-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Kendala yang dihadapi, solusi yang ditemukan, atau refleksi pembelajaran hari ini..."
            className="w-full px-3.5 py-2.5 border-2 border-black bg-[#FFFDF6] text-sm font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all"
          ></textarea>
        </div>

        {/* Action Buttons */}
        <div className="border-t-4 border-black pt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border-2 border-black bg-white hover:bg-black/5 text-sm font-black uppercase tracking-wide cursor-pointer transition-all"
          >
            Batal
          </button>
          
          <button
            type="submit"
            id="save-log-btn"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#39FF14] text-black border-3 border-black text-sm font-black uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-black" />
            {editingLog ? 'Simpan Perubahan' : 'Simpan Logbook'}
          </button>
        </div>
      </form>
    </div>
  );
}
