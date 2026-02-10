// ------------------------------------------------------
// נתונים ראשוניים
// ------------------------------------------------------
let incomes = JSON.parse(localStorage.getItem("incomes") || "[]");
let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
let inventory = JSON.parse(localStorage.getItem("inventory") || "[]");
let purchases = JSON.parse(localStorage.getItem("purchases") || "[]");

let categories = JSON.parse(localStorage.getItem("categories") || "[]");

if (categories.length === 0) {
  categories = [
    { name: "שיווק ומכירות", sub: ["פרסום", "פייסבוק", "גוגל", "פליירים", "עמלות מכירה"] },
    { name: "תפעול", sub: ["דלק", "תחזוקה", "ציוד", "שכירות"] },
    { name: "שכר", sub: ["עובד 1", "עובד 2", "בונוסים"] },
    { name: "כללי", sub: ["הוצאות משרד", "קניות", "שונות"] },
    { name: "אחר", sub: ["אחר"] }
  ];
  localStorage.setItem("categories", JSON.stringify(categories));
}

let editingExpenseId = null;

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
    renderIncomes();
  }
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
    date: new Date().toLocaleDateString("he-IL")
  };

  if (editingExpenseId) {
    expenses = expenses.map(e => e.id === editingExpenseId ? expense : e);
    editingExpenseId = null;
  } else {
    expenses.push(expense);
  }

  localStorage.setItem("expenses", JSON.stringify(expenses));
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

  let filtered = expenses;

  if (filterCat !== "all") filtered = filtered.filter(e => e.category === filterCat);
  if (filterSub !== "all") filtered = filtered.filter(e => e.sub === filterSub);

  list.innerHTML = filtered.map(e => `
    <div class="expense-item panel">
      <p>${e.date} — ${e.desc} (${e.category} / ${e.sub})</p>
      <p>${e.amount} ₪</p>
      <button class="ghost-btn small" onclick="editExpense(${e.id})">ערוך</button>
      <button class="ghost-btn small" onclick="deleteExpense(${e.id})">מחק</button>
    </div>
  `).join("");

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
  localStorage.setItem("expenses", JSON.stringify(expenses));

  renderExpenses();
  updateDashboard();
}

// ------------------------------------------------------
// עדכון רשימות קטגוריות
// ------------------------------------------------------
function updateCategorySelects() {
  const catSelect = document.getElementById("expenseCategory");
  const filterCat = document.getElementById("filterCategory");
  const filterSub = document.getElementById("filterSubCategory");

  catSelect.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");

  filterCat.innerHTML = `<option value="all">הכול</option>` +
    categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");

  updateSubCategorySelect("expenseSubCategory", catSelect.value);

  filterSub.innerHTML = `<option value="all">הכול</option>`;
}

// ------------------------------------------------------
// עדכון תתי־קטגוריות
// ------------------------------------------------------
function updateSubCategorySelect(selectId, categoryName) {
  const select = document.getElementById(selectId);
  const cat = categories.find(c => c.name === categoryName);
  if (!cat) return;

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
// דשבורד
// ------------------------------------------------------
function updateDashboard() {
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalIncome - totalExpenses;

  document.getElementById("cardIncome").innerText = totalIncome + " ₪";
  document.getElementById("cardExpenses").innerText = totalExpenses + " ₪";
  document.getElementById("cardProfit").innerText = profit + " ₪";

  drawIncomeChart();
  drawExpenseChart();
  drawCategoryChart();
  drawSubCategoryChart();
}

// ------------------------------------------------------
// גרפים
// ------------------------------------------------------
function drawIncomeChart() {
  const ctx = document.getElementById("incomeChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "line",
    data: {
      labels: incomes.map(i => i.date),
      datasets: [{
        label: "הכנסות",
        data: incomes.map(i => i.amount),
        borderColor: "green",
        fill: false
      }]
    }
  });
}

function drawExpenseChart() {
  const ctx = document.getElementById("expenseChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "line",
    data: {
      labels: expenses.map(e => e.date),
      datasets: [{
        label: "הוצאות",
        data: expenses.map(e => e.amount),
        borderColor: "red",
        fill: false
      }]
    }
  });
}

function drawCategoryChart() {
  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;

  const totals = {};
  expenses.forEach(e => totals[e.category] = (totals[e.category] || 0) + e.amount);

  new Chart(ctx, {
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

function drawSubCategoryChart() {
  const ctx = document.getElementById("subCategoryChart");
  if (!ctx) return;

  const totals = {};
  expenses.forEach(e => totals[e.sub] = (totals[e.sub] || 0) + e.amount);

  new Chart(ctx, {
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
  localStorage.setItem("inventory", JSON.stringify(inventory));

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

  purchases.push({ item, qty, date: new Date().toLocaleDateString("he-IL") });
  localStorage.setItem("purchases", JSON.stringify(purchases));

  renderPurchases();
}

function renderPurchases() {
  const list = document.getElementById("purchaseList");
  if (!list) return;

  list.innerHTML = purchases.map(p => `<p>${p.date} — ${p.item}: ${p.qty}</p>`).join("");
}

// ------------------------------------------------------
// דוחות
// ------------------------------------------------------
function showReports() {
  const div = document.getElementById("reportContent");
  if (!div) return;

  div.innerHTML = `
    <h3>הכנסות</h3>
    ${incomes.map(i => `<p>${i.date} — ${i.desc}: ${i.amount} ₪</p>`).join("")}

    <h3>הוצאות</h3>
    ${expenses.map(e => `<p>${e.date} — ${e.desc}: ${e.amount} ₪</p>`).join("")}
  `;
}

function downloadCSV() {
  let csv = "סוג,תיאור,סכום,תאריך\n";

  incomes.forEach(i => csv += `הכנסה,${i.desc},${i.amount},${i.date}\n`);
  expenses.forEach(e => csv += `הוצאה,${e.desc},${e.amount},${e.date}\n`);

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "report.csv";
  a.click();
}

// ------------------------------------------------------
// קטגוריות
// ------------------------------------------------------
function addCategory() {
  const name = document.getElementById("newCategoryName").value.trim();
  if (!name) return;

  categories.push({ name, sub: [] });
  localStorage.setItem("categories", JSON.stringify(categories));

  renderCategoryManager();
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
// הכנסות — חדש!
// ------------------------------------------------------
function saveIncome() {
  const amount = Number(document.getElementById("incomeAmount").value);
  const desc = document.getElementById("incomeDesc").value.trim();

  if (!amount || !desc) {
    alert("נא למלא את כל השדות");
    return;
  }

  const income = {
    id: Date.now(),
    amount,
    desc,
    date: new Date().toLocaleDateString("he-IL")
  };

  incomes.push(income);
  localStorage.setItem("incomes", JSON.stringify(incomes));

  renderIncomes();
  updateDashboard();
}

function renderIncomes() {
  const list = document.getElementById("incomeList");
  if (!list) return;

  list.innerHTML = incomes.map(i => `
    <div class="panel">
      <p>${i.date} — ${i.desc}</p>
      <p>${i.amount} ₪</p>
    </div>
  `).join("");
}

// ------------------------------------------------
