import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Search, Trash2, Edit2, User, CreditCard } from 'lucide-react';
import AddSantriModal from '../components/AddSantriModal';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Santri() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleEdit = (student) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedStudent(null);
        setIsModalOpen(true);
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStudents(data);
        } catch (error) {
            console.error("Error fetching students: ", error);
            toast.error("Gagal memuat data santri");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data santri ini?')) {
            try {
                await deleteDoc(doc(db, 'students', id));
                toast.success('Data santri berhasil dihapus');
                fetchStudents();
            } catch (error) {
                console.error("Error deleting student: ", error);
                toast.error('Gagal menghapus data santri');
            }
        }
    };

    const filteredStudents = students.filter(student =>
        student.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.nis && student.nis.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.kelas && student.kelas.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Data Santri</h1>
                    <p className="text-gray-500 text-sm">Kelola data santri Dayah Madinatuddiniyah</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-emerald-800 transition shadow-sm"
                >
                    <Plus size={20} />
                    <span>Tambah Santri</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama, NIS, atau kelas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="p-4 w-12 text-center">No</th>
                                <th className="p-4">NIS</th>
                                <th className="p-4">Nama Santri</th>
                                <th className="p-4">Kelas</th>
                                <th className="p-4">Orang Tua</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">Memuat data...</td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">Belum ada data santri</td>
                                </tr>
                            ) : (
                                filteredStudents.map((student, index) => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-center">{index + 1}</td>
                                        <td className="p-4 font-mono text-gray-500">{student.nis}</td>
                                        <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">
                                                {student.nama.substring(0, 2)}
                                            </div>
                                            {student.nama}
                                        </td>
                                        <td className="p-4"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">{student.kelas}</span></td>
                                        <td className="p-4">{student.namaOrangTua}</td>
                                        <td className="p-4 text-right space-x-2 flex justify-end">
                                            <Link
                                                to={`/pembayaran?studentId=${student.id}`}
                                                className="p-1 px-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded text-xs font-medium flex items-center gap-1"
                                                title="Bayar Tagihan"
                                            >
                                                <CreditCard size={14} />
                                                Bayar
                                            </Link>
                                            <button
                                                onClick={() => handleEdit(student)}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Edit Data"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(student.id)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                title="Hapus"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddSantriModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchStudents}
                studentToEdit={selectedStudent}
            />
        </div>
    );
}
