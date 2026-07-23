/**
 * Travel SIM Sales Dashboard
 * Pure Vanilla JavaScript with Supabase REST API & Chart.js
 */

// Configuration
const SUPABASE_URL = "https://bargzgtcslcbgobqsiae.supabase.co";
const SUPABASE_KEY = "sb_publishable_PMeletVzhkvg8S_NQ49XYg_laaChomr";

// Global Data State
let appState = {
  orders: [],
  products: [],
  users: [],
  destinations: [],
  joinedOrders: [],
  currentSection: "dashboard"
};

// Chart Instances
let charts = {
  revenueLine: null,
  ordersBar: null,
  productPie: null,
  destinationDoughnut: null
};

// DOM Elements
const elements = {
  navItems: document.querySelectorAll(".nav-item"),
  sections: document.querySelectorAll(".view-section"),
  pageTitle: document.getElementById("page-title"),
  globalSearch: document.getElementById("global-search"),
  refreshBtn: document.getElementById("refresh-btn"),
  exportCsvBtn: document.getElementById("export-csv-btn"),
  apiStatusDot: document.getElementById("api-status-dot"),
  apiStatusText: document.getElementById("api-status-text"),
  keyWarningBanner: document.getElementById("key-warning-banner"),
  
  // Dashboard Cards
  totalRevenue: document.getElementById("total-revenue"),
  totalOrders: document.getElementById("total-orders"),
  totalUsers: document.getElementById("total-users"),
  totalProducts: document.getElementById("total-products"),
  
  // Badges
  ordersBadge: document.getElementById("orders-count-badge"),
  productsBadge: document.getElementById("products-count-badge"),
  usersBadge: document.getElementById("users-count-badge"),
  destinationsBadge: document.getElementById("destinations-count-badge"),
  
  // Table Bodies
  ordersTbody: document.getElementById("orders-tbody"),
  productsTbody: document.getElementById("products-tbody"),
  usersTbody: document.getElementById("users-tbody"),
  destinationsTbody: document.getElementById("destinations-tbody")
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkApiKeyStatus();
  fetchAllData();
});

// Setup Navigation & Event Listeners
function setupEventListeners() {
  // Sidebar Navigation
  elements.navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetSection = item.getAttribute("data-section");
      switchSection(targetSection);
    });
  });

  // Global Search
  elements.globalSearch.addEventListener("input", handleSearch);

  // Refresh Button
  elements.refreshBtn.addEventListener("click", () => {
    fetchAllData();
  });

  // Export CSV Button
  elements.exportCsvBtn.addEventListener("click", () => {
    exportActiveSectionToCSV();
  });
}

// Section Switching Logic
function switchSection(sectionId) {
  appState.currentSection = sectionId;

  // Update Nav Active state
  elements.navItems.forEach(item => {
    if (item.getAttribute("data-section") === sectionId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update Section Visibility
  elements.sections.forEach(section => {
    if (section.id === `${sectionId}-section`) {
      section.classList.add("active");
    } else {
      section.classList.remove("active");
    }
  });

  // Update Header Title
  const titleMap = {
    dashboard: "Dashboard Overview",
    orders: "Orders Management",
    products: "Products Catalog",
    users: "Users Directory",
    destinations: "Coverage Destinations"
  };
  elements.pageTitle.textContent = titleMap[sectionId] || "Dashboard";

  // Re-apply search filter for current view
  handleSearch();
}

// Check Key Warning
function checkApiKeyStatus() {
  if (SUPABASE_KEY === "PASTE_YOUR_PUBLISHABLE_KEY_HERE" || !SUPABASE_KEY) {
    elements.keyWarningBanner.classList.remove("hidden");
  } else {
    elements.keyWarningBanner.classList.add("hidden");
  }
}

// Fetch Helper for Supabase REST API
async function fetchFromSupabase(table) {
  const endpoint = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${table}: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Fetch All Tables & Process Data
async function fetchAllData() {
  updateApiStatus(false, "Fetching data...");

  try {
    const [ordersData, productsData, usersData, destinationsData] = await Promise.all([
      fetchFromSupabase("orders").catch(err => { console.warn(err); return []; }),
      fetchFromSupabase("products").catch(err => { console.warn(err); return []; }),
      fetchFromSupabase("users").catch(err => { console.warn(err); return []; }),
      fetchFromSupabase("destinations").catch(err => { console.warn(err); return []; })
    ]);

    appState.orders = Array.isArray(ordersData) ? ordersData : [];
    appState.products = Array.isArray(productsData) ? productsData : [];
    appState.users = Array.isArray(usersData) ? usersData : [];
    appState.destinations = Array.isArray(destinationsData) ? destinationsData : [];

    // Perform Data Joins
    processDataJoins();

    // Render Dashboard UI & Tables
    updateDashboardCards();
    renderOrdersTable(appState.joinedOrders);
    renderProductsTable(appState.products);
    renderUsersTable(appState.users);
    renderDestinationsTable(appState.destinations);

    // Render Charts
    renderCharts();

    updateApiStatus(true, "Connected & Synced");
  } catch (error) {
    console.error("Supabase REST Error:", error);
    updateApiStatus(false, "API Error / Key Required");
  }
}

// Data Joins: Orders + Users (user_id) & Orders + Products (product_id = prod_id)
function processDataJoins() {
  const userMap = new Map();
  appState.users.forEach(u => {
    userMap.set(String(u.user_id), u.name || `User #${u.user_id}`);
  });

  const productMap = new Map();
  appState.products.forEach(p => {
    productMap.set(String(p.prod_id), p.productName || `Product #${p.prod_id}`);
  });

  appState.joinedOrders = appState.orders.map(order => {
    const userName = userMap.get(String(order.user_id)) || `User #${order.user_id}`;
    const productName = productMap.get(String(order.product_id)) || `Product #${order.product_id}`;
    
    return {
      ...order,
      userName,
      productName
    };
  });
}

// Update API Connection Status Indicator
function updateApiStatus(isOnline, text) {
  elements.apiStatusText.textContent = text;
  if (isOnline) {
    elements.apiStatusDot.classList.add("online");
  } else {
    elements.apiStatusDot.classList.remove("online");
  }
}

// Calculate & Update Dashboard Metric Cards
function updateDashboardCards() {
  const totalRev = appState.orders.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  elements.totalRevenue.textContent = formatCurrency(totalRev);
  elements.totalOrders.textContent = appState.orders.length.toLocaleString();
  elements.totalUsers.textContent = appState.users.length.toLocaleString();
  elements.totalProducts.textContent = appState.products.length.toLocaleString();

  elements.ordersBadge.textContent = `${appState.orders.length} Records`;
  elements.productsBadge.textContent = `${appState.products.length} Records`;
  elements.usersBadge.textContent = `${appState.users.length} Records`;
  elements.destinationsBadge.textContent = `${appState.destinations.length} Records`;
}

// Format Currency
function formatCurrency(val) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(val || 0);
}

// Format Date
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (e) {
    return dateStr;
  }
}

// Map Destination Type Codes to Descriptive Labels
function mapDestinationType(typeVal) {
  const strVal = String(typeVal).trim();
  const typeMap = {
    "1": "Type 1 (Country / Local)",
    "2": "Type 2 (Regional)",
    "3": "Type 3 (Global / Multi-region)"
  };
  return typeMap[strVal] || `Type ${strVal}`;
}

// Render Orders Table
function renderOrdersTable(ordersList) {
  if (!ordersList || ordersList.length === 0) {
    elements.ordersTbody.innerHTML = `<tr><td colspan="7" class="loading-cell">No orders found.</td></tr>`;
    return;
  }

  elements.ordersTbody.innerHTML = ordersList.map(order => `
    <tr>
      <td><strong>${escapeHtml(order.order_no || "N/A")}</strong></td>
      <td>${formatDate(order.order_date_time)}</td>
      <td><span class="tag-pill"><i class="fa-solid fa-user"></i> ${escapeHtml(order.userName)}</span></td>
      <td><span class="tag-pill"><i class="fa-solid fa-sim-card"></i> ${escapeHtml(order.productName)}</span></td>
      <td><strong style="color: var(--accent-success);">${formatCurrency(order.amount)}</strong></td>
      <td>${formatCurrency(order.discount_amount)}</td>
      <td>${escapeHtml(order.created_by || "System")}</td>
    </tr>
  `).join("");
}

// Render Products Table
function renderProductsTable(productsList) {
  if (!productsList || productsList.length === 0) {
    elements.productsTbody.innerHTML = `<tr><td colspan="10" class="loading-cell">No products found.</td></tr>`;
    return;
  }

  elements.productsTbody.innerHTML = productsList.map(prod => `
    <tr>
      <td>#${escapeHtml(prod.prod_id)}</td>
      <td><strong>${escapeHtml(prod.productName || "Unnamed")}</strong></td>
      <td><span class="badge">${escapeHtml(prod.data_limit || "N/A")}</span></td>
      <td><span class="tag-pill">${escapeHtml(prod.simMode || "eSIM")}</span></td>
      <td><strong style="color: var(--accent-success);">${formatCurrency(prod.amount)}</strong></td>
      <td>${escapeHtml(prod.validity || "N/A")}</td>
      <td>${escapeHtml(prod.fupLimit || "N/A")}</td>
      <td>${escapeHtml(prod.postFupSpeed || "N/A")}</td>
      <td>${escapeHtml(prod.operatorId || "N/A")}</td>
      <td>${escapeHtml(prod.coverageDestinations || "Global")}</td>
    </tr>
  `).join("");
}

// Render Users Table
function renderUsersTable(usersList) {
  if (!usersList || usersList.length === 0) {
    elements.usersTbody.innerHTML = `<tr><td colspan="6" class="loading-cell">No users found.</td></tr>`;
    return;
  }

  elements.usersTbody.innerHTML = usersList.map(user => `
    <tr>
      <td>#${escapeHtml(user.user_id)}</td>
      <td><strong>${escapeHtml(user.name || "Anonymous")}</strong></td>
      <td>${escapeHtml(user.country_code || "-")}</td>
      <td>${escapeHtml(user.mobile || "-")}</td>
      <td><span class="tag-pill">${escapeHtml(user.user_role || "Customer")}</span></td>
      <td>${formatDate(user.created_dateTime)}</td>
    </tr>
  `).join("");
}

// Render Destinations Table
function renderDestinationsTable(destinationsList) {
  if (!destinationsList || destinationsList.length === 0) {
    elements.destinationsTbody.innerHTML = `<tr><td colspan="6" class="loading-cell">No destinations found.</td></tr>`;
    return;
  }

  elements.destinationsTbody.innerHTML = destinationsList.map(dest => `
    <tr>
      <td>#${escapeHtml(dest.destination_id)}</td>
      <td><strong>${escapeHtml(dest.destination_name || "N/A")}</strong></td>
      <td><span class="tag-pill">${escapeHtml(mapDestinationType(dest.destination_type))}</span></td>
      <td>${dest.flag_path ? `<img src="${escapeHtml(dest.flag_path)}" alt="Flag" style="height:20px; border-radius:3px;">` : "-"}</td>
      <td>
        <span class="status-pill ${dest.is_active ? 'active' : 'inactive'}">
          <i class="fa-solid ${dest.is_active ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
          ${dest.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>${escapeHtml(dest.included_destinations || "-")}</td>
    </tr>
  `).join("");
}

// Search Handler across active views
function handleSearch() {
  const query = elements.globalSearch.value.trim().toLowerCase();

  if (appState.currentSection === "orders" || appState.currentSection === "dashboard") {
    const filteredOrders = appState.joinedOrders.filter(o =>
      String(o.order_no || "").toLowerCase().includes(query) ||
      String(o.userName || "").toLowerCase().includes(query) ||
      String(o.productName || "").toLowerCase().includes(query) ||
      String(o.created_by || "").toLowerCase().includes(query)
    );
    renderOrdersTable(filteredOrders);
  }

  if (appState.currentSection === "products" || appState.currentSection === "dashboard") {
    const filteredProducts = appState.products.filter(p =>
      String(p.productName || "").toLowerCase().includes(query) ||
      String(p.data_limit || "").toLowerCase().includes(query) ||
      String(p.simMode || "").toLowerCase().includes(query) ||
      String(p.coverageDestinations || "").toLowerCase().includes(query)
    );
    renderProductsTable(filteredProducts);
  }

  if (appState.currentSection === "users" || appState.currentSection === "dashboard") {
    const filteredUsers = appState.users.filter(u =>
      String(u.name || "").toLowerCase().includes(query) ||
      String(u.mobile || "").toLowerCase().includes(query) ||
      String(u.user_role || "").toLowerCase().includes(query) ||
      String(u.country_code || "").toLowerCase().includes(query)
    );
    renderUsersTable(filteredUsers);
  }

  if (appState.currentSection === "destinations" || appState.currentSection === "dashboard") {
    const filteredDest = appState.destinations.filter(d =>
      String(d.destination_name || "").toLowerCase().includes(query) ||
      String(mapDestinationType(d.destination_type)).toLowerCase().includes(query) ||
      String(d.included_destinations || "").toLowerCase().includes(query)
    );
    renderDestinationsTable(filteredDest);
  }
}

// Export CSV Feature
function exportActiveSectionToCSV() {
  let filename = "export.csv";
  let csvContent = "";

  if (appState.currentSection === "orders" || appState.currentSection === "dashboard") {
    filename = "orders_export.csv";
    const headers = ["Order No", "Date Time", "User Name", "Product Name", "Amount", "Discount Amount", "Created By"];
    const rows = appState.joinedOrders.map(o => [
      `"${o.order_no || ''}"`,
      `"${o.order_date_time || ''}"`,
      `"${o.userName || ''}"`,
      `"${o.productName || ''}"`,
      o.amount || 0,
      o.discount_amount || 0,
      `"${o.created_by || ''}"`
    ]);
    csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  } else if (appState.currentSection === "products") {
    filename = "products_export.csv";
    const headers = ["ID", "Product Name", "Data Limit", "SIM Mode", "Amount", "Validity", "FUP Limit", "Post FUP Speed"];
    const rows = appState.products.map(p => [
      p.prod_id,
      `"${p.productName || ''}"`,
      `"${p.data_limit || ''}"`,
      `"${p.simMode || ''}"`,
      p.amount || 0,
      `"${p.validity || ''}"`,
      `"${p.fupLimit || ''}"`,
      `"${p.postFupSpeed || ''}"`
    ]);
    csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  } else if (appState.currentSection === "users") {
    filename = "users_export.csv";
    const headers = ["User ID", "Name", "Country Code", "Mobile", "Role", "Created Date"];
    const rows = appState.users.map(u => [
      u.user_id,
      `"${u.name || ''}"`,
      `"${u.country_code || ''}"`,
      `"${u.mobile || ''}"`,
      `"${u.user_role || ''}"`,
      `"${u.created_dateTime || ''}"`
    ]);
    csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  } else if (appState.currentSection === "destinations") {
    filename = "destinations_export.csv";
    const headers = ["ID", "Destination Name", "Type", "Active Status", "Included Destinations"];
    const rows = appState.destinations.map(d => [
      d.destination_id,
      `"${d.destination_name || ''}"`,
      `"${mapDestinationType(d.destination_type)}"`,
      d.is_active ? "Active" : "Inactive",
      `"${d.included_destinations || ''}"`
    ]);
    csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  }

  // Trigger Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Chart Renderings
function renderCharts() {
  // Chart standard colors
  const primaryColor = "#6366f1";
  const secondaryColor = "#06b6d4";
  const successColor = "#10b981";
  const warningColor = "#f59e0b";
  const dangerColor = "#ef4444";
  const textColor = "#94a3b8";
  const gridColor = "#334155";

  // Shared chart options
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: textColor, font: { family: "Plus Jakarta Sans", size: 12 } }
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        borderColor: "#334155",
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor }
      },
      y: {
        ticks: { color: textColor },
        grid: { color: gridColor }
      }
    }
  };

  // 1. Revenue Line Chart (grouped by date)
  const revenueByDate = {};
  appState.joinedOrders.forEach(order => {
    const dateKey = order.order_date_time ? order.order_date_time.split("T")[0] : "Date N/A";
    revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + (parseFloat(order.amount) || 0);
  });

  const revLabels = Object.keys(revenueByDate);
  const revValues = Object.values(revenueByDate);

  if (charts.revenueLine) charts.revenueLine.destroy();
  const revCtx = document.getElementById("revenueLineChart").getContext("2d");
  charts.revenueLine = new Chart(revCtx, {
    type: "line",
    data: {
      labels: revLabels.length > 0 ? revLabels : ["No Data"],
      datasets: [{
        label: "Revenue ($)",
        data: revValues.length > 0 ? revValues : [0],
        borderColor: primaryColor,
        backgroundColor: "rgba(99, 102, 241, 0.15)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: primaryColor,
        pointBorderColor: "#ffffff"
      }]
    },
    options: {
      ...defaultOptions,
      plugins: {
        ...defaultOptions.plugins,
        tooltip: {
          ...defaultOptions.plugins.tooltip,
          callbacks: {
            label: function(context) {
              return ` Revenue: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      }
    }
  });

  // 2. Orders Bar Chart (count per date)
  const ordersByDate = {};
  appState.joinedOrders.forEach(order => {
    const dateKey = order.order_date_time ? order.order_date_time.split("T")[0] : "Date N/A";
    ordersByDate[dateKey] = (ordersByDate[dateKey] || 0) + 1;
  });

  const ordersLabels = Object.keys(ordersByDate);
  const ordersValues = Object.values(ordersByDate);

  if (charts.ordersBar) charts.ordersBar.destroy();
  const ordersCtx = document.getElementById("ordersBarChart").getContext("2d");
  charts.ordersBar = new Chart(ordersCtx, {
    type: "bar",
    data: {
      labels: ordersLabels.length > 0 ? ordersLabels : ["No Data"],
      datasets: [{
        label: "Orders Count",
        data: ordersValues.length > 0 ? ordersValues : [0],
        backgroundColor: secondaryColor,
        borderRadius: 6
      }]
    },
    options: {
      ...defaultOptions,
      plugins: {
        ...defaultOptions.plugins,
        tooltip: {
          ...defaultOptions.plugins.tooltip,
          callbacks: {
            label: function(context) {
              return ` Orders: ${context.parsed.y} orders`;
            }
          }
        }
      }
    }
  });

  // 3. Product Pie Chart (by product name revenue)
  const productRev = {};
  appState.joinedOrders.forEach(order => {
    const prodName = order.productName || "Unknown Product";
    productRev[prodName] = (productRev[prodName] || 0) + (parseFloat(order.amount) || 0);
  });

  const pieLabels = Object.keys(productRev);
  const pieValues = Object.values(productRev);

  if (charts.productPie) charts.productPie.destroy();
  const pieCtx = document.getElementById("productPieChart").getContext("2d");
  charts.productPie = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: pieLabels.length > 0 ? pieLabels : ["No Products"],
      datasets: [{
        data: pieValues.length > 0 ? pieValues : [1],
        backgroundColor: [primaryColor, secondaryColor, successColor, warningColor, dangerColor, "#8b5cf6", "#ec4899"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, font: { family: "Plus Jakarta Sans", size: 11 } }
        },
        tooltip: {
          ...defaultOptions.plugins.tooltip,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return ` ${label}: ${formatCurrency(value)}`;
            }
          }
        }
      }
    }
  });

  // 4. Destination Doughnut Chart (by destination type or status)
  const destTypes = {};
  appState.destinations.forEach(dest => {
    const mappedType = mapDestinationType(dest.destination_type);
    destTypes[mappedType] = (destTypes[mappedType] || 0) + 1;
  });

  const doughLabels = Object.keys(destTypes);
  const doughValues = Object.values(destTypes);

  if (charts.destinationDoughnut) charts.destinationDoughnut.destroy();
  const doughCtx = document.getElementById("destinationDoughnutChart").getContext("2d");
  charts.destinationDoughnut = new Chart(doughCtx, {
    type: "doughnut",
    data: {
      labels: doughLabels.length > 0 ? doughLabels : ["No Destinations"],
      datasets: [{
        data: doughValues.length > 0 ? doughValues : [1],
        backgroundColor: [secondaryColor, primaryColor, successColor, warningColor]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, font: { family: "Plus Jakarta Sans", size: 11 } }
        },
        tooltip: {
          ...defaultOptions.plugins.tooltip,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return ` ${label}: ${value} destination${value !== 1 ? 's' : ''}`;
            }
          }
        }
      }
    }
  });
}

// Utility: Escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
