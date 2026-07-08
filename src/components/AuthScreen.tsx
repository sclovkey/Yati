import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Lock, ArrowRight, UserPlus, LogIn, GraduationCap, Building, Award, AlertCircle, Loader2 } from 'lucide-react';
import { getFirestoreUser, createFirestoreUser } from '../lib/dbService';

interface AuthScreenProps {
  onLoginSuccess: (username: string) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Registration specific fields
  const [studentName, setStudentName] = useState('');
  const [institution, setInstitution] = useState('');
  const [position, setPosition] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mentorName, setMentorName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Username dan Password wajib diisi.');
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    setIsPending(true);

    try {
      // 1. Check in Firestore database first
      const firestoreUser = await getFirestoreUser(trimmedUsername);
      if (firestoreUser) {
        if (firestoreUser.password !== password) {
          setError('Password yang Anda masukkan salah.');
          setIsPending(false);
          return;
        }

        // Keep local user list in sync/cached
        const localUsers = JSON.parse(localStorage.getItem('yati_magang_users') || '[]');
        const localIndex = localUsers.findIndex((u: any) => u.username === trimmedUsername);
        const updatedLocalUser = {
          username: trimmedUsername,
          password: firestoreUser.password,
          studentName: firestoreUser.studentName,
          institution: firestoreUser.institution,
          companyName: firestoreUser.companyName,
          position: firestoreUser.position,
          mentorName: firestoreUser.mentorName
        };

        if (localIndex > -1) {
          localUsers[localIndex] = updatedLocalUser;
        } else {
          localUsers.push(updatedLocalUser);
        }
        localStorage.setItem('yati_magang_users', JSON.stringify(localUsers));

        // Success login
        localStorage.setItem('yati_magang_active_username', trimmedUsername);
        setIsPending(false);
        onLoginSuccess(trimmedUsername);
        return;
      }

      // 2. Fallback to local storage (legacy compatibility)
      const users = JSON.parse(localStorage.getItem('yati_magang_users') || '[]');
      const user = users.find((u: any) => u.username === trimmedUsername);

      if (!user) {
        setError('Username tidak terdaftar di database. Silakan daftar terlebih dahulu.');
        setIsPending(false);
        return;
      }

      if (user.password !== password) {
        setError('Password yang Anda masukkan salah.');
        setIsPending(false);
        return;
      }

      // Since they exist locally but not in Firestore, we should register them on Firestore automatically!
      try {
        await createFirestoreUser({
          username: trimmedUsername,
          password: user.password,
          studentName: user.studentName || trimmedUsername,
          institution: user.institution || '',
          companyName: user.companyName || 'Bank Kalsel Kantor Pusat',
          position: user.position || 'Staf IT Developer Intern',
          mentorName: user.mentorName || 'Akhmad Fauzi, S.Kom'
        });
      } catch (fErr) {
        console.warn('Auto-migrating legacy user to Firestore warning:', fErr);
      }

      // Success login
      localStorage.setItem('yati_magang_active_username', trimmedUsername);
      setIsPending(false);
      onLoginSuccess(trimmedUsername);
    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan koneksi saat masuk. Silakan coba lagi.');
      setIsPending(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedUsername || !password || !confirmPassword || !studentName.trim() || !institution.trim() || !companyName.trim()) {
      setError('Semua kolom bertanda bintang (*) wajib diisi.');
      return;
    }

    if (trimmedUsername.length < 3) {
      setError('Username minimal terdiri dari 3 karakter.');
      return;
    }

    if (password.length < 4) {
      setError('Password minimal terdiri dari 4 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsPending(true);

    try {
      // 1. Check if user already exists in Firestore database
      const existingUser = await getFirestoreUser(trimmedUsername);
      const users = JSON.parse(localStorage.getItem('yati_magang_users') || '[]');
      const localExists = users.some((u: any) => u.username === trimmedUsername);

      if (existingUser || localExists) {
        setError('Username sudah digunakan oleh pengguna lain.');
        setIsPending(false);
        return;
      }

      const newUser = {
        username: trimmedUsername,
        password,
        studentName: studentName.trim(),
        institution: institution.trim(),
        companyName: companyName.trim(),
        position: position.trim(),
        mentorName: mentorName.trim(),
      };

      // 2. Save in Firestore first
      await createFirestoreUser(newUser);

      // 3. Save in local storage (cache)
      users.push(newUser);
      localStorage.setItem('yati_magang_users', JSON.stringify(users));

      // Seed initial info for this new user directly to match key format
      const initialInfo = {
        studentName: newUser.studentName,
        institution: newUser.institution,
        companyName: newUser.companyName,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000 * 30).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 * 60).toISOString().split('T')[0],
        position: newUser.position,
        mentorName: newUser.mentorName
      };
      localStorage.setItem(`yati_magang_info_${trimmedUsername}`, JSON.stringify(initialInfo));

      setSuccess('Pendaftaran berhasil disimpan ke database cloud! Mengalihkan ke halaman masuk...');
      
      // Reset form and switch to login
      setTimeout(() => {
        setIsLogin(true);
        setError(null);
        setSuccess(null);
        setIsPending(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan koneksi saat mendaftar. Silakan coba lagi.');
      setIsPending(false);
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center text-white font-mono font-bold text-2xl shadow-xl shadow-gray-200 mb-4 animate-bounce">
            Y
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Yati Magang
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Logbook & Dashboard Presensi
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-md py-8 px-6 sm:px-10 rounded-3xl shadow-xl shadow-gray-100/70 border border-gray-100/50">
          
          {/* Custom Tabs Switcher with Motion */}
          <div className="flex bg-gray-50 p-1 rounded-2xl mb-8 relative z-0">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
                isLogin ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {isLogin && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-gray-100 -z-10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <LogIn className="w-3.5 h-3.5" />
              Masuk
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
                !isLogin ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {!isLogin && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-gray-100 -z-10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <UserPlus className="w-3.5 h-3.5" />
              Daftar Baru
            </button>
          </div>

          {/* Feedback Alert Messages */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 flex gap-3 items-start text-xs leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 flex gap-3 items-start text-xs leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}

          {isLogin ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isPending}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username Anda"
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    disabled={isPending}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-gray-900 text-white rounded-2xl text-xs font-bold hover:bg-gray-850 active:scale-98 transition-all shadow-md shadow-gray-900/10 cursor-pointer mt-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses Masuk...
                  </>
                ) : (
                  <>
                    Masuk ke Aplikasi
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Username *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isPending}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                    placeholder="Pilih username unik (tanpa spasi)"
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      disabled={isPending}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 4 karakter"
                      className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Konfirmasi Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      disabled={isPending}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password"
                      className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white transition-all disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Nama Lengkap Mahasiswa *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isPending}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Contoh: Yati Amalia"
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Instansi / Universitas *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isPending}
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Contoh: Universitas Lambung Mangkurat"
                    className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Posisi Magang</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Award className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      disabled={isPending}
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Contoh: Staf IT Developer Intern"
                      className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Tempat Magang *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={isPending}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Contoh: Bank Kalsel Kantor Pusat"
                      className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 focus:bg-white transition-all disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-gray-900 text-white rounded-2xl text-xs font-bold hover:bg-gray-850 active:scale-98 transition-all shadow-md shadow-gray-900/10 cursor-pointer mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses Pendaftaran...
                  </>
                ) : (
                  <>
                    Mendaftar Sekarang
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              * Data pendaftaran disimpan secara aman di database cloud (Firestore) sehingga Anda dapat masuk dari perangkat mana pun (seperti HP) secara otomatis.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
