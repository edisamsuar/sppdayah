import { collection, getDocs, query, where, addDoc, serverTimestamp, getDoc, doc, setDoc } from 'firebase/firestore';

export async function generateMonthlyBills(db) {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();
    // Format periodId as YYYY-MM
    const periodId = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    console.log(`Checking bills for period: ${periodId}`);

    try {
        // 1. Check if bills already generated for this period
        const periodRef = doc(db, 'billing_periods', periodId);
        const periodSnap = await getDoc(periodRef);

        if (periodSnap.exists()) {
            console.log('Bills already generated for this period.');
            return;
        }

        // 2. Get fee settings
        const settingsRef = doc(db, 'settings', 'fees');
        const settingsSnap = await getDoc(settingsRef);

        if (!settingsSnap.exists()) {
            console.log('No fee settings found. Skipping bill generation.');
            return;
        }

        const { sppAmount, cateringAmount } = settingsSnap.data();

        if (!sppAmount && !cateringAmount) {
            console.log('SPP and Catering amounts are 0 or undefined.');
            return;
        }

        // 3. Get active students
        const studentsRef = collection(db, 'students');
        // Assuming all students in list are active for now, or filter by isActive if implemented
        const q = query(studentsRef);
        const studentsSnap = await getDocs(q);

        if (studentsSnap.empty) {
            console.log('No students found.');
            return;
        }

        console.log(`Generating bills for ${studentsSnap.size} students...`);

        // 4. Generate bills for each student
        const batchPromises = studentsSnap.docs.map(async (studentDoc) => {
            const student = studentDoc.data();
            // Only generate if student is active (default treat as active if field missing)
            if (student.isActive === false) return;

            await addDoc(collection(db, 'bills'), {
                studentId: studentDoc.id,
                studentName: student.nama,
                studentNis: student.nis || '',
                studentClass: student.kelas || '',
                month: currentMonth,
                year: currentYear,
                periodId: periodId,

                sppAmount: Number(sppAmount) || 0,
                cateringAmount: Number(cateringAmount) || 0,
                totalAmount: (Number(sppAmount) || 0) + (Number(cateringAmount) || 0),

                status: 'unpaid', // unpaid, paid
                paidAt: null,
                createdAt: serverTimestamp()
            });
        });

        await Promise.all(batchPromises);

        // 5. Mark period as generated
        await setDoc(periodRef, {
            generatedAt: serverTimestamp(),
            count: studentsSnap.size,
            month: currentMonth,
            year: currentYear
        });

        console.log('Bill generation complete.');

    } catch (error) {
        console.error("Error generating bills:", error);
    }
}
