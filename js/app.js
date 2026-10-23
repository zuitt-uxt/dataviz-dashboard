/* =========================================================
   APP.JS — reads the data, crunches it, draws the charts
   ---------------------------------------------------------
   STARTER VERSION. The function NAMES and DESCRIPTIONS are
   already written. In Step 4, Gemini fills in the bodies.

   The descriptions are a "contract": they tell the AI exactly
   what each function receives and returns, so everyone in
   class gets code that works the same way.

   RULE: do not rename functions or change their inputs.
   ========================================================= */

// Keeps track of the charts on screen so we can replace them on switch.
let categoryChart = null;
let trendChart = null;

/**
 * parseCsv(csvText)
 * Turns raw CSV text into an array of row objects.
 * Uses the PapaParse library (loaded in index.html).
 * Example: "Genre,Global_Sales\nSports,82.74" -> [{ Genre: "Sports", Global_Sales: "82.74" }]
 * @param {string} csvText - the full CSV text, header row first
 * @returns {Object[]} one object per data row
 */
function parseCsv(csvText) {
  return Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  }).data;
}

/**
 * cleanRows(rows, settings)
 * Keeps only rows we can trust and counts the ones we threw away.
 * A row is SKIPPED when:
 *   - its category column is empty, or
 *   - its value column is not a number, or
 *   - its trend column is empty or "N/A".
 * @param {Object[]} rows - output of parseCsv
 * @param {Object} settings - one entry of DATASETS in config.js
 * @returns {{ clean: Object[], skipped: number }}
 */
function cleanRows(rows, settings) {
  let clean = [];
  let skipped = 0;
  for (let row of rows) {
    let cat = row[settings.categoryColumn];
    let val = parseFloat(row[settings.valueColumn]);
    let trend = row[settings.trendColumn];
    
    if (!cat || isNaN(val) || !trend || trend === "N/A") {
      skipped++;
    } else {
      clean.push(row);
    }
  }
  return { clean, skipped };
}

/**
 * toTrendKey(rawValue, grouping)
 * Converts a value from the trend column into the label used on the x-axis.
 *   "none"  -> unchanged             ("2006"      -> "2006")
 *   "hour"  -> hour from HH:MM       ("13:08"     -> "13:00")
 *   "month" -> YYYY-MM from M/D/YYYY ("1/5/2019"  -> "2019-01")
 *   "year"  -> YYYY from M/D/YYYY    ("1/5/2019"  -> "2019")
 * @param {string} rawValue
 * @param {string} grouping - "none" | "hour" | "month" | "year"
 * @returns {string}
 */
function toTrendKey(rawValue, grouping) {
  if (grouping === "none") {
    return rawValue;
  }
  if (grouping === "hour") {
    let parts = rawValue.split(":");
    return parts[0] + ":00";
  }
  
  let dateObj = new Date(rawValue);
  if (isNaN(dateObj.getTime())) return rawValue;
  
  if (grouping === "month") {
    let yyyy = dateObj.getFullYear();
    let mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }
  if (grouping === "year") {
    return dateObj.getFullYear().toString();
  }
  
  return rawValue;
}

/**
 * groupAndAggregate(rows, groupColumn, valueColumn, aggregation, grouping)
 * Groups rows by one column and combines the numbers in each group.
 * Example: sum of "Total" per "Product line".
 * @param {Object[]} rows - cleaned rows
 * @param {string} groupColumn - column to group by
 * @param {string} valueColumn - column with the numbers
 * @param {string} aggregation - "sum" | "count" | "average"
 * @param {string} grouping - passed to toTrendKey ("none" for categories)
 * @returns {{ labels: string[], values: number[] }} in the order first seen
 */
function groupAndAggregate(rows, groupColumn, valueColumn, aggregation, grouping) {
  let map = {};
  let countMap = {};
  
  for (let row of rows) {
    let rawKey = row[groupColumn];
    let key = grouping === "none" ? rawKey : toTrendKey(rawKey, grouping);
    let val = parseFloat(row[valueColumn]);
    
    if (map[key] === undefined) {
      map[key] = 0;
      countMap[key] = 0;
    }
    
    map[key] += val;
    countMap[key] += 1;
  }
  
  let labels = [];
  let values = [];
  
  for (let key in map) {
    labels.push(key);
    if (aggregation === "sum") {
      values.push(map[key]);
    } else if (aggregation === "count") {
      values.push(countMap[key]);
    } else if (aggregation === "average") {
      values.push(map[key] / countMap[key]);
    }
  }
  
  return { labels, values };
}

/**
 * sortGroups(groups, sortBy, limit)
 * Sorts grouped data and optionally keeps only the first few.
 * @param {{ labels: string[], values: number[] }} groups
 * @param {string} sortBy - "valueDesc" (biggest first) | "labelAsc" (A–Z / oldest first)
 * @param {number} [limit] - how many to keep (leave empty to keep all)
 * @returns {{ labels: string[], values: number[] }}
 */
function sortGroups(groups, sortBy, limit) {
  let combined = [];
  for (let i = 0; i < groups.labels.length; i++) {
    combined.push({ label: groups.labels[i], value: groups.values[i] });
  }
  
  if (sortBy === "valueDesc") {
    combined.sort((a, b) => b.value - a.value);
  } else if (sortBy === "labelAsc") {
    combined.sort((a, b) => a.label.localeCompare(b.label));
  }
  
  if (limit && limit > 0) {
    combined = combined.slice(0, limit);
  }
  
  let sortedLabels = [];
  let sortedValues = [];
  for (let item of combined) {
    sortedLabels.push(item.label);
    sortedValues.push(item.value);
  }
  
  return { labels: sortedLabels, values: sortedValues };
}

/**
 * formatNumber(value)
 * Formats a number with commas and CHART_SETTINGS.numberDecimals decimals.
 * Example: 322966.749 -> "322,966.75"
 */
function formatNumber(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: CHART_SETTINGS.numberDecimals,
    maximumFractionDigits: CHART_SETTINGS.numberDecimals
  });
}

/**
 * renderSummary(settings, cleanCount, skipped, total, topCategory)
 * Writes the dataset title, description and the 4 summary cards.
 * Required element IDs: dataset-title, dataset-description, dataset-source,
 * kpi-records, kpi-total, kpi-total-label, kpi-top, kpi-skipped
 */
function renderSummary(settings, cleanCount, skipped, total, topCategory) {
  document.getElementById("dataset-title").textContent = settings.title;
  document.getElementById("dataset-description").textContent = settings.description;
  document.getElementById("dataset-source").href = settings.source;
  
  // Format numbers without decimals for whole numbers
  document.getElementById("kpi-records").textContent = Number(cleanCount).toLocaleString();
  document.getElementById("kpi-total-label").textContent = settings.valueLabel;
  document.getElementById("kpi-total").textContent = formatNumber(total);
  document.getElementById("kpi-top").textContent = topCategory;
  document.getElementById("kpi-skipped").textContent = Number(skipped).toLocaleString();
}

/**
 * renderCategoryChart(groups, settings)
 * Draws Chart 1 (bar chart) on <canvas id="chart-category">.
 * Destroys the previous chart first so switching datasets works.
 * Required element IDs: chart-category, chart-category-title
 */
function renderCategoryChart(groups, settings) {
  document.getElementById("chart-category-title").textContent = `${settings.valueLabel} by ${settings.categoryColumn}`;
  
  if (categoryChart) {
    categoryChart.destroy();
  }
  
  let ctx = document.getElementById("chart-category").getContext("2d");
  categoryChart = new Chart(ctx, {
    type: CHART_SETTINGS.categoryChartType,
    data: {
      labels: groups.labels,
      datasets: [{
        label: settings.valueLabel,
        data: groups.values,
        backgroundColor: CHART_SETTINGS.primaryColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/**
 * renderTrendChart(groups, settings)
 * Draws Chart 2 (line chart) on <canvas id="chart-trend">.
 * Destroys the previous chart first so switching datasets works.
 * Required element IDs: chart-trend, chart-trend-title
 */
function renderTrendChart(groups, settings) {
  document.getElementById("chart-trend-title").textContent = `${settings.valueLabel} over ${settings.trendLabel}`;
  
  if (trendChart) {
    trendChart.destroy();
  }
  
  let ctx = document.getElementById("chart-trend").getContext("2d");
  trendChart = new Chart(ctx, {
    type: CHART_SETTINGS.trendChartType,
    data: {
      labels: groups.labels,
      datasets: [{
        label: settings.valueLabel,
        data: groups.values,
        borderColor: CHART_SETTINGS.primaryColor,
        backgroundColor: CHART_SETTINGS.secondaryColor,
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/**
 * loadDashboard(datasetKey)
 * The main function. Runs every step in order for one dataset:
 * parse -> clean -> group -> sort -> render summary -> render 2 charts.
 * @param {string} datasetKey - a key of DATASETS, e.g. "supermarket"
 */
function loadDashboard(datasetKey) {
  let settings = DATASETS[datasetKey];
  
  let rows = parseCsv(settings.csv);
  let cleanedData = cleanRows(rows, settings);
  
  // Category Processing
  let categoryGroups = groupAndAggregate(cleanedData.clean, settings.categoryColumn, settings.valueColumn, settings.aggregation, "none");
  let sortedCategoryGroups = sortGroups(categoryGroups, "valueDesc", CHART_SETTINGS.maxCategories);
  
  // Trend Processing
  let trendGroups = groupAndAggregate(cleanedData.clean, settings.trendColumn, settings.valueColumn, settings.aggregation, settings.trendGrouping);
  let sortedTrendGroups = sortGroups(trendGroups, "labelAsc");
  
  // Totals & Top
  let totalValue = 0;
  for (let val of categoryGroups.values) {
    totalValue += val;
  }
  
  let topCat = sortedCategoryGroups.labels.length > 0 ? sortedCategoryGroups.labels[0] : "None";
  
  // Render
  renderSummary(settings, cleanedData.clean.length, cleanedData.skipped, totalValue, topCat);
  renderCategoryChart(sortedCategoryGroups, settings);
  renderTrendChart(sortedTrendGroups, settings);
}

/**
 * setupDatasetPicker()
 * Fills <select id="dataset-select"> with every dataset in DATASETS,
 * selects ACTIVE_DATASET, and reloads the dashboard when it changes.
 */
function setupDatasetPicker() {
  let select = document.getElementById("dataset-select");
  select.innerHTML = "";
  
  for (let key in DATASETS) {
    let option = document.createElement("option");
    option.value = key;
    option.textContent = DATASETS[key].title;
    if (key === ACTIVE_DATASET) {
      option.selected = true;
    }
    select.appendChild(option);
  }
  
  select.addEventListener("change", function(e) {
    loadDashboard(e.target.value);
  });
}

// Start everything once the page has loaded.
document.addEventListener("DOMContentLoaded", function () {
  setupDatasetPicker();
  loadDashboard(ACTIVE_DATASET);
});