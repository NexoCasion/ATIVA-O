const API_BASE = "/api";
const STATUS_ORDER = ["Pendente", "Em andamento", "Finalizado", "Cancelado"];
const DEFAULT_AUTO_REFRESH_SECONDS = 15;
const FULL_PAGE_RESET_MS = 3 * 60 * 1000;
const CHASSIS_PATTERN = /^[A-Z]{2}\d{6}$/;
const THEME_STORAGE_KEY = "uiTheme";
const THEME_LABELS = {
    light: "Tema escuro",
    dark: "Tema claro",
};

const ICONS = Object.freeze({
    dashboard: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="7" height="7" rx="2"></rect><rect x="14" y="3" width="7" height="7" rx="2"></rect><rect x="3" y="14" width="7" height="7" rx="2"></rect><rect x="14" y="14" width="7" height="7" rx="2"></rect></svg>`,
    clipboard: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 14h7M8.5 18h4"></path></svg>`,
    wrench: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L4 17l3 3 8.3-8.3a4 4 0 0 0 5-5L18 9l-2.4-2.4L18 4.3"></path></svg>`,
    shieldUser: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"></path><circle cx="12" cy="9" r="2.2"></circle><path d="M8.5 15.5c.8-1.6 2-2.5 3.5-2.5s2.7.9 3.5 2.5"></path></svg>`,
    users: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.6-3.3 2.4-5 5.5-5s4.9 1.7 5.5 5M16 5.5a3 3 0 0 1 0 5.8M16.5 14c2.4.3 3.7 2 4 5"></path></svg>`,
    history: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5M12 7v5l3 2"></path></svg>`,
    sliders: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h7M15 6h5M4 12h3M11 12h9M4 18h9M17 18h3"></path><circle cx="13" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="15" cy="18" r="2"></circle></svg>`,
    gear: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.6 3h4.8l.6 2.2 1.4.8 2.2-.6L21 9.6l-1.6 1.6v1.6l1.6 1.6-2.4 4.2-2.2-.6-1.4.8-.6 2.2H9.6L9 18.8 7.6 18l-2.2.6L3 14.4l1.6-1.6v-1.6L3 9.6l2.4-4.2 2.2.6L9 5.2 9.6 3Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    eye: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    clock: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`,
    checkCircle: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.7 2.7L16.5 9"></path></svg>`,
    xCircle: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="m9 9 6 6M15 9l-6 6"></path></svg>`,
    queue: `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h10M4 12h8M4 18h6"></path><circle cx="17" cy="15" r="4"></circle><path d="M17 13v2.5l1.5 1"></path></svg>`,
});

function iconSvg(name) {
    return ICONS[name] || ICONS.dashboard;
}

const NAV_ITEMS = {
    ADMIN: [
        { route: "/admin", label: "Dashboard", icon: "dashboard" },
        { route: "/vendedor", label: "Vendedor", icon: "clipboard" },
        { route: "/oficina", label: "Oficina", icon: "wrench" },
        { route: "/admin/usuarios", label: "Usuários", icon: "shieldUser" },
        { route: "/admin/responsaveis", label: "Responsáveis", icon: "users" },
        { route: "/admin/historico", label: "Histórico", icon: "history" },
        { route: "/admin/ferramentas", label: "Ferramentas", icon: "sliders" },
    ],
    VENDEDOR: [
        { route: "/vendedor", label: "Ativações", icon: "clipboard" },
    ],
    OFICINA: [
        { route: "/oficina", label: "Oficina", icon: "wrench" },
    ],
};

const COUNTER_META = {
    "Pendente": { icon: "clock", description: "Aguardando entrada da oficina" },
    "Em andamento": { icon: "wrench", description: "Serviços já iniciados" },
    "Finalizado": { icon: "checkCircle", description: "Ativações concluídas" },
    "Cancelado": { icon: "xCircle", description: "Registros cancelados" },
};

const MECHANIC_SUMMARY_META = [
    { key: "queue", label: "Na fila", description: "Pendentes e em andamento", icon: "queue", className: "na-fila" },
    { key: "inProgress", label: "Em andamento", description: "Em execução na oficina", icon: "wrench", className: "em-andamento" },
    { key: "finished", label: "Finalizadas", description: "Concluídas no dia", icon: "checkCircle", className: "finalizadas" },
    { key: "cancelled", label: "Canceladas", description: "Registros encerrados", icon: "xCircle", className: "canceladas" },
];

const HISTORY_ACTION_LABELS = {
    activation_created: "Ativa\u00e7\u00e3o criada",
    activation_updated: "Ativa\u00e7\u00e3o editada",
    activation_cancelled: "Ativa\u00e7\u00e3o cancelada",
    activation_deleted: "Ativa\u00e7\u00e3o exclu\u00edda",
    status_changed: "Status alterado",
    service_finished: "Servi\u00e7o finalizado",
    mechanic_notes_updated: "Observa\u00e7\u00e3o da oficina atualizada",
    user_created: "Usu\u00e1rio criado",
    user_updated: "Usu\u00e1rio editado",
    user_deleted: "Usu\u00e1rio exclu\u00eddo",
    password_changed: "Senha alterada",
    person_created: "Respons\u00e1vel criado",
    person_updated: "Respons\u00e1vel editado",
    settings_updated: "Configura\u00e7\u00f5es alteradas",
    login_success: "Login realizado",
    logout: "Logout realizado",
};

const HISTORY_FIELD_ORDER = [
    "id",
    "motorcycle_model",
    "chassis",
    "order_date",
    "seller_responsible_name",
    "created_by",
    "mechanic_responsible_name",
    "activation_date",
    "activation_time",
    "client_name",
    "client_cpf",
    "status",
    "notes",
    "mechanic_notes",
    "created_at",
    "updated_at",
    "last_changed_by",
    "seller_responsible_id",
    "mechanic_responsible_id",
];

const HISTORY_FIELD_LABELS = {
    id: "ID",
    motorcycle_model: "Modelo da moto",
    chassis: "Chassi",
    order_date: "Data de pedido",
    seller_responsible_id: "ID vendedor",
    seller_responsible_name: "Vendedor respons\u00e1vel",
    mechanic_responsible_id: "ID mec\u00e2nico",
    mechanic_responsible_name: "Mec\u00e2nico respons\u00e1vel",
    activation_date: "Data de ativa\u00e7\u00e3o",
    activation_time: "Hor\u00e1rio",
    client_name: "Cliente",
    client_cpf: "CPF do cliente",
    notes: "Observa\u00e7\u00f5es do vendedor",
    mechanic_notes: "Observa\u00e7\u00f5es do mec\u00e2nico",
    status: "Status",
    created_at: "Criado em",
    updated_at: "\u00daltima altera\u00e7\u00e3o",
    created_by: "Usu\u00e1rio do cadastro",
    last_changed_by: "\u00daltimo usu\u00e1rio",
    scheduling_message: "Mensagem de agendamento",
    name: "Nome",
    username: "Login",
    profile: "Perfil",
    active: "Ativo",
    must_change_password: "Exige troca de senha",
    type: "Tipo",
};

const SECTION_BY_ROUTE = {
    "/admin": "dashboardSection",
    "/vendedor": "sellerSection",
    "/oficina": "officeSection",
    "/admin/usuarios": "usersSection",
    "/admin/responsaveis": "peopleSection",
    "/admin/historico": "historySection",
    "/admin/ferramentas": "toolsSection",
};

const elements = {
    loginScreen: document.getElementById("loginScreen"),
    appShell: document.getElementById("appShell"),
    loginForm: document.getElementById("loginForm"),
    loginUsername: document.getElementById("loginUsername"),
    loginPassword: document.getElementById("loginPassword"),
    sessionBadge: document.getElementById("sessionBadge"),
    sessionAvatar: document.getElementById("sessionAvatar"),
    logoutButton: document.getElementById("logoutButton"),
    themeToggle: document.getElementById("themeToggle"),
    globalResetCountdown: document.getElementById("globalResetCountdown"),
    sessionUserLabel: document.getElementById("sessionUserLabel"),
    sessionProfileLabel: document.getElementById("sessionProfileLabel"),
    heroSubtitle: document.getElementById("heroSubtitle"),
    mainNav: document.getElementById("mainNav"),
    panels: document.querySelectorAll(".view-panel"),
    roleVisibility: document.querySelectorAll("[data-role-visibility]"),
    toast: document.getElementById("toast"),
    dashboardDate: document.getElementById("dashboardDate"),
    dashboardFilters: document.getElementById("dashboardFilters"),
    dashboardCounters: document.getElementById("dashboardCounters"),
    delayedList: document.getElementById("delayedList"),
    upcomingList: document.getElementById("upcomingList"),
    dashboardBoard: document.getElementById("dashboardBoard"),
    activationForm: document.getElementById("activationForm"),
    activationId: document.getElementById("activationId"),
    sellerFormTitle: document.getElementById("sellerFormTitle"),
    motorcycleModel: document.getElementById("motorcycleModel"),
    chassis: document.getElementById("chassis"),
    chassisError: document.getElementById("chassisError"),
    orderDate: document.getElementById("orderDate"),
    sellerResponsibleInput: document.getElementById("sellerResponsibleInput"),
    sellerResponsibleOptions: document.getElementById("sellerResponsibleOptions"),
    activationDate: document.getElementById("activationDate"),
    activationTime: document.getElementById("activationTime"),
    schedulePreviewMessage: document.getElementById("schedulePreviewMessage"),
    clientName: document.getElementById("clientName"),
    clientCpf: document.getElementById("clientCpf"),
    notes: document.getElementById("notes"),
    status: document.getElementById("status"),
    resetSellerFormButton: document.getElementById("resetSellerFormButton"),
    sellerFilters: document.getElementById("sellerFilters"),
    filterStartDate: document.getElementById("filterStartDate"),
    filterEndDate: document.getElementById("filterEndDate"),
    filterClient: document.getElementById("filterClient"),
    filterChassis: document.getElementById("filterChassis"),
    filterSeller: document.getElementById("filterSeller"),
    filterMechanic: document.getElementById("filterMechanic"),
    filterStatus: document.getElementById("filterStatus"),
    clearFiltersButton: document.getElementById("clearFiltersButton"),
    sellerTableBody: document.getElementById("sellerTableBody"),
    sellerDailyDashboard: document.getElementById("sellerDailyDashboard"),
    sellerDailyDate: document.getElementById("sellerDailyDate"),
    sellerDailyTotal: document.getElementById("sellerDailyTotal"),
    sellerDailyAvailable: document.getElementById("sellerDailyAvailable"),
    sellerDailyProgressBar: document.getElementById("sellerDailyProgressBar"),
    sellerNextDaySummary: document.getElementById("sellerNextDaySummary"),
    sellerNextDate: document.getElementById("sellerNextDate"),
    sellerNextTotal: document.getElementById("sellerNextTotal"),
    sellerNextAvailable: document.getElementById("sellerNextAvailable"),
    sellerNextProgressBar: document.getElementById("sellerNextProgressBar"),
    sellerDailyPending: document.getElementById("sellerDailyPending"),
    sellerDailyInProgress: document.getElementById("sellerDailyInProgress"),
    sellerDailyFinished: document.getElementById("sellerDailyFinished"),
    sellerDailyCancelled: document.getElementById("sellerDailyCancelled"),
    mechanicResponsibleInput: document.getElementById("mechanicResponsibleInput"),
    mechanicResponsibleOptions: document.getElementById("mechanicResponsibleOptions"),
    mechanicDate: document.getElementById("mechanicDate"),
    mechanicSummary: document.getElementById("mechanicSummary"),
    mechanicList: document.getElementById("mechanicList"),
    userForm: document.getElementById("userForm"),
    userName: document.getElementById("userName"),
    userUsername: document.getElementById("userUsername"),
    userPassword: document.getElementById("userPassword"),
    userProfile: document.getElementById("userProfile"),
    userActive: document.getElementById("userActive"),
    userMustChangePassword: document.getElementById("userMustChangePassword"),
    usersTableBody: document.getElementById("usersTableBody"),
    userActionsDialog: document.getElementById("userActionsDialog"),
    userActionsTitle: document.getElementById("userActionsTitle"),
    userActionsSubtitle: document.getElementById("userActionsSubtitle"),
    closeUserActionsDialog: document.getElementById("closeUserActionsDialog"),
    peopleFilters: document.getElementById("peopleFilters"),
    peopleTypeFilter: document.getElementById("peopleTypeFilter"),
    peopleSearch: document.getElementById("peopleSearch"),
    peopleIncludeInactive: document.getElementById("peopleIncludeInactive"),
    peopleTableBody: document.getElementById("peopleTableBody"),
    historyFilters: document.getElementById("historyFilters"),
    historyStartDate: document.getElementById("historyStartDate"),
    historyEndDate: document.getElementById("historyEndDate"),
    historyStatus: document.getElementById("historyStatus"),
    historySellerName: document.getElementById("historySellerName"),
    historyMechanicName: document.getElementById("historyMechanicName"),
    historyContext: document.getElementById("historyContext"),
    historyTableBody: document.getElementById("historyTableBody"),
    historyDetailsDialog: document.getElementById("historyDetailsDialog"),
    historyDetailsTitle: document.getElementById("historyDetailsTitle"),
    historyDetailsSubtitle: document.getElementById("historyDetailsSubtitle"),
    historyDetailsMeta: document.getElementById("historyDetailsMeta"),
    historyDetailsActivation: document.getElementById("historyDetailsActivation"),
    historyDetailsChanges: document.getElementById("historyDetailsChanges"),
    closeHistoryDetailsDialog: document.getElementById("closeHistoryDetailsDialog"),
    exportForm: document.getElementById("exportForm"),
    exportStartDate: document.getElementById("exportStartDate"),
    exportEndDate: document.getElementById("exportEndDate"),
    exportClient: document.getElementById("exportClient"),
    exportChassis: document.getElementById("exportChassis"),
    exportSeller: document.getElementById("exportSeller"),
    exportMechanic: document.getElementById("exportMechanic"),
    exportStatus: document.getElementById("exportStatus"),
    backupButton: document.getElementById("backupButton"),
    backupResult: document.getElementById("backupResult"),
    settingsForm: document.getElementById("settingsForm"),
    settingsPublicUrl: document.getElementById("settingsPublicUrl"),
    settingsCompanyName: document.getElementById("settingsCompanyName"),
    settingsAutoRefresh: document.getElementById("settingsAutoRefresh"),
};

const state = {
    token: window.localStorage.getItem("authToken") || "",
    user: null,
    currentRoute: "",
    sellerRows: [],
    mechanicRows: [],
    users: [],
    sellerPeople: [],
    mechanicPeople: [],
    adminPeople: [],
    historyRows: [],
    focusedActivationHistoryId: null,
    settings: null,
    autoRefreshId: null,
    mechanicNotesPauseUntil: 0,
    mechanicNotesCountdownId: null,
    fullPageResetAt: 0,
    fullPageResetTimeoutId: null,
    globalResetCountdownId: null,
    pageResetInProgress: false,
    schedulePreviewRequestId: 0,
};

function todayString() {
    return new Date().toISOString().slice(0, 10);
}

function relativeLocalDateString(dayOffset) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function setDefaultSellerDateFilters() {
    if (!elements.filterStartDate.value) {
        elements.filterStartDate.value = relativeLocalDateString(-3);
    }
}

function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatTime(value) {
    return value ? value.slice(0, 5) : "-";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function humanizeHistoryKey(key) {
    return HISTORY_FIELD_LABELS[key] || String(key || "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function historyActionLabel(action) {
    return HISTORY_ACTION_LABELS[action] || humanizeHistoryKey(action);
}

function sortHistoryKeys(keys) {
    return [...keys].sort((first, second) => {
        const firstIndex = HISTORY_FIELD_ORDER.indexOf(first);
        const secondIndex = HISTORY_FIELD_ORDER.indexOf(second);
        const normalizedFirst = firstIndex === -1 ? 999 : firstIndex;
        const normalizedSecond = secondIndex === -1 ? 999 : secondIndex;
        if (normalizedFirst !== normalizedSecond) return normalizedFirst - normalizedSecond;
        return first.localeCompare(second);
    });
}

function historyValuesMatch(first, second) {
    return JSON.stringify(first ?? null) === JSON.stringify(second ?? null);
}

function historyValueIsEmpty(value) {
    return value === null || value === undefined || value === "";
}

function formatHistoryValue(key, value) {
    if (historyValueIsEmpty(value)) return "-";
    if (typeof value === "boolean") return value ? "Sim" : "N\u00e3o";
    if (key === "activation_time") return formatTime(String(value));
    if (key === "activation_date" || key === "order_date") return formatDate(String(value));
    if (key.endsWith("_at") || key === "performed_at") return formatDateTime(String(value));
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
}

function historySnapshot(row) {
    return row.new_value || row.old_value || {};
}

function historyActivationLabel(row) {
    const snapshot = historySnapshot(row);
    const id = row.entity_id || snapshot.id;
    const entityLabel = row.entity_type === "activation"
        ? "Ativa\u00e7\u00e3o"
        : humanizeHistoryKey(row.entity_type || "sistema");
    const title = id ? `${entityLabel} #${id}` : entityLabel;
    const extraValues = row.entity_type === "activation"
        ? [snapshot.motorcycle_model, snapshot.chassis, snapshot.client_name]
        : [snapshot.name, snapshot.username, snapshot.type || snapshot.profile];
    const extra = extraValues
        .filter(Boolean)
        .slice(0, 3)
        .join(" | ");
    return extra ? `${title} - ${extra}` : title;
}

function changedHistoryKeys(row) {
    const oldValue = row.old_value || {};
    const newValue = row.new_value || {};
    const keys = sortHistoryKeys([...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])]);

    if (row.old_value && row.new_value) {
        return keys.filter((key) => !historyValuesMatch(oldValue[key], newValue[key]));
    }
    if (row.new_value) {
        return keys.filter((key) => !historyValueIsEmpty(newValue[key]));
    }
    if (row.old_value) {
        return keys.filter((key) => !historyValueIsEmpty(oldValue[key]));
    }
    return [];
}

function statusClassName(value) {
    return `status-${String(value).toLowerCase().replace(/\s+/g, "-")}`;
}

function getStoredTheme() {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return theme === "dark" ? "dark" : "light";
}

function syncThemeToggle() {
    const theme = document.body.dataset.theme === "dark" ? "dark" : "light";
    if (!elements.themeToggle) return;
    const label = THEME_LABELS[theme];
    const accessibleLabel = elements.themeToggle.querySelector(".sr-only");
    if (accessibleLabel) accessibleLabel.textContent = label;
    elements.themeToggle.setAttribute("aria-label", label);
    elements.themeToggle.setAttribute("title", label);
    elements.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
}

function applyTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    syncThemeToggle();
}

function toggleTheme() {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
        applyTheme(nextTheme);
        return;
    }

    document.body.classList.add("theme-is-changing");
    const updateTheme = () => applyTheme(nextTheme);
    const finishTransition = () => document.body.classList.remove("theme-is-changing");

    if (typeof document.startViewTransition === "function") {
        const transition = document.startViewTransition(updateTheme);
        transition.finished.finally(finishTransition);
        return;
    }

    window.requestAnimationFrame(updateTheme);
    window.clearTimeout(toggleTheme.timerId);
    toggleTheme.timerId = window.setTimeout(finishTransition, 460);
}

function showToast(message, isError = false) {
    elements.toast.textContent = message;
    elements.toast.classList.toggle("is-error", isError);
    elements.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timerId);
    showToast.timerId = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

function getDefaultRoute(profile) {
    return profile === "ADMIN" ? "/admin" : profile === "OFICINA" ? "/oficina" : "/vendedor";
}

function allowedRoutes() {
    return (NAV_ITEMS[state.user?.profile] || []).map((item) => item.route);
}

function routeIsAllowed(route) {
    return allowedRoutes().includes(route);
}

function normalizePath(pathname) {
    if (!pathname || pathname === "/") return state.user ? getDefaultRoute(state.user.profile) : "/";
    return pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
}

async function apiFetch(path, options = {}) {
    const headers = {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
    };
    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";
    let payload;
    if (options.parseAs === "blob") {
        payload = await response.blob();
    } else if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        payload = await response.text();
    }

    if (!response.ok) {
        if (response.status === 401) {
            handleUnauthorized();
        }
        const message = typeof payload === "string" ? payload : payload.detail || "Erro inesperado na API.";
        throw new Error(message);
    }

    return payload;
}

function handleUnauthorized() {
    state.token = "";
    state.user = null;
    window.localStorage.removeItem("authToken");
    elements.sessionBadge?.removeAttribute("open");
    elements.appShell.classList.add("is-hidden");
    elements.loginScreen.classList.remove("is-hidden");
    window.history.replaceState({}, "", "/");
}

function saveSession(token, user) {
    state.token = token;
    state.user = user;
    window.localStorage.setItem("authToken", token);
}

function renderSession() {
    const sessionInitial = (state.user.name || state.user.username || state.user.profile).trim().charAt(0).toUpperCase();
    elements.sessionAvatar.textContent = sessionInitial;
    elements.sessionUserLabel.textContent = state.user.name;
    elements.sessionProfileLabel.textContent = `${state.user.username} • ${state.user.profile}${state.user.must_change_password ? " • Troque a senha padrão" : ""}`;
    elements.sessionBadge?.setAttribute("title", `${state.user.name} (${state.user.username})`);
    elements.loginScreen.classList.add("is-hidden");
    elements.appShell.classList.remove("is-hidden");
    elements.heroSubtitle.textContent = state.user.profile === "ADMIN"
        ? "Acesso total para administrar usuários, responsáveis, histórico e relatórios."
        : state.user.profile === "OFICINA"
            ? "Fila operacional da oficina com mecânico responsável e atualização em tempo real."
            : "Cadastro comercial com vendedor responsável salvo automaticamente.";
}

function renderRoleVisibility() {
    elements.roleVisibility.forEach((node) => {
        const allowed = (node.dataset.roleVisibility || "").split(",").map((value) => value.trim());
        node.classList.toggle("is-hidden", !allowed.includes(state.user.profile));
    });
}

function renderNav() {
    const items = NAV_ITEMS[state.user.profile] || [];
    elements.mainNav.innerHTML = items.map((item) => `
        <button class="view-button ${state.currentRoute === item.route ? "is-active" : ""}" data-route="${item.route}" type="button">
            <span class="view-button-mark">${iconSvg(item.icon)}</span>
            <span>${item.label}</span>
        </button>
    `).join("");
}

function renderSections() {
    elements.panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.id === SECTION_BY_ROUTE[state.currentRoute]);
    });
}

function populateDatalist(listElement, rows) {
    listElement.innerHTML = rows.map((row) => `<option value="${row.name}"></option>`).join("");
}

function findPersonByName(name, type) {
    const list = type === "VENDEDOR" ? state.sellerPeople : state.mechanicPeople;
    return list.find((item) => item.name.toLowerCase() === String(name || "").trim().toLowerCase()) || null;
}

async function loadResponsibleLists() {
    const [sellerPeople, mechanicPeople] = await Promise.all([
        apiFetch("/people?type=VENDEDOR"),
        apiFetch("/people?type=MECANICO"),
    ]);
    state.sellerPeople = sellerPeople;
    state.mechanicPeople = mechanicPeople;
    populateDatalist(elements.sellerResponsibleOptions, sellerPeople);
    populateDatalist(elements.mechanicResponsibleOptions, mechanicPeople);
}

function setSchedulePreviewMessage(message) {
    elements.schedulePreviewMessage.textContent = message;
}

function setChassisError(message = "") {
    const hasError = Boolean(message);
    elements.chassis.classList.toggle("is-invalid", hasError);
    elements.chassisError.textContent = hasError ? message : "Modelo de chassi errado";
    elements.chassisError.classList.toggle("is-hidden", !hasError);
}

function validateChassisField() {
    const value = elements.chassis.value.trim();
    if (!value) {
        setChassisError("");
        return true;
    }
    if (!CHASSIS_PATTERN.test(value)) {
        setChassisError("Modelo de chassi errado");
        return false;
    }
    setChassisError("");
    return true;
}

async function loadSchedulePreview({ showError = false } = {}) {
    if (!state.token) {
        elements.activationDate.value = elements.orderDate.value || todayString();
        elements.activationTime.value = "17:00";
        setSchedulePreviewMessage("O sistema calcula automaticamente a data de ativacao e fixa o horario em 17:00.");
        renderSellerDailySummary([], elements.orderDate.value, [], elements.activationDate.value);
        return;
    }

    const requestId = ++state.schedulePreviewRequestId;
    const query = new URLSearchParams();
    if (elements.orderDate.value) {
        query.set("order_date", elements.orderDate.value);
    }

    try {
        const preview = await apiFetch(`/activations/schedule-preview?${query.toString()}`);
        if (requestId !== state.schedulePreviewRequestId) return;
        elements.activationDate.value = preview.activation_date;
        elements.activationTime.value = formatTime(preview.activation_time);
        setSchedulePreviewMessage(preview.scheduling_message);
        const requestedDate = elements.orderDate.value || preview.activation_date;
        await loadSellerDailySummary(requestedDate, preview.activation_date)
            .catch(() => renderSellerDailySummary([], requestedDate, [], preview.activation_date));
    } catch (error) {
        if (requestId !== state.schedulePreviewRequestId) return;
        elements.activationDate.value = elements.orderDate.value || todayString();
        elements.activationTime.value = "17:00";
        setSchedulePreviewMessage("Nao foi possivel calcular a agenda automatica agora.");
        renderSellerDailySummary([], elements.orderDate.value, [], elements.activationDate.value);
        if (showError) {
            showToast(error.message, true);
        }
    }
}

function resetSellerForm() {
    elements.activationForm.reset();
    elements.activationId.value = "";
    elements.sellerFormTitle.textContent = "Nova ativação";
    elements.orderDate.value = todayString();
    elements.activationDate.value = todayString();
    elements.activationTime.value = "17:00";
    elements.status.value = "Pendente";
    setChassisError("");
    setSchedulePreviewMessage("Calculando a proxima vaga disponivel...");
    void loadSchedulePreview();
}

function sellerPayloadFromForm() {
    const editingRow = state.sellerRows.find((row) => row.id === Number(elements.activationId.value));
    return {
        motorcycle_model: elements.motorcycleModel.value.trim(),
        chassis: elements.chassis.value.trim(),
        order_date: elements.orderDate.value || todayString(),
        seller_responsible_name: elements.sellerResponsibleInput.value.trim(),
        activation_date: elements.activationDate.value,
        activation_time: elements.activationTime.value,
        client_name: elements.clientName.value.trim(),
        client_cpf: elements.clientCpf.value.trim(),
        notes: elements.notes.value.trim(),
        mechanic_notes: editingRow?.mechanic_notes || "",
        status: state.user.profile === "ADMIN" ? elements.status.value : (editingRow?.status || "Pendente"),
    };
}

function fillSellerForm(row) {
    elements.activationId.value = row.id;
    elements.sellerFormTitle.textContent = `Editando ativação #${row.id}`;
    elements.motorcycleModel.value = row.motorcycle_model;
    elements.chassis.value = row.chassis;
    elements.orderDate.value = row.order_date || "";
    elements.sellerResponsibleInput.value = row.seller_responsible_name || "";
    elements.activationDate.value = row.activation_date;
    elements.activationTime.value = formatTime(row.activation_time);
    elements.clientName.value = row.client_name;
    elements.clientCpf.value = row.client_cpf;
    elements.notes.value = row.notes || "";
    elements.status.value = row.status;
    setChassisError("");
    setSchedulePreviewMessage("Ao alterar a data de pedido, o sistema recalcula automaticamente a data de ativacao para a proxima vaga.");
    void loadSellerDailySummary(row.order_date || row.activation_date, row.activation_date);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function sellerQueryString() {
    const query = new URLSearchParams();
    if (elements.filterStartDate.value) query.set("start_date", elements.filterStartDate.value);
    if (elements.filterEndDate.value) query.set("end_date", elements.filterEndDate.value);
    if (elements.filterClient.value.trim()) query.set("client", elements.filterClient.value.trim());
    if (elements.filterChassis.value.trim()) query.set("chassis", elements.filterChassis.value.trim());
    if (elements.filterSeller.value.trim()) query.set("seller", elements.filterSeller.value.trim());
    if (elements.filterMechanic.value.trim()) query.set("mechanic", elements.filterMechanic.value.trim());
    if (elements.filterStatus.value) query.set("status", elements.filterStatus.value);
    return query.toString();
}

function renderSellerTable(rows) {
    state.sellerRows = rows;
    if (!rows.length) {
        elements.sellerTableBody.innerHTML = '<tr><td colspan="10" class="empty-row">Nenhuma ativação encontrada.</td></tr>';
        return;
    }

    elements.sellerTableBody.innerHTML = rows.map((row) => `
        <tr>
            <td>${row.id}</td>
            <td>${formatDate(row.activation_date)}</td>
            <td>${formatTime(row.activation_time)}</td>
            <td>${row.motorcycle_model}</td>
            <td>${row.chassis}</td>
            <td>${row.seller_responsible_name}</td>
            <td>${row.mechanic_responsible_name || "-"}</td>
            <td><span class="status-pill ${statusClassName(row.status)}">${row.status}</span></td>
            <td>${formatDateTime(row.updated_at)}<br><small>${row.last_changed_by}</small></td>
            <td>
                <div class="row-actions">
                    <button type="button" data-action="edit" data-id="${row.id}" ${state.user.profile === "OFICINA" ? "disabled" : ""}>Editar</button>
                    <button type="button" data-action="cancel" data-id="${row.id}" ${state.user.profile === "OFICINA" ? "disabled" : ""}>Cancelar</button>
                    ${state.user.profile === "ADMIN" ? `<button type="button" data-action="history" data-id="${row.id}">Histórico</button><button type="button" data-action="delete" data-id="${row.id}">Excluir</button>` : ""}
                </div>
            </td>
        </tr>
    `).join("");
}

async function loadSellerTable() {
    const query = sellerQueryString();
    const rows = await apiFetch(`/activations${query ? `?${query}` : ""}`);
    renderSellerTable(rows);
}

function renderSellerDailySummary(requestedRows, requestedDate, scheduledRows = requestedRows, scheduledDate = requestedDate) {
    const counts = requestedRows.reduce((result, row) => {
        result[row.status] = (result[row.status] || 0) + 1;
        return result;
    }, {});
    const requestedTotal = requestedRows.filter((row) => row.status !== "Cancelado").length;
    const available = Math.max(0, 8 - requestedTotal);
    const progress = Math.min(100, (requestedTotal / 8) * 100);
    const progressTrack = elements.sellerDailyProgressBar?.parentElement;
    const hasNextDay = Boolean(scheduledDate && scheduledDate !== requestedDate);

    elements.sellerDailyDate.textContent = `Data solicitada: ${formatDate(requestedDate)}`;
    elements.sellerDailyTotal.textContent = String(requestedTotal);
    elements.sellerDailyAvailable.textContent = String(available);
    elements.sellerDailyPending.textContent = String(counts.Pendente || 0);
    elements.sellerDailyInProgress.textContent = String(counts["Em andamento"] || 0);
    elements.sellerDailyFinished.textContent = String(counts.Finalizado || 0);
    elements.sellerDailyCancelled.textContent = String(counts.Cancelado || 0);
    elements.sellerDailyProgressBar.style.width = `${progress}%`;
    progressTrack?.setAttribute("aria-valuenow", String(requestedTotal));
    elements.sellerDailyDashboard.classList.toggle("is-full", available === 0);
    elements.sellerDailyDashboard.classList.toggle("has-next-day", hasNextDay);
    elements.sellerNextDaySummary.classList.toggle("is-hidden", !hasNextDay);

    if (hasNextDay) {
        const nextTotal = scheduledRows.filter((row) => row.status !== "Cancelado").length;
        const nextAvailable = Math.max(0, 8 - nextTotal);
        const nextProgress = Math.min(100, (nextTotal / 8) * 100);
        const nextProgressTrack = elements.sellerNextProgressBar?.parentElement;
        elements.sellerNextDate.textContent = formatDate(scheduledDate);
        elements.sellerNextTotal.textContent = String(nextTotal);
        elements.sellerNextAvailable.textContent = String(nextAvailable);
        elements.sellerNextProgressBar.style.width = `${nextProgress}%`;
        nextProgressTrack?.setAttribute("aria-valuenow", String(nextTotal));
    }
}

async function loadSellerDailySummary(
    requestedDate = elements.orderDate.value || todayString(),
    scheduledDate = elements.activationDate.value || requestedDate,
) {
    const normalizedRequestedDate = requestedDate || todayString();
    const normalizedScheduledDate = scheduledDate || normalizedRequestedDate;
    const dates = [...new Set([normalizedRequestedDate, normalizedScheduledDate])];
    const responses = await Promise.all(dates.map(async (dateValue) => {
        const query = new URLSearchParams({ activation_date: dateValue });
        return [dateValue, await apiFetch(`/activations?${query.toString()}`)];
    }));
    const rowsByDate = Object.fromEntries(responses);
    renderSellerDailySummary(
        rowsByDate[normalizedRequestedDate] || [],
        normalizedRequestedDate,
        rowsByDate[normalizedScheduledDate] || [],
        normalizedScheduledDate,
    );
}

function renderCounters(counts) {
    elements.dashboardCounters.innerHTML = STATUS_ORDER.map((status) => {
        const meta = COUNTER_META[status] || { icon: "dashboard", description: "Sem descricao" };
        return `
            <article class="counter-card counter-card-${statusClassName(status).replace("status-", "")}">
                <span class="metric-icon">${iconSvg(meta.icon)}</span>
                <div class="metric-copy">
                    <p>${status}</p>
                    <strong>${counts[status] ?? 0}</strong>
                    <small>${meta.description}</small>
                </div>
            </article>
        `;
    }).join("");
}

function renderChipList(container, rows, emptyText) {
    if (!rows.length) {
        container.textContent = emptyText;
        return;
    }
    container.innerHTML = rows.map((row) => `
        <span class="chip"><strong>#${row.id}</strong> ${row.motorcycle_model} - ${formatTime(row.activation_time)}</span>
    `).join("");
}

function renderDashboardBoard(rows, delayedIds, upcomingIds) {
    elements.dashboardBoard.innerHTML = STATUS_ORDER.map((status) => {
        const filtered = rows.filter((row) => row.status === status);
        return `
            <section class="board-column">
                <h3>${status}</h3>
                <div class="board-column-content">
                    ${filtered.length ? filtered.map((row) => `
                        <article class="activation-card ${delayedIds.has(row.id) ? "is-delayed" : ""} ${upcomingIds.has(row.id) ? "is-upcoming" : ""}">
                            <strong>${row.motorcycle_model}</strong>
                            <div class="activation-meta">
                                <span>#${row.id} | ${row.chassis}</span>
                                <span>${formatTime(row.activation_time)} | ${row.seller_responsible_name}</span>
                                <span>${row.client_name}</span>
                            </div>
                        </article>
                    `).join("") : '<div class="empty-state">Nenhum registro neste status.</div>'}
                </div>
            </section>
        `;
    }).join("");
}

async function loadDashboard() {
    const query = new URLSearchParams({ target_date: elements.dashboardDate.value });
    const data = await apiFetch(`/dashboard?${query.toString()}`);
    renderCounters(data.counts);
    renderChipList(elements.delayedList, data.delayed, "Nenhuma ativação atrasada.");
    renderChipList(elements.upcomingList, data.upcoming, "Nenhuma ativação próxima.");
    renderDashboardBoard(
        data.activations,
        new Set(data.delayed.map((row) => row.id)),
        new Set(data.upcoming.map((row) => row.id))
    );
}

function renderMechanicSummary(rows) {
    const pendingCount = rows.filter((row) => row.status === "Pendente").length;
    const inProgressCount = rows.filter((row) => row.status === "Em andamento").length;
    const finishedCount = rows.filter((row) => row.status === "Finalizado").length;
    const cancelledCount = rows.filter((row) => row.status === "Cancelado").length;
    const queueCount = pendingCount + inProgressCount;
    const summaryCounts = {
        queue: queueCount,
        inProgress: inProgressCount,
        finished: finishedCount,
        cancelled: cancelledCount,
    };

    elements.mechanicSummary.innerHTML = MECHANIC_SUMMARY_META.map((item) => `
        <article class="office-stat-card office-stat-card-${item.className}">
            <span class="metric-icon">${iconSvg(item.icon)}</span>
            <div class="metric-copy">
                <p>${item.label}</p>
                <strong>${summaryCounts[item.key]}</strong>
                <small>${item.description}</small>
            </div>
        </article>
    `).join("");
}

function renderMechanicCard(row) {
    const quickActions = [];
    if (row.status === "Pendente") {
        quickActions.push(`
            <button
                type="button"
                class="mechanic-action-button mechanic-action-start"
                data-status-action="Em andamento"
                data-id="${row.id}"
            >
                Iniciar serviço
            </button>
        `);
    }
    if (row.status !== "Finalizado" && row.status !== "Cancelado") {
        quickActions.push(`
            <button
                type="button"
                class="mechanic-action-button mechanic-action-finish"
                data-status-action="Finalizado"
                data-id="${row.id}"
            >
                Marcar como finalizada
            </button>
        `);
    }

    const footerMarkup = `
        <div class="mechanic-status-editor">
            <label class="mechanic-status-field">
                Alterar status
                <select data-status-select-id="${row.id}">
                    ${STATUS_ORDER.map((status) => `
                        <option value="${status}" ${row.status === status ? "selected" : ""}>${status}</option>
                    `).join("")}
                </select>
            </label>
            <button
                type="button"
                class="mechanic-action-button mechanic-action-save"
                data-status-save="true"
                data-id="${row.id}"
            >
                Salvar status
            </button>
        </div>
        ${quickActions.length ? `<div class="mechanic-card-actions">${quickActions.join("")}</div>` : `
            <div class="mechanic-card-state ${row.status === "Finalizado" ? "is-finished" : "is-cancelled"}">
                ${row.status === "Finalizado" ? "Serviço concluído" : "Registro cancelado"}
            </div>
        `}
    `;

    return `
        <article class="mechanic-card mechanic-card-${statusClassName(row.status)}">
            <div class="mechanic-card-header">
                <div>
                    <span class="mechanic-order-tag">Chegada #${row.id}</span>
                    <strong>${row.motorcycle_model}</strong>
                </div>
                <span class="status-pill ${statusClassName(row.status)}">${row.status}</span>
            </div>
            <div class="mechanic-meta-grid">
                <span class="mechanic-meta-chip"><b>Chassi</b> ${row.chassis}</span>
                <span class="mechanic-meta-chip"><b>Cliente</b> ${row.client_name}</span>
                <span class="mechanic-meta-chip"><b>Vendedor</b> ${row.seller_responsible_name}</span>
                <span class="mechanic-meta-chip"><b>Entrega</b> ${formatDate(row.activation_date)} às ${formatTime(row.activation_time)}</span>
                <span class="mechanic-meta-chip"><b>Usuário do cadastro</b> ${row.created_by || "-"}</span>
                <span class="mechanic-meta-chip"><b>Mecânico</b> ${row.mechanic_responsible_name || "-"}</span>
            </div>
            <label class="mechanic-notes-field">
                Observações do mecânico
                <textarea rows="3" data-notes-id="${row.id}" placeholder="Descreva o andamento ou a finalização do serviço">${escapeHtml(row.mechanic_notes || "")}</textarea>
            </label>
            <div class="mechanic-notes-actions">
                <span class="mechanic-notes-state" data-notes-state-id="${row.id}" role="timer"></span>
                <button
                    type="button"
                    class="mechanic-action-button mechanic-action-notes"
                    data-notes-save="true"
                    data-id="${row.id}"
                >
                    Salvar observação
                </button>
            </div>
            ${footerMarkup}
        </article>
    `;
}

function renderMechanicList(rows) {
    stopMechanicNotesCountdown();
    state.mechanicNotesPauseUntil = 0;
    state.mechanicRows = rows;
    renderMechanicSummary(rows);

    if (!rows.length) {
        elements.mechanicList.innerHTML = '<div class="empty-state">Nenhuma ativação para a data selecionada.</div>';
        return;
    }

    const activeRows = rows.filter((row) => row.status === "Pendente" || row.status === "Em andamento");
    const archivedRows = rows.filter((row) => row.status === "Finalizado" || row.status === "Cancelado");

    elements.mechanicList.innerHTML = `
        <section class="mechanic-queue-group">
            <div class="mechanic-queue-header">
                <div>
                    <h3>Fila operacional</h3>
                    <p>Use os botões para iniciar o serviço ou marcar a moto como finalizada.</p>
                </div>
            </div>
            <div class="mechanic-grid">
                ${activeRows.length ? activeRows.map(renderMechanicCard).join("") : '<div class="empty-state">Nenhuma moto pendente ou em andamento nesta data.</div>'}
            </div>
        </section>
        ${archivedRows.length ? `
            <details class="mechanic-history-group">
                <summary>Concluídas e canceladas (${archivedRows.length})</summary>
                <div class="mechanic-grid mechanic-grid-archived">
                    ${archivedRows.map(renderMechanicCard).join("")}
                </div>
            </details>
        ` : ""}
    `;
}

async function loadMechanicList() {
    const query = new URLSearchParams({ activation_date: elements.mechanicDate.value });
    const rows = await apiFetch(`/activations?${query.toString()}`);
    renderMechanicList(rows);
}

function renderUsersTable(rows) {
    state.users = rows;
    if (!rows.length) {
        elements.usersTableBody.innerHTML = '<tr><td colspan="5" class="empty-row">Nenhum usuário cadastrado.</td></tr>';
        return;
    }

    elements.usersTableBody.innerHTML = rows.map((row) => `
        <tr>
            <td>${row.name}<br><small>${row.username}</small></td>
            <td>${row.profile}</td>
            <td>${row.active ? "Sim" : "Não"}</td>
            <td>${formatDateTime(row.last_login)}</td>
            <td class="user-actions-cell">
                <button type="button" class="user-menu-trigger" data-user-menu data-id="${row.id}" aria-label="Gerenciar ações do usuário" title="Gerenciar usuário">
                    ${iconSvg("gear")}
                </button>
            </td>
        </tr>
    `).join("");
}

function closeUserActionsMenu() {
    if (elements.userActionsDialog?.open) {
        elements.userActionsDialog.close();
    }
}

function openUserActionsMenu(user) {
    if (!elements.userActionsDialog) return;
    elements.userActionsTitle.textContent = user.name;
    elements.userActionsSubtitle.textContent = `${user.username} · ${user.profile}`;
    elements.userActionsDialog.querySelectorAll("button[data-user-action]").forEach((button) => {
        button.dataset.id = String(user.id);
        if (button.dataset.userAction === "toggle") {
            button.textContent = user.active ? "Desativar usuário" : "Ativar usuário";
        }
    });
    elements.userActionsDialog.showModal();
}

async function loadUsers() {
    const rows = await apiFetch("/admin/users");
    renderUsersTable(rows);
}

function renderPeopleTable(rows) {
    state.adminPeople = rows;
    if (!rows.length) {
        elements.peopleTableBody.innerHTML = '<tr><td colspan="5" class="empty-row">Nenhum responsável encontrado.</td></tr>';
        return;
    }

    elements.peopleTableBody.innerHTML = rows.map((row) => `
        <tr>
            <td>${row.name}</td>
            <td>${row.type}</td>
            <td>${row.active ? "Sim" : "Não"}</td>
            <td>${formatDateTime(row.created_at)}</td>
            <td>
                <div class="row-actions">
                    <button type="button" data-person-action="rename" data-id="${row.id}">Renomear</button>
                    <button type="button" data-person-action="toggle" data-id="${row.id}">${row.active ? "Desativar" : "Ativar"}</button>
                </div>
            </td>
        </tr>
    `).join("");
}

async function loadAdminPeople() {
    const query = new URLSearchParams();
    if (elements.peopleTypeFilter.value) query.set("type", elements.peopleTypeFilter.value);
    if (elements.peopleSearch.value.trim()) query.set("search", elements.peopleSearch.value.trim());
    if (elements.peopleIncludeInactive.value === "true") query.set("include_inactive", "true");
    const rows = await apiFetch(`/admin/people?${query.toString()}`);
    renderPeopleTable(rows);
}

function summarizeHistoryRow(row) {
    const changes = changedHistoryKeys(row);
    if (changes.length) {
        const changedFields = changes.slice(0, 3).map(humanizeHistoryKey).join(", ");
        const suffix = changes.length > 3 ? ` +${changes.length - 3}` : "";
        return `${historyActionLabel(row.action)}: ${changedFields}${suffix}`;
    }
    return row.details || historyActionLabel(row.action) || "-";
}

function historyDetailItem(label, value) {
    return `
        <div class="history-detail-item">
            <span class="history-detail-label">${escapeHtml(label)}</span>
            <strong class="history-detail-value">${escapeHtml(value)}</strong>
        </div>
    `;
}

function renderHistoryActivationSummary(row) {
    const snapshot = historySnapshot(row);
    const items = row.entity_type === "activation"
        ? [
            ["ID", row.entity_id || snapshot.id || "-"],
            ["Modelo", snapshot.motorcycle_model || "-"],
            ["Chassi", snapshot.chassis || "-"],
            ["Cliente", snapshot.client_name || "-"],
            ["Vendedor respons\u00e1vel", snapshot.seller_responsible_name || row.seller_person_name || "-"],
            ["Usu\u00e1rio do cadastro", snapshot.created_by || "-"],
            ["Mec\u00e2nico respons\u00e1vel", snapshot.mechanic_responsible_name || row.mechanic_person_name || "-"],
            ["Entrega", `${formatHistoryValue("activation_date", snapshot.activation_date)} \u00e0s ${formatHistoryValue("activation_time", snapshot.activation_time)}`],
        ]
        : [
            ["ID", row.entity_id || snapshot.id || "-"],
            ["Tipo", humanizeHistoryKey(row.entity_type || "sistema")],
            ["Nome", snapshot.name || "-"],
            ["Login", snapshot.username || "-"],
            ["Perfil/Tipo", snapshot.profile || snapshot.type || "-"],
            ["Ativo", "active" in snapshot ? formatHistoryValue("active", snapshot.active) : "-"],
            ["Criado em", formatHistoryValue("created_at", snapshot.created_at)],
            ["Alterado em", formatHistoryValue("updated_at", snapshot.updated_at)],
        ];
    return items.map(([label, value]) => historyDetailItem(label, value)).join("");
}

function renderHistoryChangeList(row) {
    const oldValue = row.old_value || {};
    const newValue = row.new_value || {};
    const changes = changedHistoryKeys(row);

    if (!changes.length) {
        return `<p class="helper-text">${escapeHtml(row.details || "Nenhuma diferen\u00e7a de valor foi registrada para este evento.")}</p>`;
    }

    return changes.map((key) => `
        <div class="history-change-row">
            <div>
                <span class="history-change-label">Campo</span>
                <strong>${escapeHtml(humanizeHistoryKey(key))}</strong>
            </div>
            <div class="history-change-value">
                <span class="history-change-label">Antes</span>
                <strong>${escapeHtml(formatHistoryValue(key, oldValue[key]))}</strong>
            </div>
            <div class="history-change-value">
                <span class="history-change-label">Depois</span>
                <strong>${escapeHtml(formatHistoryValue(key, newValue[key]))}</strong>
            </div>
        </div>
    `).join("");
}

function openHistoryDetails(row) {
    elements.historyDetailsTitle.textContent = historyActionLabel(row.action);
    elements.historyDetailsSubtitle.textContent = `${historyActivationLabel(row)} - evento #${row.id}`;
    elements.historyDetailsMeta.innerHTML = [
        ["Data/Hora", formatDateTime(row.performed_at)],
        ["Login respons\u00e1vel", row.performed_by_login || "-"],
        ["Status da moto", row.motorcycle_status || "-"],
        ["Tipo de registro", humanizeHistoryKey(row.entity_type || "sistema")],
    ].map(([label, value]) => historyDetailItem(label, value)).join("");
    elements.historyDetailsActivation.innerHTML = renderHistoryActivationSummary(row);
    elements.historyDetailsChanges.innerHTML = renderHistoryChangeList(row);
    elements.historyDetailsDialog?.showModal();
}

function closeHistoryDetails() {
    if (elements.historyDetailsDialog?.open) {
        elements.historyDetailsDialog.close();
    }
}

function handleHistoryTableClick(event) {
    const button = event.target.closest("button[data-history-view]");
    if (!button) return;
    const row = state.historyRows.find((item) => item.id === Number(button.dataset.historyView));
    if (row) openHistoryDetails(row);
}

function renderHistoryTable(rows) {
    state.historyRows = rows;
    elements.historyTableBody.innerHTML = rows.length ? rows.map((row) => `
        <tr>
            <td>${formatDateTime(row.performed_at)}</td>
            <td>${escapeHtml(historyActivationLabel(row))}</td>
            <td>${escapeHtml(historyActionLabel(row.action))}</td>
            <td>${escapeHtml(row.performed_by_login || "-")}</td>
            <td>${escapeHtml(row.seller_person_name || "-")}</td>
            <td>${escapeHtml(row.mechanic_person_name || "-")}</td>
            <td>${escapeHtml(row.motorcycle_status || "-")}</td>
            <td>${escapeHtml(summarizeHistoryRow(row))}</td>
            <td class="history-action-cell">
                <button type="button" class="icon-button history-eye-button" data-history-view="${row.id}" aria-label="Ver detalhes do evento #${row.id}">
                    ${iconSvg("eye")}
                </button>
            </td>
        </tr>
    `).join("") : '<tr><td colspan="9" class="empty-row">Nenhum evento encontrado.</td></tr>';
}

async function loadHistory() {
    if (state.focusedActivationHistoryId) {
        const rows = await apiFetch(`/activations/${state.focusedActivationHistoryId}/history`);
        elements.historyContext.textContent = `Exibindo histórico específico da ativação #${state.focusedActivationHistoryId}.`;
        renderHistoryTable(rows);
        return;
    }

    const query = new URLSearchParams();
    if (elements.historyStartDate.value) query.set("start_date", elements.historyStartDate.value);
    if (elements.historyEndDate.value) query.set("end_date", elements.historyEndDate.value);
    if (elements.historyStatus.value) query.set("status", elements.historyStatus.value);
    const sellerPerson = findPersonByName(elements.historySellerName.value, "VENDEDOR");
    const mechanicPerson = findPersonByName(elements.historyMechanicName.value, "MECANICO");
    if (sellerPerson) query.set("seller_person_id", sellerPerson.id);
    if (mechanicPerson) query.set("mechanic_person_id", mechanicPerson.id);
    const rows = await apiFetch(`/admin/history?${query.toString()}`);
    elements.historyContext.textContent = "Exibindo histórico geral do sistema.";
    renderHistoryTable(rows);
}

async function loadSettings() {
    const settings = await apiFetch("/admin/settings");
    state.settings = settings;
    elements.settingsPublicUrl.value = settings.public_url;
    elements.settingsCompanyName.value = settings.company_name;
    elements.settingsAutoRefresh.value = settings.auto_refresh_seconds;
}

function updateAutoRefreshTimer() {
    if (state.autoRefreshId) {
        window.clearInterval(state.autoRefreshId);
    }
    const seconds = Number(state.settings?.auto_refresh_seconds || DEFAULT_AUTO_REFRESH_SECONDS);
    state.autoRefreshId = window.setInterval(async () => {
        if (!state.user) return;
        try {
            if (state.currentRoute === "/admin") {
                await loadDashboard();
            }
            if (state.currentRoute === "/vendedor") {
                await Promise.all([loadSellerTable(), loadSellerDailySummary()]);
            }
            if (state.currentRoute === "/oficina") {
                if (mechanicNotesAreBeingEdited()) return;
                await loadMechanicList();
            }
        } catch {
            // Mantém a interface operacional mesmo em falhas temporárias.
        }
    }, seconds * 1000);
}

async function loadRouteData(route) {
    if (route === "/admin") {
        await loadDashboard();
        return;
    }
    if (route === "/vendedor") {
        await Promise.all([loadResponsibleLists(), loadSellerTable()]);
        if (!elements.activationId.value) {
            await loadSchedulePreview();
        } else {
            await loadSellerDailySummary();
        }
        return;
    }
    if (route === "/oficina") {
        await Promise.all([loadResponsibleLists(), loadMechanicList()]);
        return;
    }
    if (route === "/admin/usuarios") {
        await loadUsers();
        return;
    }
    if (route === "/admin/responsaveis") {
        await Promise.all([loadResponsibleLists(), loadAdminPeople()]);
        return;
    }
    if (route === "/admin/historico") {
        await Promise.all([loadResponsibleLists(), loadHistory()]);
        return;
    }
    if (route === "/admin/ferramentas") {
        await loadSettings();
    }
}

async function navigateTo(route, { replace = false } = {}) {
    const targetRoute = routeIsAllowed(route) ? route : getDefaultRoute(state.user.profile);
    state.currentRoute = targetRoute;
    renderNav();
    renderSections();
    if (replace) {
        window.history.replaceState({}, "", targetRoute);
    } else if (window.location.pathname !== targetRoute) {
        window.history.pushState({}, "", targetRoute);
    }
    await loadRouteData(targetRoute);
}

async function submitLogin(event) {
    event.preventDefault();
    try {
        const response = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                username: elements.loginUsername.value.trim(),
                password: elements.loginPassword.value,
            }),
        });
        saveSession(response.token, response.user);
        renderSession();
        renderRoleVisibility();
        resetSellerForm();
        elements.dashboardDate.value = todayString();
        elements.mechanicDate.value = todayString();
        state.settings = { auto_refresh_seconds: DEFAULT_AUTO_REFRESH_SECONDS };
        updateAutoRefreshTimer();
        await navigateTo(response.redirect_path, { replace: true });
        showToast("Login realizado com sucesso.");
    } catch (error) {
        showToast(error.message, true);
    }
}

async function submitSellerForm(event) {
    event.preventDefault();
    try {
        const payload = sellerPayloadFromForm();
        if (!payload.seller_responsible_name) {
            throw new Error("Informe o vendedor responsável.");
        }
        if (elements.activationId.value) {
            await apiFetch(`/activations/${elements.activationId.value}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            showToast("Ativação atualizada.");
        } else {
            await apiFetch("/activations", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            showToast("Ativação criada.");
        }
        resetSellerForm();
        await Promise.all([
            loadResponsibleLists(),
            loadSellerTable(),
            state.user.profile === "ADMIN" ? loadDashboard() : Promise.resolve(),
            loadMechanicList().catch(() => null),
        ]);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function submitSellerFormWithSchedule(event) {
    event.preventDefault();
    try {
        if (!validateChassisField()) {
            elements.chassis.focus();
            return;
        }
        const payload = sellerPayloadFromForm();
        if (!payload.seller_responsible_name) {
            throw new Error("Informe o vendedor responsavel.");
        }

        if (elements.activationId.value) {
            const response = await apiFetch(`/activations/${elements.activationId.value}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            showToast(response?.scheduling_message || "Ativacao atualizada.");
        } else {
            const response = await apiFetch("/activations", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            showToast(response?.scheduling_message || "Ativacao criada.");
        }

        resetSellerForm();
        await Promise.all([
            loadResponsibleLists(),
            loadSellerTable(),
            state.user.profile === "ADMIN" ? loadDashboard() : Promise.resolve(),
            loadMechanicList().catch(() => null),
        ]);
    } catch (error) {
        if (String(error.message || "").toLowerCase().includes("chassi")) {
            setChassisError("Modelo de chassi errado");
            elements.chassis.focus();
            return;
        }
        showToast(error.message, true);
    }
}

async function handleSellerTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const row = state.sellerRows.find((item) => item.id === Number(button.dataset.id));
    if (!row) return;

    try {
        if (button.dataset.action === "edit") {
            fillSellerForm(row);
            return;
        }
        if (button.dataset.action === "cancel") {
            if (!window.confirm(`Cancelar a ativação #${row.id}?`)) return;
            await apiFetch(`/activations/${row.id}/cancel`, { method: "POST" });
            showToast("Ativação cancelada.");
        }
        if (button.dataset.action === "delete") {
            if (!window.confirm(`Excluir logicamente o registro #${row.id}?`)) return;
            await apiFetch(`/activations/${row.id}`, { method: "DELETE" });
            showToast("Registro removido logicamente.");
        }
        if (button.dataset.action === "history") {
            state.focusedActivationHistoryId = row.id;
            await navigateTo("/admin/historico");
            return;
        }
        await Promise.all([
            loadSellerTable(),
            loadSellerDailySummary(),
            state.user.profile === "ADMIN" ? loadDashboard() : Promise.resolve(),
            loadMechanicList().catch(() => null),
        ]);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleMechanicAction(event) {
    const button = event.target.closest("button[data-status-action], button[data-status-save], button[data-notes-save]");
    if (!button) return;
    try {
        const isNotesSave = button.dataset.notesSave === "true";
        const mechanicName = elements.mechanicResponsibleInput.value.trim();
        if (!mechanicName) {
            throw new Error(isNotesSave
                ? "Informe o mecânico responsável antes de salvar a observação."
                : "Informe o mecânico responsável antes de alterar o status.");
        }
        const id = Number(button.dataset.id);
        const notesField = document.querySelector(`[data-notes-id="${id}"]`);
        if (isNotesSave) {
            button.disabled = true;
            await apiFetch(`/activations/${id}/mechanic-notes`, {
                method: "PATCH",
                body: JSON.stringify({
                    mechanic_notes: notesField ? notesField.value.trim() : "",
                    mechanic_responsible_name: mechanicName,
                }),
            });
            await Promise.all([
                loadResponsibleLists(),
                loadMechanicList(),
                state.user.profile === "ADMIN" ? loadDashboard() : Promise.resolve(),
                loadSellerTable().catch(() => null),
            ]);
            showToast("Observação salva.");
            return;
        }
        const statusSelect = document.querySelector(`[data-status-select-id="${id}"]`);
        const nextStatus = button.dataset.statusSave === "true"
            ? statusSelect?.value
            : button.dataset.statusAction;
        if (!nextStatus) {
            throw new Error("Selecione um status para continuar.");
        }
        await apiFetch(`/activations/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status: nextStatus,
                mechanic_notes: notesField ? notesField.value.trim() : "",
                mechanic_responsible_name: mechanicName,
            }),
        });
        await Promise.all([
            loadResponsibleLists(),
            loadMechanicList(),
            state.user.profile === "ADMIN" ? loadDashboard() : Promise.resolve(),
            loadSellerTable().catch(() => null),
        ]);
        showToast("Status atualizado.");
    } catch (error) {
        showToast(error.message, true);
    } finally {
        if (button.isConnected) button.disabled = false;
    }
}

function mechanicNotesAreBeingEdited() {
    const activeElement = document.activeElement;
    const notesFieldIsFocused = activeElement?.matches?.("textarea[data-notes-id]");
    const hasUnsavedNotes = elements.mechanicList.querySelector('textarea[data-notes-id][data-dirty="true"]');
    if (!notesFieldIsFocused && !hasUnsavedNotes) {
        state.mechanicNotesPauseUntil = 0;
        return false;
    }
    return Date.now() < state.mechanicNotesPauseUntil;
}

function stopMechanicNotesCountdown() {
    if (!state.mechanicNotesCountdownId) return;
    window.clearInterval(state.mechanicNotesCountdownId);
    state.mechanicNotesCountdownId = null;
}

function formatMechanicNotesCountdown(remainingMs) {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function performFullPageReset() {
    if (state.pageResetInProgress) return;
    state.pageResetInProgress = true;
    if (elements.globalResetCountdown) elements.globalResetCountdown.textContent = "00:00";
    window.location.reload();
}

function updateGlobalResetCountdown() {
    const remainingMs = state.fullPageResetAt - Date.now();
    if (remainingMs <= 0) {
        performFullPageReset();
        return;
    }
    if (elements.globalResetCountdown) {
        elements.globalResetCountdown.textContent = formatMechanicNotesCountdown(remainingMs);
    }
}

function startGlobalPageReset() {
    if (state.fullPageResetTimeoutId) window.clearTimeout(state.fullPageResetTimeoutId);
    if (state.globalResetCountdownId) window.clearInterval(state.globalResetCountdownId);
    state.pageResetInProgress = false;
    state.fullPageResetAt = Date.now() + FULL_PAGE_RESET_MS;
    state.fullPageResetTimeoutId = window.setTimeout(performFullPageReset, FULL_PAGE_RESET_MS);
    state.globalResetCountdownId = window.setInterval(updateGlobalResetCountdown, 1000);
    updateGlobalResetCountdown();
}

function updateMechanicNotesCountdown() {
    const activeNotesField = document.activeElement?.matches?.("textarea[data-notes-id]")
        ? document.activeElement
        : null;
    const dirtyNotesFields = [...elements.mechanicList.querySelectorAll('textarea[data-notes-id][data-dirty="true"]')];
    const trackedFields = new Set(dirtyNotesFields);
    if (activeNotesField) trackedFields.add(activeNotesField);

    if (!trackedFields.size) {
        stopMechanicNotesCountdown();
        state.mechanicNotesPauseUntil = 0;
        elements.mechanicList.querySelectorAll("[data-notes-state-id]").forEach((notesState) => {
            notesState.textContent = "";
            notesState.classList.remove("is-paused", "is-unsaved");
        });
        return;
    }

    const remainingMs = state.fullPageResetAt - Date.now();
    if (remainingMs <= 0) {
        stopMechanicNotesCountdown();
        state.mechanicNotesPauseUntil = 0;
        trackedFields.forEach((notesField) => {
            const notesState = document.querySelector(`[data-notes-state-id="${notesField.dataset.notesId}"]`);
            if (notesState) notesState.textContent = "Recarregando site...";
        });
        performFullPageReset();
        return;
    }

    const countdown = formatMechanicNotesCountdown(remainingMs);
    elements.mechanicList.querySelectorAll("[data-notes-state-id]").forEach((notesState) => {
        const notesField = document.querySelector(`[data-notes-id="${notesState.dataset.notesStateId}"]`);
        const isTracked = trackedFields.has(notesField);
        const isDirty = notesField?.dataset.dirty === "true";
        notesState.textContent = isTracked
            ? `${isDirty ? "Não salvo • atualiza" : "Atualização pausada"} em ${countdown}`
            : "";
        notesState.classList.toggle("is-paused", isTracked);
        notesState.classList.toggle("is-unsaved", Boolean(isTracked && isDirty));
    });
}

function startMechanicNotesCountdown() {
    if (!state.mechanicNotesCountdownId) {
        state.mechanicNotesCountdownId = window.setInterval(updateMechanicNotesCountdown, 1000);
    }
    updateMechanicNotesCountdown();
}

function startMechanicNotesPause() {
    state.mechanicNotesPauseUntil = state.fullPageResetAt;
    startMechanicNotesCountdown();
}

function handleMechanicNotesFocus(event) {
    if (!event.target.closest("textarea[data-notes-id]")) return;
    startMechanicNotesPause();
}

function handleMechanicNotesInput(event) {
    const notesField = event.target.closest("textarea[data-notes-id]");
    if (!notesField) return;
    startMechanicNotesPause();
    const activationId = Number(notesField.dataset.notesId);
    const activation = state.mechanicRows.find((row) => row.id === activationId);
    const isDirty = notesField.value.trim() !== String(activation?.mechanic_notes || "").trim();
    notesField.dataset.dirty = String(isDirty);
    notesField.closest(".mechanic-card")?.classList.toggle("has-unsaved-notes", isDirty);
    updateMechanicNotesCountdown();
}

async function submitUserForm(event) {
    event.preventDefault();
    try {
        await apiFetch("/admin/users", {
            method: "POST",
            body: JSON.stringify({
                name: elements.userName.value.trim(),
                username: elements.userUsername.value.trim(),
                password: elements.userPassword.value,
                profile: elements.userProfile.value,
                active: elements.userActive.value === "true",
                must_change_password: elements.userMustChangePassword.value === "true",
            }),
        });
        elements.userForm.reset();
        await loadUsers();
        showToast("Usuário criado.");
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleUsersTableClick(event) {
    const menuButton = event.target.closest("button[data-user-menu]");
    if (menuButton) {
        const user = state.users.find((item) => item.id === Number(menuButton.dataset.id));
        if (user) openUserActionsMenu(user);
        return;
    }

    const button = event.target.closest("button[data-user-action]");
    if (!button) return;
    const user = state.users.find((item) => item.id === Number(button.dataset.id));
    if (!user) return;
    closeUserActionsMenu();

    try {
        if (button.dataset.userAction === "edit") {
            const name = window.prompt("Novo nome:", user.name);
            if (!name) return;
            const username = window.prompt("Novo usuário:", user.username);
            if (!username) return;
            const profile = window.prompt("Perfil (ADMIN, VENDEDOR, OFICINA):", user.profile);
            if (!profile) return;
            await apiFetch(`/admin/users/${user.id}`, {
                method: "PUT",
                body: JSON.stringify({ name, username, profile: profile.toUpperCase() }),
            });
            showToast("Usuário atualizado.");
        }
        if (button.dataset.userAction === "toggle") {
            await apiFetch(`/admin/users/${user.id}`, {
                method: "PUT",
                body: JSON.stringify({ active: !user.active }),
            });
            showToast("Situação do usuário atualizada.");
        }
        if (button.dataset.userAction === "password") {
            const password = window.prompt(`Nova senha para ${user.username}:`);
            if (!password) return;
            await apiFetch(`/admin/users/${user.id}/password`, {
                method: "PUT",
                body: JSON.stringify({ password }),
            });
            showToast("Senha alterada.");
        }
        if (button.dataset.userAction === "delete") {
            if (!window.confirm(`Excluir o usuário ${user.username}? Esta ação remove o login de forma definitiva.`)) return;
            await apiFetch(`/admin/users/${user.id}`, {
                method: "DELETE",
            });
            showToast("Usuário excluído.");
        }
        await loadUsers();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handlePeopleTableClick(event) {
    const button = event.target.closest("button[data-person-action]");
    if (!button) return;
    const person = state.adminPeople.find((item) => item.id === Number(button.dataset.id));
    if (!person) return;

    try {
        if (button.dataset.personAction === "rename") {
            const newName = window.prompt("Novo nome do responsável:", person.name);
            if (!newName) return;
            await apiFetch(`/admin/people/${person.id}`, {
                method: "PUT",
                body: JSON.stringify({ name: newName }),
            });
            showToast("Responsável renomeado.");
        }
        if (button.dataset.personAction === "toggle") {
            await apiFetch(`/admin/people/${person.id}`, {
                method: "PUT",
                body: JSON.stringify({ active: !person.active }),
            });
            showToast("Situação do responsável atualizada.");
        }
        await Promise.all([loadResponsibleLists(), loadAdminPeople()]);
    } catch (error) {
        showToast(error.message, true);
    }
}

async function submitExportForm(event) {
    event.preventDefault();
    try {
        const query = new URLSearchParams();
        if (elements.exportStartDate.value) query.set("start_date", elements.exportStartDate.value);
        if (elements.exportEndDate.value) query.set("end_date", elements.exportEndDate.value);
        if (elements.exportClient.value.trim()) query.set("client", elements.exportClient.value.trim());
        if (elements.exportChassis.value.trim()) query.set("chassis", elements.exportChassis.value.trim());
        if (elements.exportSeller.value.trim()) query.set("seller", elements.exportSeller.value.trim());
        if (elements.exportMechanic.value.trim()) query.set("mechanic", elements.exportMechanic.value.trim());
        if (elements.exportStatus.value) query.set("status", elements.exportStatus.value);
        const fileContent = await apiFetch(`/export?${query.toString()}`, { parseAs: "text" });
        const blob = new Blob([fileContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "relatorio-ativacoes.csv";
        link.click();
        URL.revokeObjectURL(link.href);
        showToast("Relatório exportado.");
    } catch (error) {
        showToast(error.message, true);
    }
}

async function handleBackup() {
    try {
        const result = await apiFetch("/admin/backup", { method: "POST" });
        elements.backupResult.textContent = `Backup criado em: ${result.backup_path}`;
        showToast("Backup manual criado.");
    } catch (error) {
        showToast(error.message, true);
    }
}

async function submitSettingsForm(event) {
    event.preventDefault();
    try {
        const settings = await apiFetch("/admin/settings", {
            method: "PUT",
            body: JSON.stringify({
                public_url: elements.settingsPublicUrl.value.trim(),
                company_name: elements.settingsCompanyName.value.trim(),
                auto_refresh_seconds: Number(elements.settingsAutoRefresh.value),
            }),
        });
        state.settings = settings;
        updateAutoRefreshTimer();
        showToast("Configurações salvas.");
    } catch (error) {
        showToast(error.message, true);
    }
}

async function performLogout() {
    try {
        await apiFetch("/auth/logout", { method: "POST" });
    } catch {
        // Mesmo que a sessão já tenha expirado, limpamos o estado local.
    }
    handleUnauthorized();
    showToast("Sessão encerrada.");
}

function bindEvents() {
    elements.loginForm.addEventListener("submit", submitLogin);
    elements.logoutButton.addEventListener("click", performLogout);
    elements.themeToggle?.addEventListener("click", toggleTheme);
    elements.mainNav.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-route]");
        if (!button) return;
        state.focusedActivationHistoryId = button.dataset.route === "/admin/historico" ? state.focusedActivationHistoryId : null;
        try {
            await navigateTo(button.dataset.route);
        } catch (error) {
            showToast(error.message, true);
        }
    });
    elements.dashboardFilters.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await loadDashboard();
        } catch (error) {
            showToast(error.message, true);
        }
    });
    elements.activationForm.addEventListener("submit", submitSellerFormWithSchedule);
    elements.resetSellerFormButton.addEventListener("click", resetSellerForm);
    elements.chassis.addEventListener("input", () => {
        if (!elements.chassis.value.trim()) {
            setChassisError("");
            return;
        }
        validateChassisField();
    });
    elements.chassis.addEventListener("blur", validateChassisField);
    elements.orderDate.addEventListener("change", async () => {
        try {
            await loadSchedulePreview({ showError: true });
        } catch (error) {
            showToast(error.message, true);
        }
    });
    elements.sellerFilters.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await loadSellerTable();
        } catch (error) {
            showToast(error.message, true);
        }
    });
    elements.clearFiltersButton.addEventListener("click", async () => {
        elements.sellerFilters.reset();
        try {
            await loadSellerTable();
        } catch (error) {
            showToast(error.message, true);
        }
    });
    elements.sellerTableBody.addEventListener("click", handleSellerTableClick);
    elements.mechanicDate.addEventListener("change", async () => {
        try {
            await loadMechanicList();
        } catch (error) {
            showToast(error.message, true);
        }
    });
    elements.mechanicList.addEventListener("click", handleMechanicAction);
    elements.mechanicList.addEventListener("focusin", handleMechanicNotesFocus);
    elements.mechanicList.addEventListener("input", handleMechanicNotesInput);
    elements.userForm.addEventListener("submit", submitUserForm);
    elements.usersTableBody.addEventListener("click", handleUsersTableClick);
    elements.userActionsDialog?.addEventListener("click", handleUsersTableClick);
    elements.closeUserActionsDialog?.addEventListener("click", closeUserActionsMenu);
    elements.userActionsDialog?.addEventListener("click", (event) => {
        if (event.target === elements.userActionsDialog) closeUserActionsMenu();
    });
    elements.peopleFilters.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await loadAdminPeople();
        } catch (error) {
            showToast(error.message, true);
        }
    });
    elements.peopleTableBody.addEventListener("click", handlePeopleTableClick);
    elements.historyFilters.addEventListener("submit", async (event) => {
        event.preventDefault();
        state.focusedActivationHistoryId = null;
        try {
            await loadHistory();
        } catch (error) {
            showToast(error.message, true);
        }
    });
    elements.historyTableBody.addEventListener("click", handleHistoryTableClick);
    elements.closeHistoryDetailsDialog?.addEventListener("click", closeHistoryDetails);
    elements.historyDetailsDialog?.addEventListener("click", (event) => {
        if (event.target === elements.historyDetailsDialog) closeHistoryDetails();
    });
    elements.exportForm.addEventListener("submit", submitExportForm);
    elements.backupButton.addEventListener("click", handleBackup);
    elements.settingsForm.addEventListener("submit", submitSettingsForm);
    window.addEventListener("popstate", async () => {
        if (!state.user) return;
        try {
            await navigateTo(normalizePath(window.location.pathname), { replace: true });
        } catch (error) {
            showToast(error.message, true);
        }
    });
}

async function restoreSession() {
    if (!state.token) {
        return false;
    }
    try {
        const user = await apiFetch("/auth/me");
        state.user = user;
        renderSession();
        renderRoleVisibility();
        elements.dashboardDate.value = todayString();
        elements.mechanicDate.value = todayString();
        state.settings = { auto_refresh_seconds: DEFAULT_AUTO_REFRESH_SECONDS };
        updateAutoRefreshTimer();
        await navigateTo(normalizePath(window.location.pathname), { replace: true });
        return true;
    } catch {
        handleUnauthorized();
        return false;
    }
}

async function bootstrap() {
    startGlobalPageReset();
    applyTheme(getStoredTheme());
    bindEvents();
    resetSellerForm();
    setDefaultSellerDateFilters();
    elements.dashboardDate.value = todayString();
    elements.mechanicDate.value = todayString();
    const restored = await restoreSession();
    if (!restored) {
        elements.loginScreen.classList.remove("is-hidden");
        elements.appShell.classList.add("is-hidden");
    }
}

bootstrap();
