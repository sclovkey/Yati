/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const drawPageFooter = () => {
    doc.setDrawColor(226, 232, 240); // Slate 200
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
  doc.text(info.mentorName || '__________________', 20, sigY + 34);

  doc.line(pageWidth - 70, sigY + 30, pageWidth - 15, sigY + 30);
  doc.text(info.studentName || '__________________', pageWidth - 70, sigY + 34);

  drawPageFooter();

  // PAGE 2: LOGBOOK TABLE
  doc.addPage();
  drawPageHeader(2);

  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RINCIAN LOGBOOK AKTIVITAS HARIAN', 15, 25);

  const tableBody = logs.map((log, index) => [
    index + 1,
    formatDateIndonesian(log.date).replace(/^[A-Za-z]+,\s+/, ''), // Strip the day name to save table space
    `${log.title}\n\n${log.description}`,
    `${log.minutes} Menit`,
    log.status
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['No', 'Tanggal', 'Aktivitas & Deskripsi', 'Durasi', 'Status']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [71, 85, 105], // Slate 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 113 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' }
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 15, right: 15, bottom: 20, top: 20 },
    didDrawPage: (data) => {
      // Add page header and footer for subsequent pages
      if (data.pageNumber > 1) {
        // Redraw standard headers and footers on auto-created pages
        drawPageHeader(data.pageNumber);
        drawPageFooter();
      }
    }
  });

  // Final draw page footer on page 2 (in case autoTable didn't overflow to 3rd page, we still need footer on page 2)
  drawPageFooter();

  // Save the PDF
  const filename = `Logbook_Magang_${info.studentName.replace(/\s+/g, '_') || 'Yati_Magang'}.pdf`;
  doc.save(filename);
}
