const fs = require('fs');
const file = 'c:/Users/anasm/.gemini/antigravity/scratch/diwan-al-masri/client/src/pages/VouchersPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// fix the weird encoding
content = content.replace('category: \'Ù ÙˆØ§ØªÙŠØ±\'', 'category: \'فواتير\'');
content = content.replace('showToast(d.error || \'Ø®Ø·Ø£ Ù ÙŠ Ø§Ù„Ø¥Ø¶Ø§Ù Ø©\', \'error\')', 'showToast(d.error || \'خطأ في الإضافة\', \'error\')');
content = content.replace('showToast(\'ØªÙ…Øª Ø¥Ø¶Ø§Ù Ø© Ø§Ù„Ù Ø§ØªÙˆØ±Ø© Ù„Ù„Ù…ØµØ§Ø±ÙŠÙ  Ø¨Ù†Ø¬Ø§Ø­\')', 'showToast(\'تمت إضافة الفاتورة للمصاريف بنجاح\')');
content = content.replace('showToast(\'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø¥Ø¶Ø§Ù Ø©\', \'error\')', 'showToast(\'حدث خطأ أثناء الإضافة\', \'error\')');
content = content.replace('<h3>ðŸ“¤ Ø¥Ø¶Ø§Ù Ø© Ø§Ù„Ù Ø§ØªÙˆØ±Ø© Ù„Ù„Ù…ØµØ§Ø±ÙŠÙ </h3>', '<h3>📤 إضافة الفاتورة للمصاريف</h3>');

// Let's also do a fallback for the button replace using regex
const regexActions = /<button className="btn btn-secondary btn-sm" onClick=\{\(\) => openEditModal\(inv\)\} title="تعديل">✏️<\/button>\s*<button className="btn btn-danger btn-sm" onClick=\{\(\) => setDeleteConfirm\(inv\)\} title="حذف">🗑️<\/button>/;
const newActionsRegex = '<button className="btn btn-secondary btn-sm" onClick={() => openEditModal(inv)} title="تعديل">✏️</button>\n                        <button className="btn btn-sm" style={{ background: \'rgba(234,179,8,0.15)\', color: \'#ca8a04\', border: \'1px solid rgba(234,179,8,0.3)\', padding: \'4px 8px\', borderRadius: \'4px\', fontSize: \'13px\' }} onClick={() => setExpenseConfirm(inv)} title="إضافة للمصاريف">📤 مصروف</button>\n                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(inv)} title="حذف">🗑️</button>';

if (!content.includes('📤 مصروف') && regexActions.test(content)) {
    content = content.replace(regexActions, newActionsRegex);
    console.log('Button added via Regex successfully.');
} else if (content.includes('📤 مصروف')) {
    console.log('Button already exists in file.');
} else {
    console.log('Regex did not match.');
}

fs.writeFileSync(file, content, 'utf8');
