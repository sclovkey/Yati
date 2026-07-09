/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, InternshipInfo, NotificationSettings as SettingsType, AttendanceRecord, OfficeLocation } from './types';
import Dashboard from './components/Dashboard';
import LogbookForm from './components/LogbookForm';
import LogbookList from './components/LogbookList';
import BackupSettings from './components/BackupSettings';
import AttendanceSystem from './components/AttendanceSystem';
import AuthScreen from './components/AuthScreen';
import { getFirestoreUserData, saveFirestoreUserData, getFirestoreUser } from './lib/dbService';
import { 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  Bell, 
  Settings, 
  ClipboardCheck, 
  AlertTriangle,
  X,
  FileText,
  UserCheck,
  LogOut,
  CloudLightning,
  Cloud,
  CloudOff
} from 'lucide-react';

// Pre-seeded sample data for onboarding
const INITIAL_LOGS: LogEntry[] = [];

const INITIAL_INFO: InternshipInfo = {
  studentName: 'Yati Amalia',
  institution: 'Universitas Lambung Mangkurat',
  companyName: 'Bank Kalsel Kantor Pusat',
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000 * 30).toISOString().split('T')[0], // 30 days ago
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 * 60).toISOString().split('T')[0], // 60 days from now
  position: 'Staf IT Developer Intern',
  mentorName: 'Akhmad Fauzi, S.Kom'
};

const INITIAL_NOTIF_SETTINGS: SettingsType = {
  enabled: false,
  time: '17:00'
};

const DEFAULT_OFFICE: OfficeLocation = {
  latitude: 0,
  longitude: 0,
  radius: 600, // 600 meters
  name: '',
  workStart: '08:00',
  workEnd: '17:00'
};

export default function App() {
  // 1. Current Session State
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('yati_magang_active_username');
  });

  // 2. Core States
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [info, setInfo] = useState<InternshipInfo>(INITIAL_INFO);
  const [notifSettings, setNotifSettings] = useState<SettingsType>(INITIAL_NOTIF_SETTINGS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [officeLoc, setOfficeLoc] = useState<OfficeLocation>(DEFAULT_OFFICE);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'logbook' | 'tambah' | 'presensi' | 'profil'>('dashboard');
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);

  // Firestore synchronization states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<boolean>(false);
  const [isFetchedFromFirestore, setIsFetchedFromFirestore] = useState(false);
  
  // In-app banner alert state for reminders
  const [inAppAlert, setInAppAlert] = useState<{ show: boolean; title: string; body: string }>({
    show: false,
    title: '',
    body: ''
  });

  // 3. Hydrate state from Firestore (first choice) or fallback to local storage
  useEffect(() => {
    let active = true;

    async function hydrate() {
      if (!currentUser) {
        setLogs([]);
        setInfo(INITIAL_INFO);
        setNotifSettings(INITIAL_NOTIF_SETTINGS);
        setAttendance([]);
        setOfficeLoc(DEFAULT_OFFICE);
        setIsFetchedFromFirestore(false);
        return;
      }

      setIsSyncing(true);
      setSyncError(false);
      setIsFetchedFromFirestore(false);

      try {
        // Fetch all app data for this user from Firestore
        const firestoreData = await getFirestoreUserData(currentUser);
        const firestoreUserProfile = await getFirestoreUser(currentUser);
        
        if (!active) return;

        let profileInfo = INITIAL_INFO;
        if (firestoreUserProfile) {
          profileInfo = {
            studentName: firestoreUserProfile.studentName || currentUser,
            institution: firestoreUserProfile.institution || 'Universitas Lambung Mangkurat',
            companyName: firestoreUserProfile.companyName || 'Bank Kalsel Kantor Pusat',
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000 * 30).toISOString().split('T')[0],
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 * 60).toISOString().split('T')[0],
            position: firestoreUserProfile.position || 'Staf IT Developer Intern',
            mentorName: firestoreUserProfile.mentorName || 'Akhmad Fauzi, S.Kom'
          };
        }

        if (firestoreData) {
          if (firestoreData.logs) setLogs(firestoreData.logs);
          
          let resolvedInfo = firestoreData.info || profileInfo;
          // If stored info has the default 'Yati Amalia' but registered profile has a different name, override it to use the registered profile!
          if (firestoreUserProfile && (resolvedInfo.studentName === 'Yati Amalia' || !resolvedInfo.studentName) && firestoreUserProfile.studentName && firestoreUserProfile.studentName !== 'Yati Amalia') {
            resolvedInfo = {
              ...resolvedInfo,
              studentName: firestoreUserProfile.studentName,
              institution: firestoreUserProfile.institution || resolvedInfo.institution,
              companyName: firestoreUserProfile.companyName || resolvedInfo.companyName,
              position: firestoreUserProfile.position || resolvedInfo.position,
              mentorName: firestoreUserProfile.mentorName || resolvedInfo.mentorName
            };
          }
          setInfo(resolvedInfo);

          if (firestoreData.notifSettings) setNotifSettings(firestoreData.notifSettings);
          if (firestoreData.attendance) setAttendance(firestoreData.attendance);
          if (firestoreData.officeLoc) setOfficeLoc(firestoreData.officeLoc);
          
          // Seed local cache too
          localStorage.setItem(`yati_magang_logs_${currentUser}`, JSON.stringify(firestoreData.logs || []));
          localStorage.setItem(`yati_magang_info_${currentUser}`, JSON.stringify(resolvedInfo));
          localStorage.setItem(`yati_magang_notif_settings_${currentUser}`, JSON.stringify(firestoreData.notifSettings || INITIAL_NOTIF_SETTINGS));
          localStorage.setItem(`yati_magang_attendance_${currentUser}`, JSON.stringify(firestoreData.attendance || []));
          localStorage.setItem(`yati_magang_office_loc_${currentUser}`, JSON.stringify(firestoreData.officeLoc || DEFAULT_OFFICE));
        } else {
          // Fallback to local storage migration if document doesn't exist on Firestore
          const savedLogsStr = localStorage.getItem(`yati_magang_logs_${currentUser}`);
          const currentLogs = savedLogsStr ? JSON.parse(savedLogsStr) : INITIAL_LOGS;

          const savedInfoStr = localStorage.getItem(`yati_magang_info_${currentUser}`);
          let currentInfo = profileInfo;
          if (savedInfoStr) {
            currentInfo = JSON.parse(savedInfoStr);
            // If savedInfo has default 'Yati Amalia' but registered profile is different, override it!
            if (firestoreUserProfile && (currentInfo.studentName === 'Yati Amalia' || !currentInfo.studentName) && firestoreUserProfile.studentName && firestoreUserProfile.studentName !== 'Yati Amalia') {
              currentInfo = {
                ...currentInfo,
                studentName: firestoreUserProfile.studentName,
                institution: firestoreUserProfile.institution || currentInfo.institution,
                companyName: firestoreUserProfile.companyName || currentInfo.companyName,
                position: firestoreUserProfile.position || currentInfo.position,
                mentorName: firestoreUserProfile.mentorName || currentInfo.mentorName
              };
            }
          } else {
            const users = JSON.parse(localStorage.getItem('yati_magang_users') || '[]');
            const matchedUser = users.find((u: any) => u.username === currentUser);
            if (matchedUser) {
              currentInfo = {
                studentName: matchedUser.studentName || currentUser,
                institution: matchedUser.institution || 'Universitas Lambung Mangkurat',
                companyName: matchedUser.companyName || 'Bank Kalsel Kantor Pusat',
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000 * 30).toISOString().split('T')[0],
                endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 * 60).toISOString().split('T')[0],
                position: matchedUser.position || 'Staf IT Developer Intern',
                mentorName: matchedUser.mentorName || 'Akhmad Fauzi, S.Kom'
              };
            }
          }

          const savedNotifStr = localStorage.getItem(`yati_magang_notif_settings_${currentUser}`);
          const currentNotif = savedNotifStr ? JSON.parse(savedNotifStr) : INITIAL_NOTIF_SETTINGS;

          const savedAttendanceStr = localStorage.getItem(`yati_magang_attendance_${currentUser}`);
          const currentAttendance = savedAttendanceStr ? JSON.parse(savedAttendanceStr) : [];

          const savedOfficeStr = localStorage.getItem(`yati_magang_office_loc_${currentUser}`);
          const currentOffice = savedOfficeStr ? JSON.parse(savedOfficeStr) : DEFAULT_OFFICE;

          setLogs(currentLogs);
          setInfo(currentInfo);
          setNotifSettings(currentNotif);
          setAttendance(currentAttendance);
          setOfficeLoc(currentOffice);

          // Write initial payload to Firestore
          await saveFirestoreUserData(currentUser, {
            logs: currentLogs,
            info: currentInfo,
            notifSettings: currentNotif,
            attendance: currentAttendance,
            officeLoc: currentOffice
          });
        }
      } catch (err) {
        console.error("Hydration error:", err);
        setSyncError(true);
        
        // Fallback to local storage in case of total offline/network errors
        if (!active) return;
        const savedLogs = localStorage.getItem(`yati_magang_logs_${currentUser}`);
        setLogs(savedLogs ? JSON.parse(savedLogs) : INITIAL_LOGS);

        const savedInfo = localStorage.getItem(`yati_magang_info_${currentUser}`);
        if (savedInfo) setInfo(JSON.parse(savedInfo));

        const savedNotif = localStorage.getItem(`yati_magang_notif_settings_${currentUser}`);
        setNotifSettings(savedNotif ? JSON.parse(savedNotif) : INITIAL_NOTIF_SETTINGS);

        const savedAttendance = localStorage.getItem(`yati_magang_attendance_${currentUser}`);
        setAttendance(savedAttendance ? JSON.parse(savedAttendance) : []);

        const savedOffice = localStorage.getItem(`yati_magang_office_loc_${currentUser}`);
        setOfficeLoc(savedOffice ? JSON.parse(savedOffice) : DEFAULT_OFFICE);
      } finally {
        if (active) {
          setIsFetchedFromFirestore(true);
          setIsSyncing(false);
        }
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, [currentUser]);

  // 4. Save state back to local cache & Sync to Firestore (Debounced to optimize writes)
  useEffect(() => {
    if (!currentUser || !isFetchedFromFirestore) return;
    
    // Always save to local cache instantly for instant offline fallback
    localStorage.setItem(`yati_magang_logs_${currentUser}`, JSON.stringify(logs));
    localStorage.setItem(`yati_magang_info_${currentUser}`, JSON.stringify(info));
    localStorage.setItem(`yati_magang_notif_settings_${currentUser}`, JSON.stringify(notifSettings));
    localStorage.setItem(`yati_magang_attendance_${currentUser}`, JSON.stringify(attendance));
    localStorage.setItem(`yati_magang_office_loc_${currentUser}`, JSON.stringify(officeLoc));

    // Debounced Firestore upload
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      setSyncError(false);
      const success = await saveFirestoreUserData(currentUser, {
        logs,
        info,
        notifSettings,
        attendance,
        officeLoc
      });
      if (!success) {
        setSyncError(true);
      }
      setIsSyncing(false);
    }, 1000); // 1-second debounce window

    return () => clearTimeout(timer);
  }, [logs, info, notifSettings, attendance, officeLoc, currentUser, isFetchedFromFirestore]);

  // 4. Save Logbook entries handler
  const handleSaveLog = (newLogData: Omit<LogEntry, 'id'> & { id?: string }) => {
    if (newLogData.id) {
      // Edit mode
      setLogs(prev => prev.map(item => item.id === newLogData.id ? { ...item, ...newLogData } as LogEntry : item));
    } else {
      // Create mode
      const newEntry: LogEntry = {
        ...newLogData,
        id: 'log_' + Date.now()
      };
      setLogs(prev => [newEntry, ...prev]);
    }
    
    // Reset states and redirect to logbook list
    setEditingLog(null);
    setActiveTab('logbook');
  };

  // Delete log entry handler
  const handleDeleteLog = (id: string) => {
    setLogs(prev => prev.filter(item => item.id !== id));
    setEditingLog(null);
    setActiveTab('logbook');
  };

  // Import Backup logs & info
  const handleImportData = (importedLogs: LogEntry[], importedInfo?: InternshipInfo) => {
    setLogs(importedLogs);
    if (importedInfo) {
      setInfo(importedInfo);
    }
  };

  // Save attendance record handler
  const handleSaveAttendance = (record: AttendanceRecord) => {
    setAttendance(prev => {
      const exists = prev.some(item => item.date === record.date);
      if (exists) {
        return prev.map(item => item.date === record.date ? record : item);
      } else {
        return [record, ...prev];
      }
    });
  };

  // Delete attendance record handler
  const handleDeleteAttendance = (id: string) => {
    setAttendance(prev => prev.filter(item => item.id !== id));
  };

  // Clear logs helper
  const handleClearData = () => {
    setLogs([]);
    setAttendance([]);
    setInfo(INITIAL_INFO);
    setOfficeLoc(DEFAULT_OFFICE);
  };

  // Helper: Trigger form with preset date
  const handleQuickAdd = (initialDate?: string) => {
    setEditingLog(null);
    setActiveTab('tambah');
  };

  // Helper: Trigger editing of log
  const handleEditTrigger = (log: LogEntry) => {
    setEditingLog(log);
    setActiveTab('tambah');
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(username) => setCurrentUser(username)} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('yati_magang_active_username');
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  return (
    <div id="yati-magang-root" className="min-h-screen bg-[#FFFDF6] flex flex-col font-sans antialiased text-black">
      {/* 1. Interactive In-App Notification Toast */}
      {inAppAlert.show && (
        <div className="fixed top-6 right-6 left-6 md:left-auto md:w-96 bg-[#FFDE4D] text-black border-4 border-black p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] z-50 animate-fadeIn flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⚡</span>
              <h4 className="font-display font-extrabold text-sm uppercase tracking-wide text-black">{inAppAlert.title}</h4>
            </div>
            <button 
              onClick={() => setInAppAlert(prev => ({ ...prev, show: false }))}
              className="p-1 border-2 border-black bg-white hover:bg-[#FF6B6B] transition-all"
            >
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
          <p className="text-xs font-bold font-sans text-black leading-relaxed">{inAppAlert.body}</p>
          <div className="flex justify-end gap-2 pt-1.5">
            <button
              onClick={() => {
                setInAppAlert(prev => ({ ...prev, show: false }));
                handleQuickAdd();
              }}
              className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#ff5555] text-black border-2 border-black text-xs font-extrabold shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
            >
              Isi Sekarang
            </button>
          </div>
        </div>
      )}

      {/* 2. Web App Bar (Navigation & Logo) */}
      <header className="sticky top-0 bg-white border-b-4 border-black z-40 shadow-[0_4px_0px_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between gap-4">
            {/* Logo Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-3 border-black bg-[#FFDE4D] flex items-center justify-center text-black font-display font-extrabold text-xl shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                Y
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-lg text-black uppercase tracking-tight">Yati Magang</span>
                <span className="text-[9px] font-mono font-extrabold text-[#A259FF] uppercase tracking-wider bg-purple-100 border border-black px-1 py-0.5 rounded-sm">Logbook & Dashboard</span>
              </div>
            </div>

            {/* Tablet/Desktop Navigation tabs */}
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => { setActiveTab('dashboard'); setEditingLog(null); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 border-2 text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                  activeTab === 'dashboard' 
                    ? 'bg-[#FF6B6B] text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
                    : 'border-transparent text-gray-700 hover:bg-black/5 hover:border-black/20'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>

              <button
                onClick={() => { setActiveTab('logbook'); setEditingLog(null); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 border-2 text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                  activeTab === 'logbook' 
                    ? 'bg-[#FFDE4D] text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
                    : 'border-transparent text-gray-700 hover:bg-black/5 hover:border-black/20'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Logbook
              </button>

              <button
                onClick={() => { setActiveTab('presensi'); setEditingLog(null); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 border-2 text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                  activeTab === 'presensi' 
                    ? 'bg-[#39FF14] text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
                    : 'border-transparent text-gray-700 hover:bg-black/5 hover:border-black/20'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Presensi
              </button>

              <button
                onClick={() => { setActiveTab('profil'); setEditingLog(null); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 border-2 text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                  activeTab === 'profil' 
                    ? 'bg-[#C3F2FF] text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
                    : 'border-transparent text-gray-700 hover:bg-black/5 hover:border-black/20'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Profil & Pengaturan
              </button>
            </nav>

            {/* Profile Quick indicator (Right) */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Syncing Status Indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                {isSyncing ? (
                  <>
                    <CloudLightning className="w-3.5 h-3.5 animate-pulse text-[#A259FF]" />
                    <span className="text-[10px] font-extrabold text-black uppercase font-mono">SINKRON...</span>
                  </>
                ) : syncError ? (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-[#FF6B6B] animate-pulse" />
                    <span className="text-[10px] font-extrabold text-[#FF6B6B] uppercase font-mono">LOKAL CACHE</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-[#6BCB77]" />
                    <span className="text-[10px] font-extrabold text-[#6BCB77] uppercase font-mono">TERSINKRON</span>
                  </>
                )}
              </div>

              <div className="text-right flex flex-col">
                <span className="text-xs font-black uppercase tracking-tight text-black">{info.studentName || 'Mahasiswa'}</span>
                <span className="text-[9px] font-mono text-black font-semibold uppercase">{info.institution || 'Belum diatur'}</span>
              </div>
              <div className="w-9 h-9 bg-[#A259FF] border-2 border-black flex items-center justify-center font-display font-black text-sm text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                {info.studentName ? info.studentName.charAt(0) : 'M'}
              </div>
              
              <div className="h-6 w-0.5 bg-black mx-1"></div>
              
              <button
                onClick={handleLogout}
                title="Keluar Akun"
                className="p-2 border-2 border-black bg-[#FF6B6B]/20 hover:bg-[#FF6B6B] text-black hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Dashboard Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-16 md:mb-0">
        <div className="animate-fadeIn">
          {activeTab === 'dashboard' && (
            <Dashboard 
              logs={logs} 
              info={info} 
              attendanceLogs={attendance}
              onNavigateToForm={handleQuickAdd}
              onNavigateToList={() => setActiveTab('logbook')}
              onNavigateToPresensi={() => setActiveTab('presensi')}
              officeLoc={officeLoc}
            />
          )}

          {activeTab === 'logbook' && (
            <LogbookList 
              logs={logs} 
              info={info} 
              onEditLog={handleEditTrigger}
              onAddLog={handleQuickAdd}
            />
          )}

          {activeTab === 'tambah' && (
            <LogbookForm 
              editingLog={editingLog} 
              defaultMentorName={info.mentorName}
              onSave={handleSaveLog}
              onDelete={handleDeleteLog}
              onCancel={() => { setEditingLog(null); setActiveTab('logbook'); }}
            />
          )}

          {activeTab === 'presensi' && (
            <AttendanceSystem 
              attendanceLogs={attendance}
              onSaveAttendance={handleSaveAttendance}
              onDeleteAttendance={handleDeleteAttendance}
              officeLoc={officeLoc}
              onUpdateOfficeLoc={setOfficeLoc}
              info={info}
            />
          )}

          {activeTab === 'profil' && (
            <BackupSettings 
              info={info} 
              logs={logs}
              onUpdateInfo={setInfo}
              onImportLogs={handleImportData}
              onClearLogs={handleClearData}
              onLogout={handleLogout}
              officeLoc={officeLoc}
              onUpdateOfficeLoc={setOfficeLoc}
            />
          )}
        </div>
      </main>

      {/* 4. Mobile Bottom Toolbar (Fixed Bottom for Handphone access) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-3 border-black px-4 py-3.5 z-50 flex items-center justify-around shadow-[0_-3px_0px_rgba(0,0,0,1)]">
        <button
          onClick={() => { setActiveTab('dashboard'); setEditingLog(null); }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
            activeTab === 'dashboard' 
              ? 'text-black font-black scale-105 bg-[#FF6B6B] border-2 border-black p-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
              : 'text-gray-700 hover:text-black p-1.5'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-tight">Dashboard</span>
        </button>

        <button
          onClick={() => { setActiveTab('logbook'); setEditingLog(null); }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
            activeTab === 'logbook' 
              ? 'text-black font-black scale-105 bg-[#FFDE4D] border-2 border-black p-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
              : 'text-gray-700 hover:text-black p-1.5'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-tight">Logbook</span>
        </button>

        <button
          onClick={() => { setActiveTab('presensi'); setEditingLog(null); }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
            activeTab === 'presensi' 
              ? 'text-black font-black scale-105 bg-[#39FF14] border-2 border-black p-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
              : 'text-gray-700 hover:text-black p-1.5'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-tight">Presensi</span>
        </button>

        <button
          onClick={() => { setActiveTab('profil'); setEditingLog(null); }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
            activeTab === 'profil' 
              ? 'text-black font-black scale-105 bg-[#C3F2FF] border-2 border-black p-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
              : 'text-gray-700 hover:text-black p-1.5'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-tight">Pengaturan</span>
        </button>
      </div>

      {/* 5. Simple Footer */}
      <footer className="bg-white border-t-4 border-black py-8 text-center text-xs font-mono font-bold text-black px-4 mt-12 pb-28 md:pb-8 shadow-[0_-4px_0px_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 Yati Magang. Semua data tersimpan aman secara terenkripsi di database cloud.</p>
          <div className="flex gap-4">
            <a href="#dashboard-container" className="hover:underline decoration-2 decoration-[#FF6B6B] transition-colors">Syarat Penggunaan</a>
            <span>•</span>
            <a href="#dashboard-container" className="hover:underline decoration-2 decoration-[#FF6B6B] transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
