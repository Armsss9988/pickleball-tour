"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Trophy, Medal, Users, Settings2, PlayCircle, Shuffle, ShieldCheck, Eye, Loader2, Lock, ArrowLeft, Sparkles, MessageSquareQuote, Key, Zap, Flame, RotateCcw, AlertTriangle, MapPin, Clock, Info, LogOut } from 'lucide-react';
// Removed Firebase imports for PostgreSQL sync

// ================= HÀM LẤY LOCALSTORAGE AN TOÀN =================
const getSafeLocal = (key) => { try { return localStorage.getItem(key) || ''; } catch (e) { return ''; } };
const setSafeLocal = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { console.warn("Chặn lưu trữ"); } };
const removeSafeLocal = (key) => { try { localStorage.removeItem(key); } catch (e) {} };

// ================= JWT SESSION HELPERS =================
const REFRESH_TOKEN_KEY = 'pb_refresh_token';

// ================= AUTO GENERATE MATCHES =================
const generateMatchesForGroup = (teamIndices, prefix) => {
  let matches = []; let idC = 1;
  for (let i = 0; i < teamIndices.length; i++) {
    for (let j = i + 1; j < teamIndices.length; j++) {
      matches.push({ id: `${prefix}_${idC++}`, t1Idx: teamIndices[i], t2Idx: teamIndices[j], s1: '', s2: '' });
    }
  }
  return matches.sort(() => Math.random() - 0.5);
};

// KHỞI TẠO DỮ LIỆU GỐC THEO ẢNH EXCEL
const generateDefaultState = () => {
  return {
    mensPlayers: [
      "Nam Giang", "Phan Anh idol", "Chiến Ocean Edu", "Hoàng Thiên", 
      "Ngọc Thọ", "Điện máy Chiến Hương Qb", "Minh Hải", "Tuấn Sơn", 
      "Lân Qbi", "Nam Nguyen Hoang", "Như Hiếu", "Hoàng Ban", 
      "Phúc Huỳnh Lộc Ninh", "Điện Tử Đức Quang"
    ], 
    womensPlayers: [
      "Anh Đào", "Phương Thảo", "Diệu Linh", "Thúy Hằng", 
      "Dương Thảo", "Phạm Hạnh", "Lim", "Ngọc Hà", 
      "Hoàng Hiền", "Đinh Tuyến", "Hạ Thu", "Hồng Lê" 
    ], 
    mensTeams: [
      "Nam Giang - Phan Anh idol", "Chiến Ocean Edu - Hoàng Thiên", 
      "Ngọc Thọ - Điện máy Chiến Hương Qb", "Minh Hải - Tuấn Sơn",
      "Lân Qbi - Nam Nguyen Hoang", "Như Hiếu - Hoàng Ban", 
      "Phúc Huỳnh Lộc Ninh - Điện Tử Đức Quang"
    ],
    womensTeams: [
      "Anh Đào - Phương Thảo", "Diệu Linh - Thúy Hằng", 
      "Dương Thảo - Phạm Hạnh", "Lim - Ngọc Hà", 
      "Hoàng Hiền - Đinh Tuyến", "Hạ Thu - Hồng Lê"
    ],
    mensSetup: false, womensSetup: false,
    mensGroupA: [], mensGroupB: [], mensKO: { sf1: {s1:'', s2:''}, sf2: {s1:'', s2:''}, final: {s1:'', s2:''}, third: {s1:'', s2:''} },
    womensGroupA: [], womensGroupB: [], womensKO: { sf1: {s1:'', s2:''}, sf2: {s1:'', s2:''}, final: {s1:'', s2:''}, third: {s1:'', s2:''} },
    shuffling: null, hypeMessage: ''
  };
};

// ================= UI COMPONENTS =================
const GolabLogo = () => (
  <svg viewBox="0 0 200 140" width="128" height="90" className="w-24 h-auto sm:w-32 drop-shadow-md" style={{ maxWidth: '140px' }}>
    <ellipse cx="100" cy="70" rx="95" ry="65" fill="#583182" stroke="#F4E75A" strokeWidth="4" />
    <g opacity="0.85"><circle cx="100" cy="40" r="22" fill="#DFD454" /><text x="100" y="47" fill="white" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">A</text></g>
    <g opacity="0.85"><circle cx="82" cy="65" r="22" fill="#69A057" /><text x="82" y="72" fill="white" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">S</text></g>
    <g opacity="0.85"><circle cx="118" cy="65" r="22" fill="#5684BC" /><text x="118" y="72" fill="white" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">C</text></g>
    <text x="100" y="115" fill="#F4E75A" fontSize="42" fontFamily="Arial, sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="-1">golab</text>
  </svg>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [authStep, setAuthStep] = useState('role_select'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('mens');
  
  // JWT tokens: access token in memory ref, refresh token in localStorage
  const accessTokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tourneyState, setTourneyState] = useState(generateDefaultState());
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // AI States
  const [geminiApiKey, setGeminiApiKey] = useState(getSafeLocal('gemini_api_key'));
  const [aiCommentary, setAiCommentary] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingNickname, setIsGeneratingNickname] = useState(false);
  const [showApiInput, setShowApiInput] = useState(!getSafeLocal('gemini_api_key'));

  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3000); };

  // ===== JWT helper: schedule silent refresh before token expires =====
  const scheduleTokenRefresh = useCallback((expiresInMs: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Refresh 60 seconds before expiry
    const delay = Math.max(expiresInMs - 60_000, 5_000);
    refreshTimerRef.current = setTimeout(async () => {
      const storedRefresh = getSafeLocal(REFRESH_TOKEN_KEY);
      if (!storedRefresh) return;
      try {
        const res = await fetch('/api/pickleball-refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefresh }),
        });
        if (!res.ok) throw new Error('refresh failed');
        const data = await res.json();
        accessTokenRef.current = data.accessToken;
        setSafeLocal(REFRESH_TOKEN_KEY, data.refreshToken);
        // Parse new expiry from JWT payload (base64 middle part)
        try {
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          const expiresIn = (payload.exp * 1000) - Date.now();
          scheduleTokenRefresh(expiresIn);
        } catch {}
      } catch (err) {
        console.error('Silent refresh failed, logging out', err);
        handleLogout();
      }
    }, delay);
  }, []);

  // ===== Auto-restore session from localStorage on mount =====
  useEffect(() => {
    const storedRefresh = getSafeLocal(REFRESH_TOKEN_KEY);
    if (!storedRefresh) return;
    // Try to get a new access token with the stored refresh token
    (async () => {
      try {
        const res = await fetch('/api/pickleball-refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefresh }),
        });
        if (!res.ok) {
          removeSafeLocal(REFRESH_TOKEN_KEY);
          return;
        }
        const data = await res.json();
        accessTokenRef.current = data.accessToken;
        setSafeLocal(REFRESH_TOKEN_KEY, data.refreshToken);
        setRole('admin');
        try {
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          const expiresIn = (payload.exp * 1000) - Date.now();
          scheduleTokenRefresh(expiresIn);
        } catch {}
      } catch (err) {
        console.error('Auto-restore session failed:', err);
        removeSafeLocal(REFRESH_TOKEN_KEY);
      }
    })();
  }, [scheduleTokenRefresh]);

  const handleLogout = useCallback(async () => {
    const storedRefresh = getSafeLocal(REFRESH_TOKEN_KEY);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    accessTokenRef.current = null;
    removeSafeLocal(REFRESH_TOKEN_KEY);
    setRole(null);
    setAuthStep('role_select');
    setPasswordInput('');
    if (storedRefresh) {
      fetch('/api/pickleball-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      }).catch(() => {});
    }
  }, []);

  // ================= TỰ ĐỘNG NHÚNG CSS CHO CODESANDBOX =================
  useEffect(() => {
    if (!document.getElementById('tailwind-script')) {
      const script = document.createElement('script');
      script.id = 'tailwind-script';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // 1. ĐỒNG BỘ DỮ LIỆU POSTGRESQL (GET/POST) VÀ POLLING CHO VIEWER
  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch('/api/pickleball-state');
        const data = await res.json();
        if (isMounted && data) {
          if(!data.mensKO) data.mensKO = generateDefaultState().mensKO;
          if(!data.womensKO) data.womensKO = generateDefaultState().womensKO;
          setTourneyState(data);
        }
      } catch (err) {
        console.error("Lỗi fetch state:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchState();

    const interval = setInterval(() => {
      if (role === 'viewer') {
        fetchState();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [role]);

  const syncToCloud = async (newState) => {
    if (role !== 'admin') return;
    const token = accessTokenRef.current;
    if (!token) { showToast('Phiên đăng nhập hết hạn, đang làm mới...'); return; }
    try {
      const res = await fetch('/api/pickleball-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newState),
      });
      if (res.status === 401) {
        // Try refresh once
        const storedRefresh = getSafeLocal(REFRESH_TOKEN_KEY);
        if (!storedRefresh) { handleLogout(); return; }
        const rRes = await fetch('/api/pickleball-refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefresh }),
        });
        if (!rRes.ok) { handleLogout(); return; }
        const rData = await rRes.json();
        accessTokenRef.current = rData.accessToken;
        setSafeLocal(REFRESH_TOKEN_KEY, rData.refreshToken);
        // Retry original request
        await fetch('/api/pickleball-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rData.accessToken}` },
          body: JSON.stringify(newState),
        });
      }
    } catch (e) {
      console.error("Lỗi syncToCloud:", e);
    }
  };

  const updateStateAndSync = (updates) => {
    if (role !== 'admin') return;
    setTourneyState(prev => {
        const newState = { ...prev, ...updates };
        syncToCloud(newState);
        return newState;
    });
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/pickleball-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAuthError(err.message || 'Mật khẩu sai!');
        setPasswordInput('');
        return;
      }
      const data = await res.json();
      accessTokenRef.current = data.accessToken;
      setSafeLocal(REFRESH_TOKEN_KEY, data.refreshToken);
      // Schedule background refresh
      try {
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        const expiresIn = (payload.exp * 1000) - Date.now();
        scheduleTokenRefresh(expiresIn);
      } catch {}

      setRole('admin');
      try {
        const stateRes = await fetch('/api/pickleball-state');
        const stateData = await stateRes.json();
        if (stateData) {
          if(!stateData.mensKO) stateData.mensKO = generateDefaultState().mensKO;
          if(!stateData.womensKO) stateData.womensKO = generateDefaultState().womensKO;
          setTourneyState(stateData);
        } else {
          await syncToCloud(tourneyState);
        }
      } catch(e) {}
    } catch (err) {
      setAuthError('Lỗi kết nối máy chủ.');
    }
  };

  const resetTournament = () => {
    if (role !== 'admin') return;
    const defaultData = generateDefaultState();
    setTourneyState(defaultData); syncToCloud(defaultData);
    setShowResetConfirm(false); showToast("Đã khôi phục dữ liệu gốc!");
  };

  // 3. LOGIC GIẢI ĐẤU
  const executeInstantShuffle = (type) => {
    if (role !== 'admin') return;
    const playersKey = type === 'mens' ? 'mensPlayers' : 'womensPlayers';
    const arr = [...(tourneyState[playersKey] || [])];
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    updateStateAndSync({ [playersKey]: arr });
    showToast("Đã xáo trộn danh sách!");
  };

  const handlePlayerChange = (type, index, value) => {
    if (role !== 'admin') return;
    const playersKey = type === 'mens' ? 'mensPlayers' : 'womensPlayers';
    const newPlayers = [...(tourneyState[playersKey] || [])];
    newPlayers[index] = value;
    updateStateAndSync({ [playersKey]: newPlayers });
  };

  const finalizeAndPair = (type) => {
    if (role !== 'admin') return;
    const setupKey = type === 'mens' ? 'mensSetup' : 'womensSetup';
    
    let updates = { [setupKey]: true };
    if (type === 'mens') {
      updates.mensGroupA = generateMatchesForGroup([0, 1, 2], 'm_A');
      updates.mensGroupB = generateMatchesForGroup([3, 4, 5, 6], 'm_B');
    } else {
      updates.womensGroupA = generateMatchesForGroup([0, 1, 2], 'w_A');
      updates.womensGroupB = generateMatchesForGroup([3, 4, 5], 'w_B');
    }
    
    updateStateAndSync(updates);
    showToast(`Đã chia bảng và lên lịch!`);
  };

  const handleGroupScoreChange = (type, group, matchId, field, value) => {
    if (role !== 'admin') return;
    const val = value === '' ? '' : parseInt(value, 10);
    const key = type === 'mens' ? (group === 'A' ? 'mensGroupA' : 'mensGroupB') : (group === 'A' ? 'womensGroupA' : 'womensGroupB');
    setTourneyState(prev => {
        const newMatches = (prev[key] || []).map(m => m.id === matchId ? { ...m, [field]: val } : m);
        const newState = { ...prev, [key]: newMatches };
        syncToCloud(newState); return newState;
    });
  };

  const handleKOScoreChange = (type, match, field, value) => {
    if (role !== 'admin') return;
    const val = value === '' ? '' : parseInt(value, 10);
    const key = type === 'mens' ? 'mensKO' : 'womensKO';
    setTourneyState(prev => {
        const newKO = { ...prev[key] };
        newKO[match] = { ...newKO[match], [field]: val };
        const newState = { ...prev, [key]: newKO };
        syncToCloud(newState); return newState;
    });
  };

  // --- TÍNH TOÁN BẢNG XẾP HẠNG & ĐẨY NHÁNH TỰ ĐỘNG ---
  const calculateStandings = (teams, matches, teamIndicesInGroup) => {
    if (!teams || !matches) return [];
    let stats = teamIndicesInGroup.map(idx => ({ index: idx, name: teams[idx], played: 0, wins: 0, losses: 0, pointDiff: 0, points: 0 }));
    
    matches.forEach(m => {
      if (m.s1 !== '' && m.s2 !== '') {
        const t1Stat = stats.find(s => s.index === m.t1Idx);
        const t2Stat = stats.find(s => s.index === m.t2Idx);
        if(t1Stat && t2Stat) {
          t1Stat.played++; t2Stat.played++;
          let diff = m.s1 - m.s2;
          t1Stat.pointDiff += diff; t2Stat.pointDiff -= diff;
          if (m.s1 > m.s2) { t1Stat.wins++; t1Stat.points++; t2Stat.losses++; }
          else if (m.s1 < m.s2) { t2Stat.wins++; t2Stat.points++; t1Stat.losses++; }
        }
      }
    });
    return stats.sort((a, b) => b.points !== a.points ? b.points - a.points : b.pointDiff !== a.pointDiff ? b.pointDiff - a.pointDiff : a.name.localeCompare(b.name));
  };

  const calculateKnockoutLogic = (teams, groupAStats, groupBStats, koState) => {
    const firstA = groupAStats[0]?.name; const secondA = groupAStats[1]?.name;
    const firstB = groupBStats[0]?.name; const secondB = groupBStats[1]?.name;
    let sf1Winner = null, sf1Loser = null, sf2Winner = null, sf2Loser = null, champion = null, thirdPlace = null;
    
    if(koState.sf1.s1 !== '' && koState.sf1.s2 !== '') {
        if(koState.sf1.s1 > koState.sf1.s2) { sf1Winner = firstA; sf1Loser = secondB; }
        else if(koState.sf1.s2 > koState.sf1.s1) { sf1Winner = secondB; sf1Loser = firstA; }
    }
    if(koState.sf2.s1 !== '' && koState.sf2.s2 !== '') {
        if(koState.sf2.s1 > koState.sf2.s2) { sf2Winner = firstB; sf2Loser = secondA; }
        else if(koState.sf2.s2 > koState.sf2.s1) { sf2Winner = secondA; sf2Loser = firstB; }
    }
    if(koState.final.s1 !== '' && koState.final.s2 !== '') { champion = koState.final.s1 > koState.final.s2 ? sf1Winner : (koState.final.s2 > koState.final.s1 ? sf2Winner : null); }
    if(koState.third.s1 !== '' && koState.third.s2 !== '') { thirdPlace = koState.third.s1 > koState.third.s2 ? sf1Loser : (koState.third.s2 > koState.third.s1 ? sf2Loser : null); }
    return { firstA, secondA, firstB, secondB, sf1Winner, sf1Loser, sf2Winner, sf2Loser, champion, thirdPlace };
  };

  const mensStandingsA = useMemo(() => calculateStandings(tourneyState?.mensTeams, tourneyState?.mensGroupA, [0,1,2]), [tourneyState]);
  const mensStandingsB = useMemo(() => calculateStandings(tourneyState?.mensTeams, tourneyState?.mensGroupB, [3,4,5,6]), [tourneyState]);
  const mensKOData = useMemo(() => calculateKnockoutLogic(tourneyState?.mensTeams, mensStandingsA, mensStandingsB, tourneyState?.mensKO || generateDefaultState().mensKO), [mensStandingsA, mensStandingsB, tourneyState]);

  const womensStandingsA = useMemo(() => calculateStandings(tourneyState?.womensTeams, tourneyState?.womensGroupA, [0,1,2]), [tourneyState]);
  const womensStandingsB = useMemo(() => calculateStandings(tourneyState?.womensTeams, tourneyState?.womensGroupB, [3,4,5]), [tourneyState]);
  const womensKOData = useMemo(() => calculateKnockoutLogic(tourneyState?.womensTeams, womensStandingsA, womensStandingsB, tourneyState?.womensKO || generateDefaultState().womensKO), [womensStandingsA, womensStandingsB, tourneyState]);

  // --- AI LOGIC ---
  const callGeminiAPI = async (prompt) => {
    if (!geminiApiKey) { setShowApiInput(true); throw new Error("Vui lòng nhập API Key"); }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text.replace(/[\*\"]/g, '').trim(); 
  };

  const generateAllNicknames = async (type) => {
    if (role !== 'admin' || isGeneratingNickname) return;
    setIsGeneratingNickname(true);
    try {
      const teamsKey = type === 'mens' ? 'mensTeams' : 'womensTeams';
      const currentTeams = [...tourneyState[teamsKey]];
      const prompt = `Đặt biệt danh thể thao ngầu (tối đa 3 chữ) cho MỖI đội sau: ${currentTeams.join(', ')}. Trả về định dạng: [Tên đội ban đầu] ([Biệt danh]). Mỗi đội 1 dòng.`;
      const response = await callGeminiAPI(prompt);
      const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if(lines.length === currentTeams.length) {
        updateStateAndSync({ [teamsKey]: lines }); showToast("Tạo biệt danh thành công!");
      } else { showToast("AI lỗi định dạng, hãy thử lại."); }
    } catch (e) { showToast(e.message); }
    finally { setIsGeneratingNickname(false); }
  };

  const generateAICommentary = async () => {
    setIsGeneratingAI(true); setAiCommentary('');
    try {
      let prompt = activeTab === 'mens' 
        ? `Bình luận máu lửa (100 chữ) giải Pickleball GOLAB đôi Nam (Vòng tròn). Bảng A Nhất: ${mensKOData.firstA||'Chưa rõ'}. Bảng B Nhất: ${mensKOData.firstB||'Chưa rõ'}. Thêm emoji.`
        : `Bình luận máu lửa (100 chữ) giải Pickleball GOLAB đôi Nữ (Vòng tròn). Khen ngợi các bóng hồng. Thêm emoji.`;
      setAiCommentary(await callGeminiAPI(prompt));
    } catch (e) { setAiCommentary(`Lỗi AI: ${e.message}`); }
    finally { setIsGeneratingAI(false); }
  };

  // ================= UI SUB-COMPONENTS =================
  const GroupTable = ({ title, standings }) => (
    <div className="mb-6">
      <h3 className="font-bold text-lg mb-2 text-indigo-800 bg-indigo-50 px-3 py-1 rounded inline-block">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-sm text-left border overflow-hidden">
          <thead className="bg-slate-100 font-bold uppercase"><tr className="border-b"><th className="p-2 w-10 text-center">#</th><th className="p-2">Tên Đội</th><th className="p-2 text-center text-green-600">T</th><th className="p-2 text-center text-red-500">B</th><th className="p-2 text-center">HS</th><th className="p-2 text-center text-blue-600">Đ</th></tr></thead>
          <tbody>
            {standings.map((team, idx) => (
              <tr key={idx} className={`border-b ${idx < 2 ? 'bg-blue-50/50' : 'bg-white'}`}>
                <td className="p-2 font-bold text-center">{idx + 1}</td>
                <td className="p-2 font-semibold truncate max-w-[140px] text-xs sm:text-sm" title={team.name}>{team.name}</td>
                <td className="p-2 text-center font-bold text-green-600">{team.wins}</td><td className="p-2 text-center text-red-500">{team.losses}</td>
                <td className="p-2 text-center font-mono">{team.pointDiff > 0 ? `+${team.pointDiff}` : team.pointDiff}</td>
                <td className="p-2 text-center font-bold text-blue-600 text-base">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const MatchList = ({ matches, teams, type, group }) => (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-6">
      {matches.map((m, idx) => (
        <div key={m.id} className="bg-white border p-2 rounded-lg flex justify-between items-center gap-1 shadow-sm">
          <div className="flex-1 text-right text-xs sm:text-sm font-medium truncate" title={teams[m.t1Idx]}>{teams[m.t1Idx]}</div>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded border shrink-0">
            <input type="number" min="0" disabled={role !== 'admin'} className="w-8 sm:w-10 h-7 text-center border rounded bg-white font-bold outline-none focus:border-blue-500" value={m.s1} onChange={(e) => handleGroupScoreChange(type, group, m.id, 's1', e.target.value)} />
            <span className="font-bold text-slate-400">-</span>
            <input type="number" min="0" disabled={role !== 'admin'} className="w-8 sm:w-10 h-7 text-center border rounded bg-white font-bold outline-none focus:border-blue-500" value={m.s2} onChange={(e) => handleGroupScoreChange(type, group, m.id, 's2', e.target.value)} />
          </div>
          <div className="flex-1 text-left text-xs sm:text-sm font-medium truncate" title={teams[m.t2Idx]}>{teams[m.t2Idx]}</div>
        </div>
      ))}
    </div>
  );

  const KnockoutBox = ({ title, t1, t2, s1, s2, w, matchKey, type }) => (
    <div className="bg-white border rounded-lg shadow-md p-3 w-full sm:w-60 flex flex-col gap-2 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500"></div>
      <div className="text-xs font-bold text-slate-500 uppercase ml-2">{title}</div>
      <div className={`flex items-center gap-2 rounded px-2 py-1.5 border ml-2 ${w === t1 && t1 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-transparent'}`}>
        <div className={`flex-1 text-xs sm:text-sm truncate ${w === t1 && t1 ? 'font-bold text-green-700' : 'text-slate-700'}`} title={t1}>{t1 || 'Nhất Bảng A'}</div>
        <input type="number" min="0" disabled={role !== 'admin' || !t1} value={s1} onChange={e => handleKOScoreChange(type, matchKey, 's1', e.target.value)} className="w-10 h-7 text-center font-bold border rounded outline-none focus:border-blue-500 bg-white" placeholder="0" />
      </div>
      <div className={`flex items-center gap-2 rounded px-2 py-1.5 border ml-2 ${w === t2 && t2 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-transparent'}`}>
        <div className={`flex-1 text-xs sm:text-sm truncate ${w === t2 && t2 ? 'font-bold text-green-700' : 'text-slate-700'}`} title={t2}>{t2 || 'Nhì Bảng B'}</div>
        <input type="number" min="0" disabled={role !== 'admin' || !t2} value={s2} onChange={e => handleKOScoreChange(type, matchKey, 's2', e.target.value)} className="w-10 h-7 text-center font-bold border rounded outline-none focus:border-blue-500 bg-white" placeholder="0" />
      </div>
    </div>
  );

  // ================= MAIN RENDER =================
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-purple-700" size={48} /></div>;

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border text-center relative">
          <div className="flex justify-center mb-6"><GolabLogo /></div>
          {authStep === 'role_select' ? (
            <div className="animate-in fade-in">
              <h1 className="text-2xl font-bold mb-2">Giải Pickleball GOLAB</h1>
              <p className="text-slate-500 mb-8 font-medium">Hệ thống Quản lý Giải đấu Trực tuyến</p>
              <button onClick={() => setAuthStep('password_prompt')} className="w-full bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-xl font-bold flex justify-center gap-3 mb-4 shadow-md"><ShieldCheck size={24} /> Ban Tổ Chức (Quản Trị)</button>
              <button onClick={() => setRole('viewer')} className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 p-4 rounded-xl font-bold flex justify-center gap-3"><Eye size={24} /> Khán Giả (Xem Trực Tiếp)</button>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4">
              <button onClick={() => {setAuthStep('role_select'); setAuthError('');}} className="absolute top-6 left-6 text-slate-400 hover:text-slate-700"><ArrowLeft size={24} /></button>
              <Lock size={32} className="mx-auto text-purple-500 mb-4"/>
              <h2 className="text-xl font-bold mb-6">Mật khẩu Ban Tổ Chức</h2>
              <form onSubmit={handleAdminLogin}>
                <input type="password" placeholder="Nhập pass..." value={passwordInput} onChange={(e) => {setPasswordInput(e.target.value); setAuthError('');}} className="w-full border-2 rounded-xl px-4 py-3 mb-2 text-center focus:border-purple-500 focus:outline-none" autoFocus />
                {authError && <p className="text-red-500 text-sm font-medium mb-2">{authError}</p>}
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl font-bold mt-2 transition-colors">Đăng Nhập</button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderContent = (type) => {
    const isMens = type === 'mens';
    const setupStatus = isMens ? tourneyState.mensSetup : tourneyState.womensSetup;
    const playersKey = isMens ? 'mensPlayers' : 'womensPlayers';
    const teamsList = isMens ? tourneyState.mensTeams : tourneyState.womensTeams;
    const groupAStandings = isMens ? mensStandingsA : womensStandingsA;
    const groupBStandings = isMens ? mensStandingsB : womensStandingsB;
    const groupAMatches = isMens ? tourneyState.mensGroupA : tourneyState.womensGroupA;
    const groupBMatches = isMens ? tourneyState.mensGroupB : tourneyState.womensGroupB;
    const koData = isMens ? mensKOData : womensKOData;
    const koState = isMens ? tourneyState.mensKO : tourneyState.womensKO;
    const playerLimit = isMens ? 14 : 12;

    if (!setupStatus) {
      const teamsKey = isMens ? 'mensTeams' : 'womensTeams';
      const teamsCount = isMens ? 7 : 6;

      const handleTeamChange = (index: number, value: string) => {
        if (role !== 'admin') return;
        const newTeams = [...(tourneyState[teamsKey] || [])];
        while (newTeams.length < teamsCount) newTeams.push('');
        newTeams[index] = value;
        updateStateAndSync({ [teamsKey]: newTeams });
      };

      const autoPairTeams = () => {
        if (role !== 'admin') return;
        const players = tourneyState[playersKey] || [];
        const newTeams: string[] = [];
        for (let i = 0; i < players.length; i += 2) {
          if (players[i] || players[i+1]) {
            newTeams.push(`${players[i] || '---'} - ${players[i+1] || '---'}`);
          }
        }
        updateStateAndSync({ [teamsKey]: newTeams });
        showToast("Đã tự động ghép cặp theo thứ tự!");
      };

      const handleSaveDraft = async () => {
        if (role !== 'admin') return;
        await syncToCloud(tourneyState);
        showToast("Đã lưu danh sách đội vào cơ sở dữ liệu!");
      };

      return (
        <div className="mx-auto animate-in fade-in space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-3 gap-2">
            <h2 className={`text-xl font-bold ${isMens ? 'text-blue-700' : 'text-pink-700'}`}>
              Cài Đặt Đội Ngũ & VĐV ({isMens ? 'Đôi Nam' : 'Đôi Nữ'})
            </h2>
            {role === 'admin' && (
              <div className="flex gap-2">
                <button
                  onClick={autoPairTeams}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Shuffle size={14} /> Ghép Cặp Tự Động
                </button>
                <button
                  onClick={handleSaveDraft}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ShieldCheck size={14} /> Lưu Danh Sách Đội
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Cột 1: Danh sách VĐV */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">
                1. Danh sách VĐV Đăng ký ({playerLimit} người)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(tourneyState[playersKey] || []).map((player: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 border rounded-lg bg-slate-50 border-slate-200">
                    <span className={`w-5 h-5 flex justify-center items-center rounded-full font-bold text-xs shrink-0 ${isMens ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={player || ''}
                      onChange={(e) => handlePlayerChange(type, idx, e.target.value)}
                      disabled={role !== 'admin'}
                      className="flex-1 w-full bg-transparent border-none text-xs font-semibold focus:outline-none text-slate-800"
                      placeholder={`VĐV ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
              {role === 'admin' && (
                <button
                  onClick={() => executeInstantShuffle(type)}
                  className="w-full text-xs bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-bold flex justify-center items-center gap-1 transition-all cursor-pointer"
                >
                  <Shuffle size={14} /> Xáo Trộn Danh Sách VĐV
                </button>
              )}
            </div>

            {/* Cột 2: Tự Xếp Đội (Cặp Đôi) */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">
                2. Cấu hình Đội Hình (Tự xếp cặp đôi)
              </h3>
              <div className="space-y-2">
                {Array.from({ length: teamsCount }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="font-bold text-xs text-slate-400 w-12 shrink-0">Đội {idx + 1}:</span>
                    <input
                      type="text"
                      value={tourneyState[teamsKey]?.[idx] || ''}
                      onChange={(e) => handleTeamChange(idx, e.target.value)}
                      disabled={role !== 'admin'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold focus:bg-white focus:border-indigo-500 outline-none text-slate-800"
                      placeholder={`Ví dụ: VĐV A - VĐV B`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {role === 'admin' && (
            <div className="border-t pt-6 text-center">
              <button
                onClick={() => finalizeAndPair(type)}
                className={`px-8 py-3.5 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-md transition-all hover:scale-102 mx-auto cursor-pointer ${isMens ? 'bg-blue-600 hover:bg-blue-700' : 'bg-pink-600 hover:bg-pink-700'}`}
              >
                <PlayCircle size={22} /> Chốt Đội & Chia Bảng Thi Đấu
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
          <h2 className={`text-2xl font-black uppercase tracking-tight ${isMens ? 'text-blue-800' : 'text-pink-800'}`}>Giai đoạn: Vòng Bảng & Đấu Chéo</h2>
          {role === 'admin' && (
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => generateAllNicknames(type)} disabled={isGeneratingNickname} className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-yellow-200 shadow-sm"><Zap size={16}/> AI Biệt Danh</button>
              <button onClick={() => updateStateAndSync({ [isMens?'mensSetup':'womensSetup']: false })} className={`text-sm px-3 py-1.5 rounded-full font-medium flex items-center gap-1 ${isMens ? 'text-blue-600 bg-blue-50' : 'text-pink-600 bg-pink-50'}`}><Settings2 size={16}/> Sửa DS</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
            <GroupTable title="BẢNG A (3 Đội)" standings={groupAStandings} />
            <h4 className="font-bold text-slate-600 mb-2 mt-4 flex items-center gap-2"><PlayCircle size={16}/> Lịch đấu Bảng A</h4>
            <MatchList matches={groupAMatches} teams={teamsList} type={type} group="A" />
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
            <GroupTable title={`BẢNG B (${isMens ? '4' : '3'} Đội)`} standings={groupBStandings} />
            <h4 className="font-bold text-slate-600 mb-2 mt-4 flex items-center gap-2"><PlayCircle size={16}/> Lịch đấu Bảng B</h4>
            <MatchList matches={groupBMatches} teams={teamsList} type={type} group="B" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-8"></div>
          <h3 className={`text-2xl font-black text-center mt-8 mb-8 uppercase ${isMens ? 'text-blue-800' : 'text-pink-800'}`}>Vòng Đấu Chéo (Knock-out)</h3>
          
          <div className="flex flex-col md:flex-row justify-center items-center md:items-stretch gap-8">
            <div className="flex flex-col justify-around gap-6">
              <KnockoutBox title="BÁN KẾT 1 (Nhất A vs Nhì B)" t1={koData.firstA} t2={koData.secondB} s1={koState.sf1.s1} s2={koState.sf1.s2} w={koData.sf1Winner} matchKey="sf1" type={type} />
              <KnockoutBox title="BÁN KẾT 2 (Nhất B vs Nhì A)" t1={koData.firstB} t2={koData.secondA} s1={koState.sf2.s1} s2={koState.sf2.s2} w={koData.sf2Winner} matchKey="sf2" type={type} />
            </div>

            <div className="flex flex-col justify-center gap-8">
              <div className="bg-gradient-to-b from-yellow-50 to-white border-2 border-yellow-400 rounded-xl p-4 w-full sm:w-64 shadow-xl">
                <div className="text-center font-black text-yellow-800 uppercase mb-3 flex items-center justify-center gap-2"><Trophy size={20} className="text-yellow-600"/> CHUNG KẾT</div>
                <div className={`flex items-center gap-2 rounded px-2 py-2 border mb-2 ${koData.champion === koData.sf1Winner && koData.champion ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`flex-1 text-xs sm:text-sm truncate ${koData.champion === koData.sf1Winner && koData.champion ? 'font-bold text-yellow-800' : 'text-gray-700'}`} title={koData.sf1Winner}>{koData.sf1Winner || 'Thắng BK1'}</div>
                  <input type="number" min="0" disabled={role !== 'admin' || !koData.sf1Winner} value={koState.final.s1} onChange={e => handleKOScoreChange(type, 'final', 's1', e.target.value)} className="w-12 h-8 text-center font-bold border rounded outline-none focus:border-yellow-500 bg-white" placeholder="0" />
                </div>
                <div className={`flex items-center gap-2 rounded px-2 py-2 border ${koData.champion === koData.sf2Winner && koData.champion ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`flex-1 text-xs sm:text-sm truncate ${koData.champion === koData.sf2Winner && koData.champion ? 'font-bold text-yellow-800' : 'text-gray-700'}`} title={koData.sf2Winner}>{koData.sf2Winner || 'Thắng BK2'}</div>
                  <input type="number" min="0" disabled={role !== 'admin' || !koData.sf2Winner} value={koState.final.s2} onChange={e => handleKOScoreChange(type, 'final', 's2', e.target.value)} className="w-12 h-8 text-center font-bold border rounded outline-none focus:border-yellow-500 bg-white" placeholder="0" />
                </div>
                {koData.champion && <div className="mt-4 p-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg font-black shadow-md text-sm text-center uppercase animate-pulse">🏆 VÔ ĐỊCH: {koData.champion}</div>}
              </div>

              <div className="bg-gradient-to-b from-orange-50 to-white border-2 border-orange-300 rounded-xl p-4 w-full sm:w-64 shadow-md">
                <div className="text-center font-bold text-orange-800 uppercase mb-3 flex items-center justify-center gap-2"><Medal size={20} className="text-orange-600"/> Tranh Hạng 3</div>
                <div className={`flex items-center gap-2 rounded px-2 py-1.5 border mb-2 ${koData.thirdPlace === koData.sf1Loser && koData.thirdPlace ? 'bg-orange-100 border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`flex-1 text-xs sm:text-sm truncate ${koData.thirdPlace === koData.sf1Loser && koData.thirdPlace ? 'font-bold text-orange-800' : 'text-gray-700'}`} title={koData.sf1Loser}>{koData.sf1Loser || 'Thua BK1'}</div>
                  <input type="number" min="0" disabled={role !== 'admin' || !koData.sf1Loser} value={koState.third.s1} onChange={e => handleKOScoreChange(type, 'third', 's1', e.target.value)} className="w-10 h-7 text-center font-bold border rounded outline-none focus:border-orange-500 bg-white" placeholder="0" />
                </div>
                <div className={`flex items-center gap-2 rounded px-2 py-1.5 border ${koData.thirdPlace === koData.sf2Loser && koData.thirdPlace ? 'bg-orange-100 border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`flex-1 text-xs sm:text-sm truncate ${koData.thirdPlace === koData.sf2Loser && koData.thirdPlace ? 'font-bold text-orange-800' : 'text-gray-700'}`} title={koData.sf2Loser}>{koData.sf2Loser || 'Thua BK2'}</div>
                  <input type="number" min="0" disabled={role !== 'admin' || !koData.sf2Loser} value={koState.third.s2} onChange={e => handleKOScoreChange(type, 'third', 's2', e.target.value)} className="w-10 h-7 text-center font-bold border rounded outline-none focus:border-orange-500 bg-white" placeholder="0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 md:p-8 relative font-sans">
      {toastMessage && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg font-medium animate-in slide-in-from-top-4 z-[100]">{toastMessage}</div>}
      
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm z-[100]">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-4"><AlertTriangle size={28} /><h2 className="text-xl font-bold">Làm Lại Từ Đầu?</h2></div>
            <p className="text-slate-600 mb-6">Hành động này sẽ XÓA SẠCH điểm số vòng bảng, nhánh đấu và trả danh sách VĐV về trạng thái lúc mới mở app.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl">Hủy Bỏ</button>
              <button onClick={resetTournament} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md">Đồng Ý Khôi Phục</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">

        {/* ================= BẢNG THÔNG TIN MINI GAME ================= */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 rounded-2xl shadow-xl border border-indigo-700 p-6 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-5"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white opacity-5"></div>

          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <div className="inline-block bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-1 rounded mb-2 uppercase tracking-wider shadow-sm">Mini Game</div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-1 drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">GIẢI PICKLEBALL TRANH CÚP GOLAB LẦN 2</h1>
              <p className="text-indigo-200 font-medium text-sm sm:text-base">Đơn vị tổ chức & Tài trợ: <strong className="text-white">Trung tâm Xét nghiệm GOLAB</strong></p>
            </div>
            <div className="hidden sm:block bg-white/10 p-2 rounded-xl backdrop-blur-sm"><GolabLogo /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="font-bold text-yellow-400 mb-3 border-b border-white/10 pb-2 flex items-center gap-2"><Info size={18}/> THÔNG TIN GIẢI ĐẤU</h3>
              <ul className="space-y-3 text-sm sm:text-base">
                <li className="flex items-center gap-3"><Users className="text-indigo-300 shrink-0" size={18}/> <span><strong>Nội dung:</strong> Đôi Nam (7 Đội) & Đôi Nữ (6 Đội)</span></li>
                <li className="flex items-center gap-3"><Clock className="text-indigo-300 shrink-0" size={18}/> <span><strong>Thời gian:</strong> 17h00, Ngày 06/06/2026</span></li>
                <li className="flex items-center gap-3"><MapPin className="text-indigo-300 shrink-0" size={18}/> <span><strong>Địa điểm:</strong> Sân Pickleball Hùng Hà</span></li>
                <li className="flex items-start gap-3"><Settings2 className="text-indigo-300 shrink-0 mt-1" size={18}/> <span><strong>Thể thức:</strong> Chia làm 2 bảng đánh vòng tròn. Chọn 2 đội Nhất, Nhì mỗi bảng vào đấu chéo Bán Kết & Chung Kết.</span></li>
              </ul>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col justify-center">
              <h3 className="font-bold text-yellow-400 mb-4 text-center leading-tight">🏆 CƠ CẤU GIẢI THƯỞNG 🏆<br/><span className="text-[12px] font-normal text-indigo-100 block mt-1">(Mỗi VĐV trong đội đạt giải sẽ nhận 01 Voucher tương ứng)</span></h3>
              
              <div className="flex flex-col gap-3">
                <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/50 rounded-lg p-3 flex items-center gap-4">
                  <div className="bg-yellow-500 text-yellow-900 rounded-full w-10 h-10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(234,179,8,0.5)]"><Trophy size={20}/></div>
                  <div><div className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Giải Nhất</div><div className="text-xl sm:text-2xl font-black text-yellow-400">1.000.000đ / VĐV</div></div>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 bg-slate-300/10 border border-slate-300/30 rounded-lg p-2 flex items-center gap-3">
                    <div className="bg-slate-300 text-slate-800 rounded-full w-8 h-8 flex items-center justify-center shrink-0"><Medal size={16}/></div>
                    <div><div className="text-[10px] font-bold text-slate-300 uppercase">Giải Nhì</div><div className="text-base sm:text-lg font-bold text-white">600.000đ / VĐV</div></div>
                  </div>
                  <div className="flex-1 bg-orange-400/10 border border-orange-400/30 rounded-lg p-2 flex items-center gap-3">
                    <div className="bg-orange-400 text-orange-900 rounded-full w-8 h-8 flex items-center justify-center shrink-0"><Medal size={16}/></div>
                    <div><div className="text-[10px] font-bold text-orange-300 uppercase">Giải Ba</div><div className="text-base sm:text-lg font-bold text-white">400.000đ / VĐV</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HEADER BẢNG ĐIỀU KHIỂN */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 md:p-6 rounded-xl shadow-sm border mb-6 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
            <div><h2 className="text-xl font-black uppercase text-slate-800">Bảng Điều Khiển</h2><p className="text-slate-500 text-sm font-medium">Cập nhật trực tiếp kết quả thi đấu</p></div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {role === 'admin' && <button onClick={() => setShowResetConfirm(true)} className="text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 border border-red-200"><RotateCcw size={16}/> Khôi Phục Gốc</button>}
            <div className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-bold text-sm flex items-center border border-purple-200"><ShieldCheck className="mr-2" size={18}/> Quản Trị Viên</div>
            {role === 'admin' && (
              <button onClick={handleLogout} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full font-bold text-sm flex items-center gap-2 border border-slate-300 transition-colors">
                <LogOut size={16}/> Đăng Xuất
              </button>
            )}
          </div>
        </div>

        {/* TABS TRÌNH ĐƠN */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('mens')} className={`flex-1 py-3 rounded-lg font-bold transition-colors ${activeTab === 'mens' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}>Đôi Nam</button>
          <button onClick={() => setActiveTab('womens')} className={`flex-1 py-3 rounded-lg font-bold transition-colors ${activeTab === 'womens' ? 'bg-pink-600 text-white shadow-md' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}>Đôi Nữ</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
          {renderContent(activeTab)}
        </div>
      </div>
    </div>
  );
}