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
    "<table><thead><tr><th>#</th><th>التاريخ والوقت</th><th>القراءة</th><th>الفارق الزمني (ساعات)</th><th>المعدل اليومي (كيلوواط/ساعة)</th></tr></thead><tbody>";
  let terminalOutput =
    "> متوسط الاستهلاك اليومي\n---------------------------\n";
  for (let i = data.length - 21; i < data.length - 1; i++) {
    const row = data[i];
    const nextRow = data[i + 1];
    if (nextRow) {
      const hoursDiff = (nextRow.timestamp - row.timestamp) / (1000 * 60 * 60);
      const daysDiff = hoursDiff / 24;
      const kWhUsage = nextRow.reading - row.reading;
      const avgPerDay = kWhUsage / daysDiff;

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
    "<table><thead><tr><th>#</th><th>Date & Time</th><th>Reading</th><th>Time Diff (hrs)</th><th>Avg. per Day (kWh)</th></tr></thead><tbody>";
  let terminalOutput = "> Average Usage Per Day\n---------------------------\n";
  for (let i = data.length - 21; i < data.length - 1; i++) {
    const row = data[i];
    const nextRow = data[i + 1];
    if (nextRow) {
      const hoursDiff = (nextRow.timestamp - row.timestamp) / (1000 * 60 * 60);
      const daysDiff = hoursDiff / 24;
      const kWhUsage = nextRow.reading - row.reading;
      const avgPerDay = kWhUsage / daysDiff;

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
  document.getElementById("terminal-ar").textContent =
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
        return;
      }

      const timeDiff = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
      const daysDiff = timeDiff / 24;
      const avgPerDay = totalUsage / daysDiff;
      const cost = calculateCost(totalUsage);
      const category = getCategoryAr(totalUsage);

      logAr("> ملخص استهلاك الكهرباء للشهر الماضي");
      logAr("----------------------------------------");
      logAr(`📅 أول قراءة: ${first.timestamp.toLocaleDateString("ar-EG")}`);
      logAr(`📅 آخر قراءة:  ${last.timestamp.toLocaleDateString("ar-EG")}`);
      logAr(`⚡ إجمالي الاستهلاك: ${totalUsage} كيلوواط/ساعة`);
      logAr(`📊 المتوسط اليومي: ${avgPerDay.toFixed(2)} كيلوواط/يوم`);
      logAr(`💰 التكلفة المقدرة: ${cost.toFixed(2)} جنيه`);
      logAr(`📈 فئة الفاتورة: ${category}`);

      displayAveragePerDayAr(data);
      displayRollingCostChartEn(data);
    })
    .catch((error) =>
      logAr("> ❌ حدث خطأ في تحميل أو معالجة البيانات: " + error.message)
    );
}

// Load and process CSV data for English
function loadEnglishData() {
  document.getElementById("terminal-en").textContent =
    "> Loading electricity usage data...";
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
        return;
      }

      const timeDiff = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
      const daysDiff = timeDiff / 24;
      const avgPerDay = totalUsage / daysDiff;
      const cost = calculateCost(totalUsage);
      const category = getCategoryEn(totalUsage);

      logEn("> Electricity Usage Summary for Last Month");
      logEn("----------------------------------------");
      logEn(`📅 First Reading: ${first.timestamp.toLocaleDateString("en-US")}`);
      logEn(`📅 Last Reading:  ${last.timestamp.toLocaleDateString("en-US")}`);
      logEn(`⚡ Total Usage: ${totalUsage} kWh`);
      logEn(`📊 Average per day: ${avgPerDay.toFixed(2)} kWh/day`);
      logEn(`💰 Estimated Cost: ${cost.toFixed(2)} EGP`);
      logEn(`📈 Billing Category: ${category}`);

      displayAveragePerDayEn(data);
      displayRollingCostChartEn(data);
    })
    .catch((error) =>
      logEn("> ❌ Failed to fetch or process CSV: " + error.message)
    );
}

function displayRollingCostChartEn(data) {
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

      // For labels, use months (e.g. "2025-05")
      const labels = months;

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
      const estimatedCosts = months.map(
        (m) => estimatedCostsByMonth[m] || null
      );
      const billingCosts = months.map((m) => billingByMonth[m] || null);

      new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Estimated Cost",
              data: estimatedCosts,
              borderColor: "#00ff00",
              backgroundColor: "rgba(0, 255, 0, 0.3)",
              tension: 0.3,
              fill: true,
            },
            {
              label: "Actual Bill",
              data: billingCosts,
              borderColor: "#ff0000",
              backgroundColor: "rgba(255, 0, 0, 0.3)",
              tension: 0.3,
              fill: false,
              spanGaps: true,
            },
          ],
        },
        options: {
          scales: {
            x: {
              ticks: { color: "#00ff00" },
              grid: {
                color: "#4d4d4d",
                drawBorder: true,
                drawOnChartArea: true,
              },
              border: { color: "#00ff00" },
            },
            y: {
              beginAtZero: true,
              ticks: { color: "#00ff00" },
              grid: {
                color: "#4d4d4d",
                drawBorder: true,
                drawOnChartArea: true,
              },
              border: { color: "#00ff00" },
            },
          },
          plugins: {
            legend: {
              labels: { color: "#00ff00" },
            },
          },
        },
      });
    })
    .catch((error) => {
      logEn("> ❌ Failed to fetch billing CSV: " + error.message);
    });
}

// Language switch button logic
const langSwitchBtn = document.getElementById("lang-switch");
const contentEn = document.getElementById("content-en");
const contentAr = document.getElementById("content-ar");

let currentLang = "ar";

langSwitchBtn.addEventListener("click", () => {
  if (currentLang === "ar") {
    currentLang = "en";
    contentAr.style.display = "none";
    contentEn.style.display = "block";
    langSwitchBtn.textContent = "التبديل إلى العربية / Switch to Arabic";
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    if (!contentEn.dataset.loaded) {
      loadEnglishData();
      contentEn.dataset.loaded = "true";
    }
  } else {
    currentLang = "ar";
    contentEn.style.display = "none";
    contentAr.style.display = "block";
    langSwitchBtn.textContent = "Switch to English / التبديل إلى الإنجليزية";
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    if (!contentAr.dataset.loaded) {
      loadArabicData();
      contentAr.dataset.loaded = "true";
    }
  }
});

// Load Arabic data by default on page load
window.onload = () => {
  loadArabicData();
  contentAr.dataset.loaded = "true";
};
