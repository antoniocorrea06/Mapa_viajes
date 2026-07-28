import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eetpzvdvpcdyngbpxggu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dyhXIH7rBE1b0FHaqr1AEA_hFwCg5m4";
const TABLE_NAME = "lugares";

const TIPOS = [
  { value: "Restaurante", emoji: "🍽️" },
  { value: "Monumento", emoji: "🗿" },
  { value: "Plaza", emoji: "🏛️" },
  { value: "Mirador", emoji: "🌄" },
  { value: "Museo", emoji: "🖼️" },
  { value: "Naturaleza", emoji: "🌲" },
  { value: "Alojamiento", emoji: "🏨" },
  { value: "Rutas", emoji: "🥾" },
  { value: "Otro", emoji: "📍" },
];

const DEFAULT_CENTER = [48.8566, 5.0]; // centrado en Europa occidental
const DEFAULT_ZOOM = 4;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const elements = {
  authPanel: document.querySelector("#auth-panel"),
  mainPanel: document.querySelector("#main-panel"),
  authTabLogin: document.querySelector("#auth-tab-login"),
  authTabSignup: document.querySelector("#auth-tab-signup"),
  loginForm: document.querySelector("#login-form"),
  loginEmailInput: document.querySelector("#login-email-input"),
  loginPasswordInput: document.querySelector("#login-password-input"),
  signupForm: document.querySelector("#signup-form"),
  signupUsernameInput: document.querySelector("#signup-username-input"),
  signupEmailInput: document.querySelector("#signup-email-input"),
  signupPasswordInput: document.querySelector("#signup-password-input"),
  loginStatus: document.querySelector("#login-status"),
  sessionInfo: document.querySelector("#session-info"),
  logoutButton: document.querySelector("#logout-button"),

  tabLista: document.querySelector("#tab-lista"),
  tabMapa: document.querySelector("#tab-mapa"),
  viewLista: document.querySelector("#view-lista"),
  viewMapa: document.querySelector("#view-mapa"),

  form: document.querySelector("#place-form"),
  nameInput: document.querySelector("#place-name-input"),
  tipoInput: document.querySelector("#place-tipo-input"),
  paisInput: document.querySelector("#place-pais-input"),
  ciudadInput: document.querySelector("#place-ciudad-input"),
  paisDatalist: document.querySelector("#pais-datalist"),
  ciudadDatalist: document.querySelector("#ciudad-datalist"),
  notaInput: document.querySelector("#place-nota-input"),

  useMyLocationButton: document.querySelector("#use-my-location"),
  addressSearchInput: document.querySelector("#address-search-input"),
  addressSearchButton: document.querySelector("#address-search-button"),
  locationStatus: document.querySelector("#location-status"),
  formMapContainer: document.querySelector("#form-map"),

  filterPais: document.querySelector("#filter-pais"),
  filterCiudad: document.querySelector("#filter-ciudad"),
  filterTipo: document.querySelector("#filter-tipo"),
  filterSearch: document.querySelector("#filter-search"),

  status: document.querySelector("#status"),
  placesList: document.querySelector("#places-list"),
  mainMapContainer: document.querySelector("#main-map"),
};

let allPlaces = [];
let formLat = null;
let formLng = null;

let formMap = null;
let formMarker = null;
let mainMap = null;
let mainMarkersLayer = null;
let mainMapReady = false;

let currentUser = null;
let currentProfile = null;
let profilesMap = new Map(); // user_id -> username

init();

async function init() {
  populateTipoSelects();
  initFormMap();
  attachEventListeners();
  attachAuthListeners();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    await handleAuthenticated(session);
  } else {
    showAuthPanel();
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await handleAuthenticated(session);
    } else {
      currentUser = null;
      currentProfile = null;
      showAuthPanel();
    }
  });
}

function isSupremo() {
  return currentProfile?.rol === "supremo";
}

function attachAuthListeners() {
  elements.authTabLogin.addEventListener("click", () => switchAuthTab("login"));
  elements.authTabSignup.addEventListener("click", () => switchAuthTab("signup"));
  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.signupForm.addEventListener("submit", handleSignupSubmit);
  elements.logoutButton.addEventListener("click", handleLogout);
}

function switchAuthTab(tab) {
  const isLogin = tab === "login";

  elements.authTabLogin.classList.toggle("is-active", isLogin);
  elements.authTabSignup.classList.toggle("is-active", !isLogin);
  elements.authTabLogin.setAttribute("aria-selected", String(isLogin));
  elements.authTabSignup.setAttribute("aria-selected", String(!isLogin));

  elements.loginForm.classList.toggle("hidden", !isLogin);
  elements.signupForm.classList.toggle("hidden", isLogin);
  setLoginStatus("");
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  const email = elements.loginEmailInput.value.trim();
  const password = elements.loginPasswordInput.value;

  const submitButton = elements.loginForm.querySelector("button");
  submitButton.disabled = true;
  setLoginStatus("Iniciando sesión...");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  submitButton.disabled = false;

  if (error) {
    console.error(error);
    setLoginStatus("Email o contraseña incorrectos.");
    return;
  }

  setLoginStatus("");
}

async function handleSignupSubmit(event) {
  event.preventDefault();

  const username = elements.signupUsernameInput.value.trim();
  const email = elements.signupEmailInput.value.trim();
  const password = elements.signupPasswordInput.value;

  const submitButton = elements.signupForm.querySelector("button");
  submitButton.disabled = true;
  setLoginStatus("Creando cuenta...");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  submitButton.disabled = false;

  if (error) {
    console.error(error);
    setLoginStatus("No se pudo crear la cuenta. Revisa los datos o prueba con otro email.");
    return;
  }

  if (data.session) {
    // Confirmación de email desactivada en el proyecto: entra directamente.
    setLoginStatus("");
    return;
  }

  setLoginStatus("Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión.");
  elements.signupForm.reset();
  switchAuthTab("login");
}

function setLoginStatus(message) {
  elements.loginStatus.textContent = message;
}

async function handleLogout() {
  await supabase.auth.signOut();
}

async function handleAuthenticated(session) {
  currentUser = session.user;

  const [{ data: profile, error: profileError }, { data: allProfiles, error: allProfilesError }] =
    await Promise.all([
      supabase.from("profiles").select("rol, email, username").eq("id", currentUser.id).single(),
      supabase.from("profiles").select("id, username, email"),
    ]);

  if (profileError) {
    console.error(profileError);
  }
  if (allProfilesError) {
    console.error(allProfilesError);
  }

  currentProfile = profile ?? { rol: "editor" };
  profilesMap = new Map(
    (allProfiles ?? []).map((p) => [p.id, p.username || p.email || "alguien"])
  );

  showMainPanel();
  await loadPlaces();
}

function showAuthPanel() {
  elements.authPanel.classList.remove("hidden");
  elements.mainPanel.classList.add("hidden");
  elements.loginForm.reset();
  elements.signupForm.reset();
  setLoginStatus("");
}

function showMainPanel() {
  elements.authPanel.classList.add("hidden");
  elements.mainPanel.classList.remove("hidden");
  const rolLabel = isSupremo() ? "Supremo" : "Editor";
  const nombre = currentProfile?.username || currentUser.email;
  elements.sessionInfo.textContent = `${nombre} · ${rolLabel}`;
}

function attachEventListeners() {
  elements.tabLista.addEventListener("click", () => switchTab("lista"));
  elements.tabMapa.addEventListener("click", () => switchTab("mapa"));
  elements.form.addEventListener("submit", handleAddPlace);
  elements.useMyLocationButton.addEventListener("click", handleUseMyLocation);
  elements.addressSearchButton.addEventListener("click", handleSearchAddress);
  elements.filterPais.addEventListener("change", renderFilteredResults);
  elements.filterCiudad.addEventListener("change", renderFilteredResults);
  elements.filterTipo.addEventListener("change", renderFilteredResults);
  elements.filterSearch.addEventListener("input", renderFilteredResults);
  elements.paisInput.addEventListener("input", () => forceUppercase(elements.paisInput));
  elements.ciudadInput.addEventListener("input", () => forceUppercase(elements.ciudadInput));
}

function forceUppercase(input) {
  const cursorPosition = input.selectionStart;
  input.value = input.value.toUpperCase();
  input.setSelectionRange(cursorPosition, cursorPosition);
}

function populateTipoSelects() {
  for (const tipo of TIPOS) {
    const option = document.createElement("option");
    option.value = tipo.value;
    option.textContent = `${tipo.emoji} ${tipo.value}`;
    elements.tipoInput.append(option);
  }

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "Todos los tipos";
  elements.filterTipo.append(allOption);

  for (const tipo of TIPOS) {
    const option = document.createElement("option");
    option.value = tipo.value;
    option.textContent = `${tipo.emoji} ${tipo.value}`;
    elements.filterTipo.append(option);
  }
}

function getTipoEmoji(tipo) {
  return TIPOS.find((t) => t.value === tipo)?.emoji ?? "📍";
}

/* ------------------------------- Pestañas -------------------------------- */

function switchTab(tab) {
  const isLista = tab === "lista";

  elements.tabLista.classList.toggle("is-active", isLista);
  elements.tabMapa.classList.toggle("is-active", !isLista);
  elements.tabLista.setAttribute("aria-selected", String(isLista));
  elements.tabMapa.setAttribute("aria-selected", String(!isLista));

  elements.viewLista.classList.toggle("hidden", !isLista);
  elements.viewMapa.classList.toggle("hidden", isLista);

  if (!isLista) {
    if (!mainMapReady) {
      initMainMap();
    }
    setTimeout(() => {
      mainMap.invalidateSize();
      renderMapMarkers(getFilteredPlaces());
    }, 100);
  }
}

/* ---------------------------- Mapa del formulario -------------------------- */

function initFormMap() {
  formMap = L.map(elements.formMapContainer).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(formMap);

  formMap.on("click", (event) => {
    setFormLocation(event.latlng.lat, event.latlng.lng, null);
    setLocationStatus("Ubicación marcada a mano en el mapa.");
  });
}

function setFormLocation(lat, lng, zoom) {
  formLat = lat;
  formLng = lng;

  if (formMarker) {
    formMarker.setLatLng([lat, lng]);
  } else {
    formMarker = L.marker([lat, lng], { draggable: true }).addTo(formMap);
    formMarker.on("dragend", () => {
      const position = formMarker.getLatLng();
      formLat = position.lat;
      formLng = position.lng;
      setLocationStatus("Ubicación ajustada arrastrando el marcador.");
    });
  }

  formMap.setView([lat, lng], zoom ?? formMap.getZoom());
}

function setLocationStatus(message) {
  elements.locationStatus.textContent = message;
}

function handleUseMyLocation() {
  if (!navigator.geolocation) {
    setLocationStatus("Tu navegador no soporta geolocalización.");
    return;
  }

  setLocationStatus("Obteniendo tu ubicación...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setFormLocation(position.coords.latitude, position.coords.longitude, 15);
      setLocationStatus("Ubicación actual detectada.");
    },
    (error) => {
      console.error(error);
      setLocationStatus("No se pudo obtener tu ubicación. Revisa los permisos del navegador.");
    }
  );
}

async function handleSearchAddress() {
  const query = elements.addressSearchInput.value.trim();

  if (!query) {
    return;
  }

  setLocationStatus("Buscando...");

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    );
    const results = await response.json();

    if (!results || results.length === 0) {
      setLocationStatus(`No se encontró "${query}".`);
      return;
    }

    const { lat, lon, display_name: displayName } = results[0];
    setFormLocation(Number(lat), Number(lon), 15);
    setLocationStatus(`Encontrado: ${displayName}`);
  } catch (error) {
    console.error(error);
    setLocationStatus("No se pudo buscar la dirección. Inténtalo de nuevo.");
  }
}

/* --------------------------------- Guardar --------------------------------- */

async function handleAddPlace(event) {
  event.preventDefault();

  const nombre = elements.nameInput.value.trim();
  const tipo = elements.tipoInput.value;

  if (!nombre || !tipo) {
    return;
  }

  setControlsDisabled(true);

  const { error } = await supabase.from(TABLE_NAME).insert({
    nombre,
    tipo,
    pais: elements.paisInput.value.trim() || null,
    ciudad: elements.ciudadInput.value.trim() || null,
    nota: elements.notaInput.value.trim() || null,
    latitud: formLat,
    longitud: formLng,
    user_id: currentUser.id,
  });

  setControlsDisabled(false);

  if (error) {
    renderError(error);
    return;
  }

  resetForm();
  setStatus("Lugar guardado.");
  await loadPlaces();
}

function resetForm() {
  elements.form.reset();
  formLat = null;
  formLng = null;

  if (formMarker) {
    formMap.removeLayer(formMarker);
    formMarker = null;
  }

  formMap.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  setLocationStatus("");
}

function setControlsDisabled(disabled) {
  for (const el of elements.form.querySelectorAll("input, select, textarea, button")) {
    el.disabled = disabled;
  }
}

/* ---------------------------------- Cargar ---------------------------------- */

async function loadPlaces() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, nombre, tipo, pais, ciudad, nota, latitud, longitud, created_at, user_id")
    .order("created_at", { ascending: false });

  if (error) {
    renderError(error);
    return;
  }

  allPlaces = data ?? [];
  populateFilterOptions();
  renderFilteredResults();
}

function populateFilterOptions() {
  fillSelectWithUnique(elements.filterPais, "pais", "Todos los países");
  fillSelectWithUnique(elements.filterCiudad, "ciudad", "Todas las ciudades");
  fillDatalistWithUnique(elements.paisDatalist, "pais");
  fillDatalistWithUnique(elements.ciudadDatalist, "ciudad");
}

function fillDatalistWithUnique(datalistEl, field) {
  const values = Array.from(
    new Set(allPlaces.map((place) => place[field]).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  datalistEl.innerHTML = "";

  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    datalistEl.append(option);
  }
}

function fillSelectWithUnique(selectEl, field, allLabel) {
  const previousValue = selectEl.value;
  const values = Array.from(
    new Set(allPlaces.map((place) => place[field]).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  selectEl.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = allLabel;
  selectEl.append(allOption);

  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.append(option);
  }

  if (values.includes(previousValue)) {
    selectEl.value = previousValue;
  }
}

function getFilteredPlaces() {
  const pais = elements.filterPais.value;
  const ciudad = elements.filterCiudad.value;
  const tipo = elements.filterTipo.value;
  const search = elements.filterSearch.value.trim().toLowerCase();

  return allPlaces.filter((place) => {
    if (pais && place.pais !== pais) return false;
    if (ciudad && place.ciudad !== ciudad) return false;
    if (tipo && place.tipo !== tipo) return false;
    if (search && !place.nombre.toLowerCase().includes(search)) return false;
    return true;
  });
}

function renderFilteredResults() {
  const filtered = getFilteredPlaces();
  renderList(filtered);

  if (!elements.viewMapa.classList.contains("hidden") && mainMapReady) {
    renderMapMarkers(filtered);
  }
}

function renderList(places) {
  elements.placesList.innerHTML = "";

  if (places.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent = "No hay lugares guardados todavía (o ninguno coincide con el filtro).";
    elements.placesList.append(emptyState);
    return;
  }

  for (const place of places) {
    const card = document.createElement("li");
    card.className = "place-card";

    const header = document.createElement("div");
    header.className = "place-card-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("p");
    title.className = "place-card-title";
    title.textContent = `${getTipoEmoji(place.tipo)} ${place.nombre}`;

    const meta = document.createElement("p");
    meta.className = "place-card-meta";
    const ubicacionTexto = [place.ciudad, place.pais].filter(Boolean).join(", ");
    const esTuyo = place.user_id === currentUser?.id;
    const autor = profilesMap.get(place.user_id) || "alguien";
    const autorTexto = esTuyo ? "Añadido por ti" : `Añadido por ${autor}`;
    meta.textContent = [ubicacionTexto, autorTexto].filter(Boolean).join(" · ");

    titleWrap.append(title, meta);
    header.append(titleWrap);

    card.append(header);

    if (place.nota) {
      const nota = document.createElement("p");
      nota.className = "place-card-nota";
      nota.textContent = place.nota;
      card.append(nota);
    }

    const puedeBorrar = esTuyo || isSupremo();

    if (puedeBorrar) {
      const footer = document.createElement("div");
      footer.className = "place-card-footer";

      const deleteButton = document.createElement("button");
      deleteButton.className = "place-delete";
      deleteButton.type = "button";
      deleteButton.textContent = "Eliminar";
      deleteButton.addEventListener("click", () => handleDeletePlace(place.id));

      footer.append(deleteButton);
      card.append(footer);
    }

    elements.placesList.append(card);
  }
}

async function handleDeletePlace(id) {
  const confirmed = window.confirm("¿Eliminar este lugar de la lista?");

  if (!confirmed) {
    return;
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    renderError(error);
    return;
  }

  await loadPlaces();
}

/* -------------------------------- Mapa principal ------------------------------- */

function initMainMap() {
  mainMap = L.map(elements.mainMapContainer).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(mainMap);

  mainMarkersLayer = L.layerGroup().addTo(mainMap);
  mainMapReady = true;

  window.addEventListener("resize", () => {
    if (mainMapReady && !elements.viewMapa.classList.contains("hidden")) {
      mainMap.invalidateSize();
    }
  });
}

function renderMapMarkers(places) {
  mainMarkersLayer.clearLayers();

  const placesWithLocation = places.filter(
    (place) => place.latitud != null && place.longitud != null
  );

  for (const place of placesWithLocation) {
    const autor = profilesMap.get(place.user_id) || "alguien";
    const popupHtml = `
      <strong>${getTipoEmoji(place.tipo)} ${escapeHtml(place.nombre)}</strong><br />
      ${escapeHtml([place.ciudad, place.pais].filter(Boolean).join(", "))}
      ${place.nota ? `<br /><em>${escapeHtml(place.nota)}</em>` : ""}
      <br /><span class="popup-autor">Añadido por ${escapeHtml(autor)}</span>
    `;

    L.marker([place.latitud, place.longitud]).bindPopup(popupHtml).addTo(mainMarkersLayer);
  }

  if (placesWithLocation.length > 0) {
    const bounds = L.latLngBounds(
      placesWithLocation.map((place) => [place.latitud, place.longitud])
    );
    mainMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* --------------------------------- Estado UI --------------------------------- */

function setStatus(message) {
  elements.status.textContent = message;
}

function renderError(error) {
  console.error(error);
  setStatus("No se pudo conectar con Supabase. Revisa la tabla y las políticas del proyecto.");
}