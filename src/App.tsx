/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LogEntry, InternshipInfo, NotificationSettings as SettingsType, AttendanceRecord, OfficeLocation } from './types';
import Dashboard from './components/Dashboard';
import LogbookForm from './components/LogbookForm';
import LogbookList from './components/LogbookList';
import NotificationSettings from './components/NotificationSettings';
import BackupSettings from './components/BackupSettings';
import AttendanceSystem from './components/AttendanceSystem';
import AuthScreen from './components/AuthScreen';
import { checkAndTriggerReminder } from './utils/notification';
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
  LogOut
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
  latitude: -3.322238,
  longitude: 114.591253,
  radius: 600, // 600 meters
  name: 'Bank Kalsel Kantor Pusat'
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'logbook' | 'tambah' | 'presensi' | 'notifikasi' | 'profil'>('dashboard');
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  
  // In-app banner alert state for reminders
  const [inAppAlert, setInAppAlert] = useState<{ show: boolean; title: string; body: string }>({
    show: false,
    title: '',
    body: ''
  });

  // 3. Hydrate state whenever active user changes and migrate any anonymous data if needed
  useEffect(() => {
    if (currentUser) {
      // Migrate anonymous data if it exists and user has no user-specific data yet
      const userLogsStr = localStorage.getItem(`yati_magang_logs_${currentUser}`);
      if (!userLogsStr) {
        const anonLogs = localStorage.getItem('yati_magang_logs');
        if (anonLogs && JSON.parse(anonLogs).length > 0) {
          localStorage.setItem(`yati_magang_logs_${currentUser}`, anonLogs);
        }
      }

      const userAttendanceStr = localStorage.getItem(`yati_magang_attendance_${currentUser}`);
      if (!userAttendanceStr) {
        const anonAttendance = localStorage.getItem('yati_magang_attendance');
        if (anonAttendance && JSON.parse(anonAttendance).length > 0) {
          localStorage.setItem(`yati_magang_attendance_${currentUser}`, anonAttendance);
        }
      }

      const userInfoStr = localStorage.getItem(`yati_magang_info_${currentUser}`);
      if (!userInfoStr) {
        const anonInfo = localStorage.getItem('yati_magang_info');
        if (anonInfo) {
          localStorage.setItem(`yati_magang_info_${currentUser}`, anonInfo);
        }
      }

      // Now fetch user-specific data
      const savedLogs = localStorage.getItem(`yati_magang_logs_${currentUser}`);
      setLogs(savedLogs ? JSON.parse(savedLogs) : INITIAL_LOGS);

      const savedInfo = localStorage.getItem(`yati_magang_info_${currentUser}`);
      if (savedInfo) {
        setInfo(JSON.parse(savedInfo));
      } else {
        // Fallback: search in registered users table
        const users = JSON.parse(localStorage.getItem('yati_magang_users') || '[]');
        const matchedUser = users.find((u: any) => u.username === currentUser);
        if (matchedUser) {
          const seededInfo: InternshipInfo = {
            studentName: matchedUser.studentName || currentUser,
            institution: matchedUser.institution || 'Universitas Lambung Mangkurat',
            companyName: 'Bank Kalsel Kantor Pusat',
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000 * 30).toISOString().split('T')[0],
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 * 60).toISOString().split('T')[0],
            position: matchedUser.position || 'Staf IT Developer Intern',
            mentorName: matchedUser.mentorName || 'Akhmad Fauzi, S.Kom'
          };
          setInfo(seededInfo);
          localStorage.setItem(`yati_magang_info_${currentUser}`, JSON.stringify(seededInfo));
        } else {
          setInfo(INITIAL_INFO);
        }
      }

      const savedNotif = localStorage.getItem(`yati_magang_notif_settings_${currentUser}`);
      setNotifSettings(savedNotif ? JSON.parse(savedNotif) : INITIAL_NOTIF_SETTINGS);

      const savedAttendance = localStorage.getItem(`yati_magang_attendance_${currentUser}`);
      setAttendance(savedAttendance ? JSON.parse(savedAttendance) : []);

      const savedOffice = localStorage.getItem(`yati_magang_office_loc_${currentUser}`);
      setOfficeLoc(savedOffice ? JSON.parse(savedOffice) : DEFAULT_OFFICE);
    } else {
      setLogs([]);
      setInfo(INITIAL_INFO);
      setNotifSettings(INITIAL_NOTIF_SETTINGS);
      setAttendance([]);
      setOfficeLoc(DEFAULT_OFFICE);
    }
  }, [currentUser]);

  // 4. Save state back to user-specific local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`yati_magang_logs_${currentUser}`, JSON.stringify(logs));
    }
  }, [logs, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`yati_magang_info_${currentUser}`, JSON.stringify(info));
    }
  }, [info, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`yati_magang_notif_settings_${currentUser}`, JSON.stringify(notifSettings));
    }
  }, [notifSettings, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`yati_magang_attendance_${currentUser}`, JSON.stringify(attendance));
    }
  }, [attendance, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`yati_magang_office_loc_${currentUser}`, JSON.stringify(officeLoc));
    }
  }, [officeLoc, currentUser]);

  // 3. Background timer check for notifications (every 30 seconds)
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const hasFilledToday = logs.some(l => l.date === todayStr);

    const checkInterval = setInterval(() => {
      const result = checkAndTriggerReminder(
        notifSettings,
        hasFilledToday,
        (title, body) => {
          // Callback for showing in-app notification banner
          setInAppAlert({ show: true, title, body });
        }
      );

      if (result.triggered && result.updatedSettings) {
        setNotifSettings(result.updatedSettings);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [notifSettings, logs]);

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
    <div id="yati-magang-root" className="min-h-screen bg-gray-50/50 flex flex-col font-sans antialiased text-gray-800">
      {/* 1. Interactive In-App Notification Toast */}
      {inAppAlert.show && (
        <div className="fixed top-6 right-6 left-6 md:left-auto md:w-96 bg-gray-900 text-white rounded-2xl p-5 border border-gray-800 shadow-2xl z-50 animate-fadeIn flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📝</span>
              <h4 className="font-bold text-sm text-white">{inAppAlert.title}</h4>
            </div>
            <button 
              onClick={() => setInAppAlert(prev => ({ ...prev, show: false }))}
              className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{inAppAlert.body}</p>
          <div className="flex justify-end gap-2 pt-1.5">
            <button
              onClick={() => {
                setInAppAlert(prev => ({ ...prev, show: false }));
                handleQuickAdd();
              }}
              className="px-3.5 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-100"
            >
              Isi Sekarang
            </button>
          </div>
        </div>
      )}

      {/* 2. Web App Bar (Navigation & Logo) */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* Logo Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center text-white font-mono font-bold tracking-tight">
                Y
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-gray-900 tracking-tight">Yati Magang</span>
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Logbook & Dashboard</span>
              </div>
            </div>

            {/* Tablet/Desktop Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => { setActiveTab('dashboard'); setEditingLog(null); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>

              <button
                onClick={() => { setActiveTab('logbook'); setEditingLog(null); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'logbook' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Catatan Logbook
              </button>

              <button
                onClick={() => { setActiveTab('presensi'); setEditingLog(null); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'presensi' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Presensi
              </button>

              <button
                onClick={() => { setActiveTab('notifikasi'); setEditingLog(null); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'notifikasi' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                Pengingat
                {notifSettings.enabled && <span className="w-1.5 h-1.5 rounded-full bg-gray-900"></span>}
              </button>

              <button
                onClick={() => { setActiveTab('profil'); setEditingLog(null); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'profil' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Profil & Backup
              </button>
            </nav>

            {/* Profile Quick indicator (Right) */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right flex flex-col">
                <span className="text-xs font-bold text-gray-800">{info.studentName || 'Mahasiswa'}</span>
                <span className="text-[9px] text-gray-400 font-mono">{info.institution || 'Belum diatur'}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-600">
                {info.studentName ? info.studentName.charAt(0) : 'M'}
              </div>
              
              <div className="h-5 w-[1px] bg-gray-150 mx-1"></div>
              
              <button
                onClick={handleLogout}
                title="Keluar Akun"
                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Dashboard Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fadeIn">
          {activeTab === 'dashboard' && (
            <Dashboard 
              logs={logs} 
              info={info} 
              attendanceLogs={attendance}
              onNavigateToForm={handleQuickAdd}
              onNavigateToList={() => setActiveTab('logbook')}
            />
          )}

          {activeTab === 'logbook' && (
            <LogbookList 
              logs={logs} 
              info={info} 
              onEditLog={handleEditTrigger}
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

          {activeTab === 'notifikasi' && (
            <NotificationSettings 
              settings={notifSettings} 
              onUpdateSettings={setNotifSettings}
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
            />
          )}
        </div>
      </main>

      {/* 4. Mobile Bottom Toolbar (Fixed Bottom for Handphone access) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-50 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <button
          onClick={() => { setActiveTab('dashboard'); setEditingLog(null); }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'dashboard' ? 'text-gray-900 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => { setActiveTab('logbook'); setEditingLog(null); }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'logbook' ? 'text-gray-900 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">Logbook</span>
        </button>

        <button
          onClick={() => { setActiveTab('presensi'); setEditingLog(null); }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'presensi' ? 'text-gray-900 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px]">Presensi</span>
        </button>

        <button
          onClick={() => { setActiveTab('notifikasi'); setEditingLog(null); }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'notifikasi' ? 'text-gray-900 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[10px]">Notifikasi</span>
        </button>

        <button
          onClick={() => { setActiveTab('profil'); setEditingLog(null); }}
          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'profil' ? 'text-gray-900 font-semibold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Profil</span>
        </button>
      </div>

      {/* 5. Simple Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-[11px] text-gray-400 px-4 mt-12 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 Yati Magang. Semua data tersimpan aman secara lokal di peramban Anda.</p>
          <div className="flex gap-4">
            <a href="#dashboard-container" className="hover:text-gray-600 transition-colors">Syarat Penggunaan</a>
            <span>•</span>
            <a href="#dashboard-container" className="hover:text-gray-600 transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
