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
    <div id="auth-screen-container" className="min-h-screen bg-[#FFFDF6] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-black relative overflow-hidden">
      {/* Neo-brutalist background decorative circles */}
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-4 border-black bg-[#FF5C8A] -z-10 opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full border-4 border-black bg-[#39FF14] -z-10 opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-12 h-12 border-4 border-black bg-[#A259FF] -z-10 opacity-30 transform rotate-12 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 border-4 border-black bg-[#FFDE4D] flex items-center justify-center text-black font-display font-extrabold text-3xl shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-4">
            Y
          </div>
          <h2 className="text-3xl font-display font-extrabold text-black tracking-tight uppercase">
            Yati Magang
          </h2>
          <p className="mt-2 text-xs font-mono font-bold text-black border-2 border-black bg-[#C3F2FF] px-3 py-1.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
            LOGBOOK & DASHBOARD PRESENSI
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]">
          
          {/* Custom Tabs Switcher */}
          <div className="flex bg-[#F3EFE0] border-3 border-black p-1 mb-8 relative z-0">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-extrabold border-2 transition-all cursor-pointer ${
                isLogin 
                  ? 'bg-[#A259FF] text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
                  : 'border-transparent text-gray-600 hover:text-black hover:bg-black/5'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Masuk
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-extrabold border-2 transition-all cursor-pointer ${
                !isLogin 
                  ? 'bg-[#A259FF] text-black border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
                  : 'border-transparent text-gray-600 hover:text-black hover:bg-black/5'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Daftar Baru
            </button>
          </div>

          {/* Feedback Alert Messages */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-[#FF6B6B] border-3 border-black text-black flex gap-3 items-start text-xs font-bold leading-relaxed shadow-[3px_3px_0px_rgba(0,0,0,1)]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-black" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-[#6BCB77] border-3 border-black text-black flex gap-3 items-start text-xs font-bold leading-relaxed shadow-[3px_3px_0px_rgba(0,0,0,1)]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-black" />
              <span>{success}</span>
            </motion.div>
          )}

          {isLogin ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-xs font-extrabold text-black uppercase tracking-wider block mb-2 font-display">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isPending}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username Anda"
                    className="block w-full pl-10 pr-4 py-3 bg-white border-3 border-black text-xs font-bold text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:bg-[#FFFDF6] transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-black uppercase tracking-wider block mb-2 font-display">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    disabled={isPending}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    className="block w-full pl-10 pr-4 py-3 bg-white border-3 border-black text-xs font-bold text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:bg-[#FFFDF6] transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-[#FF6B6B] hover:bg-[#ff5555] text-black border-3 border-black font-extrabold shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
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
                <label className="text-xs font-extrabold text-black uppercase tracking-wider block mb-2 font-display">Username *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isPending}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                    placeholder="Pilih username unik (tanpa spasi)"
                    className="block w-full pl-10 pr-4 py-3 bg-white border-3 border-black text-xs font-bold text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:bg-[#FFFDF6] transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-black uppercase tracking-wider block mb-2 font-display">Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      disabled={isPending}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 4 karakter"
                      className="block w-full pl-10 pr-4 py-3 bg-white border-3 border-black text-xs font-bold text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:bg-[#FFFDF6] transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-black uppercase tracking-wider block mb-2 font-display">Konfirmasi Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      disabled={isPending}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password"
                      className="block w-full pl-10 pr-4 py-3 bg-white border-3 border-black text-xs font-bold text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:bg-[#FFFDF6] transition-all disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-black uppercase tracking-wider block mb-2 font-display">Nama Lengkap Mahasiswa *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isPending}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Contoh: Yati Amalia"
                    className="block w-full pl-10 pr-4 py-3 bg-white border-3 border-black text-xs font-bold text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:bg-[#FFFDF6] transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-black uppercase tracking-wider block mb-2 font-display">Instansi / Universitas *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    disabled={isPending}
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Contoh: Universitas Lambung Mangkura"
                    className="block w-full pl-10 pr-4 py-3 bg-white border-3 border-black text-xs font-bold text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:bg-[#FFFDF6] transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-extrabold text-black uppercase tracking-wider block mb-2 font-display">Posisi Magang</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
                      <Award className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      disabled={isPending}
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Contoh: Staf IT Developer Intern"
                      className="block w-full pl-10 pr-4 py-3 bg-white border-3 border-black text-xs font-bold text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:bg-[#FFFDF6] transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-black uppercase tracking-wider block mb-2 font-display">Tempat Magang *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-black">
                      <Building className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={isPending}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Contoh: Bank Kalsel Kantor Pusat"
                      className="block w-full pl-10 pr-4 py-3 bg-white border-3 border-black text-xs font-bold text-black placeholder-gray-500 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] focus:bg-[#FFFDF6] transition-all disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-[#FF6B6B] hover:bg-[#ff5555] text-black border-3 border-black font-extrabold shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
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

          <div className="mt-6 text-center border-t-2 border-dashed border-black pt-5">
            <p className="text-[10px] font-bold text-black uppercase tracking-wider leading-relaxed">
              * Data pendaftaran disimpan secara aman di database cloud (Firestore). Anda dapat masuk dari HP & Laptop secara otomatis.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
