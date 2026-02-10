import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { CLASS_OPTIONS, formatRupiah } from '../lib/utils';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AddSantriModal({ isOpen, onClose, onSuccess, studentToEdit }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nis: '',
        nama: '',
        kelas: CLASS_OPTIONS[0],
        alamat: '',
        namaOrangTua: '',
        noHp: '',
        initialSPP: '',
        initialCatering: ''
    });

    // Handle Edit Mode Population
    useEffect(() => {
        if (studentToEdit) {
            setFormData({
                nis: studentToEdit.nis || '',
                nama: studentToEdit.nama || '',
                kelas: studentToEdit.kelas || CLASS_OPTIONS[0],
                alamat: studentToEdit.alamat || '',
                namaOrangTua: studentToEdit.namaOrangTua || '',
                noHp: studentToEdit.noHp || '',
                initialSPP: '', // Reset bills on edit
                initialCatering: ''
            });
        } else {
            // Reset for Add Mode
            setFormData({
                nis: '',
                nama: '',
                kelas: CLASS_OPTIONS[0],
                alamat: '',
                namaOrangTua: '',
                noHp: '',
                initialSPP: '',
                initialCatering: ''
            });
        }
    }, [studentToEdit, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Enforce numeric only for NIS
        if (name === 'nis') {
            if (value && !/^\d+$/.test(value)) return;
        }

        setFormData({ ...formData, [name]: value });
    };

    const checkNisExists = async (nis) => {
        if (!nis) return false;
        const q = query(collection(db, 'students'), where('nis', '==', nis));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return false;

        // If editing, check if the found doc is NOT the current student
        if (studentToEdit) {
            return snapshot.docs.some(doc => doc.id !== studentToEdit.id);
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate NIS (Client side first)
        if (!formData.nis || formData.nis.trim() === '') {
            toast.error('NIS wajib diisi');
            return;
        }

        setLoading(true);

        try {
            // Check for duplicate NIS
            const isDuplicate = await checkNisExists(formData.nis);
            if (isDuplicate) {
                toast.error(`NIS ${formData.nis} sudah terdaftar. Gunakan NIS lain.`);
                setLoading(false);
                return;
            }

            let studentRefId;

            if (studentToEdit) {
                // UPDATE Existing Student
                const studentRef = doc(db, 'students', studentToEdit.id);
                await updateDoc(studentRef, {
                    nis: formData.nis,
                    nama: formData.nama,
                    kelas: formData.kelas,
                    alamat: formData.alamat,
                    namaOrangTua: formData.namaOrangTua,
                    noHp: formData.noHp,
                    updatedAt: serverTimestamp()
                });
                studentRefId = studentToEdit.id;
            } else {
                // ADD New Student
                const docRef = await addDoc(collection(db, 'students'), {
                    nis: formData.nis,
                    nama: formData.nama,
                    kelas: formData.kelas,
                    alamat: formData.alamat,
                    namaOrangTua: formData.namaOrangTua,
                    noHp: formData.noHp,
                    createdAt: serverTimestamp(),
                    isActive: true
                });
                studentRefId = docRef.id;
            }

            // Create Initial Bill if SPP or Catering is provided (Only for Add Mode typically, but let's allow it for Edit if user inputs it)
            // Ideally only on Add, but user might want to add a manual bill during edit? 
            // Let's allow it but maybe with a clear UI indication.
            const spp = Number(formData.initialSPP) || 0;
            const catering = Number(formData.initialCatering) || 0;

            if (spp > 0 || catering > 0) {
                const today = new Date();
                await addDoc(collection(db, 'bills'), {
                    studentId: studentRefId,
                    studentName: formData.nama,
                    studentNis: formData.nis,
                    studentClass: formData.kelas,
                    month: today.getMonth() + 1,
                    year: today.getFullYear(),
                    periodId: `MANUAL_${Date.now()}`, // Unique ID for manual/initial bills

                    sppAmount: spp,
                    cateringAmount: catering,
                    totalAmount: spp + catering,
                    description: studentToEdit ? 'Tagihan Tambahan (Edit)' : 'Tagihan Awal / Pendaftaran',

                    status: 'unpaid',
                    paidAt: null,
                    createdAt: serverTimestamp()
                });
            }

            setLoading(false);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving student: ", error);
            setLoading(false);
            toast.error(`Gagal menyimpan data: ${error.message}`);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={studentToEdit ? "Edit Data Santri" : "Tambah Santri Baru"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">NIS</label>
                        <input
                            type="text"
                            name="nis"
                            value={formData.nis}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            placeholder="NIS"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                        <select
                            name="kelas"
                            value={formData.kelas}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        >
                            {CLASS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                    <input
                        type="text"
                        name="nama"
                        value={formData.nama}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="Nama Santri"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Orang Tua</label>
                    <input
                        type="text"
                        name="namaOrangTua"
                        value={formData.namaOrangTua}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="Nama Orang Tua"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">No HP / WA (Opsional)</label>
                    <input
                        type="text"
                        name="noHp"
                        value={formData.noHp}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="08..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                    <textarea
                        name="alamat"
                        value={formData.alamat}
                        onChange={handleChange}
                        rows="2"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="Alamat Lengkap"
                        required
                    />
                </div>

                <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">{studentToEdit ? 'Tambah Tagihan Baru (Opsional)' : 'Atur Tagihan Awal (Opsional)'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tagihan SPP</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400 text-xs">Rp</span>
                                <input
                                    type="number"
                                    name="initialSPP"
                                    value={formData.initialSPP}
                                    onChange={handleChange}
                                    className="w-full pl-8 p-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tagihan Catering</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400 text-xs">Rp</span>
                                <input
                                    type="number"
                                    name="initialCatering"
                                    value={formData.initialCatering}
                                    onChange={handleChange}
                                    className="w-full pl-8 p-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                    {studentToEdit && <p className="text-xs text-amber-600 mt-2">*Isi hanya jika ingin menambahkan tagihan manual baru untuk santri ini.</p>}
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-2 rounded-lg hover:bg-emerald-800 transition disabled:opacity-50 flex justify-center items-center"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (studentToEdit ? 'Simpan Perubahan' : 'Simpan Data Santri')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
