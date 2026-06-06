// ======= المستخدمون =======
// ملاحظة أمنية: في بيئة الإنتاج يجب نقل التحقق للسيرفر
const users = { "11": "11", "hh": "00" };
let currentUser = localStorage.getItem('charcoal_db_user');

// ======= البيانات الافتراضية =======
let data = JSON.parse(localStorage.getItem('charcoal_db_v2')) || {
    stockQty: 0,
    avgPurchasePrice: 0,
    totalDamagesCost: 0,
    sales: [],
    damages: []
};

// تأكد من وجود مصفوفة damages
if (!data.damages) data.damages = [];

let firebaseDB = null;
initFirebase();

if (currentUser) showApp();

// ======= التنقل =======
function openSection(sectionId) {
    document.getElementById('mainMenu').style.display = 'none';
    const sections = document.getElementsByClassName('section-content');
    for (let s of sections) s.style.display = 'none';
    document.getElementById(sectionId).style.display = 'block';

    // تحديث البيانات عند فتح الأقسام
    if (sectionId === 'historySection') filterSales();
}

function goBack() {
    const sections = document.getElementsByClassName('section-content');
    for (let s of sections) s.style.display = 'none';
    document.getElementById('mainMenu').style.display = 'grid';
}

// ======= تسجيل الدخول =======
function login() {
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value;
    const errEl = document.getElementById('loginError');

    if (users[u] && users[u] === p) {
        localStorage.setItem('charcoal_db_user', u);
        currentUser = u;
        errEl.style.display = 'none';
        showApp();
    } else {
        errEl.style.display = 'block';
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    }
}

function togglePassword() {
    const passInput = document.getElementById('password');
    const isText = passInput.type === 'text';
    passInput.type = isText ? 'password' : 'text';
    document.getElementById('eyeIcon').innerHTML = isText
        ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
        : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
}

function logout() {
    localStorage.removeItem('charcoal_db_user');
    location.reload();
}

// ======= Firebase =======
function initFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyAIGarZ0y4-qQHoVDQY9DedRRuh14-Tc9M",
        authDomain: "my-work-ha.firebaseapp.com",
        projectId: "my-work-ha",
        storageBucket: "my-work-ha.firebasestorage.app",
        messagingSenderId: "1085899315475",
        appId: "1:1085899315475:web:692e5f8b862909a72ee2e6"
    };

    try {
        firebase.initializeApp(firebaseConfig);
        firebaseDB = firebase.firestore();
        console.log('Firebase initialized');
        // جلب البيانات من Firebase عند البدء
        loadFromFirebase();
    } catch (error) {
        console.warn('Firebase initialization failed:', error);
        setSyncStatus(false);
    }
}

function loadFromFirebase() {
    if (!firebaseDB) return;
    setSyncStatus(null); // loading

    firebaseDB.collection('salesApp').doc('state').get()
        .then(doc => {
            if (doc.exists) {
                const remoteData = doc.data();
                // استخدام البيانات الأحدث بناءً على عدد المبيعات
                if (remoteData && remoteData.sales &&
                    remoteData.sales.length >= data.sales.length) {
                    data = remoteData;
                    if (!data.damages) data.damages = [];
                    localStorage.setItem('charcoal_db_v2', JSON.stringify(data));
                    updateUI();
                }
                setSyncStatus(true);
            } else {
                setSyncStatus(true);
            }
        })
        .catch(err => {
            console.warn('Firebase load failed:', err);
            setSyncStatus(false);
        });
}

function syncDataToFirebase() {
    if (!firebaseDB) return;
    setSyncStatus(null);

    firebaseDB.collection('salesApp').doc('state').set(data)
        .then(() => {
            setSyncStatus(true);
        })
        .catch(error => {
            console.warn('Firebase sync failed:', error);
            setSyncStatus(false);
        });
}

function setSyncStatus(ok) {
    const badge = document.getElementById('syncStatus');
    const text = document.getElementById('syncText');
    if (!badge) return;
    if (ok === null) {
        badge.className = 'sync-badge sync-loading';
        text.textContent = 'جاري المزامنة...';
    } else if (ok) {
        badge.className = 'sync-badge sync-ok';
        text.textContent = 'متزامن';
    } else {
        badge.className = 'sync-badge sync-error';
        text.textContent = 'غير متزامن';
    }
}

// ======= عرض التطبيق =======
function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('currentUserDisplay').innerText = currentUser;
    updateUI();
}

// ======= حساب الفاتورة =======
function calcTotal() {
    const qty = parseFloat(document.getElementById('saleQty').value) || 0;
    const price = parseFloat(document.getElementById('salePrice').value) || 0;
    const total = qty * price;

    document.getElementById('totalPrice').value = total;
    document.getElementById('totalDisplayUI').innerHTML =
        `${total.toLocaleString()} <span style="font-size: 16px; color: var(--text-secondary);">دينار</span>`;

    calcRemaining();
}

// BUG FIX: حساب المتبقي تلقائياً عند تغيير المبلغ المستلم
function calcRemaining() {
    const total = parseFloat(document.getElementById('totalPrice').value) || 0;
    const paid = parseFloat(document.getElementById('paidAmount').value) || 0;
    const remaining = Math.max(0, total - paid);

    const remainingEl = document.getElementById('remainingAmount');
    remainingEl.value = remaining > 0 ? remaining.toLocaleString() + ' دينار' : 'لا يوجد دين';
    remainingEl.style.color = remaining > 0 ? 'var(--danger)' : 'var(--success)';
}

// ======= إضافة مخزون =======
function addStock() {
    const qty = parseFloat(document.getElementById('addQty').value);
    const cost = parseFloat(document.getElementById('addCost').value);

    if (!qty || !cost || qty <= 0 || cost <= 0) {
        return showToast('الرجاء إدخال بيانات صحيحة', 'error');
    }

    const totalCurrentValue = data.stockQty * data.avgPurchasePrice;
    const totalNewValue = qty * cost;
    const newTotalQty = data.stockQty + qty;

    data.avgPurchasePrice = (totalCurrentValue + totalNewValue) / newTotalQty;
    data.stockQty = newTotalQty;

    saveData();
    document.getElementById('addQty').value = '';
    document.getElementById('addCost').value = '';
    document.getElementById('currentAvgCost').value = '';
    showToast(`تم إضافة ${qty} كرتون للمخزون`, 'success');
}

// ======= إضافة فاتورة بيع =======
function addSale() {
    const name = document.getElementById('customerName').value.trim();
    const qty = parseFloat(document.getElementById('saleQty').value);
    const sellPrice = parseFloat(document.getElementById('salePrice').value);
    const total = parseFloat(document.getElementById('totalPrice').value);
    const paid = parseFloat(document.getElementById('paidAmount').value) || 0;
    const customerID = document.getElementById('customerID').value.trim();

    if (!name || !qty || !sellPrice) {
        return showToast('الرجاء استكمال بيانات الفاتورة (الاسم، الكمية، السعر)', 'error');
    }
    if (qty > data.stockQty) {
        return showToast(`الكمية المطلوبة (${qty}) تتجاوز المخزون المتوفر (${data.stockQty})`, 'error');
    }
    if (paid > total) {
        return showToast('المبلغ المستلم لا يمكن أن يتجاوز إجمالي الفاتورة', 'error');
    }

    const remaining = total - paid;
    const profit = (sellPrice - data.avgPurchasePrice) * qty;

    const sale = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ar-IQ'),
        customer: name,
        qty: qty,
        sellPrice: sellPrice,
        total: total,
        paid: paid,
        remaining: remaining,
        profit: profit,
        customerID: customerID
    };

    data.sales.push(sale);
    data.stockQty -= qty;

    saveData();

    // تنظيف الحقول
    ['customerName','saleQty','salePrice','totalPrice','paidAmount','customerID'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('remainingAmount').value = '';
    document.getElementById('totalDisplayUI').innerHTML =
        `0 <span style="font-size: 16px; color: var(--text-secondary);">دينار</span>`;

    showToast(`تم حفظ فاتورة ${name} بنجاح ✓`, 'success');
    goBack();
}

// ======= تسجيل تالف =======
function addDamage() {
    const qty = parseFloat(document.getElementById('damageQty').value);
    const reason = document.getElementById('damageReason').value.trim();

    if (!qty || qty <= 0) return showToast('الرجاء إدخال كمية صحيحة', 'error');
    if (qty > data.stockQty) return showToast('لا يوجد رصيد كافٍ في المخزون', 'error');

    const lossValue = qty * data.avgPurchasePrice;

    data.damages.push({
        id: Date.now(),
        date: new Date().toLocaleDateString('ar-IQ'),
        qty: qty,
        lossValue: lossValue,
        reason: reason || 'غير محدد'
    });

    data.stockQty -= qty;
    data.totalDamagesCost += lossValue;

    saveData();
    document.getElementById('damageQty').value = '';
    document.getElementById('damageReason').value = '';
    showToast(`تم تسجيل تالف ${qty} كرتون`, 'error');
}

// ======= تسديد دين =======
function payDebt(saleId) {
    const payInput = document.getElementById(`pay_${saleId}`).value;
    const payment = parseFloat(payInput);

    if (!payment || payment <= 0) return showToast('الرجاء إدخال مبلغ صحيح', 'error');

    const saleIndex = data.sales.findIndex(s => s.id === saleId);
    if (saleIndex !== -1) {
        if (payment > data.sales[saleIndex].remaining) {
            return showToast('المبلغ المدخل يتجاوز قيمة الدين المتبقي', 'error');
        }
        data.sales[saleIndex].paid += payment;
        data.sales[saleIndex].remaining -= payment;

        // تقريب لتجنب أخطاء الفاصلة العائمة
        data.sales[saleIndex].remaining = Math.round(data.sales[saleIndex].remaining * 100) / 100;

        saveData();
        showToast(`تم تسديد ${payment.toLocaleString()} دينار ✓`, 'success');
    }
}

// BUG FIX: حذف سجل مبيعات مع استعادة الكمية اختيارياً
function deleteSale(saleId) {
    const sale = data.sales.find(s => s.id === saleId);
    if (!sale) return;

    const restoreStock = confirm(`هل تريد حذف فاتورة "${sale.customer}"؟\n\nاضغط موافق لحذف الفاتورة واسترجاع ${sale.qty} كرتون للمخزون.\nاضغط إلغاء للتراجع.`);
    if (!restoreStock) return;

    data.sales = data.sales.filter(s => s.id !== saleId);
    data.stockQty += sale.qty; // استعادة الكمية للمخزون

    saveData();
    showToast('تم حذف الفاتورة واسترجاع الكمية للمخزون', 'success');
}

// ======= حفظ البيانات =======
function saveData() {
    localStorage.setItem('charcoal_db_v2', JSON.stringify(data));
    updateUI();
    syncDataToFirebase();
}

// ======= تحديث واجهة المستخدم =======
function updateUI() {
    // الأرقام الأساسية
    document.getElementById('stockTotalDisplay').innerText = data.stockQty.toLocaleString();
    document.getElementById('avgCostDisplay').innerText = Math.round(data.avgPurchasePrice).toLocaleString();
    document.getElementById('damagesTotalDisplay').innerText = Math.round(data.totalDamagesCost).toLocaleString();

    const headerStock = document.getElementById('headerStockDisplay');
    if (headerStock) headerStock.innerText = data.stockQty.toLocaleString();

    let totalDebts = 0;
    let totalProfits = 0;
    let totalRevenue = 0;

    data.sales.forEach(sale => {
        totalDebts += sale.remaining;
        totalProfits += sale.profit;
        totalRevenue += sale.total;
    });

    const netProfit = totalProfits - data.totalDamagesCost;

    document.getElementById('debtsTotalDisplay').innerText = Math.round(totalDebts).toLocaleString();
    document.getElementById('netProfitDisplay').innerText = Math.round(netProfit).toLocaleString();
    document.getElementById('totalSalesCountDisplay').innerText = data.sales.length.toLocaleString();
    document.getElementById('totalRevenueDisplay').innerText = Math.round(totalRevenue).toLocaleString();

    // جدول المبيعات
    renderSalesTable(data.sales);

    // جدول الديون
    renderDebtsTable();

    // جدول التوالف
    renderDamagesTable();
}

// ======= رسم جداول المبيعات =======
function renderSalesTable(salesArr) {
    let html = '';
    const reversed = [...salesArr].reverse();

    reversed.forEach(s => {
        html += `<tr>
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${escHtml(s.customer)}</div>
                <div style="font-size:12px; color:var(--text-secondary);">${s.date}</div>
            </td>
            <td>${s.qty}</td>
            <td>${s.total.toLocaleString()}</td>
            <td style="color:var(--success);">${s.paid.toLocaleString()}</td>
            <td style="color:${s.remaining > 0 ? 'var(--danger)' : 'var(--text-secondary)'}; font-weight:${s.remaining > 0 ? '700' : 'normal'};">
                ${s.remaining > 0 ? s.remaining.toLocaleString() : '✓'}
            </td>
            <td>${s.customerID ? escHtml(s.customerID) : '<span style="color:var(--text-secondary);">—</span>'}</td>
            <td>
                <button onclick="deleteSale(${s.id})" class="btn-delete" title="حذف الفاتورة">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
            </td>
        </tr>`;
    });

    if (!html) {
        html = '<tr><td colspan="7" style="text-align:center; color:var(--text-secondary); padding:30px;">لا توجد حركات بيع مسجلة</td></tr>';
    }
    document.getElementById('salesTableBody').innerHTML = html;
}

// ======= تصفية المبيعات بالبحث =======
function filterSales() {
    const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const filtered = query
        ? data.sales.filter(s => s.customer.toLowerCase().includes(query))
        : data.sales;
    renderSalesTable(filtered);
}

// ======= رسم جدول الديون =======
function renderDebtsTable() {
    let html = '';
    data.sales.forEach(s => {
        if (s.remaining > 0) {
            html += `<tr>
                <td>
                    <div style="font-weight:600; color:var(--text-primary);">${escHtml(s.customer)}</div>
                    <div style="font-size:12px; color:var(--text-secondary);">${s.date}</div>
                </td>
                <td style="color:var(--danger); font-weight:700;">${s.remaining.toLocaleString()}</td>
                <td><input type="number" id="pay_${s.id}" placeholder="المبلغ" style="padding:10px; margin:0;" min="1"></td>
                <td><button class="btn-success" style="padding:10px;" onclick="payDebt(${s.id})">تسديد</button></td>
                <td>${s.customerID ? `<a href="tel:${escHtml(s.customerID)}" style="color:var(--accent);">${escHtml(s.customerID)}</a>` : '<span style="color:var(--text-secondary);">—</span>'}</td>
            </tr>`;
        }
    });

    if (!html) {
        html = '<tr><td colspan="5" style="text-align:center; color:var(--success); padding:30px;">✓ لا توجد أرصدة مستحقة</td></tr>';
    }
    document.getElementById('debtsTableBody').innerHTML = html;
}

// ======= رسم جدول التوالف =======
function renderDamagesTable() {
    const tbody = document.getElementById('damagesTableBody');
    if (!tbody) return;

    let html = '';
    [...data.damages].reverse().forEach(d => {
        html += `<tr>
            <td>${d.date}</td>
            <td>${d.qty} كرتون</td>
            <td style="color:var(--danger);">${Math.round(d.lossValue).toLocaleString()} دينار</td>
            <td style="color:var(--text-secondary);">${escHtml(d.reason)}</td>
        </tr>`;
    });

    if (!html) {
        html = '<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding:30px;">لا توجد توالف مسجلة</td></tr>';
    }
    tbody.innerHTML = html;
}

// ======= إشعارات Toast =======
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.className = 'toast';
    }, 3500);
}

// ======= أمان: منع XSS =======
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
