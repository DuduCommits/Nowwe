const BASE_URL = "/api";

async function request(url, options = {}) {
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };

  const response = await fetch(`${BASE_URL}${url}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// Groups
export const createGroup = (groupData) =>
  request("/groups", {
    method: "POST",
    body: JSON.stringify(groupData),
  });

export const getGroupByCode = (code) => request(`/groups/${code}`);

export const getGroupById = (id) => request(`/groups/id/${id}`);

export const updateGroup = (id, data) =>
  request(`/groups/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Members
export const addMember = (groupId, data) =>
  request(`/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const removeMember = (groupId, memberId) =>
  request(`/groups/${groupId}/members/${memberId}`, {
    method: "DELETE",
  });

// Expenses
export const createExpense = (data) =>
  request("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getExpenses = (groupId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.member_id) params.set("member_id", filters.member_id);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.limit) params.set("limit", filters.limit);
  if (filters.offset) params.set("offset", filters.offset);
  const qs = params.toString();
  return request(`/groups/${groupId}/expenses${qs ? `?${qs}` : ""}`);
};

export const updateExpense = (id, data) =>
  request(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteExpense = (id) =>
  request(`/expenses/${id}`, { method: "DELETE" });

// Balances
export const getBalances = (groupId, period = {}) => {
  const params = new URLSearchParams();
  if (period.start_date) params.set("start_date", period.start_date);
  if (period.end_date) params.set("end_date", period.end_date);
  const qs = params.toString();
  return request(`/groups/${groupId}/balances${qs ? `?${qs}` : ""}`);
};

export const getBreakdown = (groupId, period = {}) => {
  const params = new URLSearchParams();
  if (period.start_date) params.set("start_date", period.start_date);
  if (period.end_date) params.set("end_date", period.end_date);
  const qs = params.toString();
  return request(`/groups/${groupId}/breakdown${qs ? `?${qs}` : ""}`);
};

export const getFairnessScore = (groupId, period = {}) => {
  const params = new URLSearchParams();
  if (period.start_date) params.set("start_date", period.start_date);
  if (period.end_date) params.set("end_date", period.end_date);
  const qs = params.toString();
  return request(`/groups/${groupId}/fairness-score${qs ? `?${qs}` : ""}`);
};

// Scenarios
export const simulateScenario = (groupId, data) =>
  request(`/groups/${groupId}/simulate`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const saveScenario = (groupId, data) =>
  request(`/groups/${groupId}/scenarios`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getScenarios = (groupId) =>
  request(`/groups/${groupId}/scenarios`);

// Reports
export const getReport = (groupId, period = {}) => {
  const params = new URLSearchParams();
  if (period.start_date) params.set("start_date", period.start_date);
  if (period.end_date) params.set("end_date", period.end_date);
  const qs = params.toString();
  return request(`/groups/${groupId}/report${qs ? `?${qs}` : ""}`);
};

export const getReportCsvUrl = (groupId, period = {}) => {
  const params = new URLSearchParams();
  if (period.start_date) params.set("start_date", period.start_date);
  if (period.end_date) params.set("end_date", period.end_date);
  const qs = params.toString();
  return `${BASE_URL}/groups/${groupId}/report/csv${qs ? `?${qs}` : ""}`;
};

// Categories
export const getCategories = (groupId) =>
  request(`/groups/${groupId}/categories`);

export const createCategory = (groupId, data) =>
  request(`/groups/${groupId}/categories`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCategory = (groupId, catId, data) =>
  request(`/groups/${groupId}/categories/${catId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteCategory = (groupId, catId) =>
  request(`/groups/${groupId}/categories/${catId}`, {
    method: "DELETE",
  });

export const reorderCategories = (groupId, order) =>
  request(`/groups/${groupId}/categories/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ order }),
  });

// Fairness models
export const getFairnessModels = (groupId) =>
  request(`/groups/${groupId}`).then(
    (res) => res.data.fairness_models || []
  );

export const updateFairnessModel = (groupId, category, data) =>
  request(`/groups/${groupId}/fairness-models/${category}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
