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
  
  // Settings toggle
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom inputs for settings
  const [tempLat, setTempLat] = useState(officeLoc.latitude.toString());
  const [tempLng, setTempLng] = useState(officeLoc.longitude.toString());
  const [tempRadius, setTempRadius] = useState(officeLoc.radius.toString());
  const [tempName, setTempName] = useState(officeLoc.name);

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
        const dist = calculateDistance(latitude, longitude, officeLoc.latitude, officeLoc.longitude);
        setDistance(dist);
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
      name: tempName || 'Titik Kantor Pusat'
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
      
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err: any) {
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

  useEffect(() => {
    if (!hasClockedOut && presenceTab === 'hadir') {
      if (!hasPhoto && !cameraActive && !cameraError) {
        startCamera();
      }
    } else {
      if (cameraActive) {
        stopCamera();
      }
    }
  }, [hasClockedOut, hasPhoto, cameraActive, cameraError, presenceTab]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
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

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 25);

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
    <div id="attendance-section" className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gray-900">
            <UserCheck className="w-5 h-5 text-gray-900" />
            <h1 className="text-xl font-bold tracking-tight">Presensi Kehadiran Harian</h1>
          </div>
          <p className="text-xs text-gray-500">
            Lakukan pencatatan jam masuk dan pulang kerja magang Anda secara real-time dengan melampirkan swafoto (selfie) dan deteksi titik lokasi kantor.
          </p>
        </div>
        <button
          onClick={() => {
            setShowSettings(!showSettings);
            // Reset temp inputs
            setTempLat(officeLoc.latitude.toString());
            setTempLng(officeLoc.longitude.toString());
            setTempRadius(officeLoc.radius.toString());
            setTempName(officeLoc.name);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all text-gray-600"
        >
          <Settings className="w-3.5 h-3.5" />
          {showSettings ? 'Tutup Atur Titik' : 'Atur Titik Kantor'}
        </button>
      </div>

      {/* Settings Form Card */}
      {showSettings && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-gray-800" />
            <h3 className="font-bold text-sm text-gray-900">Konfigurasi Titik Tempat Kerja (Geofencing)</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Presensi diatur menggunakan batasan koordinat GPS. Isikan koordinat lokasi kantor Anda di bawah ini atau klik tombol otomatis untuk mengunci titik kantor berdasarkan posisi Anda sekarang.
          </p>
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nama Tempat Kerja</label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Latitude Koordinat</label>
              <input
                type="text"
                value={tempLat}
                onChange={(e) => setTempLat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 font-mono bg-white"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Longitude Koordinat</label>
              <input
                type="text"
                value={tempLng}
                onChange={(e) => setTempLng(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 font-mono bg-white"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Radius Toleransi (Meter)</label>
              <input
                type="number"
                value={tempRadius}
                onChange={(e) => setTempRadius(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                min="10"
                max="5000"
                required
              />
            </div>
            <div className="md:col-span-4 flex flex-wrap justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSetCurrentAsOffice}
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-600" />
                Gunakan Lokasi Saya Saat Ini
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-600 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded-xl text-xs font-semibold transition-all"
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
        } bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col space-y-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Konfirmasi Presensi Hari Ini
            </h2>
            <div className="flex items-center gap-1 text-[10px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 font-semibold text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Status Badge Indicator */}
          {todayRecord ? (
            todayRecord.status === 'Sakit' ? (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex justify-between items-start gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-800 font-sans">Keterangan Hari Ini: Sakit</h4>
                    <p className="text-[11px] text-rose-600 mt-0.5 font-sans leading-relaxed">Alasan: {todayRecord.notes || '-'}</p>
                    {todayRecord.clockInPhoto && (
                      <div className="mt-2">
                        <span className="text-[10px] text-rose-500 block mb-1">Lampiran Bukti:</span>
                        <img src={todayRecord.clockInPhoto} alt="Surat Dokter" className="w-20 h-20 rounded-lg object-cover border border-rose-200" />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAttendance(todayRecord.id)}
                  className="text-[10px] font-bold text-rose-700 hover:underline cursor-pointer"
                >
                  Batalkan
                </button>
              </div>
            ) : todayRecord.status === 'Izin' ? (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex justify-between items-start gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-800 font-sans">Keterangan Hari Ini: Izin</h4>
                    <p className="text-[11px] text-amber-600 mt-0.5 font-sans leading-relaxed">Alasan: {todayRecord.notes || '-'}</p>
                    {todayRecord.clockInPhoto && (
                      <div className="mt-2">
                        <span className="text-[10px] text-amber-500 block mb-1">Lampiran Bukti:</span>
                        <img src={todayRecord.clockInPhoto} alt="Surat Izin" className="w-20 h-20 rounded-lg object-cover border border-amber-200" />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAttendance(todayRecord.id)}
                  className="text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Batalkan
                </button>
              </div>
            ) : todayRecord.clockInTime && todayRecord.clockOutTime ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 font-sans">Presensi Hari Ini Selesai</h4>
                  <p className="text-[11px] text-emerald-600 mt-1 font-sans">Anda sudah melakukan pencatatan jam masuk ({todayRecord.clockInTime}) dan jam pulang ({todayRecord.clockOutTime}) untuk hari ini.</p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <LogIn className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-800 font-sans">Sudah Melakukan Presensi Masuk</h4>
                  <p className="text-[11px] text-blue-600 mt-1 font-sans">Anda masuk pada pukul <strong>{todayRecord.clockInTime}</strong>. Jangan lupa untuk melakukan presensi pulang saat selesai magang.</p>
                </div>
              </div>
            )
          ) : (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 font-sans">Belum Melakukan Presensi</h4>
                <p className="text-[11px] text-amber-600 mt-1 font-sans">Harap lakukan pencatatan jam masuk atau ajukan keterangan sakit/izin jika Anda berhalangan hadir hari ini.</p>
              </div>
            </div>
          )}

          {/* Tab Selector - only show when not yet clocked-in */}
          {!todayRecord && (
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPresenceTab('hadir')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  presenceTab === 'hadir'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Hadir (Selfie & GPS)
              </button>
              <button
                type="button"
                onClick={() => setPresenceTab('nonHadir')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  presenceTab === 'nonHadir'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Sakit / Izin
              </button>
            </div>
          )}

          {/* Sakit / Izin Form View */}
          {!todayRecord && presenceTab === 'nonHadir' && (
            <form onSubmit={handleNonPresenceSubmit} className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setNonPresenceType('Sakit')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    nonPresenceType === 'Sakit'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  🤕 Sakit
                </button>
                <button
                  type="button"
                  onClick={() => setNonPresenceType('Izin')}
                  className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    nonPresenceType === 'Izin'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  📄 Izin / Keperluan Lain
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Alasan Keterangan
                </label>
                <textarea
                  value={nonPresenceReason}
                  onChange={(e) => setNonPresenceReason(e.target.value)}
                  placeholder={nonPresenceType === 'Sakit' ? 'Contoh: Demam tinggi, butuh istirahat di rumah / berobat ke dokter' : 'Contoh: Ada keperluan keluarga mendesak'}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white min-h-[80px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Lampiran Foto Surat Dokter / Bukti (Opsional)
                </label>
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {nonPresencePhoto ? (
                      <img src={nonPresencePhoto} alt="Attachment" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-extrabold transition-all shadow-xs cursor-pointer">
                      <Camera className="w-3.5 h-3.5 text-gray-500" />
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
                    <p className="text-[9px] text-gray-400 mt-1">Format gambar JPG/PNG maks. 5MB</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-white ${
                  nonPresenceType === 'Sakit' ? 'bg-rose-600 hover:bg-rose-700 shadow-sm' : 'bg-amber-600 hover:bg-amber-700 shadow-sm'
                }`}
              >
                Kirim Keterangan {nonPresenceType}
              </button>
            </form>
          )}

          {/* Camera Frame Module */}
          {(!todayRecord || (!todayRecord.clockOutTime && todayRecord.status !== 'Sakit' && todayRecord.status !== 'Izin')) && (presenceTab === 'hadir' || todayRecord) && (
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Foto Bukti Aktivitas / Selfie</label>
              
              <div className="relative aspect-video rounded-2xl bg-gray-950 border border-gray-100 overflow-hidden flex flex-col items-center justify-center text-center">
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
                    <div className="w-10 h-10 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-400 animate-pulse">
                      <Camera className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-200">Kamera Langsung Terhambat</h4>
                    <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                      Kamera diblokir atau tidak terdeteksi oleh browser Anda. Silakan tetap berswafoto dengan memilih opsi unggah manual di bawah:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      <label className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer">
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
                      <label className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer">
                        <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
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
                ) : (
                  <div className="p-6 space-y-2">
                    <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto text-white animate-pulse">
                      <Camera className="w-5 h-5 animate-bounce" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-200">Mengaktifkan Kamera...</h4>
                    <p className="text-[10px] text-gray-400 max-w-xs mx-auto">Harap izinkan akses kamera langsung pada browser Anda untuk berswafoto.</p>
                  </div>
                )}

                {/* Overlay buttons inside camera block */}
                <div className="absolute bottom-3 right-3 left-3 flex justify-center items-center z-10">
                  {cameraActive ? (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer"
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
                      }}
                      className="px-4 py-2 bg-gray-900/90 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-sm shadow-sm cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Ulang Foto
                    </button>
                  ) : null}
                </div>
              </div>
              {cameraError && (
                <div className="space-y-1 text-center">
                  <p className="text-[11px] text-red-500 font-medium">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      startCamera();
                    }}
                    className="text-[10px] text-gray-900 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
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
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isWithinRadius && capturedPhoto
                      ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-md'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200/50'
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
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isWithinRadius && capturedPhoto
                      ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-md'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200/50'
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
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              * Tombol presensi hanya akan aktif apabila **foto telah dilampirkan** dan Anda terdeteksi berada **di dalam radius tempat kerja** ({officeLoc.radius} meter dari {officeLoc.name}).
            </p>
          )}
        </div>

        {/* Column 2: Location Status & Map View */}
        {!(presenceTab === 'nonHadir' || todayRecord?.status === 'Sakit' || todayRecord?.status === 'Izin') && (
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Geolocation Status Card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  Status Geofencing Anda
                </h3>
                <button
                  type="button"
                  onClick={getGeoLocation}
                  disabled={isFetchingLocation}
                  className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
                  title="Penyegaran lokasi GPS"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLocation ? 'animate-spin text-gray-800' : ''}`} />
                </button>
              </div>

              {/* Workplace summary info */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tempat Kerja:</span>
                  <span className="font-semibold text-gray-800">{officeLoc.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Koordinat Kantor:</span>
                  <span className="font-mono text-gray-700">{officeLoc.latitude.toFixed(6)}, {officeLoc.longitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Radius Diizinkan:</span>
                  <span className="font-semibold text-gray-800">{officeLoc.radius} Meter</span>
                </div>
              </div>

              {/* Geolocation result */}
              {isFetchingLocation ? (
                <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
                  <span className="text-xs text-gray-400">Mengambil sinyal GPS presisi...</span>
                </div>
              ) : locationError ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-bold">Gagal Mengunci Lokasi</h5>
                    <p className="text-[11px] leading-relaxed text-red-600/90">{locationError}</p>
                  </div>
                </div>
              ) : currentCoords ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Posisi GPS Anda:</span>
                      <span className="font-mono text-gray-700">{currentCoords.latitude.toFixed(6)}, {currentCoords.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Jarak ke Kantor:</span>
                      <span className={`font-bold text-xs ${isWithinRadius ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {distance !== null ? `${distance} Meter` : 'Menghitung...'}
                      </span>
                    </div>
                  </div>

                  {/* Radius verification badge */}
                  {isWithinRadius ? (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3.5 flex items-start gap-2 text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold">Siap untuk Presensi</h5>
                        <p className="text-[11px] text-emerald-600/90 mt-0.5">Lokasi Anda terkunci di dalam radius kerja ({distance}m). Tombol presensi telah dibuka.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3.5 flex items-start gap-2 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold">Berada di Luar Radius</h5>
                        <p className="text-[11px] text-amber-600/90 mt-0.5">Anda saat ini berjarak {distance}m dari titik kantor. Silakan mendekat atau sesuaikan titik koordinat kantor jika diperlukan.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">Tekan segarkan lokasi untuk mendapatkan GPS.</p>
              )}
            </div>

            {/* Minimalist SVG Coordinate Map Visualization */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col items-center">
              <h4 className="text-xs font-semibold text-gray-800 self-start mb-3 flex items-center gap-1.5">
                <Map className="w-4 h-4 text-gray-500" />
                Radar Jarak Lokasi Kerja
              </h4>

              {currentCoords ? (
                <div className="w-full aspect-square max-w-[200px] relative border border-gray-100 bg-gray-50 rounded-full flex items-center justify-center p-4">
                  {/* Geofence Ring */}
                  <div className="absolute w-[120px] h-[120px] rounded-full border border-gray-300 border-dashed animate-pulse bg-gray-100/50 flex items-center justify-center" />
                  
                  {/* Inner Ring */}
                  <div className="absolute w-[60px] h-[60px] rounded-full border border-gray-200" />

                  {/* Center point - Office */}
                  <div className="absolute flex flex-col items-center z-10">
                    <div className="w-4 h-4 rounded-full bg-gray-900 border-2 border-white shadow-sm flex items-center justify-center text-[7px] text-white font-bold">K</div>
                    <span className="text-[8px] font-bold text-gray-600 mt-1 bg-white/80 px-1 rounded">Kantor</span>
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
                      <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${isWithinRadius ? 'bg-emerald-600' : 'bg-amber-600 animate-ping'}`} />
                      <span className="text-[8px] font-bold text-gray-600 mt-0.5 bg-white/80 px-1 rounded">Anda ({distance}m)</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">
                  Radar membutuhkan data lokasi GPS Anda.
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Row: Historic Logs */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-semibold text-gray-900 text-base">Riwayat Presensi Magang</h3>
          {attendanceLogs.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs bg-white"
              >
                <FileDown className="w-3.5 h-3.5 text-gray-500" />
                Ekspor PDF
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin menghapus semua riwayat presensi? Semua riwayat akan hilang permanen.')) {
                    attendanceLogs.forEach(log => onDeleteAttendance(log.id));
                  }
                }}
                className="px-3 py-1.5 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200/40 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Semua Riwayat
              </button>
            </div>
          )}
        </div>
        
        {attendanceLogs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">Belum ada riwayat kehadiran terekam. Mulai lakukan presensi masuk hari ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3 text-center">Foto Masuk</th>
                  <th className="px-4 py-3">Jam Masuk</th>
                  <th className="px-4 py-3">Jarak Masuk</th>
                  <th className="px-4 py-3 text-center">Foto Pulang</th>
                  <th className="px-4 py-3">Jam Pulang</th>
                  <th className="px-4 py-3">Jarak Pulang</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {attendanceLogs.map((log) => {
                  const dayFormat = new Date(log.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                  const isSakitOrIzin = log.status === 'Sakit' || log.status === 'Izin';
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3.5 font-semibold text-gray-900">{dayFormat}</td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 mx-auto bg-gray-50 flex items-center justify-center">
                          {log.clockInPhoto ? (
                            <img src={log.clockInPhoto} alt={isSakitOrIzin ? "Lampiran Bukti" : "Clock-In"} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono">{isSakitOrIzin ? '-' : (log.clockInTime || '-')}</td>
                      <td className="px-4 py-3.5 font-medium text-gray-500">{isSakitOrIzin ? '-' : (log.clockInDistance !== undefined ? `${log.clockInDistance} m` : '-')}</td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 mx-auto bg-gray-50 flex items-center justify-center">
                          {log.clockOutPhoto ? (
                            <img src={log.clockOutPhoto} alt="Clock-Out" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono">{isSakitOrIzin ? '-' : (log.clockOutTime || '--:--:--')}</td>
                      <td className="px-4 py-3.5 font-medium text-gray-500">
                        {isSakitOrIzin ? '-' : (log.clockOutDistance !== undefined ? `${log.clockOutDistance} m` : '-')}
                      </td>
                      <td className="px-4 py-3.5">
                        {log.status === 'Sakit' ? (
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border bg-rose-50 text-rose-700 border-rose-100">
                              Sakit
                            </span>
                            <div className="text-[10px] text-rose-600 font-medium max-w-[150px] truncate" title={log.notes}>
                              {log.notes}
                            </div>
                          </div>
                        ) : log.status === 'Izin' ? (
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border bg-amber-50 text-amber-700 border-amber-100">
                              Izin
                            </span>
                            <div className="text-[10px] text-amber-600 font-medium max-w-[150px] truncate" title={log.notes}>
                              {log.notes}
                            </div>
                          </div>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            log.clockOutTime 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-blue-50 text-blue-700 border-blue-100'
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
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center"
                          title="Hapus Presensi"
                        >
                          <Trash2 className="w-4 h-4" />
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
