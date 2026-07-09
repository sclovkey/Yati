/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { LogEntry, InternshipInfo } from '../types';

// Helper to format date in Indonesian format
export function formatDateIndonesian(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${day} ${monthName} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

// Export to Excel function
export function exportToExcel(logs: LogEntry[], info: InternshipInfo) {
  if (logs.length === 0) {
    alert('Tidak ada data logbook untuk diekspor.');
    return;
  }

  // Create formatted metadata sheet
  const metadata = [
    ['LAPORAN KEGIATAN MAGANG - YATI MAGANG'],
    [''],
    ['INFORMASI MAHASISWA & TEMPAT MAGANG'],
    ['Nama Mahasiswa', info.studentName || '-'],
    ['Institusi/Kampus', info.institution || '-'],
    ['Nama Perusahaan/Instansi', info.companyName || '-'],
    ['Posisi Magang', info.position || '-'],
    ['Pembimbing Lapangan / Mentor', info.mentorName || '-'],
    ['Periode Magang', `${info.startDate ? formatDateIndonesian(info.startDate) : '-'} s.d. ${info.endDate ? formatDateIndonesian(info.endDate) : '-'}`],
    ['Total Kegiatan', `${logs.length} Hari`],
    ['Total Durasi Kerja', `${logs.reduce((sum, log) => sum + log.minutes, 0)} Menit`],
    [''],
    ['Daftar Kegiatan Magang']
  ];

  const metadataWS = XLSX.utils.aoa_to_sheet(metadata);

  // Create logs sheet
  const logsData = logs.map((log, index) => ({
    'No': index + 1,
    'Tanggal': formatDateIndonesian(log.date),
    'Aktivitas / Kegiatan': log.title,
    'Deskripsi Detail': log.description,
    'Durasi (Menit)': log.minutes,
    'Status': log.status,
    'Mentor': log.mentorName || info.mentorName || '-',
    'Catatan / Refleksi': log.notes || '-'
  }));

  const logsWS = XLSX.utils.json_to_sheet(logsData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 6 },   // No
    { wch: 25 },  // Tanggal
    { wch: 30 },  // Aktivitas
    { wch: 45 },  // Deskripsi Detail
    { wch: 15 },  // Durasi (Menit)
    { wch: 15 },  // Status
    { wch: 20 },  // Mentor
    { wch: 35 }   // Catatan
  ];
  logsWS['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, metadataWS, 'Ringkasan & Profil');
  XLSX.utils.book_append_sheet(workbook, logsWS, 'Data Logbook');

  // Format filename cleanly
  const filename = `Logbook_Magang_${info.studentName.replace(/\s+/g, '_') || 'Yati_Magang'}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// Export to PDF function
export function exportToPDF(logs: LogEntry[], info: InternshipInfo) {
  if (logs.length === 0) {
    alert('Tidak ada data logbook untuk diekspor.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette - Minimalist Gray / Slate & White
  const primaryColor = [71, 85, 105]; // Slate 600
  const secondaryColor = [148, 163, 184]; // Slate 400
  const textColor = [51, 65, 85]; // Slate 700
  const lightBg = [248, 250, 252]; // Slate 50

  // Helper: Draw header on each page
  const drawPageHeader = (pageNum: number) => {
    doc.setFillColor(71, 85, 105);
    doc.rect(0, 0, pageWidth, 15, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('YATI MAGANG - LAPORAN KEGIATAN MAGANG', 15, 9.5);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Halaman ${pageNum}`, pageWidth - 25, 9.5);
  };

  // Helper: Draw footer on each page
  const drawPageFooter = (pageNum: number) => {
    // If page >= 2, draw the compact Mentor Signature block above standard footer
    if (pageNum >= 2) {
      const sigY = pageHeight - 36;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('Tanda Tangan Pembimbing atau Mentor:', pageWidth - 80, sigY);
      
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.line(pageWidth - 80, sigY + 12, pageWidth - 15, sigY + 12);
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(info.mentorName || '__________________', pageWidth - 47.5, sigY + 16, { align: 'center' });
    }

    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    
    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Dokumen ini digenerate secara otomatis melalui aplikasi Yati Magang.', 15, pageHeight - 10);
    doc.text(`Dicetak pada: ${formatDateIndonesian(new Date().toISOString().split('T')[0])}`, pageWidth - 80, pageHeight - 10);
  };

  // PAGE 1: COVER & PROFILE SUMMARY
  // Title
  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('LAPORAN KEGIATAN MAGANG', 15, 40);
  
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(1.5);
  doc.line(15, 45, 100, 45);

  doc.setTextColor(100, 116, 139);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Logbook Aktivitas Kerja Praktik / Magang Harian', 15, 52);

  // Profile Card Background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 62, pageWidth - 30, 80, 2, 2, 'F');

  // Profile Title
  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PROFIL MAHASISWA & INSTANSI MAGANG', 22, 72);
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(22, 75, pageWidth - 22, 75);

  // Profile Fields
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  
  const labelX = 22;
  const valX = 65;
  let currentY = 83;

  const drawField = (label: string, val: string) => {
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label, labelX, currentY);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(val || '-', valX, currentY);
    currentY += 8;
  };

  drawField('Nama Mahasiswa', info.studentName);
  drawField('Institusi / Kampus', info.institution);
  drawField('Perusahaan / Instansi', info.companyName);
  drawField('Posisi / Peran', info.position);
  drawField('Pembimbing / Mentor', info.mentorName);
  drawField('Periode Magang', `${info.startDate ? formatDateIndonesian(info.startDate) : '-'} s.d. ${info.endDate ? formatDateIndonesian(info.endDate) : '-'}`);

  // Statistics Card
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, 150, pageWidth - 30, 35, 2, 2, 'F');

  doc.setTextColor(71, 85, 105);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RINGKASAN AKTIVITAS MAGANG', 22, 160);

  // Stat items
  const totalDays = logs.length;
  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  const avgMinutes = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
  const completedCount = logs.filter(l => l.status === 'Selesai').length;
  const completionRate = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Hari Kerja:', 22, 170);
  doc.text('Total Durasi Kerja:', 75, 170);
  doc.text('Rata-rata Menit/Hari:', 135, 170);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`${totalDays} Hari`, 48, 170);
  doc.text(`${totalMinutes} Menit`, 105, 170);
  doc.text(`${avgMinutes} Menit`, 168, 170);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tingkat Penyelesaian:', 22, 178);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`${completionRate}% (${completedCount}/${totalDays} Selesai)`, 60, 178);

  // Add signature section at bottom of Page 1
  const sigY = pageHeight - 55;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Mengetahui,', 20, sigY);
  doc.text('Pembimbing Lapangan / Mentor', 20, sigY + 5);
  
  doc.text('Disusun oleh,', pageWidth - 70, sigY);
  doc.text('Mahasiswa Magang', pageWidth - 70, sigY + 5);

  doc.line(20, sigY + 30, 80, sigY + 30);
  doc.setFont('Helvetica', 'bold');
  doc.text(info.mentorName || '__________________', 50, sigY + 34, { align: 'center' });

  doc.line(pageWidth - 70, sigY + 30, pageWidth - 15, sigY + 30);
  doc.text(info.studentName || '__________________', pageWidth - 42.5, sigY + 34, { align: 'center' });

  drawPageFooter(1);

  // PAGE 2: LOGBOOK BLOCKS (NO COLUMNS)
  doc.addPage();
  drawPageHeader(2);

  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RINCIAN LOGBOOK AKTIVITAS HARIAN', 15, 25);

  currentY = 32;
  let currentPage = 2;
  const margin = 15;
  const usableWidth = pageWidth - 2 * margin; // 180mm

  // Sort logs chronologically by date ascending
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  // Helper to format time range (e.g. 08.00 - 10.00)
  const formatWaktu = (log: LogEntry): string => {
    if (log.startTime && log.endTime) {
      return `${log.startTime.replace(':', '.')} - ${log.endTime.replace(':', '.')}`;
    }
    const start = log.startTime ? log.startTime.replace(':', '.') : '08.00';
    if (log.endTime) {
      return `${start} - ${log.endTime.replace(':', '.')}`;
    }
    const totalMinutes = log.minutes || 0;
    const startHours = 8;
    const startMinutes = 0;
    const endHours = Math.floor(startHours + (startMinutes + totalMinutes) / 60);
    const endMins = (startMinutes + totalMinutes) % 60;
    const endStr = `${endHours.toString().padStart(2, '0')}.${endMins.toString().padStart(2, '0')}`;
    return `${start} - ${endStr}`;
  };

  // Group logs by date
  const groupedLogs: { [date: string]: LogEntry[] } = {};
  sortedLogs.forEach((log) => {
    if (!groupedLogs[log.date]) {
      groupedLogs[log.date] = [];
    }
    groupedLogs[log.date].push(log);
  });

  interface PreparedEntry {
    waktuText: string;
    statusText: string;
    titleLines: string[];
    descLines: string[];
    notesLines: string[];
    entryHeight: number;
  }

  const lineSpacing = 4.5;
  const headerHeight = 9;
  const padding = 4;
  const entrySpacing = 6; // gap between multiple entries on the same day

  // Pre-process date groups and heights
  const dateGroups = Object.keys(groupedLogs).sort().map(date => {
    const entries = groupedLogs[date];
    const preparedEntries: PreparedEntry[] = entries.map(log => {
      const waktuText = formatWaktu(log);
      const statusText = log.status;
      
      const titleLines: string[] = doc.splitTextToSize(`Aktivitas: ${log.title}`, usableWidth - 10);
      const descLines: string[] = doc.splitTextToSize(`Deskripsi: ${log.description || '-'}`, usableWidth - 10);
      const notesText = log.notes ? `Catatan/Refleksi: ${log.notes}` : '';
      const notesLines: string[] = notesText ? doc.splitTextToSize(notesText, usableWidth - 10) : [];
      
      let entryHeight = 0;
      entryHeight += lineSpacing; // for waktu & status line
      entryHeight += 1; // small gap
      entryHeight += titleLines.length * lineSpacing;
      entryHeight += 1; // small gap
      entryHeight += descLines.length * lineSpacing;
      if (notesLines.length > 0) {
        entryHeight += 1; // small gap
        entryHeight += notesLines.length * lineSpacing;
      }
      
      return {
        waktuText,
        statusText,
        titleLines,
        descLines,
        notesLines,
        entryHeight
      };
    });
    
    // Total height of the card for this date
    let totalContentHeight = padding * 2;
    preparedEntries.forEach((entry, idx) => {
      totalContentHeight += entry.entryHeight;
      if (idx < preparedEntries.length - 1) {
        totalContentHeight += entrySpacing;
      }
    });
    
    const cardHeight = headerHeight + totalContentHeight;
    
    return {
      date,
      dateText: formatDateIndonesian(date),
      preparedEntries,
      cardHeight
    };
  });

  dateGroups.forEach((group) => {
    const { dateText, preparedEntries, cardHeight } = group;

    // Page Break Check - if the card goes beyond printable area (adjusted to leave space for signature footer)
    if (currentY + cardHeight > pageHeight - 42) {
      doc.addPage();
      currentPage++;
      drawPageHeader(currentPage);
      drawPageFooter(currentPage);
      currentY = 25; // Reset Y on new page under header
    }

    const x = margin;
    const y = currentY;

    // Outer box with black border (Neo-brutalist theme matching Yati Magang)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(x, y, usableWidth, cardHeight, 'FD');

    // Header strip for Tanggal
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(x, y, usableWidth, headerHeight, 'FD');

    // Date Text
    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(dateText, x + 4, y + 6);

    // Draw content inside the card
    let textY = y + headerHeight + padding + 3.5;

    preparedEntries.forEach((entry, idx) => {
      // If not the first entry, draw a thin separator line
      if (idx > 0) {
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.line(x + 4, textY - 4.5, x + usableWidth - 4, textY - 4.5);
      }

      // Entry Header: Waktu & Status
      doc.setTextColor(0, 0, 0);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      const entryWaktuStr = `Jam Kerja: ${entry.waktuText}`;
      doc.text(entryWaktuStr, x + 4, textY);

      const statusStr = `Status: ${entry.statusText}`;
      const statusWidth = doc.getTextWidth(statusStr);
      doc.text(statusStr, x + usableWidth - statusWidth - 4, textY);

      textY += lineSpacing + 1;

      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      entry.titleLines.forEach(line => {
        doc.text(line, x + 4, textY);
        textY += lineSpacing;
      });

      textY += 1; // gap

      // Description
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85); // slate-700
      entry.descLines.forEach(line => {
        doc.text(line, x + 4, textY);
        textY += lineSpacing;
      });

      // Notes / Reflection if any
      if (entry.notesLines.length > 0) {
        textY += 1; // gap
        doc.setFont('Helvetica', 'oblique');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        entry.notesLines.forEach(line => {
          doc.text(line, x + 4, textY);
          textY += lineSpacing;
        });
      }

      // Add space for the next entry
      textY += entrySpacing - 1;
    });

    // Move Y coordinate to the next block with a small 5mm gap
    currentY += cardHeight + 5;
  });

  // Finally ensure the last page has a footer drawn
  drawPageFooter(currentPage);

  // Save the PDF
  const filename = `Logbook_Magang_${info.studentName.replace(/\s+/g, '_') || 'Yati_Magang'}.pdf`;
  doc.save(filename);
}
