import React, { useState, useEffect, useRef } from 'react';
import { AttendanceRecord, OfficeLocation, InternshipInfo } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Camera, 
  MapPin, 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  Settings, 
  Map, 
  Image as ImageIcon,
  UserCheck,
  MapPinned,
  Trash2,
  FileDown
} from 'lucide-react';

interface AttendanceSystemProps {
  attendanceLogs: AttendanceRecord[];
  onSaveAttendance: (newRecord: AttendanceRecord) => void;
  onDeleteAttendance: (id: string) => void;
  officeLoc: OfficeLocation;
  onUpdateOfficeLoc: (newLoc: OfficeLocation) => void;
  info?: InternshipInfo;
}

// Haversine formula to calculate distance in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance in meters
}

// Helper to check if check-in or check-out is past limit
function isTimeLater(timeStr: string, limitStr: string): boolean {
  if (!timeStr || !limitStr) return false;
  // Support HH:MM:SS and HH:MM
  const [h1, m1] = timeStr.split(':').map(Number);
  const [h2, m2] = limitStr.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return false;
  return (h1 * 60 + m1) > (h2 * 60 + m2);
}

export default function AttendanceSystem({
  attendanceLogs,
  onSaveAttendance,
  onDeleteAttendance,
  officeLoc,
  onUpdateOfficeLoc,
  info
}: AttendanceSystemProps) {
  // State for location
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  // Camera stream and UI states
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const isOfficeConfigured = officeLoc && (officeLoc.latitude !== 0 || officeLoc.longitude !== 0);

  // Settings toggle
  const [showSettings, setShowSettings] = useState(!isOfficeConfigured);
  
  // Custom inputs for settings
  const [tempLat, setTempLat] = useState(isOfficeConfigured ? officeLoc.latitude.toString() : '');
  const [tempLng, setTempLng] = useState(isOfficeConfigured ? officeLoc.longitude.toString() : '');
  const [tempRadius, setTempRadius] = useState(officeLoc.radius ? officeLoc.radius.toString() : '600');
  const [tempName, setTempName] = useState(officeLoc.name || '');
  const [tempWorkStart, setTempWorkStart] = useState(officeLoc.workStart || '08:00');
  const [tempWorkEnd, setTempWorkEnd] = useState(officeLoc.workEnd || '17:00');

  // State for Sakit/Izin
  const [presenceTab, setPresenceTab] = useState<'hadir' | 'nonHadir'>('hadir');
  const [nonPresenceType, setNonPresenceType] = useState<'Sakit' | 'Izin'>('Sakit');
  const [nonPresenceReason, setNonPresenceReason] = useState('');
  const [nonPresencePhoto, setNonPresencePhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Callback ref to bind stream instantly when video element mounts
  const videoRefCallback = (node: HTMLVideoElement | null) => {
    if (node) {
      videoRef.current = node;
      if (streamRef.current) {
        node.srcObject = streamRef.current;
        node.play().catch(err => {
          console.warn("Autoplay video failed, attempting muted play:", err);
          node.muted = true;
          node.play().catch(pErr => console.warn("Muted play also failed:", pErr));
        });
      }
    } else {
      videoRef.current = null;
    }
  };

  // Today's Date String
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Find today's attendance record
  const todayRecord = attendanceLogs.find(log => log.date === todayStr);

  const [cameraEnabled, setCameraEnabled] = useState(!todayRecord);
  const isMounted = useRef(true);
  const shouldCameraRunRef = useRef(false);

  // Get current position
  const getGeoLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung oleh browser Anda.');
      return;
    }

    setIsFetchingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentCoords({ latitude, longitude });
        
        // Calculate distance
        if (officeLoc && (officeLoc.latitude !== 0 || officeLoc.longitude !== 0)) {
          const dist = calculateDistance(latitude, longitude, officeLoc.latitude, officeLoc.longitude);
          setDistance(dist);
        } else {
          setDistance(null);
        }
        setIsFetchingLocation(false);
      },
      (error) => {
        let msg = 'Gagal mengambil koordinat lokasi.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Izin lokasi ditolak. Harap izinkan akses lokasi pada browser Anda.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Informasi lokasi tidak tersedia saat ini.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Waktu pengambilan lokasi habis.';
        }
        setLocationError(msg);
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Fetch location on mount
  useEffect(() => {
    getGeoLocation();
  }, []);

  // Keep temp states synchronized when officeLoc changes from elsewhere
  useEffect(() => {
    const hasCoords = officeLoc && (officeLoc.latitude !== 0 || officeLoc.longitude !== 0);
    setTempLat(hasCoords ? officeLoc.latitude.toString() : '');
    setTempLng(hasCoords ? officeLoc.longitude.toString() : '');
    setTempRadius(officeLoc.radius ? officeLoc.radius.toString() : '600');
    setTempName(officeLoc.name || '');
    setTempWorkStart(officeLoc.workStart || '08:00');
    setTempWorkEnd(officeLoc.workEnd || '17:00');
  }, [officeLoc]);

  // Handle office settings submit
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(tempLat);
    const lng = parseFloat(tempLng);
    const rad = parseInt(tempRadius, 10);

    if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
      alert('Input tidak valid. Harap periksa koordinat dan radius Anda.');
      return;
    }

    onUpdateOfficeLoc({
      latitude: lat,
      longitude: lng,
      radius: rad,
      name: tempName || 'Titik Kantor Pusat',
      workStart: tempWorkStart || '08:00',
      workEnd: tempWorkEnd || '17:00'
    });
    
    setShowSettings(false);
  };

  // Set current position as office coordinates
  const handleSetCurrentAsOffice = () => {
    if (currentCoords) {
      setTempLat(currentCoords.latitude.toString());
      setTempLng(currentCoords.longitude.toString());
    } else {
      alert('Lokasi Anda saat ini belum terekam. Harap tunggu hingga lokasi Anda berhasil diambil.');
    }
  };

  // Start Camera
  const startCamera = async () => {
    if (!isMounted.current) return;
    setCapturedPhoto(null);
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API Kamera tidak didukung di browser ini.');
      }

      let stream;
      try {
        // Try standard selfie/user facing mode
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        });
      } catch (firstErr) {
        console.warn('Failed with strict facingMode, trying ideal facingMode', firstErr);
        try {
          // Try ideal facing mode
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: 'user' } }, 
            audio: false 
          });
        } catch (secondErr) {
          console.warn('Failed with ideal facingMode, trying generic video', secondErr);
          // Try generic any video input
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
          });
        }
      }
      
      // CRITICAL RACE CONDITION CHECK:
      // If the component was unmounted OR if the camera should no longer be active/running,
      // stop the tracks immediately to prevent active camera leaks in the browser!
      if (!isMounted.current || !shouldCameraRunRef.current) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        return;
      }

      streamRef.current = stream;
      setCameraActive(true);
    } catch (err: any) {
      if (!isMounted.current || !shouldCameraRunRef.current) return;
      console.warn('Camera access (non-fatal warning):', err);
      const isDeviceNotFound = err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.message?.includes('not found');
      if (isDeviceNotFound) {
        setCameraError('Kamera tidak ditemukan pada perangkat Anda. Silakan gunakan opsi unggah manual di bawah.');
      } else {
        setCameraError('Gagal mengakses kamera langsung. Silakan pastikan Anda mengizinkan akses kamera pada browser Anda atau gunakan tombol unggah foto di bawah.');
      }
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Automatically activate camera on mount or when photo is cleared/reset
  const hasClockedOut = todayRecord ? (todayRecord.status === 'Sakit' || todayRecord.status === 'Izin' || !!todayRecord.clockOutTime) : false;
  const hasPhoto = !!capturedPhoto;

  const shouldRun = !hasClockedOut && presenceTab === 'hadir' && !hasPhoto && cameraEnabled;
  shouldCameraRunRef.current = shouldRun;

  useEffect(() => {
    if (shouldRun) {
      if (!cameraActive && !cameraError) {
        startCamera();
      }
    } else {
      if (cameraActive) {
        stopCamera();
      }
    }
  }, [shouldRun, cameraActive, cameraError]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      shouldCameraRunRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Capture Image
  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1); // Flip horizontally for selfie effect
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  // Fallback upload photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Sakit / Izin handler
  const handleNonPresenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nonPresenceReason.trim()) {
      alert('Harap masukkan alasan ketidakhadiran.');
      return;
    }

    const newRecord: AttendanceRecord = {
      id: 'att_' + Date.now(),
      date: todayStr,
      status: nonPresenceType,
      notes: nonPresenceReason,
      clockInPhoto: nonPresencePhoto || undefined, // can attach doctor note or proof image
      clockInTime: '--:--:--', // placeholder text
    };

    onSaveAttendance(newRecord);
    // Reset form states
    setNonPresenceReason('');
    setNonPresencePhoto(null);
  };

  // Check In handler
  const handleClockIn = () => {
    if (!capturedPhoto) {
      alert('Harap ambil foto terlebih dahulu sebelum melakukan presensi.');
      return;
    }
    if (!currentCoords) {
      alert('Koordinat lokasi Anda wajib diperoleh terlebih dahulu.');
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dist = distance !== null ? distance : calculateDistance(currentCoords.latitude, currentCoords.longitude, officeLoc.latitude, officeLoc.longitude);

    const newRecord: AttendanceRecord = {
      id: 'att_' + Date.now(),
      date: todayStr,
      clockInTime: timeStr,
      clockInPhoto: capturedPhoto,
      clockInCoords: { ...currentCoords },
      clockInDistance: dist
    };

    onSaveAttendance(newRecord);
    setCapturedPhoto(null);
    setCameraEnabled(false);
  };

  // Check Out handler
  const handleClockOut = () => {
    if (!todayRecord) return;
    if (!capturedPhoto) {
      alert('Harap ambil foto terlebih dahulu sebelum melakukan presensi.');
      return;
    }
    if (!currentCoords) {
      alert('Koordinat lokasi Anda wajib diperoleh terlebih dahulu.');
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dist = distance !== null ? distance : calculateDistance(currentCoords.latitude, currentCoords.longitude, officeLoc.latitude, officeLoc.longitude);

    const updatedRecord: AttendanceRecord = {
      ...todayRecord,
      clockOutTime: timeStr,
      clockOutPhoto: capturedPhoto,
      clockOutCoords: { ...currentCoords },
      clockOutDistance: dist
    };

    onSaveAttendance(updatedRecord);
    setCapturedPhoto(null);
    setCameraEnabled(false);
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Title header band (Deep Charcoal background with white text)
      doc.setFillColor(31, 41, 55); 
      doc.rect(0, 0, 297, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('LAPORAN KEHADIRAN PRESENSI MAGANG', 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      const nowPrint = new Date();
      const datePrintStr = nowPrint.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const timePrintStr = `${String(nowPrint.getHours()).padStart(2, '0')}:${String(nowPrint.getMinutes()).padStart(2, '0')}:${String(nowPrint.getSeconds()).padStart(2, '0')}`;
      doc.text(`Dicetak pada: ${datePrintStr} ${timePrintStr}`, 14, 25);

      // Section title
      doc.setTextColor(55, 65, 81);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('INFORMASI PESERTA MAGANG', 14, 46);

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(14, 48, 283, 48);

      // Metadata grid (Left Column)
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text('Nama Peserta:', 14, 54);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(info?.studentName || '-', 48, 54);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Institusi / Sekolah:', 14, 60);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(info?.institution || '-', 48, 60);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Posisi Magang:', 14, 66);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(info?.position || '-', 48, 66);

      // Metadata grid (Right Column)
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Perusahaan:', 150, 54);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(info?.companyName || '-', 185, 54);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Nama Mentor:', 150, 60);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(info?.mentorName || '-', 185, 60);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Periode Magang:', 150, 66);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(`${info?.startDate || '-'} s.d. ${info?.endDate || '-'}`, 185, 66);

      // Prepare table data
      const tableHeaders = [
        'No',
        'Tanggal',
        'Foto Masuk',
        'Jam Masuk',
        'Jarak Masuk',
        'Foto Pulang',
        'Jam Pulang',
        'Jarak Pulang',
        'Status'
      ];

      const tableRows = attendanceLogs.map((log, index) => {
        const dayFormat = new Date(log.date).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        const isSakitOrIzin = log.status === 'Sakit' || log.status === 'Izin';
        let statusText = log.clockOutTime ? 'Selesai' : 'Sedang Kerja';
        if (log.status === 'Sakit') {
          statusText = `Sakit: ${log.notes || '-'}`;
        } else if (log.status === 'Izin') {
          statusText = `Izin: ${log.notes || '-'}`;
        }

        return [
          (index + 1).toString(),
          dayFormat,
          '', // clockInPhoto placeholder
          isSakitOrIzin ? '-' : (log.clockInTime || '-'),
          isSakitOrIzin ? '-' : (log.clockInDistance !== undefined ? `${log.clockInDistance} m` : '-'),
          '', // clockOutPhoto placeholder
          isSakitOrIzin ? '-' : (log.clockOutTime || '--:--:--'),
          isSakitOrIzin ? '-' : (log.clockOutDistance !== undefined ? `${log.clockOutDistance} m` : '-'),
          statusText
        ];
      });

      // Construct PDF Table
      autoTable(doc, {
        startY: 74,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [31, 41, 55], // Gray 800
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 55 },
          2: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 26, halign: 'center' },
          4: { cellWidth: 26, halign: 'center' },
          5: { cellWidth: 32, halign: 'center' },
          6: { cellWidth: 26, halign: 'center' },
          7: { cellWidth: 26, halign: 'center' },
          8: { cellWidth: 28, halign: 'center' }
        },
        styles: {
          fontSize: 8.5,
          minCellHeight: 24, // Plenty of room for 18mm high images
          valign: 'middle'
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            const rowIndex = data.row.index;
            const log = attendanceLogs[rowIndex];
            if (!log) return;

            if (data.column.index === 2 || data.column.index === 5) {
              const base64Data = data.column.index === 2 ? log.clockInPhoto : log.clockOutPhoto;
              const cellWidth = data.column.width;
              const cellHeight = data.cell.height;

              if (base64Data && base64Data.startsWith('data:image')) {
                try {
                  const imgSize = 18; // Square aspect ratio looks very uniform and neat!
                  const xOffset = data.cell.x + (cellWidth - imgSize) / 2;
                  const yOffset = data.cell.y + (cellHeight - imgSize) / 2;

                  doc.addImage(base64Data, 'JPEG', xOffset, yOffset, imgSize, imgSize);
                } catch (e) {
                  console.error('Failed to draw image inside PDF cell:', e);
                  // Fallback if image fails
                  doc.setFont('helvetica', 'normal');
                  doc.setFontSize(8);
                  doc.setTextColor(156, 163, 175);
                  const text = '[Gambar]';
                  const textWidth = doc.getTextWidth(text);
                  const x = data.cell.x + (cellWidth - textWidth) / 2;
                  const y = data.cell.y + (cellHeight / 2) + 3;
                  doc.text(text, x, y);
                }
              } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
                const text = '-';
                const textWidth = doc.getTextWidth(text);
                const x = data.cell.x + (cellWidth - textWidth) / 2;
                const y = data.cell.y + (cellHeight / 2) + 3;
                doc.text(text, x, y);
              }
            }
          }
        },
        margin: { left: 14, right: 14 },
        pageBreak: 'auto',
        rowPageBreak: 'avoid'
      });

      const rawName = info?.studentName || 'Yati_Amalia';
      const safeName = rawName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`presensi_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Export failed:', error);
      alert('Gagal mengekspor PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const isWithinRadius = distance !== null && distance <= officeLoc.radius;

  return (
    <div id="attendance-section" className="space-y-8 text-black font-sans">
      {/* Header Banner */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-black">
            <UserCheck className="w-6 h-6 text-black" />
            <h1 className="text-xl font-display font-black uppercase tracking-wide">Presensi Kehadiran Harian</h1>
          </div>
          <p className="text-xs font-bold text-black/70 leading-relaxed">
            Lakukan pencatatan jam masuk dan pulang kerja magang Anda secara real-time dengan melampirkan swafoto (selfie) dan deteksi titik lokasi kantor.
          </p>
        </div>
        <button
          onClick={() => {
            setShowSettings(!showSettings);
            // Reset temp inputs
            const hasCoords = officeLoc && (officeLoc.latitude !== 0 || officeLoc.longitude !== 0);
            setTempLat(hasCoords ? officeLoc.latitude.toString() : '');
            setTempLng(hasCoords ? officeLoc.longitude.toString() : '');
            setTempRadius(officeLoc.radius ? officeLoc.radius.toString() : '600');
            setTempName(officeLoc.name || '');
            setTempWorkStart(officeLoc.workStart || '08:00');
            setTempWorkEnd(officeLoc.workEnd || '17:00');
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 border-2 border-black bg-[#C3F2FF] hover:bg-[#a9e4f5] text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
        >
          <Settings className="w-4 h-4 text-black" />
          {showSettings ? 'Tutup Atur Titik' : 'Atur Titik Kantor'}
        </button>
      </div>

      {/* Settings Form Card */}
      {showSettings && (
        <div className="bg-[#FFFDF6] border-4 border-black p-5 md:p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-4">
          {/* Guide banner for new registrants */}
          {attendanceLogs.length === 0 && (
            <div className="bg-[#FFDE4D] border-3 border-black p-4 shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-black animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-xs font-display font-black text-black uppercase">⚠️ PANDUAN PENDAFTAR BARU: ATUR KOORDINAT KANTOR</h4>
                <p className="text-[11px] font-bold text-black/80 font-sans leading-relaxed">
                  Halo! Sebagai pendaftar baru, Anda <strong>wajib mengatur posisi koordinat kantor</strong> Anda terlebih dahulu sebelum memulai presensi. 
                  Silakan sesuaikan koordinat di bawah ini, atau cukup klik tombol <strong>"Gunakan Lokasi Saya Saat Ini"</strong> agar lokasi GPS Anda terkunci secara otomatis.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-black" />
            <h3 className="font-display font-black text-black uppercase text-sm">Konfigurasi Titik Tempat Kerja (Geofencing)</h3>
          </div>
          <p className="text-xs font-bold text-black/70 leading-relaxed">
            Presensi diatur menggunakan batasan koordinat GPS. Isikan koordinat lokasi kantor Anda di bawah ini atau klik tombol otomatis untuk mengunci titik kantor berdasarkan posisi Anda sekarang.
          </p>
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Nama Tempat Kerja</label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Latitude Koordinat</label>
              <input
                type="text"
                value={tempLat}
                onChange={(e) => setTempLat(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black bg-white text-xs font-mono font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Longitude Koordinat</label>
              <input
                type="text"
                value={tempLng}
                onChange={(e) => setTempLng(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black bg-white text-xs font-mono font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Radius (Meter)</label>
              <input
                type="number"
                value={tempRadius}
                onChange={(e) => setTempRadius(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                min="10"
                max="5000"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Jam Masuk (Batas)</label>
              <input
                type="time"
                value={tempWorkStart}
                onChange={(e) => setTempWorkStart(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Jam Pulang (Mulai)</label>
              <input
                type="time"
                value={tempWorkEnd}
                onChange={(e) => setTempWorkEnd(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>
            <div className="lg:col-span-6 sm:col-span-2 flex flex-wrap justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSetCurrentAsOffice}
                className="px-3.5 py-2 bg-[#FFDE4D] hover:bg-[#ffe366] text-black border-2 border-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-black" />
                Gunakan Lokasi Saya Saat Ini
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 border-2 border-black hover:bg-black/5 bg-white text-xs font-black uppercase tracking-wide cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#39FF14] text-black border-2 border-black hover:bg-[#2adb10] text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer"
                >
                  Simpan Titik Kantor
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Left is Form/Camera, Right is Location status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Column 1: Attendance Action Center */}
        <div className={`${
          (presenceTab === 'nonHadir' || todayRecord?.status === 'Sakit' || todayRecord?.status === 'Izin')
            ? 'lg:col-span-12' 
            : 'lg:col-span-7'
        } bg-white border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col space-y-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-black uppercase text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-black" />
              Konfirmasi Presensi Hari Ini
            </h2>
            <div className="flex items-center gap-1 text-[10px] bg-[#C3F2FF] border-2 border-black px-2.5 py-1 font-black uppercase text-black font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Status Badge Indicator */}
          {todayRecord ? (
            todayRecord.status === 'Sakit' ? (
              <div className="bg-[#FF6B6B]/20 border-2 border-black p-4 flex justify-between items-start gap-3 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#FF6B6B] border border-black flex items-center justify-center text-black shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-display font-black text-black uppercase">Keterangan Hari Ini: Sakit</h4>
                    <p className="text-[11px] font-bold text-black/70 mt-0.5 font-sans leading-relaxed">Alasan: {todayRecord.notes || '-'}</p>
                    {todayRecord.clockInPhoto && (
                      <div className="mt-2">
                        <span className="text-[10px] font-black text-black/70 uppercase block mb-1">Lampiran Bukti:</span>
                        <img src={todayRecord.clockInPhoto} alt="Surat Dokter" className="w-20 h-20 border border-black object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAttendance(todayRecord.id)}
                  className="text-[10px] font-black text-[#FF6B6B] uppercase hover:underline decoration-2 cursor-pointer"
                >
                  Batalkan
                </button>
              </div>
            ) : todayRecord.status === 'Izin' ? (
              <div className="bg-[#FFDE4D]/20 border-2 border-black p-4 flex justify-between items-start gap-3 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#FFDE4D] border border-black flex items-center justify-center text-black shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-display font-black text-black uppercase">Keterangan Hari Ini: Izin</h4>
                    <p className="text-[11px] font-bold text-black/70 mt-0.5 font-sans leading-relaxed">Alasan: {todayRecord.notes || '-'}</p>
                    {todayRecord.clockInPhoto && (
                      <div className="mt-2">
                        <span className="text-[10px] font-black text-black/70 uppercase block mb-1">Lampiran Bukti:</span>
                        <img src={todayRecord.clockInPhoto} alt="Surat Izin" className="w-20 h-20 border border-black object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAttendance(todayRecord.id)}
                  className="text-[10px] font-black text-black hover:underline decoration-2 cursor-pointer uppercase"
                >
                  Batalkan
                </button>
              </div>
            ) : todayRecord.clockInTime && todayRecord.clockOutTime ? (
              <div className="bg-[#39FF14]/20 border-2 border-black p-4 flex items-start gap-3 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <CheckCircle className="w-5 h-5 text-black shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-display font-black text-black uppercase">Presensi Hari Ini Selesai</h4>
                  <p className="text-[11px] font-bold text-black/80 mt-1">Anda sudah melakukan pencatatan jam masuk ({todayRecord.clockInTime}) dan jam pulang ({todayRecord.clockOutTime}) untuk hari ini.</p>
                </div>
              </div>
            ) : (
              <div className="bg-[#C3F2FF] border-2 border-black p-4 flex items-start gap-3 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <LogIn className="w-5 h-5 text-black shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-display font-black text-black uppercase">Sudah Melakukan Presensi Masuk</h4>
                  <p className="text-[11px] font-bold text-black/80 mt-1">Anda masuk pada pukul <strong>{todayRecord.clockInTime}</strong>. Jangan lupa untuk melakukan presensi pulang saat selesai magang.</p>
                </div>
              </div>
            )
          ) : (
            <div className="bg-[#FFDE4D]/30 border-2 border-black p-4 flex items-start gap-3 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <AlertCircle className="w-5 h-5 text-black shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-display font-black text-black uppercase">Belum Melakukan Presensi</h4>
                <p className="text-[11px] font-bold text-black/80 mt-1">Harap lakukan pencatatan jam masuk atau ajukan keterangan sakit/izin jika Anda berhalangan hadir hari ini.</p>
              </div>
            </div>
          )}

          {/* Tab Selector - only show when not yet clocked-in */}
          {!todayRecord && (
            <div className="flex bg-black p-1 border border-black">
              <button
                type="button"
                onClick={() => setPresenceTab('hadir')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  presenceTab === 'hadir'
                    ? 'bg-[#39FF14] text-black border border-black'
                    : 'text-white hover:text-[#39FF14]'
                }`}
              >
                Hadir (Selfie & GPS)
              </button>
              <button
                type="button"
                onClick={() => setPresenceTab('nonHadir')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  presenceTab === 'nonHadir'
                    ? 'bg-[#39FF14] text-black border border-black'
                    : 'text-white hover:text-[#39FF14]'
                }`}
              >
                Sakit / Izin
              </button>
            </div>
          )}

          {/* Sakit / Izin Form View */}
          {!todayRecord && presenceTab === 'nonHadir' && (
            <form onSubmit={handleNonPresenceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setNonPresenceType('Sakit')}
                  className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer text-center ${
                    nonPresenceType === 'Sakit'
                      ? 'bg-[#FF6B6B] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      : 'bg-white text-black hover:bg-black/5 shadow-none'
                  }`}
                >
                  🤕 Sakit
                </button>
                <button
                  type="button"
                  onClick={() => setNonPresenceType('Izin')}
                  className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer text-center ${
                    nonPresenceType === 'Izin'
                      ? 'bg-[#FFDE4D] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      : 'bg-white text-black hover:bg-black/5 shadow-none'
                  }`}
                >
                  📄 Izin / Keperluan Lain
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-black uppercase tracking-wider block">
                  Alasan Keterangan
                </label>
                <textarea
                  value={nonPresenceReason}
                  onChange={(e) => setNonPresenceReason(e.target.value)}
                  placeholder={nonPresenceType === 'Sakit' ? 'Contoh: Demam tinggi, butuh istirahat di rumah / berobat ke dokter' : 'Contoh: Ada keperluan keluarga mendesak'}
                  className="w-full px-3 py-2.5 border-2 border-black bg-white text-xs font-bold text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all min-h-[80px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-black uppercase tracking-wider block">
                  Lampiran Foto Surat Dokter / Bukti (Opsional)
                </label>
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 border-2 border-black bg-[#FFFDF6] flex items-center justify-center overflow-hidden shrink-0 shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                    {nonPresencePhoto ? (
                      <img src={nonPresencePhoto} alt="Attachment" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-black/55" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C3F2FF] hover:bg-[#a9e4f5] text-black border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                      <Camera className="w-3.5 h-3.5 text-black" />
                      {nonPresencePhoto ? 'Ubah Foto Bukti' : 'Unggah Foto Bukti'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNonPresencePhoto(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[9px] font-bold text-black/60 mt-1">Format gambar JPG/PNG maks. 5MB</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 px-4 border-2 border-black font-black uppercase text-xs flex items-center justify-center gap-2 tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0 transition-all cursor-pointer text-black ${
                  nonPresenceType === 'Sakit' ? 'bg-[#FF6B6B] hover:bg-[#ff5555]' : 'bg-[#FFDE4D] hover:bg-[#ffe366]'
                }`}
              >
                Kirim Keterangan {nonPresenceType}
              </button>
            </form>
          )}

          {/* Camera Frame Module */}
          {(!todayRecord || (!todayRecord.clockOutTime && todayRecord.status !== 'Sakit' && todayRecord.status !== 'Izin')) && (presenceTab === 'hadir' || todayRecord) && (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-black uppercase tracking-wider block">Foto Bukti Aktivitas / Selfie</label>
              
              <div className="relative aspect-[4/3] border-4 border-black bg-black overflow-hidden flex flex-col items-center justify-center text-center shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                 {cameraActive ? (
                  <video 
                    ref={videoRefCallback} 
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : capturedPhoto ? (
                  <img 
                    src={capturedPhoto} 
                    alt="Selfie captured" 
                    className="w-full h-full object-cover"
                  />
                ) : cameraError ? (
                  <div className="p-6 space-y-3 z-10">
                    <div className="w-10 h-10 bg-[#FF6B6B] border-2 border-black flex items-center justify-center mx-auto text-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                      <Camera className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wide">Kamera Langsung Terhambat</h4>
                    <p className="text-[10px] text-gray-300 max-w-xs mx-auto">
                      Kamera diblokir atau tidak terdeteksi oleh browser Anda. Silakan tetap berswafoto dengan memilih opsi unggah manual di bawah:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      <label className="px-3.5 py-1.5 bg-[#39FF14] text-black border-2 border-black text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer">
                        <Camera className="w-3.5 h-3.5" />
                        Gunakan Kamera HP
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="px-3.5 py-1.5 bg-white text-black border-2 border-black text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer">
                        <ImageIcon className="w-3.5 h-3.5 text-black" />
                        Pilih dari Galeri
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : !cameraEnabled ? (
                  <div className="p-6 space-y-3 z-10 text-center">
                    <div className="w-12 h-12 bg-[#FFDE4D] border-2 border-black flex items-center justify-center mx-auto text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Kamera Belum Aktif</h4>
                    <p className="text-[10px] text-gray-300 max-w-xs mx-auto leading-relaxed">
                      Silakan aktifkan kamera terlebih dahulu untuk melakukan swafoto presensi, atau gunakan tombol unggah manual di bawah.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraError(null);
                        setCameraEnabled(true);
                      }}
                      className="mt-1 px-4 py-2 bg-[#39FF14] text-black border-2 border-black text-[10px] font-black uppercase tracking-wide shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Aktifkan Kamera
                    </button>
                  </div>
                ) : (
                  <div className="p-6 space-y-2">
                    <div className="w-12 h-12 bg-gray-900 border-2 border-gray-700 flex items-center justify-center mx-auto text-white animate-pulse">
                      <Camera className="w-5 h-5 animate-bounce" />
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Mengaktifkan Kamera...</h4>
                    <p className="text-[10px] text-gray-400 max-w-xs mx-auto">Harap izinkan akses kamera langsung pada browser Anda untuk berswafoto.</p>
                  </div>
                )}

                {/* Overlay buttons inside camera block */}
                <div className="absolute bottom-3 right-3 left-3 flex justify-center items-center z-10">
                  {cameraActive ? (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-2.5 bg-[#39FF14] hover:bg-[#2adb10] text-black border-2 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Foto
                    </button>
                  ) : capturedPhoto ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedPhoto(null);
                        setCameraError(null);
                        setCameraEnabled(true);
                      }}
                      className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#ff5555] text-black border-2 border-black text-xs font-black uppercase transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Ulang Foto
                    </button>
                  ) : null}
                </div>
              </div>
              {cameraError && (
                <div className="space-y-1 text-center">
                  <p className="text-[11px] text-red-500 font-bold font-mono">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      startCamera();
                    }}
                    className="text-[10px] text-black font-black uppercase hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Coba Aktifkan Kamera Lagi
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action buttons (Clock in & out) */}
          {(!todayRecord || (!todayRecord.clockOutTime && todayRecord.status !== 'Sakit' && todayRecord.status !== 'Izin')) && (presenceTab === 'hadir' || todayRecord) && (
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              {!todayRecord ? (
                <button
                  type="button"
                  onClick={handleClockIn}
                  disabled={!isWithinRadius || !capturedPhoto}
                  className={`flex-1 py-3 px-4 border-3 border-black font-black uppercase text-xs flex items-center justify-center gap-2 tracking-wider transition-all cursor-pointer ${
                    isWithinRadius && capturedPhoto
                      ? 'bg-[#39FF14] text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0'
                      : 'bg-gray-200 text-black/40 border-black/20 cursor-not-allowed'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Presensi Jam Masuk (Clock-In)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={!isWithinRadius || !capturedPhoto}
                  className={`flex-1 py-3 px-4 border-3 border-black font-black uppercase text-xs flex items-center justify-center gap-2 tracking-wider transition-all cursor-pointer ${
                    isWithinRadius && capturedPhoto
                      ? 'bg-[#39FF14] text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0'
                      : 'bg-gray-200 text-black/40 border-black/20 cursor-not-allowed'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  Presensi Jam Pulang (Clock-Out)
                </button>
              )}
            </div>
          )}
          
          {/* Geofence requirement reminder */}
          {(!todayRecord || (!todayRecord.clockOutTime && todayRecord.status !== 'Sakit' && todayRecord.status !== 'Izin')) && (presenceTab === 'hadir' || todayRecord) && (
            <p className="text-[10px] text-black/60 font-bold text-center leading-relaxed">
              * Tombol presensi hanya akan aktif apabila **foto telah dilampirkan** dan Anda terdeteksi berada **di dalam radius tempat kerja** ({officeLoc.radius} meter dari {officeLoc.name}).
            </p>
          )}
        </div>

        {/* Column 2: Location Status & Map View */}
        {!(presenceTab === 'nonHadir' || todayRecord?.status === 'Sakit' || todayRecord?.status === 'Izin') && (
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Geolocation Status Card */}
            <div className="bg-[#FFFDF6] border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-black uppercase text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-black" />
                  Status Geofencing Anda
                </h3>
                <button
                  type="button"
                  onClick={getGeoLocation}
                  disabled={isFetchingLocation}
                  className="p-1.5 border-2 border-black bg-white hover:bg-black/5 text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  title="Penyegaran lokasi GPS"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLocation ? 'animate-spin text-black font-black' : ''}`} />
                </button>
              </div>

              {/* Workplace summary info */}
              <div className="bg-white border-2 border-black p-3.5 text-xs space-y-2 shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold text-black leading-relaxed">
                <div className="flex justify-between">
                  <span className="text-black/60">Tempat Kerja:</span>
                  <span className="font-extrabold text-right">{isOfficeConfigured ? officeLoc.name : 'Belum Diatur'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Koordinat Kantor:</span>
                  <span className="font-mono text-black">
                    {isOfficeConfigured ? `${officeLoc.latitude.toFixed(6)}, ${officeLoc.longitude.toFixed(6)}` : 'Belum Diatur'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Radius Diizinkan:</span>
                  <span className="font-extrabold">{officeLoc.radius} Meter</span>
                </div>
                <div className="flex justify-between border-t border-black/10 pt-2">
                  <span className="text-black/60">Jam Masuk (Batas):</span>
                  <span className="font-extrabold text-[#FF6B6B] bg-[#FF6B6B]/10 px-1.5 rounded-sm border border-[#FF6B6B]/30">{officeLoc.workStart || '08:00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Jam Pulang (Mulai):</span>
                  <span className="font-extrabold text-[#3B82F6] bg-[#3B82F6]/10 px-1.5 rounded-sm border border-[#3B82F6]/30">{officeLoc.workEnd || '17:00'}</span>
                </div>
              </div>

              {/* Geolocation result */}
              {isFetchingLocation ? (
                <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-8 h-8 border-4 border-black border-t-[#39FF14] rounded-full animate-spin" />
                  <span className="text-xs font-bold text-black/70">Mengambil sinyal GPS presisi...</span>
                </div>
              ) : locationError ? (
                <div className="bg-[#FF6B6B]/20 border-2 border-black p-4 flex gap-3 text-xs text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  <AlertCircle className="w-4 h-4 text-[#FF6B6B] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-black uppercase text-xs">Gagal Mengunci Lokasi</h5>
                    <p className="text-[11px] leading-relaxed font-bold text-black/80">{locationError}</p>
                  </div>
                </div>
              ) : currentCoords ? (
                <div className="space-y-4">
                  <div className="bg-white border-2 border-black p-3 text-xs space-y-1.5 font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    <div className="flex justify-between">
                      <span className="text-black/60">Posisi GPS Anda:</span>
                      <span className="font-mono text-black">{currentCoords.latitude.toFixed(6)}, {currentCoords.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-black/60">Jarak ke Kantor:</span>
                      <span className={`font-black text-xs px-2 py-0.5 border border-black ${isOfficeConfigured ? (isWithinRadius ? 'bg-[#39FF14]' : 'bg-[#FF6B6B]') : 'bg-gray-200'}`}>
                        {isOfficeConfigured ? (distance !== null ? `${distance} Meter` : 'Menghitung...') : 'Belum Diatur'}
                      </span>
                    </div>
                  </div>

                  {/* Radius verification badge */}
                  {!isOfficeConfigured ? (
                    <div className="bg-[#FFDE4D]/30 border-2 border-black text-black p-3.5 flex items-start gap-2 text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      <AlertCircle className="w-5 h-5 text-black shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-black uppercase text-xs">Titik Kantor Belum Diatur</h5>
                        <p className="text-[11px] font-bold text-black/85 mt-0.5">Silakan isi nama tempat kerja dan koordinat di atas, lalu klik <strong>"Simpan Titik Kantor"</strong> untuk memulai presensi.</p>
                      </div>
                    </div>
                  ) : isWithinRadius ? (
                    <div className="bg-[#39FF14]/30 border-2 border-black text-black p-3.5 flex items-start gap-2 text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      <CheckCircle className="w-5 h-5 text-black shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-black uppercase text-xs">Siap untuk Presensi</h5>
                        <p className="text-[11px] font-bold text-black/85 mt-0.5">Lokasi Anda terkunci di dalam radius kerja ({distance}m). Tombol presensi telah dibuka.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#FF6B6B]/20 border-2 border-black text-black p-3.5 flex items-start gap-2 text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      <AlertCircle className="w-5 h-5 text-[#FF6B6B] shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-black uppercase text-xs">Berada di Luar Radius</h5>
                        <p className="text-[11px] font-bold text-black/85 mt-0.5">Anda saat ini berjarak {distance}m dari titik kantor. Silakan mendekat atau sesuaikan titik koordinat kantor jika diperlukan.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs font-bold text-black/60 text-center py-4">Tekan segarkan lokasi untuk mendapatkan GPS.</p>
              )}
            </div>

            {/* Minimalist SVG Coordinate Map Visualization */}
            <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col items-center">
              <h4 className="text-xs font-black uppercase text-black self-start mb-3 flex items-center gap-1.5">
                <Map className="w-4 h-4 text-black" />
                Radar Jarak Lokasi Kerja
              </h4>

              {currentCoords ? (
                <div className="w-full aspect-square max-w-[200px] relative border-4 border-black bg-[#FFFDF6] rounded-full flex items-center justify-center p-4 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                  {/* Geofence Ring */}
                  <div className="absolute w-[120px] h-[120px] rounded-full border-2 border-black border-dashed bg-black/5" />
                  
                  {/* Inner Ring */}
                  <div className="absolute w-[60px] h-[60px] rounded-full border border-black/15" />

                  {/* Center point - Office */}
                  <div className="absolute flex flex-col items-center z-10">
                    <div className="w-5 h-5 rounded-full bg-[#FFDE4D] border-2 border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] flex items-center justify-center text-[8px] text-black font-black">K</div>
                    <span className="text-[8px] font-black uppercase tracking-wide text-black mt-1 bg-white px-1.5 py-0.5 border border-black">Kantor</span>
                  </div>

                  {/* User point representation relative to distance */}
                  {distance !== null && (
                    <div 
                      className="absolute flex flex-col items-center transition-all duration-1000 z-10"
                      style={{
                        // Position dynamically on a diagonal based on geofence compliance
                        transform: isWithinRadius 
                          ? `translate(${(distance / (officeLoc.radius || 100)) * 25}px, -${(distance / (officeLoc.radius || 100)) * 25}px)`
                          : `translate(65px, -65px)`
                      }}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] ${isWithinRadius ? 'bg-[#39FF14]' : 'bg-[#FF6B6B] animate-pulse'}`} />
                      <span className="text-[8px] font-black text-black mt-0.5 bg-white px-1.5 py-0.5 border border-black">Anda ({distance}m)</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-xs font-bold text-black/60">
                  Radar membutuhkan data lokasi GPS Anda.
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Row: Historic Logs */}
      <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-display font-black text-black uppercase text-base">Riwayat Presensi Magang</h3>
          {attendanceLogs.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="px-3.5 py-2 text-[11px] font-black uppercase tracking-wider text-black bg-[#FFDE4D] hover:bg-[#ffe366] border-2 border-black rounded-none transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0"
              >
                <FileDown className="w-3.5 h-3.5 text-black" />
                Ekspor PDF
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin menghapus semua riwayat presensi? Semua riwayat akan hilang permanen.')) {
                    attendanceLogs.forEach(log => onDeleteAttendance(log.id));
                  }
                }}
                className="px-3.5 py-2 text-[11px] font-black uppercase tracking-wider text-black bg-[#FF6B6B] hover:bg-[#ff5555] border-2 border-black rounded-none transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Semua Riwayat
              </button>
            </div>
          )}
        </div>
        
        {attendanceLogs.length === 0 ? (
          <p className="text-xs font-bold text-black/60 text-center py-8">Belum ada riwayat kehadiran terekam. Mulai lakukan presensi masuk hari ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border-4 border-black">
              <thead>
                <tr className="bg-[#FFDE4D] border-b-4 border-black text-[10px] font-black text-black uppercase tracking-wider">
                  <th className="px-4 py-3.5 border-r-2 border-black">Tanggal</th>
                  <th className="px-4 py-3.5 text-center border-r-2 border-black">Foto Masuk</th>
                  <th className="px-4 py-3.5 border-r-2 border-black">Jam Masuk</th>
                  <th className="px-4 py-3.5 border-r-2 border-black">Jarak Masuk</th>
                  <th className="px-4 py-3.5 text-center border-r-2 border-black">Foto Pulang</th>
                  <th className="px-4 py-3.5 border-r-2 border-black">Jam Pulang</th>
                  <th className="px-4 py-3.5 border-r-2 border-black">Jarak Pulang</th>
                  <th className="px-4 py-3.5 border-r-2 border-black">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10 text-black font-bold">
                {attendanceLogs.map((log) => {
                  const dayFormat = new Date(log.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                  const isSakitOrIzin = log.status === 'Sakit' || log.status === 'Izin';
                  
                  return (
                    <tr key={log.id} className="hover:bg-[#C3F2FF]/20 bg-white">
                      <td className="px-4 py-3.5 font-extrabold text-black border-r-2 border-black/10">{dayFormat}</td>
                      <td className="px-4 py-3.5 text-center border-r-2 border-black/10">
                        <div className="w-12 h-12 border-2 border-black overflow-hidden mx-auto bg-gray-50 flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                          {log.clockInPhoto ? (
                            <img src={log.clockInPhoto} alt={isSakitOrIzin ? "Lampiran Bukti" : "Clock-In"} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-black/40" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono border-r-2 border-black/10">
                        {isSakitOrIzin ? (
                          '-'
                        ) : log.clockInTime ? (
                          isTimeLater(log.clockInTime, officeLoc.workStart || '08:00') ? (
                            <span className="inline-block text-[#FF6B6B] bg-[#FF6B6B]/10 border-2 border-[#FF6B6B] px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-[1px_1px_0px_rgba(255,107,107,0.3)]">
                              {log.clockInTime}
                            </span>
                          ) : (
                            <span className="inline-block text-[#10B981] bg-[#10B981]/10 border-2 border-[#10B981] px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-[1px_1px_0px_rgba(16,185,129,0.3)]">
                              {log.clockInTime}
                            </span>
                          )
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-black border-r-2 border-black/10">{isSakitOrIzin ? '-' : (log.clockInDistance !== undefined ? `${log.clockInDistance} m` : '-')}</td>
                      <td className="px-4 py-3.5 text-center border-r-2 border-black/10">
                        <div className="w-12 h-12 border-2 border-black overflow-hidden mx-auto bg-gray-50 flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                          {log.clockOutPhoto ? (
                            <img src={log.clockOutPhoto} alt="Clock-Out" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-black/40" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono border-r-2 border-black/10">
                        {isSakitOrIzin ? (
                          '-'
                        ) : log.clockOutTime ? (
                          <span className="inline-block text-black/60 bg-black/5 border border-black/20 px-1.5 py-0.5 text-[11px]">
                            {log.clockOutTime}
                          </span>
                        ) : (
                          '--:--:--'
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-black border-r-2 border-black/10">
                        {isSakitOrIzin ? '-' : (log.clockOutDistance !== undefined ? `${log.clockOutDistance} m` : '-')}
                      </td>
                      <td className="px-4 py-3.5 border-r-2 border-black/10">
                        {log.status === 'Sakit' ? (
                          <div className="space-y-1">
                            <span className="inline-block px-2.5 py-1 text-[9px] font-black border-2 border-black bg-[#FF6B6B] text-black uppercase tracking-wider">
                              Sakit
                            </span>
                            <div className="text-[10px] font-bold text-black/85 max-w-[150px] truncate" title={log.notes}>
                              {log.notes}
                            </div>
                          </div>
                        ) : log.status === 'Izin' ? (
                          <div className="space-y-1">
                            <span className="inline-block px-2.5 py-1 text-[9px] font-black border-2 border-black bg-[#FFDE4D] text-black uppercase tracking-wider">
                              Izin
                            </span>
                            <div className="text-[10px] font-bold text-black/85 max-w-[150px] truncate" title={log.notes}>
                              {log.notes}
                            </div>
                          </div>
                        ) : (
                          <span className={`inline-block px-2.5 py-1 text-[9px] font-black border-2 border-black uppercase tracking-wider ${
                            log.clockOutTime 
                              ? 'bg-[#39FF14] text-black' 
                              : 'bg-[#C3F2FF] text-black'
                          }`}>
                            {log.clockOutTime ? 'Selesai Kerja' : 'Sedang Kerja'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Apakah Anda yakin ingin menghapus riwayat presensi tanggal ${dayFormat}?`)) {
                              onDeleteAttendance(log.id);
                            }
                          }}
                          className="p-1.5 border-2 border-black bg-[#FF6B6B] hover:bg-[#ff5555] text-black hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] cursor-pointer transition-all inline-flex items-center"
                          title="Hapus Presensi"
                        >
                          <Trash2 className="w-4 h-4 text-black" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
