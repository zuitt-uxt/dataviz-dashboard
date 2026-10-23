/* =========================================================
   CONFIG.JS — the "control panel" of the dashboard
   ---------------------------------------------------------
   These are PREDEFINED VARIABLES. The code in app.js never
   mentions a column name directly; it always reads it from
   here. That is what lets the SAME code work on ANY dataset.

   STEP 2: Gemini gives you the values for each "" below.
   Copy them in carefully — spelling and capital letters
   must match the CSV header EXACTLY.

   To switch datasets: change ACTIVE_DATASET below and refresh.
   ========================================================= */

// 1. Which dataset should the page show first?
//    Must match one of the keys inside DATASETS ("supermarket" or "videogames").
const ACTIVE_DATASET = "supermarket";

// 2. One settings block per dataset.
const DATASETS = {
  supermarket: {
    csv: SUPERMARKET_CSV,                 // comes from data/supermarket.js
    title: "Supermarket Sales Overview",
    description: "Total revenue analyzed by product line and over time.",
    source: "https://www.kaggle.com/datasets/lovishbansal123/sales-of-a-supermarket",

    // Chart 1 — bar chart: "Which category is biggest?"
    categoryColumn: "Product line",                  // column used for the bars
    valueColumn: "Total",                     // column that gets added up
    aggregation: "sum",                  // "sum" | "count" | "average"
    valueLabel: "Total Revenue",

    // Chart 2 — line chart: "How does it change over time?"
    trendColumn: "Date",                     // column used for the x-axis
    trendGrouping: "month",                   // "none" | "hour" | "month" | "year"
    trendLabel: "Purchase Date"
  },

  videogames: {
    csv: VIDEOGAMES_CSV,                 // comes from data/videogames.js
    title: "Global Video Game Sales",
    description: "Total video game sales compared across different genres and release years.",
    source: "https://www.kaggle.com/datasets/gregorut/videogamesales",

    categoryColumn: "Genre",
    valueColumn: "Global_Sales",
    aggregation: "sum",
    valueLabel: "Global Sales",

    trendColumn: "Year",
    trendGrouping: "none",
    trendLabel: "Release Year"
  }
};

// 3. Chart settings shared by every dataset.
const CHART_SETTINGS = {
  categoryChartType: "bar",              // Chart 1
  trendChartType: "line",                // Chart 2
  maxCategories: 10,                     // show only the top 10 bars
  primaryColor: "#0F766E",               // bars and line
  secondaryColor: "#99F6E4",             // line fill
  numberDecimals: 2
};
