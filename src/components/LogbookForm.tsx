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
    } else {
      // Create mode
      const todayStr = new Date().toISOString().split('T')[0];
      setDate(initialDate || todayStr);
      setTitle('');
      setMinutes(480);
      setStatus('Selesai');
      setDescription('');
      setMentorName(defaultMentorName);
      setNotes('');
    }
    setErrors({});
  }, [editingLog, initialDate, defaultMentorName]);

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!date) tempErrors.date = 'Tanggal wajib diisi';
    if (!title.trim()) tempErrors.title = 'Aktivitas utama wajib diisi';
    if (!description.trim()) tempErrors.description = 'Deskripsi detail wajib diisi';
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
      notes: notes.trim() || undefined
    });
  };

  const handleDeleteClick = () => {
    if (editingLog && confirm('Apakah Anda yakin ingin menghapus catatan logbook tanggal ini?')) {
      onDelete(editingLog.id);
    }
  };

  return (
    <div id="logbook-form-container" className="max-w-2xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden">
      {/* Header Form */}
      <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editingLog ? 'Edit Catatan Logbook' : 'Tambah Catatan Logbook Baru'}
            </h2>
            <p className="text-xs text-gray-400">
              {editingLog ? 'Perbarui aktivitas magang yang sudah dicatat' : 'Catat riwayat dan rincian aktivitas magang harian Anda'}
            </p>
          </div>
        </div>
        
        {editingLog && (
          <button
            type="button"
            id="delete-log-btn"
            onClick={handleDeleteClick}
            className="inline-flex items-center gap-1.5 text-xs text-red-600 font-medium hover:text-red-700 transition-colors cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200/40"
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
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Tanggal Kegiatan <span className="text-red-500">*</span></label>
          <input
            type="date"
            id="log-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 ${
              errors.date ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
            }`}
          />
          {errors.date && <p className="text-[11px] text-red-500 font-medium">{errors.date}</p>}
        </div>

        {/* Field: Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Nama Aktivitas / Kegiatan Utama <span className="text-red-500">*</span></label>
          <input
            type="text"
            id="log-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Merancang mock-up landing page, Memperbaiki bug checkout..."
            className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 ${
              errors.title ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-gray-900'
            }`}
          />
          {errors.title && <p className="text-[11px] text-red-500 font-medium">{errors.title}</p>}
        </div>

        {/* Column Group: Minutes & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Field: Duration Minutes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Durasi Kerja (Menit) <span className="text-red-500">*</span></label>
            <input
              type="number"
              id="log-minutes"
              min="1"
              max="1440"
              placeholder="Contoh: 480"
              value={minutes === 0 ? '' : minutes}
              onChange={(e) => setMinutes(e.target.value === '' ? 0 : Number(e.target.value))}
              className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 ${
                errors.minutes ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-gray-200 focus:ring-gray-900 focus:border-gray-900'
              }`}
            />
            {errors.minutes && <p className="text-[11px] text-red-500 font-medium">{errors.minutes}</p>}
          </div>

          {/* Field: Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Status Progres</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Selesai', 'Dalam Proses', 'Tertunda'] as const).map((statusVal) => {
                const isActive = status === statusVal;
                let colorClass = '';
                if (isActive) {
                  if (statusVal === 'Selesai') colorClass = 'bg-gray-900 text-white border-gray-900';
                  else if (statusVal === 'Dalam Proses') colorClass = 'bg-gray-800 text-white border-gray-800';
                  else colorClass = 'bg-gray-700 text-white border-gray-700';
                } else {
                  colorClass = 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50';
                }

                return (
                  <button
                    key={statusVal}
                    type="button"
                    onClick={() => setStatus(statusVal)}
                    className={`border px-2 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-center ${colorClass}`}
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
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">Deskripsi Detail Kegiatan <span className="text-red-500">*</span></label>
          <textarea
            id="log-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan secara detail apa yang Anda kerjakan, teknologi/alat yang digunakan, serta hasil yang dicapai..."
            className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 ${
              errors.description ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-gray-900'
            }`}
          ></textarea>
          {errors.description && <p className="text-[11px] text-red-500 font-medium">{errors.description}</p>}
        </div>

        {/* Field: Custom Mentor Override */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block flex items-center gap-1.5">
            Nama Mentor / Supervisor Peninjau
            <span className="text-[10px] text-gray-400 font-normal lowercase">(Opsional)</span>
          </label>
          <input
            type="text"
            id="log-mentor"
            value={mentorName}
            onChange={(e) => setMentorName(e.target.value)}
            placeholder={defaultMentorName ? `Default: ${defaultMentorName}` : "Nama pembimbing lapangan untuk hari ini"}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>

        {/* Field: Notes / Reflections */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block flex items-center gap-1.5">
            Catatan Tambahan & Refleksi Belajar
            <span className="text-[10px] text-gray-400 font-normal lowercase">(Opsional)</span>
          </label>
          <textarea
            id="log-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Kendala yang dihadapi, solusi yang ditemukan, atau refleksi pembelajaran hari ini..."
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          ></textarea>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-100 pt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          
          <button
            type="submit"
            id="save-log-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            {editingLog ? 'Simpan Perubahan' : 'Simpan Logbook'}
          </button>
        </div>
      </form>
    </div>
  );
}
