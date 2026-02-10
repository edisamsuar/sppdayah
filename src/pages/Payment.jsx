import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Search, CreditCard, CheckCircle, Clock } from 'lucide-react';
import { formatRupiah, cn } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';
import toast from 'react-hot-toast';

export default function Payment() {
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [bills, setBills] = useState([]);
    const [studentInfo, setStudentInfo] = useState(null);
    const [allStudents, setAllStudents] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);

    // Load all students once for client-side search (better UX for small datasets < 2000 records)
    useEffect(() => {
        const loadStudents = async () => {
            try {
                const q = query(collection(db, 'students'));
                const snap = await getDocs(q);
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStudents(data);

                // Check if there is a studentId in URL to auto-load
                const paramId = searchParams.get('studentId');
                if (paramId) {
                    const found = data.find(s => s.id === paramId);
                    if (found) {
                        setStudentInfo(found);
                        setSearchTerm(found.nama);
                        fetchBills(found.id);
                    }
                }
            } catch (error) {
                console.error("Error loading students:", error);
                toast.error("Gagal memuat data santri");
            }
        };
        loadStudents();
    }, [searchParams]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        // Client-side fuzzy search
        const term = searchTerm.toLowerCase();
        const found = allStudents.find(s =>
            s.nama.toLowerCase().includes(term) ||
            (s.nis && s.nis.toLowerCase().includes(term))
        );

        if (found) {
            setStudentInfo(found);
            setSearchTerm(found.nama); // Auto-correct display to full name
            fetchBills(found.id);
        } else {
            toast.error('Santri tidak ditemukan');
            setStudentInfo(null);
            setBills([]);
        }
    };

    const fetchBills = async (studentId) => {
        setLoading(true);
        setBills([]);
        try {
            const billsRef = collection(db, 'bills');
            const qBills = query(
                billsRef,
                where('studentId', '==', studentId)
            );
            const billSnap = await getDocs(qBills);
            const billData = billSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort client-side to avoid needing a composite index immediately
            billData.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            setBills(billData);
        } catch (error) {
            console.error("Error fetching bills:", error);
            if (error.code === 'failed-precondition' && error.message.includes('index')) {
                toast.error("Sistem Membutuhkan Index Database. Cek Console.");
            } else {
                toast.error("Gagal memuat tagihan");
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentClick = (bill) => {
        setSelectedBill(bill);
    };

    const processPayment = async (billId, payAmount) => {
        try {
            const billRef = doc(db, 'bills', billId);
            const billDoc = bills.find(b => b.id === billId);

            const currentPaid = billDoc.amountPaid || 0;
            const newPaid = currentPaid + payAmount;
            const remaining = billDoc.totalAmount - newPaid;

            // Determine status: Paid if remaining <= 0, else keep partial (unpaid in filter but has amountPaid)
            const newStatus = remaining <= 0 ? 'paid' : 'unpaid';

            await updateDoc(billRef, {
                status: newStatus,
                amountPaid: newPaid,
                lastPaymentAt: serverTimestamp(),
                paidAt: newStatus === 'paid' ? serverTimestamp() : null
            });

            // Refresh list locally
            setBills(prev => prev.map(bill =>
                bill.id === billId ? {
                    ...bill,
                    status: newStatus,
                    amountPaid: newPaid,
                    lastPaymentAt: new Date()
                } : bill
            ));

            toast.success(`Pembayaran berhasil! Status: ${newStatus === 'paid' ? 'LUNAS' : 'BELUM LUNAS (Dicicil)'}`);

        } catch (error) {
            console.error("Error processing payment:", error);
            toast.error('Gagal memproses pembayaran');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Pembayaran</h1>
                <p className="text-gray-500 text-sm">Cari santri dan proses pembayaran tagihan</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="Cari Nama Santri atau NIS (Tidak harus lengkap)..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-emerald-800 transition font-medium"
                    >
                        {loading ? 'Memuat...' : 'Cari'}
                    </button>
                </form>
            </div>

            {studentInfo && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-emerald-200 text-emerald-800 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                        {studentInfo.nama.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-emerald-900">{studentInfo.nama}</h3>
                        <p className="text-sm text-emerald-700">NIS: {studentInfo.nis} | Kelas: {studentInfo.kelas}</p>
                    </div>
                </div>
            )}

            {bills.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-800">Riwayat Tagihan</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/50">
                                    <th className="p-4">Keterangan</th>
                                    <th className="p-4">Rincian</th>
                                    <th className="p-4">Total</th>
                                    <th className="p-4">Terbayar</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bills.map((bill) => (
                                    <tr key={bill.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium">
                                            {bill.description ? bill.description : `Bulan ${bill.month}/${bill.year}`}
                                        </td>
                                        <td className="p-4 space-y-1">
                                            {bill.sppAmount > 0 && (
                                                <div className="flex justify-between w-40 text-xs">
                                                    <span>SPP:</span>
                                                    <span>{formatRupiah(bill.sppAmount)}</span>
                                                </div>
                                            )}
                                            {bill.cateringAmount > 0 && (
                                                <div className="flex justify-between w-40 text-xs">
                                                    <span>Catering:</span>
                                                    <span>{formatRupiah(bill.cateringAmount)}</span>
                                                </div>
                                            )}
                                            {!bill.sppAmount && !bill.cateringAmount && (
                                                <div className="text-xs text-gray-500">Tagihan Lainnya</div>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-gray-900">{formatRupiah(bill.totalAmount)}</td>
                                        <td className="p-4 text-emerald-600 font-medium">
                                            {bill.amountPaid && bill.amountPaid > 0 ? formatRupiah(bill.amountPaid) : '-'}
                                        </td>
                                        <td className="p-4">
                                            {bill.status === 'paid' ? (
                                                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    <CheckCircle size={14} />
                                                    <span>Lunas</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                    <Clock size={14} />
                                                    <span>Belum Lunas</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {bill.status === 'unpaid' && (
                                                <button
                                                    onClick={() => {
                                                        handlePaymentClick(bill);
                                                    }}
                                                    className="bg-primary text-white px-4 py-1.5 rounded hover:bg-emerald-700 text-xs font-medium transition shadow-sm"
                                                >
                                                    Bayar Tagihan
                                                </button>
                                            )}
                                            {bill.status === 'paid' && (
                                                <div className="text-xs text-gray-400 font-medium">
                                                    Selesai
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : studentInfo ? (
                <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Tidak ada riwayat tagihan untuk santri ini.</p>
                </div>
            ) : null}

            <PaymentModal
                isOpen={!!selectedBill}
                onClose={() => setSelectedBill(null)}
                bill={selectedBill}
                onConfirm={processPayment}
            />
        </div>
    );
}
