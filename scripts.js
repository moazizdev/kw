const csvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTJUb4YPJoURYx0PodrANsKqu42k61PsGV2F4KsqMNWKAkKHwuszAGHyFH92d0WIu3LKt6rtb7jsKV-/pub?output=csv";

const billCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8uqH4eGPe9dJZo-y18XJu0kpJWs5xvOyqy6NZVPuv3OLiKlhFa8sp9_O4xKzB6flpSv0RcOcvxhiL/pubhtml";

// Detect if this is a curl request (no user agent or contains curl)
function isCurlRequest() {
  return !navigator.userAgent || navigator.userAgent.includes("curl");
}

// Cost calculation function same for both languages
function calculateCost(kWh) {
  let cost = 0;
  let tiers = [
    { from: 0, to: 50, price: 68 },
    { from: 51, to: 100, price: 78 },
    { from: 101, to: 200, price: 95 },
    { from: 201, to: 350, price: 155 },
    { from: 351, to: 650, price: 195 },
    { from: 651, to: 1000, price: 210 },
  ];

  for (const tier of tiers) {
    if (kWh <= 0) break;
    const rangeStart = tier.from;
    const rangeEnd = tier.to;
    const unitsInTier = Math.min(kWh, rangeEnd - rangeStart + 1);
    if (unitsInTier > 0) {
      cost += unitsInTier * tier.price;
      kWh -= unitsInTier;
    }
  }

  return cost * 0.01; // Convert cents to EGP
}

// Category function for Arabic and English
function getCategoryAr(kWh) {
  if (kWh <= 50) return "الشريحة الأولى";
  if (kWh <= 100) return "الشريحة الثانية";
  if (kWh <= 200) return "الشريحة الثالثة";
  if (kWh <= 350) return "الشريحة الرابعة";
  if (kWh <= 650) return "الشريحة الخامسة";
  if (kWh <= 1000) return "الشريحة السادسة";
  return "الشريحة السابعة";
}

function getCategoryEn(kWh) {
  if (kWh <= 50) return "Tier 1";
  if (kWh <= 100) return "Tier 2";
  if (kWh <= 200) return "Tier 3";
  if (kWh <= 350) return "Tier 4";
  if (kWh <= 650) return "Tier 5";
  if (kWh <= 1000) return "Tier 6";
  return "Tier 7";
}

// Logging helpers
function logAr(line) {
  document.getElementById("terminal-ar").textContent += "\n" + line;
}

function logEn(line) {
  document.getElementById("terminal-en").textContent += "\n" + line;
}

// Render average per day table in Arabic
function displayAveragePerDayAr(data) {
  let tableHtml =
    "<table><thead><tr><th>#</th><th>التاريخ والوقت</th><th>القراءة</th><th>الفارق الزمني (ساعات)</th><th>المعدل اليومي (كيلوواط/ساعة)</th><th>التكلفة اليومية</th></tr></thead><tbody>";
  let terminalOutput =
    "> متوسط الاستهلاك اليومي\n---------------------------\n";
  
  const startIndex = Math.max(0, data.length - 21);
  
  for (let i = startIndex; i < data.length - 1; i++) {
    const row = data[i];
    const nextRow = data[i + 1];
    if (nextRow) {
      const hoursDiff = (nextRow.timestamp - row.timestamp) / (1000 * 60 * 60);
      const daysDiff = hoursDiff / 24;
      const kWhUsage = nextRow.reading - row.reading;
      const avgPerDay = kWhUsage / daysDiff;
      const dailyCost = calculateCost(kWhUsage);

      if (isCurlRequest()) {
        terminalOutput += `#${i + 1} التاريخ: ${row.timestamp.toLocaleString(
          "ar-EG"
        )} القراءة: ${row.reading} المعدل اليومي: ${avgPerDay.toFixed(
          2
        )} كيلوواط\n`;
      } else {
        tableHtml += `<tr>
            <td>${i + 1}</td>
            <td>${row.timestamp.toLocaleString("ar-EG")}</td>
            <td>${row.reading}</td>
            <td>${hoursDiff.toFixed(1)}</td>
            <td>${avgPerDay.toFixed(2)}</td>
            <td>${dailyCost.toFixed(2)} جنيه</td>
          </tr>`;
      }
    }
  }
  if (isCurlRequest()) {
    logAr(terminalOutput);
  } else {
    tableHtml += "</tbody></table>";
    document.getElementById("terminal-ar").innerHTML += tableHtml;
  }
}

// Render average per day table in English
function displayAveragePerDayEn(data) {
  let tableHtml =
    "<table><thead><tr><th>#</th><th>Date & Time</th><th>Reading</th><th>Time Diff (hrs)</th><th>Avg. per Day (kWh)</th><th>Daily Cost</th></tr></thead><tbody>";
  let terminalOutput = "> Average Usage Per Day\n---------------------------\n";
  
  const startIndex = Math.max(0, data.length - 21);
  
  for (let i = startIndex; i < data.length - 1; i++) {
    const row = data[i];
    const nextRow = data[i + 1];
    if (nextRow) {
      const hoursDiff = (nextRow.timestamp - row.timestamp) / (1000 * 60 * 60);
      const daysDiff = hoursDiff / 24;
      const kWhUsage = nextRow.reading - row.reading;
      const avgPerDay = kWhUsage / daysDiff;
      const dailyCost = calculateCost(kWhUsage);

      if (isCurlRequest()) {
        terminalOutput += `#${i + 1} Date: ${row.timestamp.toLocaleString(
          "en-US"
        )} Reading: ${row.reading} Avg. per Day: ${avgPerDay.toFixed(2)} kWh\n`;
      } else {
        tableHtml += `<tr>
            <td>${i + 1}</td>
            <td>${row.timestamp.toLocaleString("en-US")}</td>
            <td>${row.reading}</td>
            <td>${hoursDiff.toFixed(1)}</td>
            <td>${avgPerDay.toFixed(2)}</td>
            <td>${dailyCost.toFixed(2)} EGP</td>
          </tr>`;
      }
    }
  }
  if (isCurlRequest()) {
    logEn(terminalOutput);
  } else {
    tableHtml += "</tbody></table>";
    document.getElementById("terminal-en").innerHTML += tableHtml;
  }
}

// Load and process CSV data for Arabic
function loadArabicData() {
  document.getElementById("terminal-ar").innerHTML = 
    "> جاري تحميل بيانات استهلاك الكهرباء...";
  fetch(csvUrl)
    .then((response) => response.text())
    .then((csvText) => {
      const parsed = Papa.parse(csvText, { header: true });
      const data = parsed.data
        .filter((row) => row["date time"]?.trim() && row["reading"]?.trim())
        .map((row) => ({
          timestamp: new Date(row["date time"].trim()),
          reading: parseInt(row["reading"].trim()),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last30DaysData = data.filter((row) => row.timestamp >= last30Days);

      if (last30DaysData.length < 2) {
        logAr("> لا توجد بيانات كافية للشهر الماضي.");
        return;
      }

      const first = last30DaysData[0];
      const last = last30DaysData[last30DaysData.length - 1];
      const totalUsage = last.reading - first.reading;

      if (totalUsage <= 0) {
        logAr("> بيانات الاستهلاك غير صالحة.");
        hideLoading();
        return;
      }

      const timeDiff = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
      const daysDiff = timeDiff / 24;
      const avgPerDay = totalUsage / daysDiff;
      const cost = calculateCost(totalUsage);
      const category = getCategoryAr(totalUsage);
      
      // Update summary cards
      updateSummaryCards({
        totalUsage: totalUsage,
        avgPerDay: avgPerDay,
        cost: cost,
        tier: category
      });

      logAr("> ملخص استهلاك الكهرباء للشهر الماضي");
      logAr("----------------------------------------");
      logAr(`📅 أول قراءة: ${first.timestamp.toLocaleDateString("ar-EG")}`);
      logAr(`📅 آخر قراءة:  ${last.timestamp.toLocaleDateString("ar-EG")}`);
      logAr(`⚡ إجمالي الاستهلاك: ${totalUsage} كيلوواط/ساعة`);
      logAr(`📊 المتوسط اليومي: ${avgPerDay.toFixed(2)} كيلوواط/يوم`);
      logAr(`💰 التكلفة المقدرة: ${cost.toFixed(2)} جنيه`);
      logAr(`📈 فئة الفاتورة: ${category}`);

      currentData = data;
      displayAveragePerDayAr(data);
      displayRollingCostChartEn(data);
      hideLoading();
    })
    .catch((error) => {
      logAr("> ❌ حدث خطأ في تحميل أو معالجة البيانات: " + error.message);
      hideLoading();
    });
}

// Load and process CSV data for English
function loadEnglishData() {
  console.log('loadEnglishData called');
  const terminalEn = document.getElementById("terminal-en");
  if (!terminalEn) {
    console.error('terminal-en element not found');
    hideLoading();
    return;
  }
  terminalEn.innerHTML = "> Loading electricity usage data...";
  console.log('Fetching CSV data for English...', csvUrl);
  fetch(csvUrl)
    .then((response) => response.text())
    .then((csvText) => {
      const parsed = Papa.parse(csvText, { header: true });
      const data = parsed.data
        .filter((row) => row["date time"]?.trim() && row["reading"]?.trim())
        .map((row) => ({
          timestamp: new Date(row["date time"].trim()),
          reading: parseInt(row["reading"].trim()),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last30DaysData = data.filter((row) => row.timestamp >= last30Days);

      if (last30DaysData.length < 2) {
        logEn("> Not enough data for last month.");
        return;
      }

      const first = last30DaysData[0];
      const last = last30DaysData[last30DaysData.length - 1];
      const totalUsage = last.reading - first.reading;

      if (totalUsage <= 0) {
        logEn("> Invalid total usage data.");
        hideLoading();
        return;
      }

      const timeDiff = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
      const daysDiff = timeDiff / 24;
      const avgPerDay = totalUsage / daysDiff;
      const cost = calculateCost(totalUsage);
      const category = getCategoryEn(totalUsage);
      
      // Update summary cards
      updateSummaryCards({
        totalUsage: totalUsage,
        avgPerDay: avgPerDay,
        cost: cost,
        tier: category
      });

      logEn("> Electricity Usage Summary for Last Month");
      logEn("----------------------------------------");
      logEn(`📅 First Reading: ${first.timestamp.toLocaleDateString("en-US")}`);
      logEn(`📅 Last Reading:  ${last.timestamp.toLocaleDateString("en-US")}`);
      logEn(`⚡ Total Usage: ${totalUsage} kWh`);
      logEn(`📊 Average per day: ${avgPerDay.toFixed(2)} kWh/day`);
      logEn(`💰 Estimated Cost: ${cost.toFixed(2)} EGP`);
      logEn(`📈 Billing Category: ${category}`);

      currentData = data;
      displayAveragePerDayEn(data);
      displayRollingCostChartEn(data);
      hideLoading();
    })
    .catch((error) => {
      console.error('English data loading error:', error);
      logEn("> ❌ Failed to fetch or process CSV: " + error.message);
      hideLoading();
    });
}

function displayRollingCostChartEn(data, monthsPeriod = 12) {
  const chartContainer = document.getElementById("shared-chart-container");
  chartContainer.innerHTML = ""; // Clear existing chart
  const canvas = document.createElement("canvas");
  canvas.id = "rolling-cost-chart";
  chartContainer.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const rollingCosts = [];

  for (let i = 0; i < data.length; i++) {
    const currentDate = data[i].timestamp;
    const startDate = new Date(
      currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
    );
    const windowData = data.filter(
      (row) => row.timestamp >= startDate && row.timestamp <= currentDate
    );

    if (windowData.length < 2) continue;

    const usage =
      windowData[windowData.length - 1].reading - windowData[0].reading;
    if (usage > 0) {
      const cost = calculateCost(usage);
      rollingCosts.push({
        date: currentDate,
        cost: cost,
        month: currentDate.toISOString().slice(0, 7), // "YYYY-MM"
      });
    }
  }

  // Fetch billing data as CSV
  fetch(billCsvUrl.replace("/pubhtml", "/pub?output=csv"))
    .then((response) => response.text())
    .then((csvText) => {
      const parsed = Papa.parse(csvText, { header: true });
      const billingData = parsed.data
        .filter((row) => row["date"]?.trim() && row["total_bill"]?.trim())
        .map((row) => ({
          date: new Date(row["date"].trim()),
          cost: parseFloat(row["total_bill"].trim()),
          month: new Date(row["date"].trim()).toISOString().slice(0, 7),
        }));

      // Group billing costs by month, pick one cost per month (e.g., last)
      const billingByMonth = {};
      billingData.forEach((entry) => {
        billingByMonth[entry.month] = entry.cost; // overwrite keeps last cost per month
      });

      // Group rollingCosts by month, and pick one date per month for billing points
      const months = [...new Set(rollingCosts.map((rc) => rc.month))];

      // Filter to requested period
      const filteredMonths = months.slice(-monthsPeriod);
      const labels = filteredMonths;

      // Estimated cost: average or last rolling cost per month
      const estimatedCostsByMonth = {};
      months.forEach((month) => {
        const costsInMonth = rollingCosts.filter((rc) => rc.month === month);
        // pick last cost in that month
        if (costsInMonth.length) {
          estimatedCostsByMonth[month] =
            costsInMonth[costsInMonth.length - 1].cost;
        } else {
          estimatedCostsByMonth[month] = null;
        }
      });

      // Prepare data arrays for chart
      const estimatedCosts = filteredMonths.map(
        (m) => estimatedCostsByMonth[m] || null
      );
      const billingCosts = filteredMonths.map((m) => billingByMonth[m] || null);

      new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Estimated Cost",
              data: estimatedCosts,
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              tension: 0.4,
              fill: true,
              pointBackgroundColor: "#10b981",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8,
            },
            {
              label: "Actual Bill",
              data: billingCosts,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.4,
              fill: false,
              spanGaps: true,
              pointBackgroundColor: "#3b82f6",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              labels: { 
                color: "#f1f5f9",
                usePointStyle: true,
                padding: 20
              },
            },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#f1f5f9',
              bodyColor: '#94a3b8',
              borderColor: '#3b82f6',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: true,
            }
          },
          scales: {
            x: {
              ticks: { 
                color: "#94a3b8",
                maxTicksLimit: 8
              },
              grid: {
                color: "#334155",
                drawBorder: false,
              },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: { 
                color: "#94a3b8",
                callback: function(value) {
                  return value.toFixed(0) + ' EGP';
                }
              },
              grid: {
                color: "#334155",
                drawBorder: false,
              },
              border: { display: false },
            },
          },
        },
      });
    })
    .catch((error) => {
      logEn("> ❌ Failed to fetch billing CSV: " + error.message);
    });
}

// Global variables
let currentData = [];
let currentLang = "ar";
let currentSummary = {};

// UI Helper Functions
function showLoading() {
  document.getElementById("loading-overlay").style.display = "flex";
}

function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
}

function updateSummaryCards(summary) {
  const totalUsageEl = document.getElementById("total-usage");
  const dailyAvgEl = document.getElementById("daily-avg");
  const estimatedCostEl = document.getElementById("estimated-cost");
  const billingTierEl = document.getElementById("billing-tier");
  
  if (totalUsageEl) totalUsageEl.textContent = (typeof summary.totalUsage === 'number') ? summary.totalUsage.toString() : "--";
  if (dailyAvgEl) dailyAvgEl.textContent = summary.avgPerDay ? summary.avgPerDay.toFixed(1) : "--";
  if (estimatedCostEl) estimatedCostEl.textContent = summary.cost ? summary.cost.toFixed(0) : "--";
  if (billingTierEl) billingTierEl.textContent = summary.tier || "--";
  
  currentSummary = summary;
  console.log('Summary cards updated:', summary);
  
  // Automatically update projections
  updateProjectionsDisplay();
}

// Auto-update projections display
function updateProjectionsDisplay() {
  if (!currentSummary.avgPerDay) {
    // No data available yet
    document.getElementById("projected-usage").textContent = "--";
    document.getElementById("projected-cost").textContent = "--";
    document.getElementById("projected-tier").textContent = "--";
    document.getElementById("projection-trend").innerHTML = '<i class="fas fa-minus"></i><span>--</span>';
    return;
  }
  
  const daysInMonth = 30;
  const projectedUsage = currentSummary.avgPerDay * daysInMonth;
  const projectedCost = calculateCost(projectedUsage);
  const projectedTier = currentLang === "ar" ? getCategoryAr(projectedUsage) : getCategoryEn(projectedUsage);
  
  // Update projected values with smaller units
  const projectedUsageText = currentLang === "ar" 
    ? `${projectedUsage.toFixed(0)} <span class="unit-text">كيلووات/ساعة</span>`
    : `${projectedUsage.toFixed(0)} <span class="unit-text">kWh</span>`;
  const projectedCostText = currentLang === "ar" 
    ? `${projectedCost.toFixed(0)} <span class="unit-text">جنيه</span>`
    : `${projectedCost.toFixed(0)} <span class="unit-text">EGP</span>`;
    
  document.getElementById("projected-usage").innerHTML = projectedUsageText;
  document.getElementById("projected-cost").innerHTML = projectedCostText;
  document.getElementById("projected-tier").textContent = projectedTier;
  
  // Update comparison trend
  const savings = currentSummary.cost - projectedCost;
  const trendEl = document.getElementById("projection-trend");
  
  if (Math.abs(savings) < 5) {
    // Similar cost (within 5 EGP)
    trendEl.className = "trend neutral";
    trendEl.innerHTML = currentLang === "ar" 
      ? '<i class="fas fa-equals"></i><span>مماثل للشهر الحالي</span>'
      : '<i class="fas fa-equals"></i><span>Similar to current month</span>';
  } else if (savings > 0) {
    // Saving money
    trendEl.className = "trend positive";
    const savingsText = currentLang === "ar" 
      ? `<i class="fas fa-arrow-down"></i><span>توفير ${savings.toFixed(0)} جنيه</span>`
      : `<i class="fas fa-arrow-down"></i><span>Save ${savings.toFixed(0)} EGP</span>`;
    trendEl.innerHTML = savingsText;
  } else {
    // Higher cost
    trendEl.className = "trend negative";
    const increaseText = currentLang === "ar" 
      ? `<i class="fas fa-arrow-up"></i><span>زيادة ${Math.abs(savings).toFixed(0)} جنيه</span>`
      : `<i class="fas fa-arrow-up"></i><span>Increase ${Math.abs(savings).toFixed(0)} EGP</span>`;
    trendEl.innerHTML = increaseText;
  }
}

// Enhanced Language Switch
const langSwitchBtn = document.getElementById("lang-switch");
const contentEn = document.getElementById("content-en");
const contentAr = document.getElementById("content-ar");
const body = document.body;

// Debug logging
console.log('contentAr:', contentAr);
console.log('contentEn:', contentEn);
console.log('Initial body class:', body.className);
console.log('Initial currentLang:', currentLang);

langSwitchBtn.addEventListener("click", () => {
  console.log('Language switch clicked. Current:', currentLang);
  
  if (currentLang === "ar") {
    // Switch to English
    currentLang = "en";
    body.className = "lang-en";
    
    console.log('Switched to English. Body class:', body.className);
    console.log('contentEn element:', contentEn);
    console.log('contentAr element:', contentAr);
    
    // Check computed styles after switch
    setTimeout(() => {
      console.log('After switch - contentAr computed display:', window.getComputedStyle(contentAr).display);
      console.log('After switch - contentEn computed display:', window.getComputedStyle(contentEn).display);
    }, 100);
    
    langSwitchBtn.innerHTML = `<i class="fas fa-language"></i><span>التبديل إلى العربية / Switch to Arabic</span>`;
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    
    if (!contentEn.dataset.loaded) {
      console.log('Loading English data...');
      showLoading();
      loadEnglishData();
      contentEn.dataset.loaded = "true";
    } else {
      console.log('English data already loaded');
      updateProjectionsDisplay();
      hideLoading();
    }
  } else {
    // Switch to Arabic
    currentLang = "ar";
    body.className = "lang-ar";
    
    console.log('Switched to Arabic. Body class:', body.className);
    
    // CSS will handle display based on body class
    
    langSwitchBtn.innerHTML = `<i class="fas fa-language"></i><span>Switch to English / التبديل إلى الإنجليزية</span>`;
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    
    if (!contentAr.dataset.loaded) {
      showLoading();
      loadArabicData();
      contentAr.dataset.loaded = "true";
    } else {
      updateProjectionsDisplay();
      hideLoading();
    }
  }
});

// Quick Actions
function refreshData() {
  showLoading();
  if (currentLang === "ar") {
    contentAr.dataset.loaded = "false";
    document.getElementById("terminal-ar").innerHTML = "> جاري تحميل بيانات استهلاك الكهرباء...";
    loadArabicData();
  } else {
    contentEn.dataset.loaded = "false";
    document.getElementById("terminal-en").innerHTML = "> Loading electricity usage data...";
    loadEnglishData();
  }
}

function exportData() {
  if (currentData.length === 0) {
    alert(currentLang === "ar" ? "لا توجد بيانات للتصدير" : "No data to export");
    return;
  }
  
  const csv = Papa.unparse(currentData.map(row => ({
    date: row.timestamp.toISOString(),
    reading: row.reading,
    daily_usage: row.dailyUsage || '',
    cost: row.cost || ''
  })));
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `electricity-usage-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Removed showProjections function since projections now display automatically

// Modal System
function showModal(title, content, type = "info") {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal ${type}">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="closeModal(this)">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-content">
        ${content}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="closeModal(this)">
          ${currentLang === "ar" ? "إغلاق" : "Close"}
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal(modal.querySelector('.modal-close'));
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal(modal.querySelector('.modal-close'));
    }
  });
}

function closeModal(button) {
  const modal = button.closest('.modal-overlay');
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.remove();
  }, 300);
}

// Search and Filter Functionality
function toggleFilters() {
  // Simple implementation - could be expanded
  const searchInput = document.getElementById('search-input');
  searchInput.focus();
}

// Enhanced Chart Period Control
document.getElementById('chart-period')?.addEventListener('change', function() {
  const period = parseInt(this.value);
  if (currentData.length > 0) {
    displayRollingCostChartEn(currentData, period);
  }
});

// Test function for debugging
function testLanguageSwitch() {
  console.log('Test: Current body class:', document.body.className);
  if (document.body.className === 'lang-ar') {
    document.body.className = 'lang-en';
    console.log('Test: Switched to lang-en');
  } else {
    document.body.className = 'lang-ar';
    console.log('Test: Switched to lang-ar');
  }
  console.log('Test: New body class:', document.body.className);
}

// Initialize app
window.onload = () => {
  // Set initial language class
  body.className = "lang-ar";
  console.log('Initial setup: body class set to', body.className);
  
  // CSS will handle content visibility based on body class
  
  // Show loading and load data
  showLoading();
  loadArabicData();
  contentAr.dataset.loaded = "true";
  
  // Add test button for debugging (temporary)
  setTimeout(() => {
    console.log('After 2 seconds:');
    console.log('contentAr display:', window.getComputedStyle(contentAr).display);
    console.log('contentEn display:', window.getComputedStyle(contentEn).display);
  }, 2000);
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'r':
          e.preventDefault();
          refreshData();
          break;
        case 'e':
          e.preventDefault();
          exportData();
          break;
        case 'l':
          e.preventDefault();
          langSwitchBtn.click();
          break;
        case 't':
          e.preventDefault();
          testLanguageSwitch();
          break;
      }
    }
  });
  
  // Add search functionality
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const tables = document.querySelectorAll('table');
      
      tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
      });
    });
  }
};
