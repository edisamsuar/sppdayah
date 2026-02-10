import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { Users, CreditCard, AlertCircle } from 'lucide-react';
import { formatRupiah, CLASS_OPTIONS } from '../lib/utils';
import { generateMonthlyBills } from '../lib/billing';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        unpaidBills: 0,
        totalUnpaidAmount: 0
    });

    const [classCounts, setClassCounts] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initDashboard = async () => {
            // 1. Trigger bill generation logic
            await generateMonthlyBills(db);

            // 2. Fetch stats
            try {
                // Students count
                const studColl = collection(db, 'students');
                const studSnapshot = await getCountFromServer(studColl);

                // Unpaid bills
                const billsColl = collection(db, 'bills');
                const qUnpaid = query(billsColl, where('status', '==', 'unpaid'));
                const billsSnapshot = await getDocs(qUnpaid);

                let totalUnpaid = 0;
                billsSnapshot.forEach(doc => {
                    totalUnpaid += (doc.data().totalAmount || 0);
                });

                // Class counts (client-side aggregation for MVP as Firestore count queries can be expensive if many)
                // Or specific queries
                const studDocs = await getDocs(studColl);
                const counts = {};
                CLASS_OPTIONS.forEach(c => counts[c] = 0);

                studDocs.forEach(doc => {
                    const data = doc.data();
                    if (data.kelas) {
                        counts[data.kelas] = (counts[data.kelas] || 0) + 1;
                    }
                });
                setClassCounts(counts);

                setStats({
                    totalStudents: studSnapshot.data().count,
                    unpaidBills: billsSnapshot.size,
                    totalUnpaidAmount: totalUnpaid
                });

            } catch (error) {
                console.error("Error loading dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        initDashboard();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Santri</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {loading ? '...' : stats.totalStudents}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-full">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Tagihan Belum Lunas</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {loading ? '...' : stats.unpaidBills}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Tunggakan</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {loading ? 'Rp ...' : formatRupiah(stats.totalUnpaidAmount)}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Rombel (Jumlah Santri per Kelas)</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {CLASS_OPTIONS.map((kelas) => (
                        <div key={kelas} className="bg-emerald-50 p-4 rounded-lg text-center border border-emerald-100 hover:bg-emerald-100 transition">
                            <span className="block text-emerald-600 text-sm mb-1">{kelas}</span>
                            <span className="text-2xl font-bold text-primary">
                                {loading ? '-' : (classCounts[kelas] || 0)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
