import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { formatRupiah } from '../lib/utils';
import { Loader2 } from 'lucide-react';

import toast from 'react-hot-toast';

export default function PaymentModal({ isOpen, onClose, bill, onConfirm }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset amount when bill changes
    useEffect(() => {
        if (bill) {
            // Default to full amount if no previous payment, or remaining amount
            const remaining = bill.totalAmount - (bill.amountPaid || 0);
            setAmount(remaining.toString());
        }
    }, [bill]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) return toast.error('Jumlah pembayaran tidak valid');
        if (Number(amount) > remaining) return toast.error('Jumlah pembayaran melebihi sisa tagihan');

        setLoading(true);
        await onConfirm(bill.id, Number(amount));
        setLoading(false);
        onClose();
    };

    if (!bill) return null;

    const remaining = bill.totalAmount - (bill.amountPaid || 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Proses Pembayaran">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500">Keterangan Tagihan</p>
                    <p className="font-semibold text-gray-800">{bill.description || `Bulan ${bill.month}/${bill.year}`}</p>
                    <div className="flex justify-between mt-2 text-sm">
                        <span>Total Tagihan:</span>
                        <span className="font-bold">{formatRupiah(bill.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between mt-1 text-sm text-emerald-600">
                        <span>Sudah Dibayar:</span>
                        <span>{formatRupiah(bill.amountPaid || 0)}</span>
                    </div>
                    <div className="flex justify-between mt-1 text-sm text-red-600 border-t border-gray-200 pt-1">
                        <span>Sisa Tagihan:</span>
                        <span className="font-bold">{formatRupiah(remaining)}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Bayar</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm">Rp</span>
                        </div>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={remaining}
                            className="pl-10 w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-bold text-lg"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                    {/* Quick Amount Buttons */}
                    <div className="flex gap-2 mt-2">
                        <button
                            type="button"
                            onClick={() => setAmount(remaining.toString())}
                            className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full hover:bg-emerald-200 transition"
                        >
                            Bayar Lunas ({formatRupiah(remaining)})
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        *Jika pembayaran penuh ({formatRupiah(remaining)}), status akan menjadi LUNAS.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-2 rounded-lg hover:bg-emerald-800 transition disabled:opacity-50 flex justify-center items-center"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Konfirmasi Pembayaran'}
                </button>
            </form>
        </Modal>
    );
}
