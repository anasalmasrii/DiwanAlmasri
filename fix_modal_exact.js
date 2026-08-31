const fs = require('fs');
const file = 'c:/Users/anasm/.gemini/antigravity/scratch/diwan-al-masri/client/src/pages/VouchersPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const badTitle = 'ðŸ“¤ Ø¥Ø¶Ø§Ù Ø© Ø§Ù„Ù Ø§ØªÙˆØ±Ø© Ù„Ù„Ù…ØµØ§Ø±ÙŠÙ ';
const goodTitle = '📤 إضافة الفاتورة للمصاريف';

const badClose = 'âœ•';
const goodClose = '✕';

const badDesc = 'Ø³ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù…ØµØ±ÙˆÙ  Ø¬Ø¯ÙŠØ¯ Ø¨Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªØ§Ù„ÙŠØ©:';
const goodDesc = 'سيتم إنشاء مصروف جديد بالمعلومات التالية:';

const badLabel1 = 'Ø§Ù„Ø¨ÙŠØ§Ù†:';
const goodLabel1 = 'البيان:';

const badInvoice = 'Ù Ø§ØªÙˆØ±Ø©';
const goodInvoice = 'فاتورة';

const badDash = 'â€”';
const goodDash = '—';

const badLabel2 = 'Ø§Ù„Ù…Ø¨Ù„Øº:';
const goodLabel2 = 'المبلغ:';

const badCurrency = 'Ø¯.Ø£';
const goodCurrency = 'د.أ';

const badLabel3 = 'Ø§Ù„ØªØ§Ø±ÙŠØ®:';
const goodLabel3 = 'التاريخ:';

const badLabel4 = 'Ø§Ù„Ù Ø¦Ø©:';
const goodLabel4 = 'الفئة:';

const badCat = 'Ù ÙˆØ§ØªÙŠØ±';
const goodCat = 'فواتير';

const badBtnYes = 'âœ… Ù†Ø¹Ù…ØŒ Ø£Ø¶Ù  Ù„Ù„Ù…ØµØ§Ø±ÙŠÙ ';
const goodBtnYes = '✅ نعم، أضف للمصاريف';

const badBtnCancel = 'Ø¥Ù„ØºØ§Ø¡';
const goodBtnCancel = 'إلغاء';

content = content.replace(badTitle, goodTitle);
content = content.replace(badClose, goodClose);
content = content.replace(badDesc, goodDesc);
content = content.replace(badLabel1, goodLabel1);
content = content.replace(badInvoice, goodInvoice);
content = content.replace(badDash, goodDash);
content = content.replace(badDash, goodDash);
content = content.replace(badLabel2, goodLabel2);
content = content.replace(badCurrency, goodCurrency);
content = content.replace(badLabel3, goodLabel3);
content = content.replace(badDash, goodDash);
content = content.replace(badLabel4, goodLabel4);
content = content.replace(badCat, goodCat);
content = content.replace(badBtnYes, goodBtnYes);
content = content.replace(badBtnCancel, goodBtnCancel);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed mojibake via exact text replacement');
