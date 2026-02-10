import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Printer, Trash2 } from 'lucide-react';
import { formatRupiah, CLASS_OPTIONS } from '../lib/utils';
import toast from 'react-hot-toast';

export default function Reports() {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        class: '',
        status: 'unpaid' // 'unpaid', 'paid', 'all'
    });

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handlePrint = () => {
        window.print();
    }

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data laporan/tagihan ini? Data yang dihapus tidak dapat dikembalikan.')) {
            try {
                await deleteDoc(doc(db, 'bills', id));
                toast.success('Laporan berhasil dihapus');
                // Refresh data
                fetchReports();
            } catch (error) {
                console.error("Error deleting document: ", error);
                const msg = error.message || "";
                if (error.code === 'permission-denied' || msg.includes("Missing or insufficient permissions")) {
                    toast.error('GAGAL: Izin Ditolak. Hubungi Admin.');
                } else {
                    toast.error(`Gagal menghapus data: ${msg}`);
                }
            }
        }
    };

    // Helper to aggregate bills by student
    const aggregateBills = (rawBills) => {
        const studentMap = {};

        rawBills.forEach(bill => {
            if (!studentMap[bill.studentId]) {
                studentMap[bill.studentId] = {
                    studentId: bill.studentId,
                    studentName: bill.studentName,
                    studentClass: bill.studentClass,
                    totalDebt: 0,
                    totalSpp: 0,
                    totalCatering: 0,
                    bills: []
                };
            }

            const remaining = bill.totalAmount - (bill.amountPaid || 0);
            studentMap[bill.studentId].totalDebt += remaining;
            studentMap[bill.studentId].totalSpp += (bill.sppAmount || 0);
            studentMap[bill.studentId].totalCatering += (bill.cateringAmount || 0);
            studentMap[bill.studentId].bills.push(bill);
        });

        return Object.values(studentMap);
    };

    const fetchReports = async () => {
        setLoading(true);
        setBills([]);
        setSelectedStudent(null);
        try {
            const billsRef = collection(db, 'bills');
            const constraints = [];

            // If looking for "Unpaid" (Arrears), we typically want ALL history, not just this month.
            // But if user wants "Paid" or "All", they usually mean for a specific period.
            // User request: "pada tagihan belum lunas ubah jadi santri yang belum lunas... misal nunggak 3 bulan"
            // This implies for 'unpaid' mode, we should fetch EVERYTHING that is unpaid.

            if (filter.status === 'unpaid') {
                // Fetch ALL unpaid bills regardless of date
                constraints.push(where('status', '==', 'unpaid'));
            } else {
                // For 'paid' or 'all', respect the date filter
                constraints.push(where('month', '==', Number(filter.month)));
                constraints.push(where('year', '==', Number(filter.year)));
                if (filter.status !== 'all') {
                    constraints.push(where('status', '==', filter.status));
                }
            }

            const q = query(billsRef, ...constraints);
            const snapshot = await getDocs(q);
            let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Client-side filtering for Class
            if (filter.class) {
                data = data.filter(d => d.studentClass === filter.class);
            }

            // Client-side Sorting
            data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

            setBills(data);
        } catch (error) {
            console.error("Error fetching reports:", error);
            toast.error("Gagal memuat laporan");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [filter]);

    // Derived Display Data
    // If 'unpaid', we show Aggregated Student List.
    // If 'paid' or 'all', we show the standard Bill List (Monthly Report).
    const isArrearsView = filter.status === 'unpaid';
    const displayData = isArrearsView ? aggregateBills(bills) : bills;

    const openDetail = (student) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isArrearsView ? 'Laporan Tunggakan Santri' : 'Laporan Keuangan Bulanan'}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {isArrearsView
                            ? 'Daftar santri yang memiliki tunggakan pembayaran'
                            : 'Rekapitulasi pembayaran bulanan'}
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-emerald-800 transition"
                >
                    <Printer size={20} />
                    <span>Cetak Laporan</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 print:hidden">
                <select
                    value={filter.status}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    className="p-2 border border-gray-300 rounded-lg font-medium"
                >
                    <option value="unpaid">Santri Belum Lunas (Tunggakan)</option>
                    <option value="paid">Laporan Lunas (Bulanan)</option>
                    <option value="all">Semua Data (Bulanan)</option>
                </select>

                {/* Date filters only relevant if NOT in Arrears view (since Arrears shows all time) */}
                {!isArrearsView && (
                    <>
                        <select
                            value={filter.month}
                            onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                            className="p-2 border border-gray-300 rounded-lg"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select
                            value={filter.year}
                            onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                            className="p-2 border border-gray-300 rounded-lg"
                        >
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </>
                )}

                <select
                    value={filter.class}
                    onChange={(e) => setFilter({ ...filter, class: e.target.value })}
                    className="p-2 border border-gray-300 rounded-lg"
                >
                    <option value="">Semua Kelas</option>
                    {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Main Report Table */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0">
                <div className="hidden print:block text-center mb-8 border-b-2 border-gray-800 pb-4">
                    <h1 className="text-2xl font-bold uppercase">Dayah Madinatuddiniyah Babussalam</h1>
                    <p className="text-sm">
                        {isArrearsView ? 'Laporan Tunggakan Santri' : 'Laporan Pembayaran SPP & Catering'}
                    </p>
                    <p className="text-xs mt-1">
                        {!isArrearsView && `Periode: ${new Date(0, filter.month - 1).toLocaleString('id-ID', { month: 'long' })} ${filter.year} | `}
                        Kelas: {filter.class || 'Semua'}
                    </p>
                </div>

                <table className="w-full text-left text-sm text-gray-900 border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="py-2">No</th>
                            <th className="py-2">Nama Santri</th>
                            <th className="py-2">Kelas</th>
                            {isArrearsView ? (
                                // Columns for Arrears View
                                <>
                                    <th className="py-2 text-right">Total Tunggakan</th>
                                    <th className="py-2 text-center text-red-600 font-bold">Status</th>
                                    <th className="py-2 text-right print:hidden">Aksi</th>
                                </>
                            ) : (
                                // Columns for Standard View
                                <>
                                    <th className="py-2 text-right">SPP</th>
                                    <th className="py-2 text-right">Catering</th>
                                    <th className="py-2 text-right">Total</th>
                                    <th className="py-2 text-center">Status</th>
                                    <th className="py-2 text-right print:hidden">Aksi</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="8" className="py-8 text-center text-gray-500">Memuat data...</td></tr>
                        ) : displayData.length === 0 ? (
                            <tr><td colSpan="8" className="py-8 text-center text-gray-500">Tidak ada data</td></tr>
                        ) : (
                            displayData.map((item, index) => (
                                <tr key={isArrearsView ? item.studentId : item.id} className="hover:bg-gray-50">
                                    <td className="py-2">{index + 1}</td>
                                    <td className="py-2 font-medium">{item.studentName}</td>
                                    <td className="py-2">{item.studentClass}</td>

                                    {isArrearsView ? (
                                        // Row for Arrears Aggregation
                                        <>
                                            <td className="py-2 text-right font-bold text-red-600">
                                                {formatRupiah(item.totalDebt)}
                                            </td>
                                            <td className="py-2 text-center text-red-500 text-xs">
                                                Belum Lunas ({item.bills.length} Tagihan)
                                            </td>
                                            <td className="py-2 text-right print:hidden">
                                                <button
                                                    onClick={() => openDetail(item)}
                                                    className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded text-xs hover:bg-emerald-200 transition"
                                                >
                                                    Rincian
                                                </button>
                                            </td>
                                        </>
                                    ) : (
                                        // Row for Standard Report
                                        <>
                                            <td className="py-2 text-right">{formatRupiah(item.sppAmount)}</td>
                                            <td className="py-2 text-right">{formatRupiah(item.cateringAmount)}</td>
                                            <td className="py-2 text-right font-medium">{formatRupiah(item.totalAmount)}</td>
                                            <td className="py-2 text-center">
                                                {item.status === 'paid' ? (
                                                    <span className="text-emerald-600 font-bold">Lunas</span>
                                                ) : item.amountPaid > 0 ? (
                                                    <span className="text-amber-600 font-bold">Dicicil</span>
                                                ) : (
                                                    <span className="text-red-500">Belum</span>
                                                )}
                                            </td>
                                            <td className="py-2 text-right print:hidden">
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition"
                                                    title="Hapus Laporan/Tagihan ini"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-800 font-bold bg-gray-50">
                            <td colSpan="3" className="py-4 text-right">Grand Total:</td>
                            {isArrearsView ? (
                                <>
                                    <td className="py-4 text-right text-red-700 text-lg">
                                        {formatRupiah(displayData.reduce((sum, d) => sum + (d.totalDebt || 0), 0))}
                                    </td>
                                    <td colSpan="2"></td>
                                </>
                            ) : (
                                <>
                                    <td className="py-4 text-right text-gray-900">
                                        {formatRupiah(displayData.reduce((sum, b) => sum + (b.sppAmount || 0), 0))}
                                    </td>
                                    <td className="py-4 text-right text-gray-900">
                                        {formatRupiah(displayData.reduce((sum, b) => sum + (b.cateringAmount || 0), 0))}
                                    </td>
                                    <td className="py-4 text-right text-gray-900">
                                        {formatRupiah(displayData.reduce((sum, b) => sum + (b.totalAmount || 0), 0))}
                                    </td>
                                    <td colSpan="2"></td>
                                </>
                            )}
                        </tr>
                    </tfoot>
                </table>

                <div className="hidden print:flex justify-end mt-12">
                    <div className="text-center">
                        <p className="mb-16">Mengetahui, Bendahara</p>
                        <p className="font-bold underline">( ............................ )</p>
                    </div>
                </div>
            </div>

            {/* Rincian Modal */}
            {selectedStudent && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isModalOpen ? '' : 'hidden'}`}>
                    <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl z-10 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Rincian Tunggakan</h2>
                                <p className="text-gray-500">{selectedStudent.studentName} - {selectedStudent.studentClass}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700 sticky top-0">
                                    <tr>
                                        <th className="p-3">Bulan/Tahun</th>
                                        <th className="p-3">Keterangan</th>
                                        <th className="p-3 text-right">Total Tagihan</th>
                                        <th className="p-3 text-right">Sudah Bayar</th>
                                        <th className="p-3 text-right">Sisa (Tunggakan)</th>
                                        <th className="p-3">Tgl Bayar Terakhir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {selectedStudent.bills.map((bill) => {
                                        const remaining = bill.totalAmount - (bill.amountPaid || 0);
                                        return (
                                            <tr key={bill.id}>
                                                <td className="p-3 font-medium">{bill.month} / {bill.year}</td>
                                                <td className="p-3 text-gray-500">{bill.description}</td>
                                                <td className="p-3 text-right">{formatRupiah(bill.totalAmount)}</td>
                                                <td className="p-3 text-right text-emerald-600">
                                                    {bill.amountPaid > 0 ? formatRupiah(bill.amountPaid) : '-'}
                                                </td>
                                                <td className="p-3 text-right font-bold text-red-600">
                                                    {formatRupiah(remaining)}
                                                </td>
                                                <td className="p-3 text-xs text-gray-500">
                                                    {bill.lastPaymentAt?.seconds
                                                        ? new Date(bill.lastPaymentAt.seconds * 1000).toLocaleDateString('id-ID')
                                                        : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="border-t-2 border-gray-100 font-bold bg-gray-50">
                                    <tr>
                                        <td colSpan="4" className="p-3 text-right">Total Tunggakan:</td>
                                        <td className="p-3 text-right text-red-700 text-lg">
                                            {formatRupiah(selectedStudent.totalDebt)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
