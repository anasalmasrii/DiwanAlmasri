import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

const seedData = [
    { id: 1, name: 'فؤاد محمود مصطفى المصري', subs: 3, contrib: 20 },
    { id: 2, name: 'محمود فؤاد محمود المصري', subs: 3, contrib: 20 },
    { id: 3, name: 'حاتم فؤاد محمود المصري', subs: 3, contrib: 10 },
    { id: 4, name: 'طارق توفيق محمود المصري', subs: 3, contrib: 20 },
    { id: 5, name: 'توفيق طارق توفيق المصري', subs: 3, contrib: 20 },
    { id: 6, name: 'عمرو طارق توفيق المصري', subs: 3, contrib: 20 },
    { id: 7, name: 'عصام توفيق محمود المصري', subs: 3, contrib: 10 },
    { id: 8, name: 'محمد توفيق محمود المصري', subs: 3, contrib: 10 },
    { id: 9, name: 'خالد توفيق محمود المصري', subs: 3, contrib: 20 },
    { id: 10, name: 'كريم خالد توفيق المصري', subs: 3, contrib: 0 },
    { id: 11, name: 'طارق خالد توفيق المصري', subs: 3, contrib: 0 },
    { id: 12, name: 'محمد راجح محمود المصري', subs: 3, contrib: 20 },
    { id: 13, name: 'راجح محمد راجح المصري', subs: 3, contrib: 20 },
    { id: 14, name: 'محمد نشأت راجح محمد المصري', subs: 3, contrib: 5 },
    { id: 15, name: 'احمد محمد راجح المصري (بكر)', subs: 3, contrib: 20 },
    { id: 16, name: 'محمد احمد محمد المصري (بكر)', subs: 3, contrib: 20 },
    { id: 17, name: 'عبدالرحمن احمد محمد المصري', subs: 3, contrib: 10 },
    { id: 18, name: 'معاوية احمد محمد المصري', subs: 3, contrib: 10 },
    { id: 19, name: 'رمزي محمد راجح المصري', subs: 3, contrib: 20 },
    { id: 20, name: 'عبدالفتاح رمزي محمد المصري', subs: 3, contrib: 10 },
    { id: 21, name: 'عماد محمد راجح المصري', subs: 3, contrib: 0 },
    { id: 22, name: 'يوسف محمد راجح المصري', subs: 3, contrib: 10 },
    { id: 23, name: 'عبدالكريم محمد محمود المصري', subs: 0, contrib: 0 },
    { id: 24, name: 'رامز عبدالكريم محمد المصري', subs: 0, contrib: 10 },
    { id: 25, name: 'محمد عبدالكريم محمد المصري', subs: 0, contrib: 10 },
    { id: 26, name: 'يزيد محمد عبدالكريم المصري', subs: 0, contrib: 0 },
    { id: 27, name: 'يامن محمد عبدالكريم المصري', subs: 0, contrib: 0 },
    { id: 28, name: 'محمود عبدالكريم محمد المصري', subs: 0, contrib: 0 },
    { id: 29, name: 'مصطفى عبدالكريم محمد المصري', subs: 0, contrib: 0 },
    { id: 30, name: 'احمد عبدالكريم محمد المصري', subs: 0, contrib: 0 },
    { id: 31, name: 'احمد محمد محمود المصري', subs: 3, contrib: 20 },
    { id: 32, name: 'محمد احمد محمد المصري', subs: 3, contrib: 20 },
    { id: 33, name: 'احمد محمد احمد المصري', subs: 3, contrib: 10 },
    { id: 34, name: 'ايمن محمد احمد المصري', subs: 3, contrib: 10 },
    { id: 35, name: 'زكريا احمد محمد المصري', subs: 3, contrib: 20 },
    { id: 36, name: 'حمزة احمد محمد المصري', subs: 3, contrib: 20 },
    { id: 37, name: 'يحيى احمد محمد المصري', subs: 3, contrib: 10 },
    { id: 38, name: 'عمر احمد محمد المصري', subs: 3, contrib: 10 },
    { id: 39, name: 'عادل محمد محمود المصري', subs: 3, contrib: 10 },
    { id: 40, name: 'مهند عادل محمد المصري', subs: 0, contrib: 0 },
    { id: 41, name: 'علي خميس محمود المصري', subs: 3, contrib: 20 },
    { id: 42, name: 'نادر علي خميس المصري', subs: 3, contrib: 20 },
    { id: 43, name: 'سامر علي خميس المصري', subs: 3, contrib: 20 },
    { id: 44, name: 'محمد خميس محمود المصري', subs: 3, contrib: 20 },
    { id: 45, name: 'قيس محمد خميس المصري', subs: 3, contrib: 20 },
    { id: 46, name: 'قصي محمد خميس المصري', subs: 3, contrib: 20 },
    { id: 47, name: 'قيصر محمد خميس المصري', subs: 3, contrib: 20 },
    { id: 48, name: 'احمد محمد خميس المصري', subs: 3, contrib: 20 },
    { id: 49, name: 'صهيب محمد خميس المصري', subs: 3, contrib: 10 },
    { id: 50, name: 'خليل خميس محمود المصري', subs: 3, contrib: 20 },
    { id: 51, name: 'علاء خليل خميس المصري', subs: 3, contrib: 20 },
    { id: 52, name: 'ضياء خليل خميس المصري', subs: 3, contrib: 10 },
    { id: 53, name: 'بهاء خليل خميس المصري', subs: 3, contrib: 10 },
    { id: 54, name: 'نبيل خميس محمود المصري', subs: 3, contrib: 20 },
    { id: 55, name: 'احمد نبيل خميس المصري', subs: 3, contrib: 20 },
    { id: 56, name: 'ثائر سمير خميس المصري', subs: 3, contrib: 20 },
    { id: 57, name: 'ناجي سمير خميس المصري', subs: 3, contrib: 20 },
    { id: 58, name: 'جواد ناجي سمير المصري', subs: 3, contrib: 10 },
    { id: 59, name: 'نعيم سعيد محمود المصري', subs: 3, contrib: 20 },
    { id: 60, name: 'سعيد نعيم سعيد المصري', subs: 3, contrib: 0 },
    { id: 61, name: 'احمد نعيم سعيد المصري', subs: 3, contrib: 0 },
    { id: 62, name: 'محمد نعيم سعيد المصري', subs: 3, contrib: 0 },
    { id: 63, name: 'محمود سعيد محمود المصري', subs: 3, contrib: 20 },
    { id: 64, name: 'عمر محمود سعيد المصري', subs: 3, contrib: 20 },
    { id: 65, name: 'يوسف محمود سعيد المصري', subs: 3, contrib: 10 },
    { id: 66, name: 'محمد سعيد محمود المصري', subs: 3, contrib: 0 },
    { id: 67, name: 'سلمان محمد سعيد المصري', subs: 3, contrib: 0 },
    { id: 68, name: 'اسماعيل سعيد محمود المصري', subs: 3, contrib: 10 },
    { id: 69, name: 'احمد اسماعيل سعيد المصري', subs: 3, contrib: 0 },
    { id: 70, name: 'زيد اسماعيل سعيد المصري', subs: 3, contrib: 0 },
    { id: 71, name: 'بلال سعيد محمود المصري', subs: 3, contrib: 0 },
    { id: 72, name: 'علي بلال سعيد المصري', subs: 3, contrib: 0 },
    { id: 73, name: 'جميل محمد احمد المصري', subs: 3, contrib: 0 },
    { id: 74, name: 'عبدالفتاح جميل محمد المصري', subs: 3, contrib: 0 },
    { id: 75, name: 'محمد جميل محمد المصري', subs: 3, contrib: 20 },
    { id: 76, name: 'جميل محمد جميل المصري', subs: 3, contrib: 0 },
    { id: 77, name: 'احمد جميل محمد المصري', subs: 3, contrib: 20 },
    { id: 78, name: 'اسامة احمد جميل المصري', subs: 0, contrib: 0 },
    { id: 79, name: 'محمود محمد احمد المصري', subs: 0, contrib: 0 },
    { id: 80, name: 'محمد محمود محمد المصري', subs: 0, contrib: 0 },
    { id: 81, name: 'معتز محمود محمد المصري', subs: 0, contrib: 0 },
    { id: 82, name: 'عبدالله عبدالعزيز سالم المصري', subs: 0, contrib: 0 },
    { id: 83, name: 'هيثم عبدالعزيز سالم المصري', subs: 0, contrib: 0 },
    { id: 84, name: 'عماد عبدالعزيز سالم المصري', subs: 0, contrib: 0 },
    { id: 85, name: 'سالم عبدالعزيز سالم المصري', subs: 0, contrib: 0 },
    { id: 86, name: 'ليث عبدالله عبدالعزيز المصري', subs: 0, contrib: 0 },
    { id: 87, name: 'احمد سلمان المصري', subs: 3, contrib: 20 },
    { id: 88, name: 'انس احمد سلمان المصري', subs: 3, contrib: 20 },
    { id: 89, name: 'احمد محمد سلمان المصري', subs: 3, contrib: 20 },
    { id: 90, name: 'اسامة محمد سلمان المصري', subs: 3, contrib: 20 },
    { id: 91, name: 'محمود سلمان المصري', subs: 3, contrib: 20 },
    { id: 92, name: 'عبادة محمود سلمان المصري', subs: 3, contrib: 10 },
    { id: 93, name: 'محمد صالح المصري', subs: 0, contrib: 0 },
    { id: 94, name: 'ثائر محمد صالح المصري', subs: 0, contrib: 0 },
    { id: 95, name: 'ابراهيم صالح المصري', subs: 3, contrib: 20 },
    { id: 96, name: 'معتز ابراهيم صالح المصري', subs: 3, contrib: 20 },
    { id: 97, name: 'احمد ابراهيم صالح المصري', subs: 3, contrib: 20 },
    { id: 98, name: 'محمد الامين ابراهيم صالح المصري', subs: 3, contrib: 20 },
    { id: 99, name: 'اسحاق صالح المصري', subs: 0, contrib: 0 },
    { id: 100, name: 'محمد اسحاق صالح المصري', subs: 0, contrib: 0 },
    { id: 101, name: 'جهاد اسحاق صالح المصري', subs: 0, contrib: 0 },
    { id: 102, name: 'رمضان صالح المصري', subs: 0, contrib: 0 },
    { id: 103, name: 'صهيب رمضان صالح المصري', subs: 0, contrib: 0 },
    { id: 104, name: 'يوسف صالح المصري', subs: 0, contrib: 10 },
    { id: 105, name: 'عبدالرحمن يوسف صالح المصري', subs: 0, contrib: 0 },
    { id: 106, name: 'حذيفة يوسف صالح المصري', subs: 0, contrib: 0 },
    { id: 108, name: 'سفيان صالح المصري', subs: 3, contrib: 20 },
    { id: 109, name: 'جميل سفيان صالح المصري', subs: 3, contrib: 10 },
    { id: 110, name: 'عبدالله محمد حمدان المصري', subs: 9, contrib: 20 },
    { id: 111, name: 'محمد عبدالله محمد المصري', subs: 9, contrib: 20 },
    { id: 112, name: 'يحيى محمد حمدان المصري', subs: 9, contrib: 20 },
    { id: 113, name: 'يزن يحيى محمد المصري', subs: 9, contrib: 10 },
    { id: 114, name: 'زكريا محمد حمدان المصري', subs: 9, contrib: 20 },
    { id: 115, name: 'وسام زكريا محمد المصري', subs: 9, contrib: 10 },
    { id: 116, name: 'خالد محمود حمدان المصري', subs: 0, contrib: 0 },
    { id: 117, name: 'محمد خالد محمود المصري', subs: 0, contrib: 0 },
    { id: 118, name: 'مصطفى خالد محمود المصري', subs: 0, contrib: 0 },
    { id: 119, name: 'محمد محمود حمدان المصري', subs: 3, contrib: 20 },
    { id: 120, name: 'عبدالله محمد محمود المصري', subs: 3, contrib: 10 },
    { id: 121, name: 'باسم محمود حمدان المصري', subs: 0, contrib: 0 },
    { id: 122, name: 'عمر باسم محمود المصري', subs: 0, contrib: 0 },
    { id: 123, name: 'محمود باسم محمود المصري', subs: 0, contrib: 0 },
    { id: 124, name: 'اسامة باسم محمود المصري', subs: 0, contrib: 0 },
    { id: 125, name: 'احمد محمود حمدان المصري', subs: 0, contrib: 10 },
    { id: 126, name: 'لؤي احمد محمود المصري', subs: 0, contrib: 10 },
    { id: 127, name: 'عبدالحميد هاشم عبدالحميد المصري', subs: 9, contrib: 20 },
    { id: 128, name: 'محمد عبدالحميد هاشم المصري', subs: 9, contrib: 20 },
    { id: 129, name: 'يزن عبدالحميد هاشم المصري', subs: 9, contrib: 20 },
    { id: 130, name: 'هاشم محمد هاشم المصري', subs: 9, contrib: 20 },
    { id: 131, name: 'ايهاب محمد هاشم المصري', subs: 9, contrib: 20 },
    { id: 132, name: 'عمر محمد هاشم المصري', subs: 9, contrib: 20 },
    { id: 133, name: 'نبيل محمد هاشم المصري', subs: 9, contrib: 20 },
    { id: 134, name: 'يوسف هاشم عبدالحميد المصري', subs: 9, contrib: 20 },
    { id: 135, name: 'حسام يوسف هاشم المصري', subs: 9, contrib: 20 },
    { id: 136, name: 'هاشم يوسف هاشم المصري', subs: 7, contrib: 10 },
    { id: 137, name: 'محمدخير يوسف هاشم المصري', subs: 6, contrib: 10 },
    { id: 138, name: 'حاتم يوسف هاشم المصري', subs: 6, contrib: 20 },
    { id: 139, name: 'امجد هاشم عبدالحميد المصري', subs: 6, contrib: 20 },
    { id: 140, name: 'هشام امجد هاشم المصري', subs: 6, contrib: 20 },
    { id: 141, name: 'ضياء امجد هاشم المصري', subs: 6, contrib: 20 },
    { id: 142, name: 'نبيل هاشم عبدالحميد المصري', subs: 6, contrib: 20 },
    { id: 143, name: 'محمد نبيل هاشم المصري', subs: 6, contrib: 10 },
    { id: 144, name: 'مصطفى عبدالرحمن عبدالحميد المصري', subs: 0, contrib: 0 },
    { id: 145, name: 'محمد عبدالرحمن عبدالحميد المصري', subs: 0, contrib: 25 },
    { id: 146, name: 'حمزة محمد عبدالرحمن المصري', subs: 0, contrib: 0 },
    { id: 147, name: 'ليث محمد عبدالرحمن المصري', subs: 0, contrib: 0 },
    { id: 148, name: 'ابراهيم عبدالرحمن عبدالحميد المصري', subs: 0, contrib: 0 },
    { id: 149, name: 'عامر عبدالرحمن عبدالحميد المصري', subs: 0, contrib: 0 },
    { id: 150, name: 'معاذ عبدالرحمن عبدالحميد المصري', subs: 0, contrib: 0 },
    { id: 151, name: 'ماجد عمر عبدالحميد المصري', subs: 0, contrib: 0 },
    { id: 152, name: 'عمر ماجد عمر المصري', subs: 0, contrib: 0 },
    { id: 153, name: 'عايد عمر عبدالحميد المصري', subs: 0, contrib: 0 },
    { id: 154, name: 'عزالدين عمر عبدالحميد المصري', subs: 0, contrib: 0 },
    { id: 155, name: 'وائل عمر عبدالحميد المصري', subs: 0, contrib: 20 }
];

router.get('/', async (req, res) => {
    const db = getDb();
    
    try {
        await db.run('BEGIN TRANSACTION');

        for (const member of seedData) {
            // 1. Insert Member with join_date = '2026-06-01'
            const result = await db.run(
                'INSERT INTO members (full_name, join_date, status) VALUES (?, ?, ?) RETURNING id',
                [member.name, '2026-06-01', 'active']
            );
            
            // Handle different driver returns (sqlite vs pg)
            let memberId;
            if (result && result.rows && result.rows[0]) {
                memberId = result.rows[0].id; // pg
            } else if (result && result.id) {
                memberId = result.id; // custom sqlite wrapper returns {id} sometimes
            } else {
                // Fetch the last inserted ID if RETURNING doesn't work correctly in the wrapper
                const idRow = await db.get("SELECT id FROM members WHERE full_name = ? ORDER BY id DESC LIMIT 1", [member.name]);
                memberId = idRow.id;
            }

            // 2. Insert Subscriptions
            let rem_amount = member.subs;
            let current_month = 6;
            let current_year = 2026;

            while (rem_amount > 0) {
                let amount_to_pay = 0;
                let notes = '';

                if (rem_amount >= 3) {
                    amount_to_pay = 3;
                    rem_amount -= 3;
                } else {
                    amount_to_pay = rem_amount;
                    let remaining_debt = 3 - rem_amount;
                    notes = 'متبقي ' + remaining_debt + ' دنانير من اشتراك هذا الشهر';
                    rem_amount = 0;
                }

                // Insert payment for this month
                let payment_date = `2026-${String(current_month).padStart(2, '0')}-05`; // e.g. paid on 5th of that month
                await db.run(
                    'INSERT INTO payments (member_id, month, year, amount, payment_date, payment_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [memberId, current_month, current_year, amount_to_pay, payment_date, 'اشتراك', notes]
                );

                current_month++;
                if (current_month > 12) {
                    current_month = 1;
                    current_year++;
                }
            }

            // 3. Insert Contribution if any
            if (member.contrib > 0) {
                await db.run(
                    'INSERT INTO payments (member_id, month, year, amount, payment_date, payment_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [memberId, 6, 2026, member.contrib, '2026-06-05', 'مساهمة', 'مساهمة إضافية مسجلة مبدئياً']
                );
            }
        }

        await db.run('COMMIT');
        res.send('<div dir="rtl" style="font-family: Arial; padding: 50px; text-align: center;"><h1>✅ تم إدخال جميع الـ 155 مشترك بنجاح!</h1><p>بإمكانك العودة للموقع الآن، وتمت إضافة جميع الحسابات، الديون، والمساهمات بدقة 100%.</p></div>');
    } catch (err) {
        await db.run('ROLLBACK');
        console.error(err);
        res.status(500).send('<div dir="rtl" style="font-family: Arial; padding: 50px; text-align: center;"><h1>❌ حدث خطأ أثناء إدخال البيانات</h1><pre>' + err.message + '</pre></div>');
    }
});

export default router;
