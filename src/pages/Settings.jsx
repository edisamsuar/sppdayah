import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Save, DollarSign } from 'lucide-react';
import { formatRupiah } from '../lib/utils';

import toast from 'react-hot-toast';

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fees, setFees] = useState({
        sppAmount: '',
        cateringAmount: '',
        billingDay: ''
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'fees');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFees(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
                toast.error("Gagal memuat pengaturan");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await setDoc(doc(db, 'settings', 'fees'), {
                sppAmount: Number(fees.sppAmount),
                cateringAmount: Number(fees.cateringAmount),
                billingDay: Number(fees.billingDay),
                updatedAt: serverTimestamp()
            });
            toast.success('Pengaturan berhasil disimpan');
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Pengaturan Biaya</h1>
                <p className="text-gray-500 text-sm">Atur nominal SPP dan Catering bulanan</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Jatuh Tempo (Setiap Bulan)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        max="28"
                                        value={fees.billingDay || ''}
                                        onChange={(e) => setFees({ ...fees, billingDay: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        placeholder="Contoh: 10"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 text-sm">Tgl</span>
                                    </div>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Tagihan akan otomatis dibuat pada tanggal ini setiap bulannya.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Biaya SPP (Bulanan)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 text-sm">Rp</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={fees.sppAmount}
                                        onChange={(e) => setFees({ ...fees, sppAmount: e.target.value })}
                                        className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Preview: {fees.sppAmount ? formatRupiah(fees.sppAmount) : 'Rp 0'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Catering (Bulanan)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 text-sm">Rp</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={fees.cateringAmount}
                                        onChange={(e) => {
                                            // Ensure we check for non-empty string before converting to number for state if needed, 
                                            // but standard input behavior expects string. 
                                            // Let's keep it simple.
                                            setFees({ ...fees, cateringAmount: e.target.value })
                                        }}
                                        className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Preview: {fees.cateringAmount ? formatRupiah(fees.cateringAmount) : 'Rp 0'}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-emerald-800 transition shadow-sm font-medium flex items-center space-x-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                <span>Simpan Perubahan</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
