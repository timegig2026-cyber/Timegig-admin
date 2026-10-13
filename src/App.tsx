import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Minus, Globe, Navigation, Loader2, Briefcase, User, 
  ArrowLeft, ArrowRight, X, Camera, Upload, Mail, Phone, 
  MapPin, Check, CheckCircle2, Trash2, Sparkles, Building2,
  Share2, Save, Compass, Key, Shield, ShieldCheck, Copy, 
  Users, ExternalLink, Network, Award, Zap, HelpCircle, 
  CheckSquare, FastForward, DollarSign, Layers
} from 'lucide-react';
import L from 'leaflet';

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface UserProfileData {
  avatarImage: string | null;
  brandLogo: string | null;
  fullName: string;
  displayName: string;
  title: string;
  bio: string;
  phone: string;
  whatsapp: string;
  primaryEmail: string;
  secondaryEmail: string;
  locationAddress: string;
  locationCity: string;
  locationLat: number | null;
  locationLng: number | null;
  socialLinks: SocialLink[];
  isCompleted: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'tenant' | 'user';
  isApproved: boolean;
  activeSubscription: 'none' | 'tenant';
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  tenantConversions: number;
  earnings: number;
  createdAt: string;
}

const DEFAULT_PROFILE: UserProfileData = {
  avatarImage: null,
  brandLogo: null,
  fullName: '',
  displayName: '',
  title: '',
  bio: '',
  phone: '',
  whatsapp: '',
  primaryEmail: '',
  secondaryEmail: '',
  locationAddress: '',
  locationCity: '',
  locationLat: null,
  locationLng: null,
  socialLinks: [
    { id: '1', platform: 'Instagram', url: '' },
    { id: '2', platform: 'LinkedIn', url: '' },
  ],
  isCompleted: false,
};

const SOCIAL_PLATFORMS = [
  'Instagram',
  'LinkedIn',
  'Twitter / X',
  'Facebook',
  'GitHub',
  'YouTube',
  'TikTok',
  'WhatsApp',
  'Website / Portfolio',
];

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
];

const SAMPLE_LOGOS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300&auto=format&fit=crop&q=80',
];

// Initial pre-configured accounts representing viral referral chain
const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'acc_admin',
    email: 'timegig2026@gmail.com',
    fullName: 'Master Admin (timegig2026)',
    role: 'admin',
    isApproved: true,
    activeSubscription: 'tenant',
    referralCode: 'ADMIN',
    referredBy: null,
    referralCount: 4,
    tenantConversions: 2,
    earnings: 599.98,
    createdAt: '2026-01-01',
  },
  {
    id: 'acc_user_1',
    email: 'sarah.j@example.com',
    fullName: 'Sarah Jenkins',
    role: 'tenant',
    isApproved: true,
    activeSubscription: 'tenant',
    referralCode: 'TEN-SJ88',
    referredBy: 'ADMIN',
    referralCount: 2,
    tenantConversions: 1,
    earnings: 299.99,
    createdAt: '2026-02-10',
  },
  {
    id: 'acc_user_2',
    email: 'david.miller@example.com',
    fullName: 'David Miller',
    role: 'tenant',
    isApproved: true,
    activeSubscription: 'tenant',
    referralCode: 'TEN-DM42',
    referredBy: 'TEN-SJ88',
    referralCount: 1,
    tenantConversions: 0,
    earnings: 0,
    createdAt: '2026-02-15',
  },
];

export default function App() {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number; accuracy?: number }>({
    lat: 37.7749,
    lng: -122.4194,
    accuracy: 0,
  });

  const [isSatellite, setIsSatellite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Tab State: 'gigs' shows Map with all controls; 'seekers' shows empty white screen; 'profile' shows screen-by-screen setup
  const [activeTab, setActiveTab] = useState<'seekers' | 'gigs' | 'profile'>('gigs');

  // Screen-by-Screen Profile Wizard (1 to 6)
  const [profileScreen, setProfileScreen] = useState<number>(1);
  const [isLocatingProfile, setIsLocatingProfile] = useState(false);

  // Accounts state with persistence
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('geopulse_accounts');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_ACCOUNTS;
  });

  // Current active logged-in account (defaults to admin timegig2026@gmail.com for seamless testing)
  const [currentAccountId, setCurrentAccountId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('geopulse_current_account_id');
      if (saved) return saved;
    } catch {
      // fallback
    }
    return 'acc_admin';
  });

  // Current user account object
  const currentAccount = accounts.find(a => a.id === currentAccountId) || accounts[0];

  // Whether active account has special admin skip privileges
  const isSpecialUser = currentAccount.email.toLowerCase() === 'timegig2026@gmail.com';

  // Referral Code from URL query parameters (e.g. ?ref=ADMIN or ?ref=TEN-SJ88)
  const [activeReferralCode, setActiveReferralCode] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('tenantRef');
      if (ref) {
        localStorage.setItem('geopulse_active_ref', ref);
        return ref;
      }
      return localStorage.getItem('geopulse_active_ref');
    } catch {
      return null;
    }
  });

  const [referralBannerVisible, setReferralBannerVisible] = useState<boolean>(() => !!activeReferralCode);

  // Modals
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);

  // Profile data with persistence in localStorage
  const [profileData, setProfileData] = useState<UserProfileData>(() => {
    try {
      const saved = localStorage.getItem('geopulse_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_PROFILE;
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Synchronize accounts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('geopulse_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [accounts]);

  // Synchronize currentAccountId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('geopulse_current_account_id', currentAccountId);
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [currentAccountId]);

  // Base Application URL for generating sharing links
  const appBaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://ais-pre-uzva6jfyjwao5cunbehskw-339746247390.us-west2.run.app';

  // Admin Master Share Link
  const adminShareLink = `${appBaseUrl}?ref=ADMIN`;

  // Tenant Share Link for current user (or Admin if admin)
  const tenantShareLink = `${appBaseUrl}?ref=${currentAccount.referralCode || 'ADMIN'}`;

  // Initialize Leaflet Map
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

    // Locate user initially
    locateUser(false);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Invalidate map size when switching back to GiGs tab
  useEffect(() => {
    if (activeTab === 'gigs' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 50);
    }
  }, [activeTab]);

  // Update GPS marker on the map
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
      iconAnchor: [12, 12],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
      marker.bindPopup(`<b>Your Location</b><br />Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
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
          weight: 1,
        }).addTo(map);
        circleRef.current = circle;
      }
    }
  }, [currentPos]);

  // Trigger Geolocation
  const locateUser = (animate: boolean = true) => {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        setCurrentPos({ lat, lng, accuracy });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16, { animate });
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error.message);
        if (animate) {
          showMessage('Could not retrieve GPS location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Toggle Map vs Satellite View
  const toggleSatellite = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const nextSatellite = !isSatellite;
    setIsSatellite(nextSatellite);

    const url = nextSatellite
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newLayer = L.tileLayer(url, { maxZoom: 19 }).addTo(map);
    tileLayerRef.current = newLayer;
  };

  // Place Search via OpenStreetMap Nominatim
  const handlePlaceSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
        { headers: { 'User-Agent': 'GeoPulseOSMApp/1.0' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = Number(data[0].lat);
        const lon = Number(data[0].lon);
        setCurrentPos({ lat, lng: lon });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 15, { animate: true });
        }
      } else {
        showMessage('Location not found. Try another search.');
      }
    } catch (err) {
      console.error('Search error:', err);
      showMessage('Error searching location.');
    } finally {
      setIsSearching(false);
    }
  };

  const showMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Copy Link helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showMessage(`Copied ${label} to clipboard!`);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      showMessage(`Link ready: ${text}`);
    }
  };

  // Native Web Share API helper
  const triggerNativeShare = async (url: string, title: string, text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        showMessage('Share sheet opened successfully!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyToClipboard(url, title);
        }
      }
    } else {
      copyToClipboard(url, title);
    }
  };

  // File Upload helper for Profile Picture and Logo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarImage' | 'brandLogo') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({
          ...prev,
          [field]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Automatic Location Setter for Profile (Reverse geocodes GPS coordinates)
  const handleAutoSetLocation = () => {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported.');
      return;
    }
    setIsLocatingProfile(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setProfileData(prev => ({
          ...prev,
          locationLat: lat,
          locationLng: lng,
        }));

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { 'User-Agent': 'GeoPulseOSMApp/1.0' } }
          );
          const data = await res.json();
          if (data) {
            const city = data.address?.city || data.address?.town || data.address?.suburb || 'Local Area';
            setProfileData(prev => ({
              ...prev,
              locationCity: city,
              locationAddress: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            }));
          }
        } catch {
          setProfileData(prev => ({
            ...prev,
            locationAddress: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            locationCity: 'Current Location',
          }));
        } finally {
          setIsLocatingProfile(false);
          showMessage('Location automatically set from GPS map coordinates!');
        }
      },
      () => {
        setIsLocatingProfile(false);
        showMessage('Could not detect GPS location.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Add Dynamic Social Media Link
  const handleAddSocialLink = () => {
    const newLink: SocialLink = {
      id: Date.now().toString(),
      platform: 'Instagram',
      url: '',
    };
    setProfileData(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, newLink],
    }));
  };

  const handleUpdateSocialLink = (id: string, field: 'platform' | 'url', val: string) => {
    setProfileData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map(link => (link.id === id ? { ...link, [field]: val } : link)),
    }));
  };

  const handleRemoveSocialLink = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter(link => link.id !== id),
    }));
  };

  // Save Complete Profile
  const handleSaveProfile = () => {
    const updated = { ...profileData, isCompleted: true };
    setProfileData(updated);
    localStorage.setItem('geopulse_user_profile', JSON.stringify(updated));
    showMessage('Profile successfully saved!');
  };

  // Skip feature for timegig2026@gmail.com on profile wizard
  const handleAdminSkipProfile = () => {
    const autoFilled: UserProfileData = {
      avatarImage: profileData.avatarImage || SAMPLE_AVATARS[0],
      brandLogo: profileData.brandLogo || SAMPLE_LOGOS[0],
      fullName: profileData.fullName || 'Admin User (timegig2026)',
      displayName: profileData.displayName || '@timegig_admin',
      title: profileData.title || 'Master Platform Administrator',
      bio: profileData.bio || 'Verified Admin account with full platform skip & management privileges.',
      phone: profileData.phone || '+1 555-019-2026',
      whatsapp: profileData.whatsapp || '+1 555-019-2026',
      primaryEmail: 'timegig2026@gmail.com',
      secondaryEmail: 'support@timegig.app',
      locationAddress: profileData.locationAddress || 'Admin Global HQ, Downtown',
      locationCity: profileData.locationCity || 'San Francisco, CA',
      locationLat: currentPos.lat,
      locationLng: currentPos.lng,
      socialLinks: profileData.socialLinks.length > 0 ? profileData.socialLinks : [
        { id: '1', platform: 'LinkedIn', url: 'https://linkedin.com/in/timegig' },
        { id: '2', platform: 'Twitter / X', url: 'https://x.com/timegig' },
      ],
      isCompleted: true,
    };
    setProfileData(autoFilled);
    setProfileScreen(6);
    localStorage.setItem('geopulse_user_profile', JSON.stringify(autoFilled));
    showMessage('⚡ Admin Skip Applied: Profile auto-completed with timegig2026 privileges!');
  };

  // "Become a Tenant" Subscription Activation Flow
  // When a user subscribes:
  // 1. Their status becomes an approved tenant.
  // 2. They receive their OWN unique referral link (e.g. TEN-XXXX) to invite others.
  // 3. The person who referred them (Admin or upstream tenant) gets +1 conversion and credit.
  const handleSubscribeBecomeTenant = (skipPayment: boolean = false) => {
    const refCode = currentAccount.referralCode && currentAccount.referralCode !== 'ADMIN'
      ? currentAccount.referralCode
      : `TEN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const referrerCode = currentAccount.referredBy || activeReferralCode || 'ADMIN';

    setAccounts(prevAccounts => {
      return prevAccounts.map(acc => {
        // Update current user
        if (acc.id === currentAccount.id) {
          return {
            ...acc,
            role: 'tenant',
            activeSubscription: 'tenant',
            isApproved: true,
            referralCode: refCode,
            referredBy: acc.referredBy || referrerCode,
          };
        }
        // Reward the referrer
        if (acc.referralCode === referrerCode || (referrerCode === 'ADMIN' && acc.role === 'admin')) {
          return {
            ...acc,
            tenantConversions: (acc.tenantConversions || 0) + 1,
            earnings: (acc.earnings || 0) + 299.99,
          };
        }
        return acc;
      });
    });

    if (skipPayment) {
      showMessage(`⚡ Admin Skip: Subscription activated! Your viral invite code is: ${refCode}`);
    } else {
      showMessage(`🎉 Welcome Tenant! Subscription active! Your viral invite code is: ${refCode}`);
    }
  };

  // VIRAL SIMULATION ENGINE:
  // Lets the user test the viral loop in action!
  // Any simulated user joins via the current referral link, pays "Become a Tenant",
  // receives their own link, and can invite the next person in the chain!
  const handleSimulateViralJoin = (inviterCode: string = 'ADMIN') => {
    const fakeNames = [
      { name: 'Alex Morgan', email: 'alex.m@example.com' },
      { name: 'Marcus Vance', email: 'marcus.v@example.com' },
      { name: 'Elena Rostova', email: 'elena.r@example.com' },
      { name: 'Kofi Mensah', email: 'kofi.m@example.com' },
      { name: 'Sophia Chen', email: 'sophia.c@example.com' },
    ];
    const picked = fakeNames[Math.floor(Math.random() * fakeNames.length)];
    const newRefCode = `TEN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newId = `acc_sim_${Date.now()}`;

    const newSimulatedAccount: UserAccount = {
      id: newId,
      email: picked.email,
      fullName: picked.name,
      role: 'tenant',
      isApproved: true,
      activeSubscription: 'tenant',
      referralCode: newRefCode,
      referredBy: inviterCode,
      referralCount: 0,
      tenantConversions: 0,
      earnings: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAccounts(prev => {
      const updated = prev.map(acc => {
        if (acc.referralCode === inviterCode || (inviterCode === 'ADMIN' && acc.role === 'admin')) {
          return {
            ...acc,
            referralCount: (acc.referralCount || 0) + 1,
            tenantConversions: (acc.tenantConversions || 0) + 1,
            earnings: (acc.earnings || 0) + 299.99,
          };
        }
        return acc;
      });
      return [...updated, newSimulatedAccount];
    });

    showMessage(`🚀 Viral Loop Success: ${picked.name} joined via ${inviterCode}, paid "Become a Tenant" and received their link (${newRefCode})!`);
  };

  // Switch active account (allows switching between Admin and Tenants for testing)
  const handleSwitchAccount = (accountId: string) => {
    setCurrentAccountId(accountId);
    const target = accounts.find(a => a.id === accountId);
    if (target) {
      showMessage(`Switched active account to: ${target.fullName} (${target.email})`);
    }
  };

  // Quick switch to admin account (timegig2026@gmail.com)
  const handleSwitchToAdmin = () => {
    const adminAcc = accounts.find(a => a.email === 'timegig2026@gmail.com') || accounts[0];
    setCurrentAccountId(adminAcc.id);
    showMessage('⚡ Switched to Admin Account (timegig2026@gmail.com) with full skip privileges!');
  };

  // Viral chain calculations
  const totalNetworkMembers = accounts.length;
  const totalTenantSubscribers = accounts.filter(a => a.activeSubscription === 'tenant').length;
  const adminAccount = accounts.find(a => a.role === 'admin') || accounts[0];
  const totalNetworkRevenue = (accounts.filter(a => a.activeSubscription === 'tenant' && a.role !== 'admin').length) * 299.99;

  return (
    <div className="w-full h-[100dvh] overflow-hidden relative bg-slate-900 font-sans text-slate-900 select-none">
      
      {/* MAP VIEW CONTAINER (Always mounted so map state & Leaflet canvas stay pristine) */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

      {/* TOP SEARCH BAR (Rendered on GiGs Map view) */}
      {activeTab === 'gigs' && (
        <div className="absolute top-4 inset-x-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-20 animate-in fade-in duration-200">
          <form onSubmit={handlePlaceSearch} className="relative shadow-xl">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 stroke-[1.5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any place, city, or address..."
              className="w-full bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl pl-11 pr-24 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-sm"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </form>
        </div>
      )}

      {/* FLOATING REFERRAL BANNER (Shown when user joined through a link) */}
      {activeTab === 'gigs' && referralBannerVisible && activeReferralCode && (
        <div className="absolute top-20 inset-x-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-20 animate-in slide-in-from-top-3 fade-in duration-200">
          <div className="bg-gradient-to-r from-blue-900/95 to-indigo-950/95 backdrop-blur-md border border-blue-400/30 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-blue-300">
                <Network className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  Joined via Referral Link: <span className="text-blue-300 font-mono">[{activeReferralCode}]</span>
                </p>
                <p className="text-[10px] text-slate-300 truncate">
                  Subscribe to "Become a Tenant" to unlock your own viral link to invite others!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setTenantModalOpen(true)}
                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-[10px] font-bold transition-colors shadow-sm"
              >
                Become Tenant
              </button>
              <button
                onClick={() => setReferralBannerVisible(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING MAP CONTROLS ON RIGHT (Shown in GiGs Map view) */}
      {activeTab === 'gigs' && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5 shadow-2xl animate-in fade-in duration-200">
          
          {/* ZOOM IN (+) FEATURE */}
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-11 h-11 bg-gradient-to-b from-white to-slate-100 hover:from-slate-50 hover:to-slate-200 text-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 shadow-[0_4px_0_0_#cbd5e1,0_6px_10px_rgba(0,0,0,0.08)] active:translate-y-1 active:shadow-none transition-all focus:outline-none"
            title="Zoom In"
          >
            <Plus className="w-5 h-5 stroke-[2]" />
          </button>

          {/* ZOOM OUT (-) FEATURE */}
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-11 h-11 bg-gradient-to-b from-white to-slate-100 hover:from-slate-50 hover:to-slate-200 text-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 shadow-[0_4px_0_0_#cbd5e1,0_6px_10px_rgba(0,0,0,0.08)] active:translate-y-1 active:shadow-none transition-all focus:outline-none"
            title="Zoom Out"
          >
            <Minus className="w-5 h-5 stroke-[2]" />
          </button>

          {/* GPS LOCATION (NAVIGATION) */}
          <button
            onClick={() => locateUser(true)}
            disabled={isLocating}
            className="w-11 h-11 bg-gradient-to-b from-white to-slate-100 hover:from-slate-50 hover:to-slate-200 text-blue-600 rounded-2xl flex items-center justify-center border border-slate-200 shadow-[0_4px_0_0_#cbd5e1,0_6px_10px_rgba(0,0,0,0.08)] active:translate-y-1 active:shadow-none transition-all focus:outline-none"
            title="Current GPS Location"
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5 stroke-[2]" />
            )}
          </button>

          {/* SATELLITE TOGGLE (GLOBE) */}
          <button
            onClick={toggleSatellite}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all focus:outline-none active:translate-y-1 active:shadow-none ${
              isSatellite
                ? 'bg-gradient-to-b from-blue-600 to-indigo-800 text-white border-blue-400 shadow-[0_4px_0_0_#1e1b4b,0_8px_14px_rgba(37,99,235,0.4)]'
                : 'bg-gradient-to-b from-white to-slate-100 hover:from-slate-50 hover:to-slate-200 text-slate-800 border-slate-200 shadow-[0_4px_0_0_#cbd5e1,0_6px_10px_rgba(0,0,0,0.08)]'
            }`}
            title="Toggle Satellite Imagery"
          >
            <Globe className="w-5 h-5 stroke-[2]" />
          </button>

        </div>
      )}

      {/* SEEKERS TAB: EMPTY WHITE SCREEN AS EXPLICITLY REQUESTED */}
      {activeTab === 'seekers' && (
        <div className="fixed inset-0 bg-white z-40 flex flex-col animate-in fade-in duration-150">
          {/* Pristine empty white screen canvas */}
          <div className="flex-1 w-full bg-white" />
        </div>
      )}

      {/* PROFILE TAB: SCREEN-BY-SCREEN GUIDED FLOW */}
      {activeTab === 'profile' && (
        <div className="fixed inset-0 bg-slate-50 z-40 overflow-y-auto pb-28 animate-in fade-in duration-200 flex flex-col text-slate-900">
          
          {/* Top Sticky Header */}
          <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 z-30 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('gigs')}
                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">GiGs Map</span>
              </button>
              <div className="h-4 w-px bg-slate-200 mx-1" />
              <h2 className="text-sm font-bold text-slate-900">Profile Setup</h2>
            </div>

            {/* Screen indicator step badge */}
            <div className="px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">
              Screen {profileScreen} of 6
            </div>
          </header>

          <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-5">
            
            {/* SPECIAL SKIP FEATURE BANNER FOR timegig2026@gmail.com */}
            {isSpecialUser && (
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">timegig2026@gmail.com Special Access</span>
                    <span className="text-[10px] text-amber-800">You have access to skip features across all profile setup screens.</span>
                  </div>
                </div>
                <button
                  onClick={handleAdminSkipProfile}
                  className="px-3 py-1.5 bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-[0_3px_0_0_#b45309] hover:from-amber-300 hover:to-amber-500 active:translate-y-0.5 transition-all shrink-0 flex items-center gap-1"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Admin Skip & Save</span>
                </button>
              </div>
            )}

            {/* SCREEN 1: PROFILE PICTURE & BRAND LOGO */}
            {profileScreen === 1 && (
              <section className="space-y-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-200">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase">Screen 1 of 6</span>
                  <h3 className="text-lg font-bold text-slate-900">Profile Picture & Brand Logo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Upload your individual user photo and company or brand logo.</p>
                </div>

                {/* Live Combined Avatar + Logo Preview */}
                <div className="flex items-center justify-center py-2">
                  <div className="relative">
                    {profileData.avatarImage ? (
                      <img
                        src={profileData.avatarImage}
                        alt="Avatar Preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-indigo-500/20"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center text-slate-400">
                        <User className="w-10 h-10 stroke-[1.5]" />
                      </div>
                    )}
                    {/* Brand Logo Badge Overlay */}
                    {profileData.brandLogo && (
                      <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white p-0.5 border-2 border-white shadow-md">
                        <img
                          src={profileData.brandLogo}
                          alt="Logo Badge"
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 1. User Profile Picture */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-800">1. User Profile Picture</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'avatarImage')} className="hidden" />
                    </label>
                    {profileData.avatarImage && (
                      <button
                        onClick={() => setProfileData(p => ({ ...p, avatarImage: null }))}
                        className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Sample Avatars Selector */}
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 block mb-1.5">Or choose a sample avatar:</span>
                    <div className="flex items-center gap-2.5">
                      {SAMPLE_AVATARS.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt="Sample"
                          onClick={() => setProfileData(p => ({ ...p, avatarImage: url }))}
                          className={`w-10 h-10 rounded-full object-cover cursor-pointer border-2 transition-all hover:scale-105 ${
                            profileData.avatarImage === url ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Brand / Company Logo */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-800">2. Company / Brand Logo</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5 transition-colors">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Upload Brand Logo</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'brandLogo')} className="hidden" />
                    </label>
                    {profileData.brandLogo && (
                      <button
                        onClick={() => setProfileData(p => ({ ...p, brandLogo: null }))}
                        className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Sample Logos Selector */}
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 block mb-1.5">Or choose a sample logo:</span>
                    <div className="flex items-center gap-2.5">
                      {SAMPLE_LOGOS.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt="Sample Logo"
                          onClick={() => setProfileData(p => ({ ...p, brandLogo: url }))}
                          className={`w-10 h-10 rounded-xl object-cover cursor-pointer border-2 transition-all hover:scale-105 ${
                            profileData.brandLogo === url ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  {isSpecialUser ? (
                    <button
                      onClick={handleAdminSkipProfile}
                      className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>Skip to Complete</span>
                    </button>
                  ) : <div />}
                  <button
                    onClick={() => setProfileScreen(2)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
                  >
                    <span>Next: Basic Information</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* SCREEN 2: BASIC INFORMATION */}
            {profileScreen === 2 && (
              <section className="space-y-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-200">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase">Screen 2 of 6</span>
                  <h3 className="text-lg font-bold text-slate-900">Basic Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Introduce yourself and your professional identity.</p>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData(p => ({ ...p, fullName: e.target.value }))}
                      placeholder="e.g. Alex Matthews"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Display Name / Handle</label>
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(p => ({ ...p, displayName: e.target.value }))}
                      placeholder="e.g. @alexmatthews"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Professional Title / Headline</label>
                    <input
                      type="text"
                      value={profileData.title}
                      onChange={(e) => setProfileData(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Certified Property Manager & Surveyor"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Bio / About</label>
                    <textarea
                      rows={3}
                      value={profileData.bio}
                      onChange={(e) => setProfileData(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell people about your services, experience, and background..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    onClick={() => setProfileScreen(1)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={() => setProfileScreen(3)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
                  >
                    <span>Next: Contact & Email</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* SCREEN 3: CONTACT INFORMATION & EMAIL INFORMATION */}
            {profileScreen === 3 && (
              <section className="space-y-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-200">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase">Screen 3 of 6</span>
                  <h3 className="text-lg font-bold text-slate-900">Contact & Email Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Add your phone numbers and email channels so users can reach you.</p>
                </div>

                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Primary Phone Number</span>
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+27 82 123 4567"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp / Alternative Phone</span>
                    </label>
                    <input
                      type="tel"
                      value={profileData.whatsapp}
                      onChange={(e) => setProfileData(p => ({ ...p, whatsapp: e.target.value }))}
                      placeholder="+27 82 987 6543"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Primary Email Address</span>
                    </label>
                    <input
                      type="email"
                      value={profileData.primaryEmail}
                      onChange={(e) => setProfileData(p => ({ ...p, primaryEmail: e.target.value }))}
                      placeholder="alex@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Secondary / Business Email</span>
                    </label>
                    <input
                      type="email"
                      value={profileData.secondaryEmail}
                      onChange={(e) => setProfileData(p => ({ ...p, secondaryEmail: e.target.value }))}
                      placeholder="business@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    onClick={() => setProfileScreen(2)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={() => setProfileScreen(4)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
                  >
                    <span>Next: Set Location</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* SCREEN 4: LOCATION SETTING (AUTO GPS OR MANUAL) */}
            {profileScreen === 4 && (
              <section className="space-y-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-200">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase">Screen 4 of 6</span>
                  <h3 className="text-lg font-bold text-slate-900">Location Settings</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Set your operating location manually, or have the map set it automatically via GPS coordinates.
                  </p>
                </div>

                {/* 3D ONE-CLICK AUTOMATIC GPS SETTER */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-blue-600" />
                      <span>Automatic Map Detection</span>
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                      Instant GPS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Tap below to let the map automatically detect your current location and fill in your address coordinates.
                  </p>
                  <button
                    type="button"
                    onClick={handleAutoSetLocation}
                    disabled={isLocatingProfile}
                    className="w-full py-3 bg-gradient-to-b from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:translate-y-0.5 text-white rounded-xl text-xs font-bold shadow-[0_4px_0_0_#1e40af] transition-all flex items-center justify-center gap-2"
                  >
                    {isLocatingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4 stroke-[2]" />
                    )}
                    <span>{isLocatingProfile ? 'Detecting Location...' : 'Set Location Automatically via Map (GPS)'}</span>
                  </button>
                </div>

                {/* Location fields */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Full Street Address / Location</label>
                    <input
                      type="text"
                      value={profileData.locationAddress}
                      onChange={(e) => setProfileData(p => ({ ...p, locationAddress: e.target.value }))}
                      placeholder="e.g. 124 Main Street, Waterfront"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">City / Region / Country</label>
                    <input
                      type="text"
                      value={profileData.locationCity}
                      onChange={(e) => setProfileData(p => ({ ...p, locationCity: e.target.value }))}
                      placeholder="e.g. Cape Town, Western Cape"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                    />
                  </div>

                  {/* Coordinates pill */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>GPS Coordinates:</span>
                    </span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {profileData.locationLat !== null && profileData.locationLng !== null
                        ? `${profileData.locationLat.toFixed(5)}°, ${profileData.locationLng.toFixed(5)}°`
                        : `${currentPos.lat.toFixed(5)}°, ${currentPos.lng.toFixed(5)}° (Default)`}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    onClick={() => setProfileScreen(3)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={() => setProfileScreen(5)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
                  >
                    <span>Next: Social Media Links</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* SCREEN 5: SOCIAL MEDIA LINKS (DYNAMIC - ADD MORE) */}
            {profileScreen === 5 && (
              <section className="space-y-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase">Screen 5 of 6</span>
                    <h3 className="text-lg font-bold text-slate-900">Social Media Links</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Connect your platforms. You can add as many links as you want.</p>
                  </div>
                  <button
                    onClick={handleAddSocialLink}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Link</span>
                  </button>
                </div>

                {/* Dynamic Social Links List */}
                <div className="space-y-3 pt-1">
                  {profileData.socialLinks.map((link) => (
                    <div key={link.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="w-full sm:w-44 shrink-0">
                        <select
                          value={link.platform}
                          onChange={(e) => handleUpdateSocialLink(link.id, 'platform', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                        >
                          {SOCIAL_PLATFORMS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => handleUpdateSocialLink(link.id, 'url', e.target.value)}
                          placeholder={`https://${link.platform.toLowerCase().replace(/[^a-z]/g, '')}.com/yourhandle`}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <button
                        onClick={() => handleRemoveSocialLink(link.id)}
                        className="p-2 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-xl transition-colors self-end sm:self-center"
                        title="Delete link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {profileData.socialLinks.length === 0 && (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                      No social links added yet. Tap "+ Add Link" above to add your first profile.
                    </div>
                  )}

                  {/* Quick Add Button */}
                  <button
                    type="button"
                    onClick={handleAddSocialLink}
                    className="w-full py-2.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 bg-indigo-50/50 hover:bg-indigo-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Social Media Link</span>
                  </button>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    onClick={() => setProfileScreen(4)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={() => setProfileScreen(6)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
                  >
                    <span>Next: Review & Save</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            )}

            {/* SCREEN 6: REVIEW PROFILE & SAVE */}
            {profileScreen === 6 && (
              <section className="space-y-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase">Screen 6 of 6 · Final</span>
                    <h3 className="text-lg font-bold text-slate-900">Review & Save Profile</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Verify your details screen by screen and click save to finalize.</p>
                  </div>
                  {profileData.isCompleted && (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                </div>

                {/* Profile Card Preview */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200 rounded-2xl space-y-4">
                  {/* Avatar + Brand Logo + Header */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      {profileData.avatarImage ? (
                        <img
                          src={profileData.avatarImage}
                          alt="Avatar"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shadow-sm">
                          {profileData.fullName ? profileData.fullName.slice(0, 2).toUpperCase() : 'USER'}
                        </div>
                      )}
                      {profileData.brandLogo && (
                        <img
                          src={profileData.brandLogo}
                          alt="Brand Logo"
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border border-white shadow object-cover bg-white"
                        />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{profileData.fullName || 'Name Not Set'}</h4>
                      <p className="text-xs font-semibold text-indigo-600">{profileData.displayName || '@username'}</p>
                      <p className="text-[11px] text-slate-500">{profileData.title || 'Professional Title'}</p>
                    </div>
                  </div>

                  {profileData.bio && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-3 rounded-xl border border-slate-100">
                      {profileData.bio}
                    </p>
                  )}

                  {/* Contact & Email Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Phone className="w-3 h-3 text-indigo-600" /> Phone
                      </span>
                      <p className="font-semibold text-slate-900">{profileData.phone || 'None provided'}</p>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Mail className="w-3 h-3 text-indigo-600" /> Primary Email
                      </span>
                      <p className="font-semibold text-slate-900 truncate">{profileData.primaryEmail || 'None provided'}</p>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-0.5 sm:col-span-2">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" /> Confirmed Location
                      </span>
                      <p className="font-semibold text-slate-900">
                        {profileData.locationAddress || profileData.locationCity || 'Current GPS Location Set'}
                      </p>
                    </div>
                  </div>

                  {/* Social Media Links Badges */}
                  {profileData.socialLinks.filter(s => s.url).length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase">Social Media Profiles:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profileData.socialLinks.filter(s => s.url).map(link => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                          >
                            <span>{link.platform}</span>
                            <Share2 className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3D SAVE BUTTON */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => setProfileScreen(5)}
                    className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 w-full py-3.5 bg-gradient-to-b from-emerald-500 to-teal-700 hover:from-emerald-600 hover:to-teal-800 text-white rounded-2xl text-xs font-black shadow-[0_5px_0_0_#065f46,0_10px_16px_rgba(5,150,105,0.35)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4 stroke-[2.2]" />
                    <span>Save Complete Profile</span>
                  </button>
                </div>
              </section>
            )}
          </main>
        </div>
      )}

      {/* ADMIN PORTAL & VIRAL MASTER REFERRAL CENTER MODAL */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[90dvh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Admin Viral Referral Center</h3>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md">
                      timegig2026 Master
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Master share link and cascading viral loop manager</p>
                </div>
              </div>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
              
              {/* ADMIN ACCOUNT STATUS & SKIP BADGE */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Admin Master Account: timegig2026@gmail.com</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    This account possesses instant skip features (skip payments, skip approvals, instant tenant bypass).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSwitchToAdmin}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-colors"
                  >
                    Active as Admin
                  </button>
                </div>
              </div>

              {/* 1. ADMIN MASTER SHARE LINK CARD */}
              <div className="p-5 bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-200 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-sm text-slate-900">Your Master Admin Invite Link</span>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                    Master Root Code: ADMIN
                  </span>
                </div>

                <p className="text-slate-600 text-[11px] leading-relaxed">
                  The link below runs this app. Any users who join through this link and pay your <b>"Become a Tenant"</b> subscription will automatically receive their own unique link to invite other users, and those referral users do the exact same thing over and over again!
                </p>

                {/* Share Link Input Box */}
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl p-1.5 shadow-inner">
                  <input
                    type="text"
                    readOnly
                    value={adminShareLink}
                    className="flex-1 bg-transparent px-2.5 text-xs text-slate-800 font-mono outline-none truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(adminShareLink, 'Admin Master Share Link')}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </button>
                  <button
                    onClick={() => triggerNativeShare(adminShareLink, 'GeoPulse OSM - Become a Tenant', 'Join GeoPulse and become a verified tenant to get your own viral invite link!')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                </div>

                {/* Test Simulation Button */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Want to test this viral invitation flow right now?</span>
                  <button
                    onClick={() => handleSimulateViralJoin('ADMIN')}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Simulate User Join & Pay Subscription</span>
                  </button>
                </div>
              </div>

              {/* 2. VIRAL NETWORK STATS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Network</span>
                  <span className="text-xl font-black text-slate-900">{totalNetworkMembers}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Users in system</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Paid Tenants</span>
                  <span className="text-xl font-black text-emerald-600">{totalTenantSubscribers}</span>
                  <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">Active subscriptions</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Admin Invites</span>
                  <span className="text-xl font-black text-indigo-600">{adminAccount.referralCount}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Direct referrals</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Est. Revenue</span>
                  <span className="text-xl font-black text-amber-600">R{totalNetworkRevenue.toFixed(2)}</span>
                  <span className="text-[10px] text-amber-700 font-medium block mt-0.5">Subscription fees</span>
                </div>
              </div>

              {/* 3. MULTI-TIER VIRAL CHAIN OVERVIEW */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-sm text-slate-900">Viral Cascading Referral Tree</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Live multi-tier network</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
                  {accounts.map((acc, index) => (
                    <div key={acc.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">{acc.fullName}</span>
                            {acc.role === 'admin' ? (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                                Root Admin
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                                Tenant Subscriber
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">
                            Code: <b className="font-mono text-slate-700">{acc.referralCode}</b> · Invited by: <b className="font-mono text-slate-700">{acc.referredBy || 'None (Root)'}</b>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="font-bold text-indigo-600 block text-xs">{acc.referralCount} Invites</span>
                          <span className="text-[10px] text-emerald-600 font-semibold">{acc.tenantConversions} Paid</span>
                        </div>

                        {acc.id !== currentAccountId && (
                          <button
                            onClick={() => handleSwitchAccount(acc.id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition-colors"
                            title="Switch to this account to test their invite link"
                          >
                            Switch To
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                timegig2026@gmail.com Root Administrator
              </span>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Center
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TENANT PORTAL & VIRAL REFERRAL LINK MODAL */}
      {tenantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl max-h-[90dvh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
                  <Key className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Tenant Portal</h3>
                    {currentAccount.activeSubscription === 'tenant' ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                        Active Tenant
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                        Subscription Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Manage lease and your personal viral referral link</p>
                </div>
              </div>
              <button
                onClick={() => setTenantModalOpen(false)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              
              {/* IF USER IS NOT YET A SUBSCRIBED TENANT */}
              {currentAccount.activeSubscription !== 'tenant' ? (
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-emerald-950">Become a Tenant Subscription</h4>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                        R299.99 / mo
                      </span>
                    </div>

                    <p className="text-[11px] text-emerald-900 leading-relaxed">
                      Pay the Admin's "Become a Tenant" subscription to activate your official tenant portal and receive your <b>own unique viral referral link</b> to invite other users!
                    </p>

                    <div className="space-y-2 pt-1 text-[11px] text-slate-700">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Instant access to TenantPortal features on the map</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Receive your personal viral link to invite others & earn R299.99 per tenant conversion</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Continuous chain: Your invitees receive their own link when they subscribe!</span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleSubscribeBecomeTenant(false)}
                        className="flex-1 py-3 bg-gradient-to-b from-emerald-500 to-teal-700 hover:from-emerald-600 hover:to-teal-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Pay & Become a Tenant (R299.99)</span>
                      </button>

                      {/* SPECIAL SKIP FEATURE FOR timegig2026@gmail.com */}
                      {isSpecialUser && (
                        <button
                          onClick={() => handleSubscribeBecomeTenant(true)}
                          className="py-3 px-4 bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                          title="Skip payment and instantly activate tenant status with admin privileges"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Admin Skip & Activate</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* IF USER IS AN ACTIVE TENANT -> SHOW VIRAL INVITE LINK CARD */
                <div className="space-y-5">
                  
                  {/* Status Banner */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-emerald-950 block">Tenant Status: Active & Verified</span>
                      <span className="text-[10px] text-emerald-700">Account: {currentAccount.fullName} ({currentAccount.email})</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-lg">
                      Paid to Admin
                    </span>
                  </div>

                  {/* VIRAL INVITE LINK CARD */}
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-sm text-slate-900">Your Personal Viral Invite Link</span>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md font-mono">
                        Code: {currentAccount.referralCode}
                      </span>
                    </div>

                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Share your unique link below. Any users who join through your link and pay the "Become a Tenant" subscription will receive <b>their own link to invite other users</b>, and that referral users do the same thing over and over again!
                    </p>

                    {/* Share Link Input */}
                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl p-1.5 shadow-inner">
                      <input
                        type="text"
                        readOnly
                        value={tenantShareLink}
                        className="flex-1 bg-transparent px-2.5 text-xs text-slate-800 font-mono outline-none truncate"
                      />
                      <button
                        onClick={() => copyToClipboard(tenantShareLink, 'Your Tenant Viral Invite Link')}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => triggerNativeShare(tenantShareLink, 'Join via my Tenant Invite Link', 'Join GeoPulse through my tenant link and become a verified tenant to get your own link!')}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>
                    </div>

                    {/* Test Simulation Button */}
                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Test your personal referral loop:</span>
                      <button
                        onClick={() => handleSimulateViralJoin(currentAccount.referralCode)}
                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Simulate User Joining via My Link</span>
                      </button>
                    </div>
                  </div>

                  {/* Personal Viral Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Direct Invites</span>
                      <span className="text-lg font-black text-slate-900">{currentAccount.referralCount || 0}</span>
                      <span className="text-[10px] text-slate-400 block">Joined users</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Converted</span>
                      <span className="text-lg font-black text-emerald-600">{currentAccount.tenantConversions || 0}</span>
                      <span className="text-[10px] text-emerald-600 block">Became tenants</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Rewards</span>
                      <span className="text-lg font-black text-amber-600">R{(currentAccount.earnings || 0).toFixed(2)}</span>
                      <span className="text-[10px] text-amber-700 block">Earnings</span>
                    </div>
                  </div>

                  {/* Friends who joined via this link */}
                  <div className="space-y-2">
                    <span className="font-bold text-xs text-slate-900 block">Downstream Users Who Joined via Your Link:</span>
                    {accounts.filter(a => a.referredBy === currentAccount.referralCode).length > 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-200">
                        {accounts.filter(a => a.referredBy === currentAccount.referralCode).map(sub => (
                          <div key={sub.id} className="p-3 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900 block">{sub.fullName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">Assigned Code: {sub.referralCode}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                              Subscribed & Active
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[11px] text-slate-400">
                        No one has joined with your link yet. Copy your link above or click "Simulate User Joining" to test the loop!
                      </p>
                    )}
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setTenantModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Portal
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING STATUS TOAST */}
      {statusMessage && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2 rounded-xl shadow-2xl text-[11px] font-semibold animate-in fade-in slide-in-from-bottom-2 border border-white/10 flex items-center gap-2 max-w-xs sm:max-w-md text-center">
          <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}

      {/* COMPACT SEE-THROUGH BOTTOM MENU BAR WITH 3D ICONS */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-t border-white/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-1.5 px-4 flex items-center justify-around">
        
        {/* SEEKERS 3D BUTTON */}
        <button
          onClick={() => setActiveTab('seekers')}
          className="flex flex-col items-center gap-0.5 group focus:outline-none transition-transform active:translate-y-0.5"
          title="Seekers"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'seekers'
                ? 'bg-gradient-to-b from-sky-400 to-blue-600 text-white border-t border-white/60 shadow-[0_3px_0_0_#0369a1,0_6px_10px_rgba(2,132,199,0.35)] translate-y-0.5'
                : 'bg-gradient-to-b from-white to-slate-100 text-slate-700 border border-slate-200/90 shadow-[0_3px_0_0_#cbd5e1,0_4px_6px_rgba(0,0,0,0.05)] hover:from-slate-50 hover:to-slate-100'
            }`}
          >
            <Search className="w-4 h-4 stroke-[2.2] drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
          </div>
          <span
            className={`text-[9px] font-bold tracking-tight transition-colors ${
              activeTab === 'seekers' ? 'text-sky-600 font-black' : 'text-slate-600 group-hover:text-slate-900'
            }`}
          >
            Seekers
          </span>
        </button>

        {/* GIGS 3D BUTTON */}
        <button
          onClick={() => setActiveTab('gigs')}
          className="flex flex-col items-center gap-0.5 group focus:outline-none transition-transform active:translate-y-0.5"
          title="GiGs Map View"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'gigs'
                ? 'bg-gradient-to-b from-blue-500 to-indigo-700 text-white border-t border-white/60 shadow-[0_3px_0_0_#1e1b4b,0_6px_10px_rgba(37,99,235,0.35)] translate-y-0.5'
                : 'bg-gradient-to-b from-white to-slate-100 text-slate-700 border border-slate-200/90 shadow-[0_3px_0_0_#cbd5e1,0_4px_6px_rgba(0,0,0,0.05)] hover:from-slate-50 hover:to-slate-100'
            }`}
          >
            <Briefcase className="w-4 h-4 stroke-[2.2] drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
          </div>
          <span
            className={`text-[9px] font-bold tracking-tight transition-colors ${
              activeTab === 'gigs' ? 'text-blue-600 font-black' : 'text-slate-600 group-hover:text-slate-900'
            }`}
          >
            GiGs
          </span>
        </button>

        {/* PROFILE 3D BUTTON */}
        <button
          onClick={() => setActiveTab('profile')}
          className="flex flex-col items-center gap-0.5 group focus:outline-none transition-transform active:translate-y-0.5"
          title="Profile Setup"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'profile'
                ? 'bg-gradient-to-b from-purple-500 to-indigo-700 text-white border-t border-white/60 shadow-[0_3px_0_0_#3b0764,0_6px_10px_rgba(147,51,234,0.35)] translate-y-0.5'
                : 'bg-gradient-to-b from-white to-slate-100 text-slate-700 border border-slate-200/90 shadow-[0_3px_0_0_#cbd5e1,0_4px_6px_rgba(0,0,0,0.05)] hover:from-slate-50 hover:to-slate-100'
            }`}
          >
            {profileData.avatarImage ? (
              <img
                src={profileData.avatarImage}
                alt="Avatar"
                className="w-7 h-7 rounded-lg object-cover border border-white/40 shadow-inner"
              />
            ) : (
              <User className="w-4 h-4 stroke-[2.2] drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
            )}
          </div>
          <span
            className={`text-[9px] font-bold tracking-tight transition-colors ${
              activeTab === 'profile' ? 'text-purple-600 font-black' : 'text-slate-600 group-hover:text-slate-900'
            }`}
          >
            Profile
          </span>
        </button>

      </nav>

    </div>
  );
}
