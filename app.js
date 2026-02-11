function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
  document.getElementById(id).style.display = "block";
}
function registerUser() {
  const email = document.getElementById("registerEmail").value;
  const pass = document.getElementById("registerPassword").value;

  auth.createUserWithEmailAndPassword(email, pass)
    .then(() => showScreen("accountsScreen"))
    .catch(err => alert(err.message));
}

function loginUser() {
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPassword").value;

  auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
      loadAccounts();
      showScreen("accountsScreen");
    })
    .catch(err => alert(err.message));
}

function resetPassword() {
  const email = document.getElementById("resetEmail").value;

  auth.sendPasswordResetEmail(email)
    .then(() => alert("נשלח קישור שחזור"))
    .catch(err => alert(err.message));
}

function logoutUser() {
  auth.signOut().then(() => showScreen("loginScreen"));
}
function loadAccounts() {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("users")
    .doc(user.uid)
    .collection("accounts")
    .get()
    .then(snapshot => {
      console.log("חשבונות נטענו:", snapshot.size);
    });
}
function createNewAccount() {
  const name = prompt("שם החשבון:");
  if (!name) return;

  const type = prompt("סוג החשבון: business / home / investments");
  if (!type) return;

  const user = auth.currentUser;
  if (!user) return alert("לא מחובר");

  const accountId = Date.now().toString();

  db.collection("users")
    .doc(user.uid)
    .collection("accounts")
    .doc(accountId)
    .set({
      id: accountId,
      name: name,
      type: type,
      createdAt: new Date().toISOString()
    })
    .then(() => {
      alert("חשבון נוצר בהצלחה");
      loadAccounts();
    });
}
function openAccount(type) {
  if (type === "business") {
    showScreen("businessScreen");
    document.getElementById("businessName").innerText = "חשבון עסק";
  }

  if (type === "home") {
    showScreen("homeScreen");
    document.getElementById("homeName").innerText = "חשבון משק בית";
  }

  if (type === "investments") {
    showScreen("investScreen");
    document.getElementById("investName").innerText = "חשבון השקעות";
  }
}
function openBusinessSection(section) {
  const container = document.getElementById("businessContent");

  const template = document.getElementById(`business-${section}`);
  if (!template) {
    container.innerHTML = "<p>לא נמצא תוכן</p>";
    return;
  }

  container.innerHTML = template.innerHTML;

  if (section === "income") loadBusinessIncome();
  if (section === "expenses") loadBusinessExpenses();
}
function saveBusinessIncome() {
  const amount = Number(document.getElementById("bizIncomeAmount").value);
  const desc = document.getElementById("bizIncomeDesc").value;

  const user = auth.currentUser;
  if (!user) return;

  db.collection("users")
    .doc(user.uid)
    .collection("accounts")
    .doc("business") // בהמשך נחליף ל-ID אמיתי
    .collection("incomes")
    .add({
      amount,
      desc,
      date: new Date().toISOString()
    })
    .t²hen(() => loadBusinessIncome());
}
function loadBusinessIncome() {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("users")
    .doc(user.uid)
    .collection("accounts")
    .doc("business")
    .collection("incomes")
    .get()
    .then(snapshot => {
      const list = document.getElementById("bizIncomeList");
      list.innerHTML = "";

      snapshot.forEach(doc => {
        const data = doc.data();
        list.innerHTML += `<p>${data.desc} — ${data.amount} ₪</p>`;
      });
    });
}
// ------------------------------------------------------
// משקי בית (Households) + נתונים ראשוניים
// ------------------------------------------------------
let households = JSON.parse(localStorage.getItem("households") || "[]");
let currentHousehold = localStorage.getItem("currentHousehold") || null;

if (households.length === 0) {
  households = ["ברירת מחדל"];
  currentHousehold = "ברירת מחדל";
  localStorage.setItem("households", JSON.stringify(households));
  localStorage.setItem("currentHousehold", currentHousehold);
}

function keyFor(name) {
  return `${name}_${currentHousehold}`;
}

let incomes = JSON.parse(localStorage.getItem(keyFor("incomes")) || "[]");
let expenses = JSON.parse(localStorage.getItem(keyFor("expenses")) || "[]");
let inventory = JSON.parse(localStorage.getItem(keyFor("inventory")) || "[]");
let purchases = JSON.parse(localStorage.getItem(keyFor("purchases")) || "[]");

let categories = JSON.parse(localStorage.getItem(keyFor("categories")) || "[]");
let incomeCategories = JSON.parse(localStorage.getItem(keyFor("incomeCategories")) || "[]");

if (categories.length === 0) {
  categories = [
    { name: "שיווק ומכירות", sub: ["פרסום", "פייסבוק", "גוגל", "פליירים", "עמלות מכירה"] },
    { name: "תפעול", sub: ["דלק", "תחזוקה", "ציוד", "שכירות"] },
    { name: "שכר", sub: ["עובד 1", "עובד 2", "בונוסים"] },
    { name: "כללי", sub: ["הוצאות משרד", "קניות", "שונות"] },
    { name: "אחר", sub: ["אחר"] }
  ];
  localStorage.setItem(keyFor("categories"), JSON.stringify(categories));
}

if (incomeCategories.length === 0) {
  incomeCategories = [
    { name: "מכירות", sub: ["מוצרים", "שירותים", "אונליין", "אופליין"] },
    { name: "עמלות", sub: ["שותפים", "אפיקים חיצוניים"] },
    { name: "החזרי מס", sub: ["מע״מ", "מס הכנסה"] },
    { name: "אחר", sub: ["אחר"] }
  ];
  localStorage.setItem(keyFor("incomeCategories"), JSON.stringify(incomeCategories));
}

let editingExpenseId = null;

// גרפים
let incomeChartInstance = null;
let expenseChartInstance = null;
let categoryChartInstance = null;
let subCategoryChartInstance = null;

// ------------------------------------------------------
// עזר: שמירה/טעינה לפי משק בית
// ------------------------------------------------------
function reloadDataForCurrentHousehold() {
  incomes = JSON.parse(localStorage.getItem(keyFor("incomes")) || "[]");
  expenses = JSON.parse(localStorage.getItem(keyFor("expenses")) || "[]");
  inventory = JSON.parse(localStorage.getItem(keyFor("inventory")) || "[]");
  purchases = JSON.parse(localStorage.getItem(keyFor("purchases")) || "[]");
  categories = JSON.parse(localStorage.getItem(keyFor("categories")) || "[]");
  incomeCategories = JSON.parse(localStorage.getItem(keyFor("incomeCategories")) || "[]");

  if (categories.length === 0) {
    categories = [
      { name: "שיווק ומכירות", sub: ["פרסום", "פייסבוק", "גוגל", "פליירים", "עמלות מכירה"] },
      { name: "תפעול", sub: ["דלק", "תחזוקה", "ציוד", "שכירות"] },
      { name: "שכר", sub: ["עובד 1", "עובד 2", "בונוסים"] },
      { name: "כללי", sub: ["הוצאות משרד", "קניות", "שונות"] },
      { name: "אחר", sub: ["אחר"] }
    ];
    localStorage.setItem(keyFor("categories"), JSON.stringify(categories));
  }

  if (incomeCategories.length === 0) {
    incomeCategories = [
      { name: "מכירות", sub: ["מוצרים", "שירותים", "אונליין", "אופליין"] },
      { name: "עמלות", sub: ["שותפים", "אפיקים חיצוניים"] },
      { name: "החזרי מס", sub: ["מע״מ", "מס הכנסה"] },
      { name: "אחר", sub: ["אחר"] }
    ];
    localStorage.setItem(keyFor("incomeCategories"), JSON.stringify(incomeCategories));
  }

  updateHouseholdUI();
  updateCategorySelects();
  updateIncomeCategorySelects();
  updateDashboard();
  renderExpenses();
  renderIncomes();
  renderInventory();
  renderPurchases();
  renderCategoryManager();
}

// ------------------------------------------------------
// ניווט בין מסכים
// ------------------------------------------------------
function showSection(id) {
  document.querySelectorAll(".section").forEach(sec => sec.style.display = "none");
  document.getElementById(id).style.display = "block";

  if (id === "expenses") {
    updateCategorySelects();
    renderExpenses();
  }

  if (id === "categories") {
    renderCategoryManager();
  }

  if (id === "dashboard") {
    updateDashboard();
  }

  if (id === "income") {
    updateIncomeCategorySelects();
    renderIncomes();
  }

  if (id === "households") {
    updateHouseholdUI();
  }

  if (id === "reports") {
    // אפשר להוסיף לוגיקה אם צריך
  }
}

// ------------------------------------------------------
// משקי בית
// ------------------------------------------------------
function updateHouseholdUI() {
  const label = document.getElementById("currentHouseholdLabel");
  if (label) label.innerText = currentHousehold || "לא נבחר";

  const select = document.getElementById("householdSelect");
  if (select) {
    select.innerHTML = households.map(h => `<option value="${h}" ${h === currentHousehold ? "selected" : ""}>${h}</option>`).join("");
  }

  const list = document.getElementById("householdList");
  if (list) {
    list.innerHTML = households.map(h => `
      <div class="panel">
        <p>${h}</p>
      </div>
    `).join("");
  }
}

function addHousehold() {
  const nameInput = document.getElementById("newHouseholdName");
  const name = nameInput.value.trim();
  if (!name) return;

  if (!households.includes(name)) {
    households.push(name);
    localStorage.setItem("households", JSON.stringify(households));
  }

  currentHousehold = name;
  localStorage.setItem("currentHousehold", currentHousehold);

  nameInput.value = "";
  reloadDataForCurrentHousehold();
}

function changeHousehold() {
  const select = document.getElementById("householdSelect");
  if (!select) return;

  currentHousehold = select.value;
  localStorage.setItem("currentHousehold", currentHousehold);
  reloadDataForCurrentHousehold();
}

// ------------------------------------------------------
// הוספת הוצאה
// ------------------------------------------------------
function saveExpense() {
  const amount = Number(document.getElementById("expenseAmount").value);
  const desc = document.getElementById("expenseDesc").value.trim();
  const category = document.getElementById("expenseCategory").value;
  const sub = document.getElementById("expenseSubCategory").value;

  if (!amount || !desc || !category || !sub) {
    alert("נא למלא את כל השדות");
    return;
  }

  const expense = {
    id: editingExpenseId || Date.now(),
    amount,
    desc,
    category,
    sub,
    date: new Date().toISOString()
  };

  if (editingExpenseId) {
    expenses = expenses.map(e => e.id === editingExpenseId ? expense : e);
    editingExpenseId = null;
  } else {
    expenses.push(expense);
  }

  localStorage.setItem(keyFor("expenses"), JSON.stringify(expenses));
  renderExpenses();
  updateDashboard();
}

// ------------------------------------------------------
// הצגת הוצאות
// ------------------------------------------------------
function renderExpenses() {
  const list = document.getElementById("expenseList");
  if (!list) return;

  const filterCat = document.getElementById("filterCategory").value;
  const filterSub = document.getElementById("filterSubCategory").value;

  let filtered = expenses.slice();

  if (filterCat !== "all") filtered = filtered.filter(e => e.category === filterCat);
  if (filterSub !== "all") filtered = filtered.filter(e => e.sub === filterSub);

  list.innerHTML = filtered.map(e => {
    const d = new Date(e.date);
    const dateStr = d.toLocaleDateString("he-IL");
    return `
      <div class="expense-item panel">
        <p>${dateStr} — ${e.desc} (${e.category} / ${e.sub})</p>
        <p>${e.amount} ₪</p>
        <button class="ghost-btn small" onclick="editExpense(${e.id})">ערוך</button>
        <button class="ghost-btn small" onclick="deleteExpense(${e.id})">מחק</button>
      </div>
    `;
  }).join("");

  renderCategorySummary();
}

// ------------------------------------------------------
// עריכת הוצאה
// ------------------------------------------------------
function editExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;

  editingExpenseId = id;

  document.getElementById("expenseAmount").value = exp.amount;
  document.getElementById("expenseDesc").value = exp.desc;
  document.getElementById("expenseCategory").value = exp.category;

  updateSubCategorySelect("expenseSubCategory", exp.category);
  document.getElementById("expenseSubCategory").value = exp.sub;
}

// ------------------------------------------------------
// מחיקת הוצאה
// ------------------------------------------------------
function deleteExpense(id) {
  if (!confirm("למחוק הוצאה זו?")) return;

  expenses = expenses.filter(e => e.id !== id);
  localStorage.setItem(keyFor("expenses"), JSON.stringify(expenses));

  renderExpenses();
  updateDashboard();
}

// ------------------------------------------------------
// עדכון רשימות קטגוריות (הוצאות)
// ------------------------------------------------------
function updateCategorySelects() {
  const catSelect = document.getElementById("expenseCategory");
  const filterCat = document.getElementById("filterCategory");
  const filterSub = document.getElementById("filterSubCategory");

  if (catSelect) {
    catSelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  }

  if (filterCat) {
    filterCat.innerHTML = `<option value="all">הכול</option>` +
      categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  }

  if (catSelect) {
    updateSubCategorySelect("expenseSubCategory", catSelect.value);
  }

  if (filterSub) {
    filterSub.innerHTML = `<option value="all">הכול</option>`;
  }
}

// ------------------------------------------------------
// עדכון תתי־קטגוריות (הוצאות)
// ------------------------------------------------------
function updateSubCategorySelect(selectId, categoryName) {
  const select = document.getElementById(selectId);
  const cat = categories.find(c => c.name === categoryName);
  if (!select || !cat) return;

  select.innerHTML = cat.sub.map(s => `<option value="${s}">${s}</option>`).join("");
}

// ------------------------------------------------------
// סיכום לפי קטגוריות
// ------------------------------------------------------
function renderCategorySummary() {
  const body = document.getElementById("categorySummaryBody");
  if (!body) return;

  const summary = {};

  expenses.forEach(e => {
    const key = `${e.category}__${e.sub}`;
    summary[key] = (summary[key] || 0) + e.amount;
  });

  body.innerHTML = Object.entries(summary).map(([key, total]) => {
    const [cat, sub] = key.split("__");
    return `
      <tr>
        <td>${cat}</td>
        <td>${sub}</td>
        <td>${total} ₪</td>
      </tr>
    `;
  }).join("");
}

// ------------------------------------------------------
// דשבורד + סינון לפי חודש/שנה
// ------------------------------------------------------
function filterByMonthYear(list, month, year) {
  return list.filter(item => {
    const d = new Date(item.date);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();

    if (month !== "all" && Number(month) !== m) return false;
    if (year && Number(year) !== y) return false;
    return true;
  });
}

function updateDashboard() {
  const month = document.getElementById("dashboardMonth")?.value || "all";
  const year = document.getElementById("dashboardYear")?.value || "";

  const filteredIncomes = filterByMonthYear(incomes, month, year);
  const filteredExpenses = filterByMonthYear(expenses, month, year);

  const totalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalIncome - totalExpenses;

  document.getElementById("cardIncome").innerText = totalIncome + " ₪";
  document.getElementById("cardExpenses").innerText = totalExpenses + " ₪";
  document.getElementById("cardProfit").innerText = profit + " ₪";

  drawIncomeChart(filteredIncomes);
  drawExpenseChart(filteredExpenses);
  drawCategoryChart(filteredExpenses);
  drawSubCategoryChart(filteredExpenses);
}

// ------------------------------------------------------
// גרפים
// ------------------------------------------------------
function drawIncomeChart(data) {
  const ctx = document.getElementById("incomeChart");
  if (!ctx) return;

  if (incomeChartInstance) {
    incomeChartInstance.destroy();
  }

  incomeChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(i => new Date(i.date).toLocaleDateString("he-IL")),
      datasets: [{
        label: "הכנסות",
        data: data.map(i => i.amount),
        borderColor: "green",
        fill: false
      }]
    }
  });
}

function drawExpenseChart(data) {
  const ctx = document.getElementById("expenseChart");
  if (!ctx) return;

  if (expenseChartInstance) {
    expenseChartInstance.destroy();
  }

  expenseChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(e => new Date(e.date).toLocaleDateString("he-IL")),
      datasets: [{
        label: "הוצאות",
        data: data.map(e => e.amount),
        borderColor: "red",
        fill: false
      }]
    }
  });
}

function drawCategoryChart(data) {
  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const totals = {};
  data.forEach(e => totals[e.category] = (totals[e.category] || 0) + e.amount);

  categoryChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(totals),
      datasets: [{
        label: "סה״כ לפי קטגוריה",
        data: Object.values(totals),
        backgroundColor: "orange"
      }]
    }
  });
}

function drawSubCategoryChart(data) {
  const ctx = document.getElementById("subCategoryChart");
  if (!ctx) return;

  if (subCategoryChartInstance) {
    subCategoryChartInstance.destroy();
  }

  const totals = {};
  data.forEach(e => totals[e.sub] = (totals[e.sub] || 0) + e.amount);

  subCategoryChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(totals),
      datasets: [{
        label: "סה״כ לפי תת־קטגוריה",
        data: Object.values(totals),
        backgroundColor: "blue"
      }]
    }
  });
}

// ------------------------------------------------------
// מלאי
// ------------------------------------------------------
function addItem() {
  const name = document.getElementById("itemName").value.trim();
  const qty = Number(document.getElementById("itemQty").value);

  if (!name || !qty) return;

  inventory.push({ name, qty });
  localStorage.setItem(keyFor("inventory"), JSON.stringify(inventory));

  renderInventory();
}

function renderInventory() {
  const list = document.getElementById("inventoryList");
  if (!list) return;

  list.innerHTML = inventory.map(i => `<p>${i.name}: ${i.qty}</p>`).join("");
}

// ------------------------------------------------------
// רכש
// ------------------------------------------------------
function addPurchase() {
  const item = document.getElementById("purchaseItem").value.trim();
  const qty = Number(document.getElementById("purchaseQty").value);

  if (!item || !qty) return;

  purchases.push({ item, qty, date: new Date().toISOString() });
  localStorage.setItem(keyFor("purchases"), JSON.stringify(purchases));

  renderPurchases();
}

function renderPurchases() {
  const list = document.getElementById("purchaseList");
  if (!list) return;

  list.innerHTML = purchases.map(p => `
    <p>${new Date(p.date).toLocaleDateString("he-IL")} — ${p.item}: ${p.qty}</p>
  `).join("");
}

// ------------------------------------------------------
// דוחות
// ------------------------------------------------------
function showReports() {
  const div = document.getElementById("reportContent");
  if (!div) return;

  const month = document.getElementById("reportMonth").value;
  const year = document.getElementById("reportYear").value;
  const type = document.getElementById("reportType").value;

  const filteredIncomes = filterByMonthYear(incomes, month, year);
  const filteredExpenses = filterByMonthYear(expenses, month, year);

  if (type === "summary") {
    const totalIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const profit = totalIncome - totalExpenses;

    div.innerHTML = `
      <h3>סיכום הכנסות/הוצאות</h3>
      <p>סה״כ הכנסות: ${totalIncome} ₪</p>
      <p>סה״כ הוצאות: ${totalExpenses} ₪</p>
      <p>רווח נקי: ${profit} ₪</p>
    `;
  } else if (type === "categories") {
    const catTotals = {};
    filteredExpenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });

    div.innerHTML = `
      <h3>סיכום לפי קטגוריות</h3>
      ${Object.entries(catTotals).map(([cat, total]) => `<p>${cat}: ${total} ₪</p>`).join("")}
    `;
  } else if (type === "cashflow") {
    const all = [
      ...filteredIncomes.map(i => ({ type: "הכנסה", amount: i.amount, date: i.date, desc: i.desc })),
      ...filteredExpenses.map(e => ({ type: "הוצאה", amount: e.amount, date: e.date, desc: e.desc }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    div.innerHTML = `
      <h3>תזרים מזומנים</h3>
      ${all.map(r => `
        <p>${new Date(r.date).toLocaleDateString("he-IL")} — ${r.type}: ${r.desc} — ${r.amount} ₪</p>
      `).join("")}
    `;
  }
}

function downloadCSV() {
  let csv = "סוג,תיאור,סכום,תאריך,קטגוריה,תת קטגוריה\n";

  incomes.forEach(i => {
    csv += `הכנסה,${i.desc},${i.amount},${new Date(i.date).toLocaleDateString("he-IL")},${i.category || ""},${i.sub || ""}\n`;
  });
  expenses.forEach(e => {
    csv += `הוצאה,${e.desc},${e.amount},${new Date(e.date).toLocaleDateString("he-IL")},${e.category},${e.sub}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "report.csv";
  a.click();
}

function downloadTXT() {
  let txt = "דוח עסק\n\n";

  incomes.forEach(i => {
    txt += `הכנסה: ${i.desc} — ${i.amount} ₪ (${new Date(i.date).toLocaleDateString("he-IL")})\n`;
  });
  expenses.forEach(e => {
    txt += `הוצאה: ${e.desc} — ${e.amount} ₪ (${new Date(e.date).toLocaleDateString("he-IL")})\n`;
  });

  const blob = new Blob([txt], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "report.txt";
  a.click();
}

// ------------------------------------------------------
// קטגוריות (הוצאות)
// ------------------------------------------------------
function addCategory() {
  const name = document.getElementById("newCategoryName").value.trim();
  if (!name) return;

  categories.push({ name, sub: [] });
  localStorage.setItem(keyFor("categories"), JSON.stringify(categories));

  renderCategoryManager();
  updateCategorySelects();
}

function renderCategoryManager() {
  const div = document.getElementById("categoryManager");
  if (!div) return;

  div.innerHTML = categories.map(c => `
    <div class="panel">
      <h4>${c.name}</h4>
      <p>תתי־קטגוריות: ${c.sub.join(", ")}</p>
    </div>
  `).join("");
}

// ------------------------------------------------------
// הכנסות — קטגוריות ותתי־קטגוריות
// ------------------------------------------------------
function updateIncomeCategorySelects() {
  const catSelect = document.getElementById("incomeCategory");
  const subSelect = document.getElementById("incomeSubCategory");
  if (!catSelect || !subSelect) return;

  catSelect.innerHTML = incomeCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");

  const firstCat = incomeCategories[0];
  if (firstCat) {
    subSelect.innerHTML = firstCat.sub.map(s => `<option value="${s}">${s}</option>`).join("");
  }

  catSelect.onchange = () => {
    const cat = incomeCategories.find(c => c.name === catSelect.value);
    if (!cat) return;
    subSelect.innerHTML = cat.sub.map(s => `<option value="${s}">${s}</option>`).join("");
  };
}

function saveIncome() {
  const amount = Number(document.getElementById("incomeAmount").value);
  const desc = document.getElementById("incomeDesc").value.trim();
  const category = document.getElementById("incomeCategory").value;
  const sub = document.getElementById("incomeSubCategory").value;

  if (!amount || !desc || !category || !sub) {
    alert("נא למלא את כל השדות");
    return;
  }

  const income = {
    id: Date.now(),
    amount,
    desc,
    category,
    sub,
    date: new Date().toISOString()
  };

  incomes.push(income);
  localStorage.setItem(keyFor("incomes"), JSON.stringify(incomes));

  renderIncomes();
  updateDashboard();
}

function renderIncomes() {
  const list = document.getElementById("incomeList");
  if (!list) return;

  list.innerHTML = incomes.map(i => `
    <div class="panel">
      <p>${new Date(i.date).toLocaleDateString("he-IL")} — ${i.desc} (${i.category} / ${i.sub})</p>
      <p>${i.amount} ₪</p>
    </div>
  `).join("");
}

// ------------------------------------------------------
// הפעלה ראשונית
// ------------------------------------------------------
reloadDataForCurrentHousehold();
showSection("dashboard");
