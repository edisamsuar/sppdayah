import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { User, Phone, Camera, Save, Loader2 } from 'lucide-react';

export default function Profile() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        displayName: '',
        phoneNumber: '',
        photoURL: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser) return;
            const uid = auth.currentUser.uid;
            try {
                const docRef = doc(db, 'users', uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setData(docSnap.data());
                } else {
                    setData({
                        displayName: auth.currentUser.displayName || '',
                        phoneNumber: '',
                        photoURL: auth.currentUser.photoURL || ''
                    });
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        };
        fetchData();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Update Auth Profile
            await updateProfile(user, {
                displayName: data.displayName,
                photoURL: data.photoURL
            });

            // Update Firestore
            await setDoc(doc(db, 'users', user.uid), {
                displayName: data.displayName,
                phoneNumber: data.phoneNumber,
                photoURL: data.photoURL,
                updatedAt: serverTimestamp()
            }, { merge: true });

            alert('Profil berhasil diperbarui');
        } catch (error) {
            console.error("Error updating profile:", error);
            alert('Gagal memperbarui profil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Profil Admin</h1>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={data.displayName}
                                onChange={(e) => setData({ ...data, displayName: e.target.value })}
                                className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={data.phoneNumber}
                                onChange={(e) => setData({ ...data, phoneNumber: e.target.value })}
                                className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="628..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL Foto Profil</label>
                        <div className="relative">
                            <Camera className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={data.photoURL}
                                onChange={(e) => setData({ ...data, photoURL: e.target.value })}
                                className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="https://..."
                            />
                        </div>
                        {data.photoURL && (
                            <div className="mt-2">
                                <img src={data.photoURL} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-2 rounded-lg hover:bg-emerald-800 transition flex justify-center items-center space-x-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            <span>Simpan Profil</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
