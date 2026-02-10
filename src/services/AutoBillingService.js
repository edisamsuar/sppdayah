import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

import toast from 'react-hot-toast';

export const checkAndGenerateBills = async () => {
    try {
        console.log("Checking for automatic bills generator...");

        // 1. Fetch Settings
        const settingsRef = doc(db, 'settings', 'fees');
        const settingsSnap = await getDoc(settingsRef);

        if (!settingsSnap.exists()) {
            console.log("No settings found, skipping auto-billing.");
            return;
        }

        const settings = settingsSnap.data();
        const billingDay = settings.billingDay;

        if (!billingDay) {
            console.log("Billing day not set.");
            return;
        }

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentYear = today.getFullYear();

        // 2. Check if today >= billingDay
        if (currentDay < billingDay) {
            console.log(`Not yet billing day. Today: ${currentDay}, Billing Day: ${billingDay}`);
            return;
        }

        // 3. Check System Status (to avoid duplicate generation for this month)
        // We use a unique ID for the monthly log: BILL_GENERATION_{MONTH}_{YEAR}
        const logId = `BILL_GENERATION_${currentMonth}_${currentYear}`;
        const logRef = doc(db, 'system_logs', logId);
        const logSnap = await getDoc(logRef);

        if (logSnap.exists()) {
            console.log("Bills already generated for this month.");
            return;
        }

        console.log("Starting automatic bill generation...");

        // 4. Fetch Active Students
        const studentsRef = collection(db, 'students');
        const qStudents = query(studentsRef, where('isActive', '==', true));
        const studentSnaps = await getDocs(qStudents);

        if (studentSnaps.empty) {
            console.log("No active students found.");
            return;
        }

        // 5. Batch Create Bills
        const batch = writeBatch(db);
        const billsRef = collection(db, 'bills');
        let billCount = 0;

        // Firestore batch limit is 500. If more students, we'd need to chunk it.
        // Assuming < 500 for now.

        studentSnaps.forEach((studentDoc) => {
            const student = studentDoc.data();
            const newBillRef = doc(billsRef); // Generate ID

            const spp = Number(settings.sppAmount) || 0;
            const catering = Number(settings.cateringAmount) || 0;

            batch.set(newBillRef, {
                studentId: studentDoc.id,
                studentName: student.nama,
                studentNis: student.nis,
                studentClass: student.kelas,
                month: currentMonth,
                year: currentYear,
                periodId: `${currentMonth}_${currentYear}`, // Unique Period ID

                sppAmount: spp,
                cateringAmount: catering,
                totalAmount: spp + catering,
                description: `Tagihan Bulan ${currentMonth}/${currentYear}`,

                status: 'unpaid',
                paidAt: null,
                createdAt: serverTimestamp()
            });

            billCount++;
        });

        // 6. Record System Log
        batch.set(logRef, {
            generatedAt: serverTimestamp(),
            month: currentMonth,
            year: currentYear,
            billCount: billCount,
            status: 'success'
        });

        await batch.commit();
        console.log(`Successfully generated ${billCount} bills.`);
        await batch.commit();
        console.log(`Successfully generated ${billCount} bills.`);
        toast.success(`Sistem Otomatis: ${billCount} Tagihan baru untuk bulan ini telah berhasil dibuat.`);

    } catch (error) {
        console.error("Error in auto-billing service:", error);
    }
};
