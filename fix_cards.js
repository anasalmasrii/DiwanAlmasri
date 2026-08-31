const fs = require('fs');
const file = 'c:/Users/anasm/.gemini/antigravity/scratch/diwan-al-masri/client/src/pages/VouchersPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldCards = `<div className="card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي سندات القبض</span>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--success)' }}>{totalReceipt.toLocaleString('en-US', { minimumFractionDigits: 3 })} د.أ</span>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي سندات الصرف</span>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--danger)' }}>{totalPayment.toLocaleString('en-US', { minimumFractionDigits: 3 })} د.أ</span>
        </div>`;

const newCards = `<div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>إجمالي سندات القبض</span>
          <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{totalReceipt.toLocaleString('en-US', { minimumFractionDigits: 3 })}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>د.أ</span>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>إجمالي سندات الصرف</span>
          <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{totalPayment.toLocaleString('en-US', { minimumFractionDigits: 3 })}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>د.أ</span>
          </div>
        </div>`;

if (content.includes(oldCards)) {
    content = content.replace(oldCards, newCards);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Cards fixed successfully.');
} else {
    console.log('Cards string not found, trying regex fallback...');
    // regex just in case spaces differ
    const regex = /<div className="card" style=\{\{ padding: '16px 20px' \}\}>\s*<span style=\{\{ fontSize: '0\.8rem', color: 'var\(--text-muted\)' \}\}>إجمالي سندات القبض<\/span>\s*<span style=\{\{ fontWeight: 700, fontSize: '1\.2rem', color: 'var\(--success\)' \}\}>\{totalReceipt\.toLocaleString\('en-US', \{ minimumFractionDigits: 3 \}\)\} د\.أ<\/span>\s*<\/div>\s*<div className="card" style=\{\{ padding: '16px 20px' \}\}>\s*<span style=\{\{ fontSize: '0\.8rem', color: 'var\(--text-muted\)' \}\}>إجمالي سندات الصرف<\/span>\s*<span style=\{\{ fontWeight: 700, fontSize: '1\.2rem', color: 'var\(--danger\)' \}\}>\{totalPayment\.toLocaleString\('en-US', \{ minimumFractionDigits: 3 \}\)\} د\.أ<\/span>\s*<\/div>/;
    if (regex.test(content)) {
        content = content.replace(regex, newCards);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Cards fixed via regex successfully.');
    } else {
        console.log('Regex did not match either.');
    }
}
