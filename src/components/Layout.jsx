import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    User,
    Bell,
    Calendar
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

import { checkAndGenerateBills } from '../services/AutoBillingService'; // Import Service

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [adminProfile, setAdminProfile] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Check for auto-billing on mount
    useEffect(() => {
        checkAndGenerateBills();
    }, []);

    // Handle scroll effect for header
    useEffect(() => {
        const handleScroll = () => {
            const mainElement = document.getElementById('main-content');
            if (mainElement) { // Check if main element exists
                setScrolled(mainElement.scrollTop > 20);
            }
        };

        // Attach scroll listener to the main content area (scrolling container)
        // We need to wait for render or use a ref, but ID selector is simple here
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.addEventListener('scroll', handleScroll);

        return () => {
            if (mainContent) mainContent.removeEventListener('scroll', handleScroll);
        }
    }, []);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Try fetching from firestore 'users' collection first
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setAdminProfile(userDoc.data());
                } else {
                    // Fallback to auth profile
                    setAdminProfile({
                        displayName: user.displayName || 'Admin',
                        photoURL: user.photoURL,
                        phoneNumber: user.phoneNumber
                    });
                }
            } else {
                setAdminProfile(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const getPageTitle = (pathname) => {
        switch (pathname) {
            case '/': return 'Pembayaran SPP dan Catering Dayah Madinatuddiniyah Babussalam';
            case '/santri': return 'Manajemen Santri';
            case '/pembayaran': return 'Pembayaran SPP';
            case '/laporan': return 'Laporan Keuangan';
            case '/pengaturan': return 'Pengaturan Aplikasi';
            case '/profil': return 'Profil Administrator';
            default: return 'MDDBBS';
        }
    };

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Data Santri', path: '/santri', icon: Users },
        { name: 'Pembayaran', path: '/pembayaran', icon: CreditCard },
        { name: 'Laporan', path: '/laporan', icon: FileText },
        { name: 'Pengaturan', path: '/pengaturan', icon: Settings },
    ];

    const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-30 w-64 bg-primary text-white transform transition-transform duration-300 lg:relative lg:translate-x-0 shadow-xl",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-emerald-800 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-bold text-amber-500 tracking-tight">MDDBBS Pay</h1>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Admin Profile Preview */}
                    {adminProfile && (
                        <div className="flex items-center gap-3 p-2 bg-emerald-800/50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-emerald-700 overflow-hidden border-2 border-amber-500 shadow-sm">
                                {adminProfile.photoURL ? (
                                    <img src={adminProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-emerald-100 font-bold">
                                        {adminProfile.displayName?.charAt(0).toUpperCase() || 'A'}
                                    </div>
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold truncate text-white">{adminProfile.displayName}</p>
                                <p className="text-xs text-emerald-300 truncate">Admin</p>
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) => cn(
                                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-emerald-800 text-white shadow-md border-r-4 border-amber-500 translate-x-1"
                                    : "text-emerald-100 hover:bg-emerald-800/50 hover:text-white hover:translate-x-1"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-emerald-800 space-y-2">
                    <NavLink
                        to="/profil"
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => cn(
                            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                            isActive
                                ? "bg-emerald-800 text-white shadow-md"
                                : "text-emerald-100 hover:bg-emerald-800/50 hover:text-white"
                        )}
                    >
                        <User size={20} />
                        <span className="font-medium">Profil Admin</span>
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-red-300 hover:bg-red-900/20 hover:text-red-200 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Keluar</span>
                    </button>
                </div>
            </div>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Enhanced Top Header */}
                <header className={cn(
                    "sticky top-0 z-20 px-6 py-4 flex items-center justify-between transition-all duration-300",
                    // Changed to primary color background for header as requested ("atur warna header")
                    // Using a gradient for a premium look
                    "bg-gradient-to-r from-emerald-900 to-emerald-800 shadow-md text-white"
                )}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/80 hover:text-white transition">
                            <Menu size={24} />
                        </button>

                        <div className="flex flex-col">
                            <h2 className="text-lg lg:text-xl font-bold tracking-wide text-amber-400">
                                {getPageTitle(location.pathname)}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Date - hidden on small mobile */}
                        <div className="hidden md:flex items-center text-emerald-100 bg-emerald-900/50 px-3 py-1.5 rounded-full border border-emerald-700/50">
                            <Calendar size={16} className="mr-2 text-emerald-400" />
                            <span className="text-xs font-medium">{today}</span>
                        </div>

                        {/* Notification Bell (Visual only) */}
                        <button className="relative p-2 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-full transition">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-emerald-900"></span>
                        </button>

                        {/* User Greeting - Desktop */}
                        <div className="hidden lg:flex flex-col text-right">
                            <span className="text-xs text-emerald-200">Selamat Datang,</span>
                            <span className="text-sm font-bold text-white">
                                {adminProfile?.displayName?.split(' ')[0] || 'Admin'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Main Scrollable Area */}
                <main
                    id="main-content"
                    className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth"
                    onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 10)}
                >
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
