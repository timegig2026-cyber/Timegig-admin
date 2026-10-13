import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, Sparkles, X, RefreshCw, MapPin, User, Camera, Upload, 
  CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft, CreditCard, 
  Check, Home, Wrench, FileText, DollarSign, Shield, BarChart3, 
  Users, FileCheck, Receipt, Search, LayoutGrid, Lock, Plus, Minus, Globe, Eye, Building2, TrendingUp, XCircle, ChevronRight,
  LogIn, LogOut, Share2, Copy, Link as LinkIcon, UserCheck, UserPlus, Settings, Mail, Phone, Calendar, BadgeCheck, CheckCircle, Clock, Edit3, Save
} from 'lucide-react';
import L from 'leaflet';

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  phone: string;
  createdAt: string;
  role: 'tenant' | 'user';
  isApproved: boolean;
  profileStep: number;
  selfieImage: string | null;
  idDocumentImage: string | null;
  activeSubscription: 'tenant' | 'user' | null;
  subStep: 'choose' | 'payment' | 'pop_upload' | 'complete';
  popImage: string | null;
  tenantPoPStatus: 'pending' | 'approved' | 'rejected';
  userPoPStatus: 'pending' | 'approved' | 'rejected';
  unitNumber?: string;
  maintenanceList: Array<{
    id: number;
    title: string;
    status: string;
    date: string;
  }>;
}

export interface Seeker {
  id: string;
  name: string;
  isOnline: boolean;
  readyToBeHired: boolean;
}

export interface Seeker {
  id: string;
  name: string;
  isOnline: boolean;
  readyToBeHired: boolean;
}

const DEFAULT_ACCOUNTS: UserAccount[] = [];

export default function App() {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number; accuracy?: number }>({
    lat: 37.7749,
    lng: -122.4194,
    accuracy: 0
  });

  const [isSatellite, setIsSatellite] = useState(false);

  // Top Search Bar State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Master Registered Accounts Database
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    // Clear old data for fresh start
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('geopulse_')) {
        localStorage.removeItem(key);
      }
    });
    return DEFAULT_ACCOUNTS;
  });

  const [currentAccountId, setCurrentAccountId] = useState<string | null>(() => {
    const savedId = localStorage.getItem('geopulse_current_account_id');
    if (savedId) return savedId;
    const isLog = localStorage.getItem('geopulse_logged_in') === 'true';
    if (isLog) return 'acc_tenant_matthews';
    return null;
  });

  // Current active account object
  const activeAccount = accounts.find(a => a.id === currentAccountId) || null;

  // User Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('geopulse_logged_in') === 'true';
  });
  const [authEmail, setAuthEmail] = useState<string>(() => {
    return activeAccount?.email || localStorage.getItem('geopulse_auth_email') || '';
  });
  const isSpecialUser = authEmail === 'timegig2026@gmail.com';
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);

  // Separate Account Editing State (for user to manage their separate profile details)
  const [accountEditName, setAccountEditName] = useState(() => activeAccount?.fullName || '');
  const [accountEditPhone, setAccountEditPhone] = useState(() => activeAccount?.phone || '');
  const [accountEditSavedToast, setAccountEditSavedToast] = useState(false);

  // Detect shared tenant ref from URL (e.g. ?tenantRef=...)
  const [sharedTenantRef, setSharedTenantRef] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('tenantRef');
    } catch {
      return null;
    }
  });

  // Persistent Profile & Verification State via localStorage
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileStep, setProfileStep] = useState<number>(() => {
    if (activeAccount) return activeAccount.profileStep;
    return localStorage.getItem('geopulse_kyc_approved') === 'true' ? 5 : 1;
  });
  const [fullName, setFullName] = useState(() => activeAccount?.fullName || localStorage.getItem('geopulse_fullname') || '');
  const [phone, setPhone] = useState(() => activeAccount?.phone || localStorage.getItem('geopulse_phone') || '');
  const [email, setEmail] = useState(() => activeAccount?.email || localStorage.getItem('geopulse_email') || '');
  const [selfieImage, setSelfieImage] = useState<string | null>(() => activeAccount?.selfieImage || localStorage.getItem('geopulse_selfie'));
  const [idDocumentImage, setIdDocumentImage] = useState<string | null>(() => activeAccount?.idDocumentImage || localStorage.getItem('geopulse_id_doc'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isApproved, setIsApproved] = useState<boolean>(() => {
    if (activeAccount) return activeAccount.isApproved;
    return localStorage.getItem('geopulse_kyc_approved') === 'true';
  });

  const [activeSubscription, setActiveSubscription] = useState<'tenant' | 'user' | null>(() => {
    if (activeAccount) return activeAccount.activeSubscription;
    return (localStorage.getItem('geopulse_active_subscription') as any) || null;
  });
  const [selectedSubscription, setSelectedSubscription] = useState<'tenant' | 'user' | null>(activeSubscription);

  // Payment & Proof of Payment (PoP) State
  const [subStep, setSubStep] = useState<'choose' | 'payment' | 'pop_upload' | 'complete'>(() => {
    if (activeAccount) return activeAccount.subStep;
    return localStorage.getItem('geopulse_pop_submitted') === 'true' ? 'complete' : 'choose';
  });
  const [popImage, setPopImage] = useState<string | null>(() => activeAccount?.popImage || localStorage.getItem('geopulse_pop_image'));

  // Approval Status for Tenant PoP and User PoP
  const [tenantPoPStatus, setTenantPoPStatus] = useState<'pending' | 'approved' | 'rejected'>(() => {
    if (activeAccount) return activeAccount.tenantPoPStatus;
    return (localStorage.getItem('geopulse_tenant_pop_status') as any) || 'pending';
  });
  const [userPoPStatus, setUserPoPStatus] = useState<'pending' | 'approved' | 'rejected'>(() => {
    if (activeAccount) return activeAccount.userPoPStatus;
    return (localStorage.getItem('geopulse_user_pop_status') as any) || 'pending';
  });

  // Tenant Portal Full-Screen State & Tabs
  const [tenantPortalOpen, setTenantPortalOpen] = useState(false);
  const [portalActivated, setPortalActivated] = useState(false);
  const [tenantTab, setTenantTab] = useState<'overview' | 'verification' | 'tenant_pop' | 'user_pop'>('overview');

  // Seekers State
  const [seekersModalOpen, setSeekersModalOpen] = useState(false);
  const [seekerSearchQuery, setSeekerSearchQuery] = useState('');
  const [seekers] = useState<Seeker[]>([
    { id: '1', name: 'John Doe', isOnline: true, readyToBeHired: true },
    { id: '2', name: 'Jane Smith', isOnline: true, readyToBeHired: true },
    { id: '3', name: 'Bob Brown', isOnline: false, readyToBeHired: true },
    { id: '4', name: 'Alice White', isOnline: true, readyToBeHired: false },
    { id: '5', name: 'Charlie Green', isOnline: true, readyToBeHired: true },
  ]);

  const resetApp = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('geopulse_')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  };
  const [linkCopied, setLinkCopied] = useState(false);
  const [maintenanceList, setMaintenanceList] = useState<any[]>(() => {
    if (activeAccount) return activeAccount.maintenanceList || [];
    const saved = localStorage.getItem('geopulse_maintenance');
    return saved ? JSON.parse(saved) : [];
  });
  const [newRequestTitle, setNewRequestTitle] = useState('');

  // Admin Dashboard State & Tabs
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'overview' | 'verification' | 'tenant_pop' | 'user_pop'>('overview');

  // Full-screen Image Lightbox State for Admin & Tenant Portal
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Admin Overview List Modals State
  const [activeTenantsModalOpen, setActiveTenantsModalOpen] = useState(false);
  const [activeUsersModalOpen, setActiveUsersModalOpen] = useState(false);

  // Camera stream ref & error state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Synchronize state when switching accounts
  const syncStateFromAccount = (acc: UserAccount) => {
    setCurrentAccountId(acc.id);
    setIsLoggedIn(true);
    setAuthEmail(acc.email);
    setFullName(acc.fullName);
    setPhone(acc.phone);
    setEmail(acc.email);
    setAccountEditName(acc.fullName);
    setAccountEditPhone(acc.phone);
    setSelfieImage(acc.selfieImage);
    setIdDocumentImage(acc.idDocumentImage);
    setIsApproved(acc.isApproved);
    setProfileStep(acc.profileStep);
    setActiveSubscription(acc.activeSubscription);
    setSelectedSubscription(acc.activeSubscription);
    setSubStep(acc.subStep);
    setPopImage(acc.popImage);
    setTenantPoPStatus(acc.tenantPoPStatus);
    setUserPoPStatus(acc.userPoPStatus);
    setMaintenanceList(acc.maintenanceList || []);

    localStorage.setItem('geopulse_current_account_id', acc.id);
    localStorage.setItem('geopulse_logged_in', 'true');
    localStorage.setItem('geopulse_auth_email', acc.email);
  };

  // Helper for Admin or User to update any account in the master accounts list
  const updateAccountData = (accountId: string, updates: Partial<UserAccount>) => {
    setAccounts(prev => {
      const updated = prev.map(a => a.id === accountId ? { ...a, ...updates } : a);
      localStorage.setItem('geopulse_accounts', JSON.stringify(updated));
      return updated;
    });

    if (accountId === currentAccountId) {
      if (updates.fullName !== undefined) {
        setFullName(updates.fullName);
        setAccountEditName(updates.fullName);
      }
      if (updates.phone !== undefined) {
        setPhone(updates.phone);
        setAccountEditPhone(updates.phone);
      }
      if (updates.email !== undefined) setEmail(updates.email);
      if (updates.isApproved !== undefined) setIsApproved(updates.isApproved);
      if (updates.profileStep !== undefined) setProfileStep(updates.profileStep);
      if (updates.activeSubscription !== undefined) setActiveSubscription(updates.activeSubscription);
      if (updates.subStep !== undefined) setSubStep(updates.subStep);
      if (updates.popImage !== undefined) setPopImage(updates.popImage);
      if (updates.selfieImage !== undefined) setSelfieImage(updates.selfieImage);
      if (updates.idDocumentImage !== undefined) setIdDocumentImage(updates.idDocumentImage);
      if (updates.tenantPoPStatus !== undefined) setTenantPoPStatus(updates.tenantPoPStatus);
      if (updates.userPoPStatus !== undefined) setUserPoPStatus(updates.userPoPStatus);
      if (updates.maintenanceList !== undefined) setMaintenanceList(updates.maintenanceList);
    }
  };

  // Keep master accounts store and active account in sync
  useEffect(() => {
    if (currentAccountId) {
      setAccounts(prevAccounts => {
        const next = prevAccounts.map(acc => {
          if (acc.id === currentAccountId) {
            return {
              ...acc,
              fullName,
              phone,
              email: email || acc.email,
              selfieImage,
              idDocumentImage,
              isApproved,
              profileStep,
              activeSubscription,
              subStep,
              popImage,
              tenantPoPStatus,
              userPoPStatus,
              maintenanceList,
              role: (activeSubscription === 'tenant' ? 'tenant' : 'user') as 'tenant' | 'user'
            };
          }
          return acc;
        });
        localStorage.setItem('geopulse_accounts', JSON.stringify(next));
        return next;
      });
      localStorage.setItem('geopulse_current_account_id', currentAccountId);
    }

    localStorage.setItem('geopulse_logged_in', isLoggedIn ? 'true' : 'false');
    if (authEmail) localStorage.setItem('geopulse_auth_email', authEmail);
  }, [
    currentAccountId, isLoggedIn, fullName, phone, email, selfieImage, 
    idDocumentImage, isApproved, profileStep, activeSubscription, 
    subStep, popImage, tenantPoPStatus, userPoPStatus, maintenanceList, authEmail
  ]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([currentPos.lat, currentPos.lng], 15);

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    mapInstanceRef.current = map;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          setCurrentPos({ lat, lng, accuracy });
          map.setView([lat, lng], 16);
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const toggleSatellite = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newIsSat = !isSatellite;
    setIsSatellite(newIsSat);

    const url = newIsSat 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newLayer = L.tileLayer(url, { maxZoom: 19 }).addTo(map);
    tileLayerRef.current = newLayer;
  };

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const { lat, lng, accuracy } = currentPos;

    const pulseIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; top: 0; left: 0; width: 24px; height: 24px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
      marker.bindPopup('<b>Your Exact Location</b><br />OpenStreetMap GPS Pin');
      markerRef.current = marker;
    }

    if (accuracy && accuracy > 0) {
      if (circleRef.current) {
        circleRef.current.setLatLng([lat, lng]);
        circleRef.current.setRadius(accuracy);
      } else {
        const circle = L.circle([lat, lng], {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
        circleRef.current = circle;
      }
    }
  }, [currentPos]);

  const handlePlaceSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'User-Agent': 'GeoPulseOSMApp/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = Number(data[0].lat);
        const lon = Number(data[0].lon);
        setCurrentPos({ lat, lng: lon });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 16, { animate: true });
        }
      } else {
        alert('Location not found on OpenStreetMap.');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Error searching location.');
    } finally {
      setIsSearching(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera access error handled:', err);
      setCameraError('Camera access unavailable or permission denied. Please use file upload or sample selfie.');
      setCameraActive(false);
    }
  };

  const captureSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setSelfieImage(dataUrl);
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'selfie' | 'id' | 'pop') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'selfie') {
          setSelfieImage(reader.result as string);
        } else if (type === 'id') {
          setIdDocumentImage(reader.result as string);
        } else if (type === 'pop') {
          setPopImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const useSampleSelfie = () => {
    setSelfieImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
    setCameraError(null);
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsApproved(true);
      setProfileStep(5);
    }, 2000);
  };

  const addMaintenanceRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestTitle.trim()) return;
    setMaintenanceList([
      { id: Date.now(), title: newRequestTitle, status: 'Pending', date: new Date().toLocaleDateString() },
      ...maintenanceList
    ]);
    setNewRequestTitle('');
  };

  // Sign Up with 3-second circle loading - Creates a BRAND NEW separate account!
  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = inputEmail.trim().toLowerCase();
    if (!cleanEmail || !inputPassword.trim()) {
      setAuthError('Please provide both email and password.');
      return;
    }
    if (!termsAccepted) {
      setAuthError('Please accept the Terms and Conditions to proceed.');
      return;
    }

    // Check if account already exists
    const existing = accounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      setAuthError('An account with this email already exists. Please log in instead or use another email.');
      return;
    }

    setAuthLoading(true);
    // 3 seconds circle loading animation
    setTimeout(() => {
      setAuthLoading(false);

      const newId = `acc_${Date.now()}`;
      const newAcc: UserAccount = {
        id: newId,
        email: cleanEmail,
        password: inputPassword,
        fullName: '',
        phone: '',
        createdAt: new Date().toISOString().split('T')[0],
        role: 'user',
        isApproved: false,
        profileStep: 1,
        selfieImage: null,
        idDocumentImage: null,
        activeSubscription: null,
        subStep: 'choose',
        popImage: null,
        tenantPoPStatus: 'pending',
        userPoPStatus: 'pending',
        unitNumber: 'Pending Assignment',
        maintenanceList: []
      };

      setAccounts(prev => {
        const next = [...prev, newAcc];
        localStorage.setItem('geopulse_accounts', JSON.stringify(next));
        return next;
      });
      syncStateFromAccount(newAcc);

      setAuthModalOpen(false);
      setInputEmail('');
      setInputPassword('');
      setTermsAccepted(false);

      // Direct user straight to profile verification!
      setProfileModalOpen(true);
      setWelcomeToast(`Your separate account was registered! Welcome ${cleanEmail}`);
      setTimeout(() => setWelcomeToast(null), 4000);
    }, 3000);
  };

  // Login handler - loads user's separate account data
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = inputEmail.trim().toLowerCase();
    if (!cleanEmail || !inputPassword.trim()) {
      setAuthError('Please provide your email and password.');
      return;
    }

    const matchedAccount = accounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (!matchedAccount) {
      setAuthError('No account found with this email. Please sign up to create your separate account.');
      return;
    }

    if (matchedAccount.password && matchedAccount.password !== inputPassword) {
      setAuthError('Incorrect password. Please verify and try again.');
      return;
    }

    syncStateFromAccount(matchedAccount);
    setAuthModalOpen(false);
    setInputEmail('');
    setInputPassword('');

    setWelcomeToast(`Welcome back, ${matchedAccount.fullName || matchedAccount.email}!`);
    setTimeout(() => setWelcomeToast(null), 4000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentAccountId(null);
    localStorage.setItem('geopulse_logged_in', 'false');
    localStorage.removeItem('geopulse_current_account_id');
    setAuthModalOpen(false);
    setWelcomeToast('You have been logged out.');
    setTimeout(() => setWelcomeToast(null), 3000);
  };

  // User save their account changes
  const handleSaveAccountDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return;
    updateAccountData(currentAccountId, {
      fullName: accountEditName.trim(),
      phone: accountEditPhone.trim()
    });
    setAccountEditSavedToast(true);
    setTimeout(() => setAccountEditSavedToast(false), 3000);
  };

  // Tenant unique sharing link
  const tenantShareLink = `${window.location.origin}?tenantRef=${encodeURIComponent(
    fullName ? fullName.toLowerCase().replace(/\s+/g, '-') : (activeAccount?.fullName ? activeAccount.fullName.toLowerCase().replace(/\s+/g, '-') : 'tenant-unit4b')
  )}`;

  const copyTenantLink = async () => {
    try {
      await navigator.clipboard.writeText(tenantShareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const shareTenantLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${fullName || 'Tenant'} - Verified Tenant Profile`,
          text: `Check out my verified tenant lease profile: ${tenantShareLink}`,
          url: tenantShareLink,
        });
      } catch {
        // user dismissed share dialog
      }
    } else {
      copyTenantLink();
    }
  };

  // Multi-Account Metrics calculation for Admin Overview
  const activeTenantsList = accounts.filter(
    a => a.activeSubscription === 'tenant' && a.subStep === 'complete' && a.tenantPoPStatus === 'approved'
  );
  const activeUsersList = accounts.filter(
    a => a.activeSubscription === 'user' && a.subStep === 'complete' && a.userPoPStatus === 'approved'
  );

  const activeTenantsCount = activeTenantsList.length;
  const activeUsersCount = activeUsersList.length;

  const tenantProfit = activeTenantsCount * 299.99;
  const userProfit = activeUsersCount * 29.99;
  const totalProfit = tenantProfit + userProfit;

  return (
    <div className="w-full h-[100dvh] overflow-hidden relative bg-white font-sans text-slate-900">
      
      {/* Welcome Toast Notification Banner */}
      {welcomeToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{welcomeToast}</span>
        </div>
      )}

      {/* Shared Tenant Link Banner */}
      {sharedTenantRef && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md border border-indigo-200 px-4 py-2.5 rounded-2xl shadow-2xl text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 text-slate-900">
          <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold">
            <Share2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-slate-500 font-medium">Shared Tenant Profile: </span>
            <span className="font-bold text-slate-900">{sharedTenantRef}</span>
          </div>
          <button 
            onClick={() => setTenantPortalOpen(true)}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-[11px] transition-colors shadow-sm"
          >
            Open Portal
          </button>
          <button 
            onClick={() => setSharedTenantRef(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Search Bar */}
      <div className="absolute top-4 inset-x-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-30">
        <form onSubmit={handlePlaceSearch} className="relative shadow-xl">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 stroke-[1.5]" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any place or address..."
            className="w-full bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl pl-11 pr-24 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-sm"
          />
          <button 
            type="submit" 
            disabled={isSearching}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            {isSearching ? '...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Zoom Feature & Satellite Icon (Moved to middle-right, away from search bar) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 shadow-xl">
        <button 
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl flex items-center justify-center border border-slate-200 shadow-md transition-all focus:outline-none"
          title="Zoom In"
        >
          <Plus className="w-5 h-5 stroke-[1.5]" />
        </button>
        <button 
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl flex items-center justify-center border border-slate-200 shadow-md transition-all focus:outline-none"
          title="Zoom Out"
        >
          <Minus className="w-5 h-5 stroke-[1.5]" />
        </button>
        <button 
          onClick={toggleSatellite}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-md transition-all focus:outline-none ${isSatellite ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          title="Toggle Satellite View"
        >
          <Globe className="w-5 h-5 stroke-[1.5]" />
        </button>

        {portalActivated && (
          <button 
            onClick={() => setTenantPortalOpen(true)}
            className="w-11 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center border border-emerald-700 shadow-md transition-all focus:outline-none"
            title="Tenant Portal"
          >
            <Home className="w-5 h-5 stroke-[1.5]" />
          </button>
        )}

        {email === 'timegig2026@gmail.com' && (
          <button 
            onClick={() => setAdminOpen(true)}
            className="w-11 h-11 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-600 rounded-2xl flex items-center justify-center border border-slate-200 shadow-md transition-all focus:outline-none"
            title="Admin Dashboard"
          >
            <Shield className="w-5 h-5 stroke-[1.5]" />
          </button>
        )}
      </div>

      {/* Full screen OpenStreetMap container */}
      <div ref={mapContainerRef} className="w-full absolute inset-0 bottom-20 z-0" />

      {/* DOCKED WHITE BOTTOM MENU BAR (Smaller, colored icons, selfie on account) */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 py-2 px-4 shadow-xl z-30 flex items-center justify-around">
        
        {/* LOGIN / ACCOUNT ICON (With Selfie) */}
        <button 
          onClick={() => {
            setAuthError(null);
            setAuthModalOpen(true);
          }}
          className="flex flex-col items-center gap-0.5 group focus:outline-none"
          title={isLoggedIn ? 'Account Settings' : 'Log In / Sign Up'}
        >
          <div className="w-9 h-9 flex items-center justify-center transition-colors">
            {isLoggedIn && (isApproved || isSpecialUser) && selfieImage ? (
              <img src={selfieImage} alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500" />
            ) : isLoggedIn ? (
              <UserCheck className="w-6 h-6 text-emerald-600 stroke-[1.5]" />
            ) : (
              <LogIn className="w-6 h-6 text-indigo-600 group-hover:text-indigo-800 stroke-[1.5]" />
            )}
          </div>
          <span className="text-[10px] font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
            {isLoggedIn ? 'Account' : 'Login'}
          </span>
        </button>

        {/* GIGS ICON IN THE MIDDLE, BIGGER SIZE */}
        <div className="flex flex-col items-center gap-0.5 -mt-6">
          <button 
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  setCurrentPos({ lat, lng, accuracy: pos.coords.accuracy });
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
                  }
                });
              }
            }}
            className="w-14 h-14 bg-white hover:bg-slate-50 rounded-full flex items-center justify-center transition-all shadow-lg border border-slate-300 focus:outline-none transform hover:scale-105"
            title="GiGs Location Focus"
          >
            <Briefcase className="w-7 h-7 text-blue-600 stroke-[1.5]" />
          </button>
          <span className="text-[10px] font-bold text-slate-700">GiGs</span>
        </div>

        {/* SEEKERS ICON */}
        <button 
          onClick={() => setSeekersModalOpen(true)}
          className="flex flex-col items-center gap-0.5 group focus:outline-none"
          title="Seekers"
        >
          <div className="w-9 h-9 flex items-center justify-center transition-colors">
            <Search className="w-6 h-6 text-indigo-600 group-hover:text-indigo-800 stroke-[1.5]" />
          </div>
          <span className="text-[10px] font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
            Seekers
          </span>
        </button>
      </div>



      {/* LOGIN / SIGNUP / SEPARATE ACCOUNT MANAGEMENT MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-white border border-slate-200 rounded-3xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900 ${isLoggedIn ? 'max-w-xl max-h-[88vh] overflow-y-auto' : 'max-w-md'}`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
                  {isLoggedIn ? (
                    <UserCheck className="w-5 h-5 text-emerald-600 stroke-[1.5]" />
                  ) : (
                    <LogIn className="w-5 h-5 text-blue-600 stroke-[1.5]" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isLoggedIn ? 'Manage Your Account' : authMode === 'signup' ? 'Create a Separate Account' : 'Welcome Back'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isLoggedIn 
                      ? 'Separate profile, KYC records, and subscription settings' 
                      : authMode === 'signup' 
                      ? 'Register your separate account with email and password' 
                      : 'Login to access your separate account'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAuthModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoggedIn ? (
              <div className="space-y-5 py-1">
                {/* Account Badge Card */}
                <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    {selfieImage ? (
                      <img 
                        src={selfieImage} 
                        alt="Selfie" 
                        onClick={() => setLightboxImg(selfieImage)}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 cursor-pointer shadow-sm hover:opacity-90"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-sm border border-indigo-200 shadow-sm">
                        {fullName ? fullName.slice(0, 2).toUpperCase() : (authEmail ? authEmail.slice(0, 2).toUpperCase() : 'US')}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{fullName || 'Registered User'}</h4>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                          {activeSubscription === 'tenant' ? 'Tenant Account' : activeSubscription === 'user' ? 'Subscriber Account' : 'Standard Account'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{authEmail || email}</p>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>ID: <span className="font-mono">{currentAccountId}</span></span>
                        <span>·</span>
                        <span>Joined: {activeAccount?.createdAt || '2026'}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Edit Account Information Form */}
                <form onSubmit={handleSaveAccountDetails} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Manage Profile Details</span>
                    </h5>
                    {accountEditSavedToast && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                        <Check className="w-3 h-3" /> Saved!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Full Legal Name</label>
                      <input 
                        type="text" 
                        value={accountEditName}
                        onChange={(e) => setAccountEditName(e.target.value)}
                        placeholder="e.g. Matthews"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Phone Number</label>
                      <input 
                        type="tel" 
                        value={accountEditPhone}
                        onChange={(e) => setAccountEditPhone(e.target.value)}
                        placeholder="+27 82 123 4567"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">Updates are stored in your separate account</span>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Account</span>
                    </button>
                  </div>
                </form>

                {/* Account Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* KYC Verification Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">KYC Verification</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isApproved ? 'Verified & Approved' : `Pending (Step ${profileStep} of 4)`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {selfieImage && idDocumentImage ? 'Selfie & ID uploaded' : 'KYC documents required'}
                    </p>
                    <button 
                      onClick={() => {
                        setAuthModalOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isApproved ? 'View KYC Record' : 'Complete Verification'}</span>
                    </button>
                  </div>

                  {/* Subscription & PoP Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Subscription & PoP</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                        (activeSubscription === 'tenant' ? tenantPoPStatus : userPoPStatus) === 'approved' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {(activeSubscription === 'tenant' ? tenantPoPStatus : userPoPStatus)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {activeSubscription === 'tenant' ? 'Become a Tenant (R299.99)' : activeSubscription === 'user' ? 'User Subscription (R29.99)' : 'No active plan'} · Ref: Ten29
                    </p>
                    <button 
                      onClick={() => {
                        setAuthModalOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Manage Plan & PoP</span>
                    </button>
                  </div>
                </div>

                {/* Registered Accounts Switcher / Multi-Account Manager */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">Switch / Manage Registered Accounts</h5>
                      <p className="text-[10px] text-slate-500">{accounts.length} separate account(s) on this device</p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsLoggedIn(false);
                        setAuthMode('signup');
                        setInputEmail('');
                        setInputPassword('');
                        setTermsAccepted(false);
                        setAuthError(null);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Register Another</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {accounts.map(acc => {
                      const isCurrent = acc.id === currentAccountId;
                      return (
                        <div key={acc.id} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${isCurrent ? 'bg-white border-indigo-400 shadow-sm' : 'bg-white/60 border-slate-200 hover:bg-white'}`}>
                          <div className="flex items-center gap-2.5 truncate mr-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                              {acc.fullName ? acc.fullName.slice(0, 2).toUpperCase() : acc.email.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <span className="font-bold text-slate-900 block truncate">{acc.fullName || acc.email}</span>
                              <span className="text-[10px] text-slate-400 block truncate">{acc.email} · {acc.role === 'tenant' ? 'Tenant' : 'User'}</span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isCurrent ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <button 
                                onClick={() => {
                                  syncStateFromAccount(acc);
                                  setWelcomeToast(`Switched to account: ${acc.fullName || acc.email}`);
                                  setTimeout(() => setWelcomeToast(null), 3000);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                              >
                                Switch
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button 
                    onClick={() => {
                      setAuthModalOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    Go to Profile KYC Wizard
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Mode Selector */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                  <button 
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError(null);
                    }}
                    className={`py-1.5 rounded-lg transition-all ${authMode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Sign Up
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                    }}
                    className={`py-1.5 rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Log In
                  </button>
                </div>

                {authError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {authLoading ? (
                  /* 3 SECONDS CIRCLE LOADING ANIMATION */
                  <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600 animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Setting up your account...</h4>
                      <p className="text-xs text-slate-400 mt-1">Directing to KYC profile wizard in 3 seconds</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={authMode === 'signup' ? handleSignup : handleLogin} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                      <input 
                        type="password" 
                        required
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    {authMode === 'signup' && (
                      <div className="flex items-start gap-2.5 pt-1">
                        <input 
                          type="checkbox"
                          id="termsCheckbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="termsCheckbox" className="text-xs text-slate-600 leading-tight cursor-pointer">
                          I accept the <span className="font-semibold text-slate-900 underline">Terms and Conditions</span> and privacy policy.
                        </label>
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 mt-2"
                    >
                      {authMode === 'signup' ? (
                        <>
                          <span>Sign Up</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Log In</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* TENANT PORTAL FULL-SCREEN OVERLAY (Identical look and features as Admin) */}
      {tenantPortalOpen && (
        <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col font-sans animate-in fade-in duration-200">
          
          {/* Top Header with Back Arrow Button */}
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0 shadow-sm">
            <button 
              onClick={() => setTenantPortalOpen(false)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors border border-slate-200 flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-sm font-bold text-slate-900">Tenant Portal Console</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-white">
            
            {/* TENANT OVERVIEW TAB */}
            {tenantTab === 'overview' ? (
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* Overview content placeholder if needed */}
              </div>
            ) : null}

            {/* TENANT VERIFICATION TAB */}
            {tenantTab === 'verification' && (
              <div className="space-y-3 max-w-5xl mx-auto">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">KYC Verification Record</h3>
                  <p className="text-[10px] text-slate-500">Your verified face selfie and ID document. Click any image to view full-screen.</p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-950">{fullName || 'Verified Tenant'}</h4>
                      <p className="text-[9px] text-slate-500">{email || 'No email provided'} · {phone || 'No phone'}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-[9px] font-semibold">
                      KYC Approved
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block mb-1">Face Selfie (Click to view full screen)</span>
                      {selfieImage ? (
                        <div 
                          onClick={() => setLightboxImg(selfieImage)}
                          className="relative cursor-pointer group rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img src={selfieImage} alt="Selfie" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold gap-1">
                            <Eye className="w-3 h-3" /> Full Screen
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center text-[9px] text-slate-400">Not uploaded</div>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block mb-1">ID Document (Click to view full screen)</span>
                      {idDocumentImage ? (
                        <div 
                          onClick={() => setLightboxImg(idDocumentImage)}
                          className="relative cursor-pointer group rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img src={idDocumentImage} alt="ID" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold gap-1">
                            <Eye className="w-3 h-3" /> Full Screen
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center text-[9px] text-slate-400">Not uploaded</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TENANT POP TAB */}
            {tenantTab === 'tenant_pop' && (
              <div className="space-y-3 max-w-5xl mx-auto">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tenant Proof of Payment (PoP)</h3>
                  <p className="text-[10px] text-slate-500">Your Capitec Bank transfer receipts and profile selfie records. Click any image to view full-screen.</p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-950">{fullName || 'Verified Tenant'} (Become a Tenant - R299.99)</h4>
                      <p className="text-[9px] text-slate-500">{email || 'No email provided'} · Ref: <span className="font-mono font-bold text-blue-600">Ten29</span> (Capitec: 1334067366)</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-semibold border ${
                      tenantPoPStatus === 'approved' 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : tenantPoPStatus === 'rejected' 
                        ? 'bg-rose-100 text-rose-800 border-rose-200' 
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {tenantPoPStatus === 'approved' ? 'Approved & Paid' : tenantPoPStatus === 'rejected' ? 'Rejected' : 'Pending Verification'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block mb-1">User Profile Selfie (Click to view full screen)</span>
                      {selfieImage ? (
                        <div 
                          onClick={() => setLightboxImg(selfieImage)}
                          className="relative cursor-pointer group rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img src={selfieImage} alt="User Selfie" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold gap-1">
                            <Eye className="w-3 h-3" /> Full Screen
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center text-[9px] text-slate-400">Not uploaded</div>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block mb-1">PoP Receipt Document (Click to view full screen)</span>
                      {popImage ? (
                        <div 
                          onClick={() => setLightboxImg(popImage)}
                          className="relative cursor-pointer group rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img src={popImage} alt="Tenant PoP" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold gap-1">
                            <Eye className="w-3 h-3" /> Full Screen
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center text-[9px] text-slate-400">Not uploaded</div>
                      )}
                    </div>
                  </div>

                  {/* Re-upload PoP button */}
                  <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                    <label className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[9px] font-semibold transition-colors cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload New PoP Receipt</span>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'pop')} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TENANT USER POP TAB (Lease Agreement & Receipts) */}
            {tenantTab === 'user_pop' && (
              <div className="space-y-3 max-w-5xl mx-auto">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Lease Receipts & Transaction History</h3>
                  <p className="text-[10px] text-slate-500">Your monthly lease payment receipts and confirmed transaction IDs.</p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-950">{fullName || 'Verified Tenant'} (Lease Agreement Unit 4B)</h4>
                      <p className="text-[9px] text-slate-500">{email || 'No email provided'} · Transaction: TX-2026-948123</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-semibold rounded-lg">
                      Locked & Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block mb-1">User Profile Selfie (Click to view full screen)</span>
                      {selfieImage ? (
                        <div 
                          onClick={() => setLightboxImg(selfieImage)}
                          className="relative cursor-pointer group rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img src={selfieImage} alt="User Selfie" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold gap-1">
                            <Eye className="w-3 h-3" /> Full Screen
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center text-[9px] text-slate-400">Not uploaded</div>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-medium block mb-1">PoP Receipt Document (Click to view full screen)</span>
                      {popImage ? (
                        <div 
                          onClick={() => setLightboxImg(popImage)}
                          className="relative cursor-pointer group rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img src={popImage} alt="Receipt" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-semibold gap-1">
                            <Eye className="w-3 h-3" /> Full Screen
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-slate-50 rounded-lg flex items-center justify-center text-[9px] text-slate-400">Not uploaded</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Tenant Portal Bottom Menu Bar (Identical 4 empty line-art tabs as Admin) */}
          <footer className="bg-white border-t border-slate-200 py-3 px-6 flex items-center justify-around shrink-0 shadow-lg">
            <button 
              onClick={() => setTenantTab('overview')}
              className={`flex flex-col items-center gap-1 group focus:outline-none ${tenantTab === 'overview' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <BarChart3 className="w-6 h-6 stroke-[1.5]" />
              <span className="text-xs font-semibold">Overview</span>
            </button>
            <button 
              onClick={() => setTenantTab('verification')}
              className={`flex flex-col items-center gap-1 group focus:outline-none ${tenantTab === 'verification' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <FileCheck className="w-6 h-6 stroke-[1.5]" />
              <span className="text-xs font-semibold">Verification</span>
            </button>
            <button 
              onClick={() => setTenantTab('tenant_pop')}
              className={`flex flex-col items-center gap-1 group focus:outline-none ${tenantTab === 'tenant_pop' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Receipt className="w-6 h-6 stroke-[1.5]" />
              <span className="text-xs font-semibold">Tenant PoP</span>
            </button>
            <button 
              onClick={() => setTenantTab('user_pop')}
              className={`flex flex-col items-center gap-1 group focus:outline-none ${tenantTab === 'user_pop' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <DollarSign className="w-6 h-6 stroke-[1.5]" />
              <span className="text-xs font-semibold">User PoP</span>
            </button>
          </footer>

        </div>
      )}

      {/* ADMIN DASHBOARD FULL-SCREEN OVERLAY - ONLY FOR TIMEGIG2026 */}
      {adminOpen && email === 'timegig2026@gmail.com' && (
        <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col font-sans animate-in fade-in duration-200">
          
          {/* Floating Back Arrow Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0 shadow-sm">
            <button 
              onClick={() => setAdminOpen(false)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors border border-slate-200 flex items-center gap-2 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-sm font-bold text-slate-900">Administration Console</span>
            <button 
              onClick={resetApp}
              className="ml-auto p-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl transition-colors border border-red-200 text-xs font-semibold"
            >
              Reset App
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-white">
            
            {/* OVERVIEW TAB */}
            {adminTab === 'overview' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Tenant Subscription Profit */}
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-xs text-slate-500 font-medium">Tenant Subscription Profit</span>
                    <h3 className="text-xl font-bold text-emerald-600">R{tenantProfit.toFixed(2)}</h3>
                    <span className="text-[10px] text-slate-400">R299.99 per active tenant</span>
                  </div>

                  {/* User Subscription Profit */}
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-xs text-slate-500 font-medium">User Subscription Profit</span>
                    <h3 className="text-xl font-bold text-emerald-600">R{userProfit.toFixed(2)}</h3>
                    <span className="text-[10px] text-slate-400">R29.99 per active user</span>
                  </div>

                  {/* CLICKABLE ACTIVE TENANTS CARD */}
                  <div 
                    onClick={() => setActiveTenantsModalOpen(true)}
                    className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-sm hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all group relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium group-hover:text-indigo-600 transition-colors">Active Tenants</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">{activeTenantsCount}</h3>
                    <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                      <Users className="w-3 h-3" /> Click to view all tenants
                    </span>
                  </div>

                  {/* CLICKABLE ACTIVE SUBSCRIPTION USERS CARD */}
                  <div 
                    onClick={() => setActiveUsersModalOpen(true)}
                    className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-sm hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all group relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium group-hover:text-indigo-600 transition-colors">Active Subscription Users</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">{activeUsersCount}</h3>
                    <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                      <Users className="w-3 h-3" /> Click to view all users
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-xs text-slate-500 font-medium">Total Revenue / Profit</span>
                    <h3 className="text-2xl font-bold text-slate-900">R{totalProfit.toFixed(2)}</h3>
                    <span className="text-[10px] text-emerald-600 font-semibold">Capitec Bank Account: 1334067366 (Matthews)</span>
                  </div>
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-1 shadow-sm">
                    <span className="text-xs text-slate-500 font-medium">Registered User KYC</span>
                    <h3 className="text-lg font-bold text-slate-900 truncate">{fullName || 'None'}</h3>
                    <span className="text-[10px] text-emerald-600 font-semibold">{isApproved ? 'Verified & Approved' : 'Unverified'}</span>
                  </div>
                </div>

                <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900">Platform Analytics Overview</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Live profit tracking for Capitec Bank transfers (Ref: Ten29). Click on <strong>Active Tenants</strong> or <strong>Active Subscription Users</strong> to inspect all subscriber records in a detailed list.
                  </p>
                </div>
              </div>
            )}

            {/* VERIFICATION TAB */}
            {adminTab === 'verification' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">KYC Verification Records</h3>
                    <p className="text-xs text-slate-500">Submitted face selfie and ID document records across all user accounts. Click any image to view full-screen.</p>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl">
                    {accounts.length} Total Accounts
                  </span>
                </div>

                <div className="space-y-4">
                  {accounts.map(acc => {
                    return (
                      <div key={acc.id} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-xs border border-indigo-200">
                              {acc.fullName ? acc.fullName.slice(0, 2).toUpperCase() : acc.email.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-950">{acc.fullName || 'User Profile'}</h4>
                              <p className="text-[11px] text-slate-500">{acc.email} · {acc.phone || 'No phone'} · <span className="font-mono text-slate-400">ID: {acc.id}</span></p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${acc.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {acc.isApproved ? 'Approved' : 'Pending Verification'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[11px] text-slate-400 font-medium block mb-1">Face Selfie (Click to view full screen)</span>
                            {acc.selfieImage ? (
                              <div 
                                onClick={() => setLightboxImg(acc.selfieImage)}
                                className="relative cursor-pointer group rounded-xl overflow-hidden border border-slate-200"
                              >
                                <img src={acc.selfieImage} alt="Selfie" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                  <Eye className="w-4 h-4" /> Full Screen
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 font-medium block mb-1">ID Document (Click to view full screen)</span>
                            {acc.idDocumentImage ? (
                              <div 
                                onClick={() => setLightboxImg(acc.idDocumentImage)}
                                className="relative cursor-pointer group rounded-xl overflow-hidden border border-slate-200"
                              >
                                <img src={acc.idDocumentImage} alt="ID" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                  <Eye className="w-4 h-4" /> Full Screen
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
                            )}
                          </div>
                        </div>

                        {/* Admin Action Buttons for KYC */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                          <button 
                            onClick={() => {
                              updateAccountData(acc.id, { isApproved: false, profileStep: 1 });
                              setWelcomeToast(`KYC rejected for ${acc.fullName || acc.email}`);
                              setTimeout(() => setWelcomeToast(null), 3000);
                            }}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject KYC
                          </button>
                          <button 
                            onClick={() => {
                              updateAccountData(acc.id, { isApproved: true, profileStep: 5 });
                              setWelcomeToast(`KYC approved for ${acc.fullName || acc.email}!`);
                              setTimeout(() => setWelcomeToast(null), 3000);
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve KYC
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TENANT POP TAB */}
            {adminTab === 'tenant_pop' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Tenant Proof of Payment (PoP)</h3>
                    <p className="text-xs text-slate-500">Capitec Bank transfer receipts and profile selfie records across tenant accounts. Approve or reject tenant payments below.</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl">
                    {activeTenantsCount} Active Tenant(s)
                  </span>
                </div>

                <div className="space-y-4">
                  {accounts.filter(a => a.activeSubscription === 'tenant' || a.popImage || a.role === 'tenant').length > 0 ? (
                    accounts.filter(a => a.activeSubscription === 'tenant' || a.popImage || a.role === 'tenant').map(acc => (
                      <div key={acc.id} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-950">{acc.fullName || 'Verified Tenant'} (Become a Tenant - R299.99)</h4>
                            <p className="text-[11px] text-slate-500">{acc.email} · Ref: <span className="font-mono font-bold text-blue-600">Ten29</span> (Capitec: 1334067366) · Unit: {acc.unitNumber || 'Unit 4B'}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            acc.tenantPoPStatus === 'approved' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                              : acc.tenantPoPStatus === 'rejected' 
                              ? 'bg-rose-100 text-rose-800 border-rose-200' 
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {acc.tenantPoPStatus === 'approved' ? 'Approved & Paid' : acc.tenantPoPStatus === 'rejected' ? 'Rejected' : 'Pending Verification'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[11px] text-slate-400 font-medium block mb-1">User Profile Selfie (Click to view full screen)</span>
                            {acc.selfieImage ? (
                              <div 
                                onClick={() => setLightboxImg(acc.selfieImage)}
                                className="relative cursor-pointer group rounded-xl overflow-hidden border border-slate-200"
                              >
                                <img src={acc.selfieImage} alt="User Selfie" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                  <Eye className="w-4 h-4" /> Full Screen
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 font-medium block mb-1">PoP Receipt Document (Click to view full screen)</span>
                            {acc.popImage ? (
                              <div 
                                onClick={() => setLightboxImg(acc.popImage)}
                                className="relative cursor-pointer group rounded-xl overflow-hidden border border-slate-200"
                              >
                                <img src={acc.popImage} alt="Tenant PoP" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                  <Eye className="w-4 h-4" /> Full Screen
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
                            )}
                          </div>
                        </div>

                        {/* Admin Action Buttons for Tenant PoP */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                          <button 
                            onClick={() => {
                              updateAccountData(acc.id, { tenantPoPStatus: 'rejected' });
                              setWelcomeToast(`Tenant PoP rejected for ${acc.fullName || acc.email}.`);
                              setTimeout(() => setWelcomeToast(null), 3000);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                              acc.tenantPoPStatus === 'rejected' 
                                ? 'bg-rose-600 text-white' 
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject PoP
                          </button>
                          <button 
                            onClick={() => {
                              updateAccountData(acc.id, { 
                                tenantPoPStatus: 'approved',
                                activeSubscription: 'tenant',
                                subStep: 'complete'
                              });
                              setWelcomeToast(`Tenant PoP approved for ${acc.fullName || acc.email}! Active Tenants updated.`);
                              setTimeout(() => setWelcomeToast(null), 3000);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                              acc.tenantPoPStatus === 'approved' 
                                ? 'bg-emerald-700 text-white' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve PoP
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                      No tenant PoP records found. Tenants will appear here after selecting the tenant plan or uploading proof of payment.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* USER POP TAB */}
            {adminTab === 'user_pop' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">User Proof of Payment (PoP)</h3>
                    <p className="text-xs text-slate-500">Capitec Bank transfer receipts and profile selfie records across user subscription accounts. Approve or reject user payments below.</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl">
                    {activeUsersCount} Active Subscriber(s)
                  </span>
                </div>

                <div className="space-y-4">
                  {accounts.filter(a => a.activeSubscription === 'user' || a.popImage).length > 0 ? (
                    accounts.filter(a => a.activeSubscription === 'user' || a.popImage).map(acc => (
                      <div key={acc.id} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-950">{acc.fullName || 'Verified User'} (User Subscription - R29.99)</h4>
                            <p className="text-[11px] text-slate-500">{acc.email} · Ref: <span className="font-mono font-bold text-blue-600">Ten29</span> (Capitec: 1334067366)</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            acc.userPoPStatus === 'approved' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                              : acc.userPoPStatus === 'rejected' 
                              ? 'bg-rose-100 text-rose-800 border-rose-200' 
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {acc.userPoPStatus === 'approved' ? 'Approved & Paid' : acc.userPoPStatus === 'rejected' ? 'Rejected' : 'Pending Verification'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[11px] text-slate-400 font-medium block mb-1">User Profile Selfie (Click to view full screen)</span>
                            {acc.selfieImage ? (
                              <div 
                                onClick={() => setLightboxImg(acc.selfieImage)}
                                className="relative cursor-pointer group rounded-xl overflow-hidden border border-slate-200"
                              >
                                <img src={acc.selfieImage} alt="User Selfie" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                  <Eye className="w-4 h-4" /> Full Screen
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 font-medium block mb-1">PoP Receipt Document (Click to view full screen)</span>
                            {acc.popImage ? (
                              <div 
                                onClick={() => setLightboxImg(acc.popImage)}
                                className="relative cursor-pointer group rounded-xl overflow-hidden border border-slate-200"
                              >
                                <img src={acc.popImage} alt="User PoP" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                  <Eye className="w-4 h-4" /> Full Screen
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
                            )}
                          </div>
                        </div>

                        {/* Admin Action Buttons for User PoP */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                          <button 
                            onClick={() => {
                              updateAccountData(acc.id, { userPoPStatus: 'rejected' });
                              setWelcomeToast(`User PoP rejected for ${acc.fullName || acc.email}.`);
                              setTimeout(() => setWelcomeToast(null), 3000);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                              acc.userPoPStatus === 'rejected' 
                                ? 'bg-rose-600 text-white' 
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject PoP
                          </button>
                          <button 
                            onClick={() => {
                              updateAccountData(acc.id, { 
                                userPoPStatus: 'approved',
                                activeSubscription: 'user',
                                subStep: 'complete'
                              });
                              setWelcomeToast(`User PoP approved for ${acc.fullName || acc.email}! Active Subscribers updated.`);
                              setTimeout(() => setWelcomeToast(null), 3000);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                              acc.userPoPStatus === 'approved' 
                                ? 'bg-emerald-700 text-white' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve PoP
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                      No user subscription PoP records found. Users will appear here after selecting the user subscription plan or uploading proof of payment.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Admin Bottom Menu Bar with Empty Line-Art Icons */}
          <footer className="bg-white border-t border-slate-200 py-3 px-6 flex items-center justify-around shrink-0 shadow-lg">
            <button 
              onClick={() => setAdminTab('overview')}
              className={`flex flex-col items-center gap-1 group focus:outline-none ${adminTab === 'overview' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <BarChart3 className="w-6 h-6 stroke-[1.5]" />
              <span className="text-xs font-semibold">Overview</span>
            </button>
            <button 
              onClick={() => setAdminTab('verification')}
              className={`flex flex-col items-center gap-1 group focus:outline-none ${adminTab === 'verification' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <FileCheck className="w-6 h-6 stroke-[1.5]" />
              <span className="text-xs font-semibold">Verification</span>
            </button>
            <button 
              onClick={() => setAdminTab('tenant_pop')}
              className={`flex flex-col items-center gap-1 group focus:outline-none ${adminTab === 'tenant_pop' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Receipt className="w-6 h-6 stroke-[1.5]" />
              <span className="text-xs font-semibold">Tenant PoP</span>
            </button>
            <button 
              onClick={() => setAdminTab('user_pop')}
              className={`flex flex-col items-center gap-1 group focus:outline-none ${adminTab === 'user_pop' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <DollarSign className="w-6 h-6 stroke-[1.5]" />
              <span className="text-xs font-semibold">User PoP</span>
            </button>
          </footer>

        </div>
      )}

      {/* ACTIVE TENANTS LIST MODAL (View all active tenants) */}
      {activeTenantsModalOpen && (
        <div className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-200">
                  <Home className="w-5 h-5 text-indigo-600 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Active Tenants Directory</h3>
                  <p className="text-xs text-slate-500">{activeTenantsCount} verified tenant(s) active</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTenantsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activeTenantsList.length > 0 ? (
                activeTenantsList.map(tenant => (
                  <div key={tenant.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {tenant.selfieImage ? (
                        <img 
                          src={tenant.selfieImage} 
                          alt="Tenant" 
                          onClick={() => setLightboxImg(tenant.selfieImage)}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 cursor-pointer shadow-sm hover:opacity-90" 
                          title="Click to view full screen"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 text-xs font-bold">
                          {tenant.fullName ? tenant.fullName.slice(0, 2).toUpperCase() : 'TN'}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{tenant.fullName || 'Verified Tenant'}</h4>
                        <p className="text-[11px] text-slate-500">{tenant.email || 'No email'} · {tenant.phone || 'No phone'}</p>
                        <div className="text-[10px] text-slate-400 mt-0.5">Plan: Become a Tenant (R299.99/mo) · Ref: Ten29</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-lg block mb-1">
                        Active Tenant
                      </span>
                      <span className="text-[10px] text-slate-500">{tenant.unitNumber || 'Unit 4B'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  No active tenants currently approved. Tenant will appear here once PoP is approved in Tenant PoP.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setActiveTenantsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE SUBSCRIPTION USERS LIST MODAL (View all active users) */}
      {activeUsersModalOpen && (
        <div className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-200">
                  <Users className="w-5 h-5 text-indigo-600 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Active Subscription Users Directory</h3>
                  <p className="text-xs text-slate-500">{activeUsersCount} standard subscriber(s) active</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveUsersModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activeUsersList.length > 0 ? (
                activeUsersList.map(u => (
                  <div key={u.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {u.selfieImage ? (
                        <img 
                          src={u.selfieImage} 
                          alt="Subscriber" 
                          onClick={() => setLightboxImg(u.selfieImage)}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 cursor-pointer shadow-sm hover:opacity-90" 
                          title="Click to view full screen"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 text-xs font-bold">
                          {u.fullName ? u.fullName.slice(0, 2).toUpperCase() : 'US'}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{u.fullName || 'Verified User'}</h4>
                        <p className="text-[11px] text-slate-500">{u.email || 'No email'} · {u.phone || 'No phone'}</p>
                        <div className="text-[10px] text-slate-400 mt-0.5">Plan: User Subscription (R29.99/mo) · Ref: Ten29</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-lg block mb-1">
                        Active User
                      </span>
                      <span className="text-[10px] text-slate-500">Standard Plan</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  No active users currently approved. User will appear here once PoP is approved in User PoP.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setActiveUsersModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN LIGHTBOX MODAL FOR ADMIN & TENANT PORTAL */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button 
              onClick={() => setLightboxImg(null)}
              className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={lightboxImg} alt="Full Screen View" className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/20 shadow-2xl" />
            <span className="text-white text-xs mt-3 font-medium">Full-Screen Document Inspection</span>
          </div>
        </div>
      )}

      {/* PROFILE & VERIFICATION WIZARD MODAL */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-200">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {subStep === 'complete' ? 'Profile & Subscription' : (isApproved || isSpecialUser) ? 'Capitec Bank Transfer & PoP' : 'Complete Your Profile'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {subStep === 'complete' ? 'Subscription active & locked' : (isApproved || isSpecialUser) ? 'Bank Transfer Details' : `Step ${profileStep} of 4: KYC Verification`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setProfileModalOpen(false); stopCamera(); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {subStep === 'complete' ? (
              <div className="space-y-5 py-2 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900">{fullName || 'Verified User'}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{email} · {phone || 'Verified Phone'}</p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">KYC Status:</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Active Subscription:</span>
                    <span className="text-indigo-600 font-bold uppercase">{activeSubscription ? (activeSubscription === 'tenant' ? 'Become a Tenant (R299.99)' : 'User Subscription (R29.99)') : 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Proof of Payment:</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      (activeSubscription === 'tenant' ? tenantPoPStatus : userPoPStatus) === 'approved'
                        ? 'text-emerald-600'
                        : (activeSubscription === 'tenant' ? tenantPoPStatus : userPoPStatus) === 'rejected'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}>
                      {(activeSubscription === 'tenant' ? tenantPoPStatus : userPoPStatus) === 'approved' 
                        ? 'Verified & Approved' 
                        : (activeSubscription === 'tenant' ? tenantPoPStatus : userPoPStatus) === 'rejected'
                        ? 'Rejected by Admin'
                        : 'Submitted (Pending Review)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Subscription Status:</span>
                    <span className="text-amber-600 font-bold">Locked Until Expiry (Nov 2026)</span>
                  </div>
                </div>

                <button 
                  onClick={() => setProfileModalOpen(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Close Profile
                </button>
              </div>
            ) : isApproved ? (
              <>
                {subStep === 'choose' && (
                  <div className="space-y-5 py-2">
                    <div className="text-center">
                      <h4 className="text-base font-bold text-slate-900">Choose Your Monthly Subscription</h4>
                      <p className="text-xs text-slate-500 mt-1">Select one subscription plan to view Capitec Bank transfer details.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div 
                        onClick={() => setSelectedSubscription('tenant')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-2 cursor-pointer ${selectedSubscription === 'tenant' ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-slate-200 bg-slate-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedSubscription === 'tenant' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {selectedSubscription === 'tenant' ? <Check className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">Become a Tenant</h5>
                          <p className="text-[10px] text-indigo-600 font-bold mt-0.5">R299.99 / month</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setSelectedSubscription('user')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-2 cursor-pointer ${selectedSubscription === 'user' ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-slate-200 bg-slate-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedSubscription === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {selectedSubscription === 'user' ? <Check className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">User Subscription</h5>
                          <p className="text-[10px] text-indigo-600 font-bold mt-0.5">R29.99 / month</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (!selectedSubscription) {
                          alert('Please select a subscription option.');
                          return;
                        }
                        setActiveSubscription(selectedSubscription);
                        setSubStep('payment');
                      }}
                      disabled={!selectedSubscription}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Bank Transfer Instructions</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {subStep === 'payment' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                      <Building2 className="w-8 h-8 text-indigo-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Capitec Bank Transfer</h4>
                        <p className="text-[11px] text-slate-600">Please transfer <span className="font-bold text-indigo-700">{activeSubscription === 'tenant' ? 'R299.99' : 'R29.99'}</span> using the banking details below.</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center"><span className="text-slate-500">Bank:</span> <span className="font-bold text-slate-900">Capitec</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500">Account Name:</span> <span className="font-bold text-slate-900">Matthews</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500">Account Number:</span> <span className="font-mono font-bold text-slate-900">1334067366</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500">Reference:</span> <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">Ten29</span></div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button 
                        onClick={() => setSubStep('choose')}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSubStep('pop_upload')}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>Next: Upload Proof of Payment (PoP)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {subStep === 'pop_upload' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Upload Proof of Payment (PoP)</h4>
                    <p className="text-xs text-slate-500">Upload your Capitec transfer receipt showing reference <span className="font-bold text-blue-600">Ten29</span>.</p>

                    <div className="flex flex-col items-center justify-center">
                      {popImage ? (
                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                          <img src={popImage} alt="PoP Preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setPopImage(null)}
                            className="absolute bottom-2 right-2 px-3 py-1 bg-red-600 text-white text-xs rounded-lg shadow"
                          >
                            Change PoP
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-48 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3 p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                          <Upload className="w-8 h-8 text-slate-400" />
                          <span className="text-xs text-slate-600 font-medium">Click to upload transfer receipt from device</span>
                          <span className="text-[10px] text-slate-400">Supports PNG, JPG, PDF up to 10MB</span>
                          <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'pop')} className="hidden" />
                        </label>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button 
                        onClick={() => setSubStep('payment')}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (!popImage) {
                            alert('Please upload your Proof of Payment receipt.');
                            return;
                          }
                          setSubStep('complete');
                          if (activeSubscription === 'tenant') {
                            setTenantPoPStatus('pending');
                          } else {
                            setUserPoPStatus('pending');
                          }
                          setProfileModalOpen(false);
                          if (activeSubscription === 'tenant') {
                            alert('Capitec Transfer PoP submitted successfully! Admin will receive it in Tenant PoP for approval.');
                          } else {
                            alert('Capitec Transfer PoP submitted successfully! Admin will receive it in User PoP for approval.');
                          }
                        }}
                        disabled={!popImage}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit Proof of Payment</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {profileStep < 5 && (
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${(profileStep / 4) * 100}%` }}
                    ></div>
                  </div>
                )}

                {profileStep === 1 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Personal Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Full Legal Name</label>
                        <input 
                          type="text" 
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Jane Doe"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                        <input 
                          type="tel" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@example.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="pt-3">
                      <button 
                        onClick={() => {
                          if (!fullName || !email) {
                            alert('Please fill in your name and email.');
                            return;
                          }
                          setProfileStep(2);
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>Next: Face Selfie</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {profileStep === 2 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Face Selfie Verification</h4>
                    <p className="text-xs text-slate-500">Capture a live selfie or upload an image file from your device.</p>

                    {cameraError && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                        {cameraError}
                      </div>
                    )}

                    <div className="flex flex-col items-center justify-center space-y-3">
                      {selfieImage ? (
                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                          <img src={selfieImage} alt="Selfie Preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setSelfieImage(null)}
                            className="absolute bottom-2 right-2 px-3 py-1 bg-red-600 text-white text-xs rounded-lg shadow"
                          >
                            Retake
                          </button>
                        </div>
                      ) : cameraActive ? (
                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-black">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <button 
                            onClick={captureSelfie}
                            className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            Capture Photo
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-48 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3 p-4 bg-slate-50">
                          <Camera className="w-8 h-8 text-slate-400" />
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button 
                              onClick={startCamera}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                            >
                              Use Camera
                            </button>
                            <button 
                              onClick={useSampleSelfie}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                            >
                              Use Sample Selfie
                            </button>
                            <label className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer">
                              Upload File
                              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'selfie')} className="hidden" />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button 
                        onClick={() => { stopCamera(); setProfileStep(1); }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (!selfieImage) {
                            alert('Please capture or upload your face selfie.');
                            return;
                          }
                          setProfileStep(3);
                        }}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>Next: ID Document</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {profileStep === 3 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">ID Document Upload</h4>
                    <p className="text-xs text-slate-500">Upload a clear photo of your government-issued ID, driver's license, or passport.</p>

                    <div className="flex flex-col items-center justify-center">
                      {idDocumentImage ? (
                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                          <img src={idDocumentImage} alt="ID Document Preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setIdDocumentImage(null)}
                            className="absolute bottom-2 right-2 px-3 py-1 bg-red-600 text-white text-xs rounded-lg shadow"
                          >
                            Change ID
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-48 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3 p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                          <Upload className="w-8 h-8 text-slate-400" />
                          <span className="text-xs text-slate-600 font-medium">Click to upload ID document from device</span>
                          <span className="text-[10px] text-slate-400">Supports PNG, JPG, PDF up to 10MB</span>
                          <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'id')} className="hidden" />
                        </label>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button 
                        onClick={() => setProfileStep(2)}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (!idDocumentImage) {
                            alert('Please upload your ID document.');
                            return;
                          }
                          setProfileStep(4);
                        }}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>Next: Review & Submit</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {profileStep === 4 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Review Verification Details</h4>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-slate-500">Name:</span> <span className="font-semibold text-slate-900">{fullName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Phone:</span> <span className="font-semibold text-slate-900">{phone || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="font-semibold text-slate-900">{email}</span></div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Selfie & ID:</span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button 
                        onClick={() => setProfileStep(3)}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        <span>{isSubmitting ? 'Verifying Documents...' : 'Submit Verification'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
