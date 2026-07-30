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
  loginIdentifierInput: document.querySelector("#login-identifier-input"),
  loginPasswordInput: document.querySelector("#login-password-input"),
  signupForm: document.querySelector("#signup-form"),
  signupUsernameInput: document.querySelector("#signup-username-input"),
  signupEmailInput: document.querySelector("#signup-email-input"),
  signupPasswordInput: document.querySelector("#signup-password-input"),
  loginStatus: document.querySelector("#login-status"),
  sessionInfo: document.querySelector("#session-info"),
  logoutButton: document.querySelector("#logout-button"),

  tabLista: document.querySelector("#tab-lista"),
  tabCrear: document.querySelector("#tab-crear"),
  tabMapa: document.querySelector("#tab-mapa"),
  viewLista: document.querySelector("#view-lista"),
  viewCrear: document.querySelector("#view-crear"),
  viewMapa: document.querySelector("#view-mapa"),

  form: document.querySelector("#place-form"),
  nameInput: document.querySelector("#place-name-input"),
  tipoInput: document.querySelector("#place-tipo-input"),
  paisInput: document.querySelector("#place-pais-input"),
  ciudadInput: document.querySelector("#place-ciudad-input"),
  notaInput: document.querySelector("#place-nota-input"),
  paisDatalist: document.querySelector("#pais-datalist"),
  ciudadDatalist: document.querySelector("#ciudad-datalist"),

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

  editModal: document.querySelector("#edit-modal"),
  editForm: document.querySelector("#edit-form"),
  editIdInput: document.querySelector("#edit-id-input"),
  editNameInput: document.querySelector("#edit-name-input"),
  editTipoInput: document.querySelector("#edit-tipo-input"),
  editPaisInput: document.querySelector("#edit-pais-input"),
  editCiudadInput: document.querySelector("#edit-ciudad-input"),
  editNotaInput: document.querySelector("#edit-nota-input"),
  editUseMyLocationButton: document.querySelector("#edit-use-my-location"),
  editAddressSearchInput: document.querySelector("#edit-address-search-input"),
  editAddressSearchButton: document.querySelector("#edit-address-search-button"),
  editLocationStatus: document.querySelector("#edit-location-status"),
  editMapContainer: document.querySelector("#edit-map"),
  editCancelButton: document.querySelector("#edit-cancel"),
};

let allPlaces = [];
let formLat = null;
let formLng = null;
let formDireccion = null;

let formMap = null;
let formMarker = null;
let mainMap = null;
let mainMarkersLayer = null;
let mainMapReady = false;

let editMap = null;
let editMarker = null;
let editMapReady = false;
let editLat = null;
let editLng = null;
let editDireccion = null;
let editingPlaceId = null;

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

function attachEventListeners() {
  elements.tabLista.addEventListener("click", () => switchTab("lista"));
  elements.tabCrear.addEventListener("click", () => switchTab("crear"));
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

  elements.editForm.addEventListener("submit", handleEditSubmit);
  elements.editCancelButton.addEventListener("click", closeEditModal);
  elements.editUseMyLocationButton.addEventListener("click", handleEditUseMyLocation);
  elements.editAddressSearchButton.addEventListener("click", handleEditSearchAddress);
  elements.editPaisInput.addEventListener("input", () => forceUppercase(elements.editPaisInput));
  elements.editCiudadInput.addEventListener("input", () => forceUppercase(elements.editCiudadInput));
}

function forceUppercase(input) {
  const cursorPosition = input.selectionStart;
  input.value = input.value.toUpperCase();
  input.setSelectionRange(cursorPosition, cursorPosition);
}

function populateTipoSelects() {
  for (const selectEl of [elements.tipoInput, elements.editTipoInput]) {
    for (const tipo of TIPOS) {
      const option = document.createElement("option");
      option.value = tipo.value;
      option.textContent = `${tipo.emoji} ${tipo.value}`;
      selectEl.append(option);
    }
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

/* --------------------------------- Auth --------------------------------- */

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

  const identifier = elements.loginIdentifierInput.value.trim();
  const password = elements.loginPasswordInput.value;

  const submitButton = elements.loginForm.querySelector("button");
  submitButton.disabled = true;
  setLoginStatus("Iniciando sesión...");

  let email = identifier;

  if (!identifier.includes("@")) {
    const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
      "get_email_for_username",
      { input_username: identifier }
    );

    if (lookupError || !resolvedEmail) {
      submitButton.disabled = false;
      setLoginStatus("No existe ninguna cuenta con ese nombre de usuario.");
      return;
    }

    email = resolvedEmail;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  submitButton.disabled = false;

  if (error) {
    console.error(error);
    setLoginStatus("Usuario/email o contraseña incorrectos.");
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
    if (error.message?.toLowerCase().includes("already registered")) {
      setLoginStatus("Ese email ya tiene una cuenta.");
    } else {
      setLoginStatus("No se pudo crear la cuenta. Inténtalo de nuevo.");
    }
    return;
  }

  // El trigger de la base de datos crea el perfil; si el username ya
  // existe, la restricción "unique" hará que el perfil no se cree bien.
  // Lo comprobamos aparte para dar un mensaje claro.
  if (data.user) {
    const { data: createdProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!createdProfile) {
      setLoginStatus(
        "Ese nombre de usuario ya está en uso. La cuenta se creó pero prueba con otro username, o contacta para corregirlo."
      );
      return;
    }
  }

  if (data.session) {
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

  setTimeout(() => {
    formMap.invalidateSize();
  }, 100);
}

/* ------------------------------- Pestañas -------------------------------- */

function switchTab(tab) {
  elements.tabLista.classList.toggle("is-active", tab === "lista");
  elements.tabCrear.classList.toggle("is-active", tab === "crear");
  elements.tabMapa.classList.toggle("is-active", tab === "mapa");
  elements.tabLista.setAttribute("aria-selected", String(tab === "lista"));
  elements.tabCrear.setAttribute("aria-selected", String(tab === "crear"));
  elements.tabMapa.setAttribute("aria-selected", String(tab === "mapa"));

  elements.viewLista.classList.toggle("hidden", tab !== "lista");
  elements.viewCrear.classList.toggle("hidden", tab !== "crear");
  elements.viewMapa.classList.toggle("hidden", tab !== "mapa");

  if (tab === "crear") {
    setTimeout(() => formMap.invalidateSize(), 100);
  }

  if (tab === "mapa") {
    if (!mainMapReady) {
      initMainMap();
    }
    setTimeout(() => {
      mainMap.invalidateSize();
      renderMapMarkers(getFilteredPlaces());
    }, 100);
  }
}

/* ------------------------------ Geocodificación ---------------------------- */

async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const result = await response.json();
    return result?.display_name ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/* ---------------------------- Mapa del formulario -------------------------- */

function initFormMap() {
  formMap = L.map(elements.formMapContainer).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(formMap);

  formMap.on("click", async (event) => {
    await setFormLocation(event.latlng.lat, event.latlng.lng, null, null, "Ubicación marcada a mano.");
  });
}

async function setFormLocation(lat, lng, zoom, addressHint, statusPrefix) {
  formLat = lat;
  formLng = lng;

  if (formMarker) {
    formMarker.setLatLng([lat, lng]);
  } else {
    formMarker = L.marker([lat, lng], { draggable: true }).addTo(formMap);
    formMarker.on("dragend", async () => {
      const position = formMarker.getLatLng();
      await setFormLocation(position.lat, position.lng, null, null, "Ajustado arrastrando el marcador.");
    });
  }

  formMap.setView([lat, lng], zoom ?? formMap.getZoom());

  if (addressHint) {
    formDireccion = addressHint;
    setLocationStatus(`Ubicación: ${addressHint}`);
    return;
  }

  setLocationStatus(`${statusPrefix ?? "Ubicación marcada."} Buscando dirección...`);
  formDireccion = await reverseGeocode(lat, lng);
  setLocationStatus(formDireccion ? `Ubicación: ${formDireccion}` : "Ubicación marcada (sin dirección disponible).");
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
    async (position) => {
      await setFormLocation(position.coords.latitude, position.coords.longitude, 15, null, "Ubicación actual detectada.");
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
    await setFormLocation(Number(lat), Number(lon), 15, displayName, null);
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
    direccion: formDireccion,
    user_id: currentUser.id,
  });

  setControlsDisabled(false);

  if (error) {
    renderError(error);
    return;
  }

  resetForm();
  setStatus("Lugar guardado.");
  switchTab("lista");
  await loadPlaces();
}

function resetForm() {
  elements.form.reset();
  formLat = null;
  formLng = null;
  formDireccion = null;

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
    .select("id, nombre, tipo, pais, ciudad, nota, latitud, longitud, direccion, created_at, user_id")
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
    title.addEventListener("click", () => focusPlaceOnMap(place));

    const meta = document.createElement("p");
    meta.className = "place-card-meta";
    const ubicacionTexto = [place.ciudad, place.pais].filter(Boolean).join(", ");
    const esTuyo = place.user_id === currentUser?.id;
    const autor = profilesMap.get(place.user_id) || "alguien";
    const autorTexto = esTuyo ? "Añadido por ti" : `Añadido por ${autor}`;
    meta.textContent = [ubicacionTexto, autorTexto].filter(Boolean).join(" · ");

    titleWrap.append(title, meta);

    if (place.direccion) {
      const direccion = document.createElement("p");
      direccion.className = "place-card-direccion";
      direccion.textContent = `📍 ${place.direccion}`;
      titleWrap.append(direccion);
    }

    header.append(titleWrap);
    card.append(header);

    if (place.nota) {
      const nota = document.createElement("p");
      nota.className = "place-card-nota";
      nota.textContent = place.nota;
      card.append(nota);
    }

    const puedeEditarOBorrar = esTuyo || isSupremo();
    const tieneUbicacion = place.latitud != null && place.longitud != null;

    if (puedeEditarOBorrar || tieneUbicacion) {
      const footer = document.createElement("div");
      footer.className = "place-card-footer";

      if (tieneUbicacion) {
        const mapsButton = document.createElement("button");
        mapsButton.className = "place-maps";
        mapsButton.type = "button";
        mapsButton.textContent = "🧭 Cómo llegar";
        mapsButton.addEventListener("click", (event) => {
          event.stopPropagation();
          openInGoogleMaps(place);
        });
        footer.append(mapsButton);
      }

      if (puedeEditarOBorrar) {
        const editButton = document.createElement("button");
        editButton.className = "place-edit";
        editButton.type = "button";
        editButton.textContent = "Editar";
        editButton.addEventListener("click", (event) => {
          event.stopPropagation();
          openEditModal(place);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "place-delete";
        deleteButton.type = "button";
        deleteButton.textContent = "Eliminar";
        deleteButton.addEventListener("click", (event) => {
          event.stopPropagation();
          handleDeletePlace(place.id);
        });

        footer.append(editButton, deleteButton);
      }

      card.append(footer);
    }

    elements.placesList.append(card);
  }
}

function openInGoogleMaps(place) {
  if (place.latitud == null || place.longitud == null) {
    return;
  }

  const url = `https://www.google.com/maps/search/?api=1&query=${place.latitud},${place.longitud}`;
  window.open(url, "_blank", "noopener");
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

/* --------------------------------- Editar ---------------------------------- */

function openEditModal(place) {
  editingPlaceId = place.id;
  elements.editIdInput.value = place.id;
  elements.editNameInput.value = place.nombre;
  elements.editTipoInput.value = place.tipo;
  elements.editPaisInput.value = place.pais ?? "";
  elements.editCiudadInput.value = place.ciudad ?? "";
  elements.editNotaInput.value = place.nota ?? "";

  editLat = place.latitud;
  editLng = place.longitud;
  editDireccion = place.direccion ?? null;

  elements.editModal.classList.remove("hidden");

  if (!editMapReady) {
    initEditMap();
  }

  setTimeout(() => {
    editMap.invalidateSize();

    if (editMarker) {
      editMap.removeLayer(editMarker);
      editMarker = null;
    }

    if (editLat != null && editLng != null) {
      placeEditMarker(editLat, editLng);
      editMap.setView([editLat, editLng], 14);
      setEditLocationStatus(editDireccion ? `Ubicación: ${editDireccion}` : "Ubicación marcada.");
    } else {
      editMap.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      setEditLocationStatus("");
    }
  }, 100);
}

function closeEditModal() {
  elements.editModal.classList.add("hidden");
  editingPlaceId = null;
}

function initEditMap() {
  editMap = L.map(elements.editMapContainer).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(editMap);

  editMap.on("click", async (event) => {
    await setEditLocation(event.latlng.lat, event.latlng.lng, null, null, "Ubicación marcada a mano.");
  });

  editMapReady = true;
}

function placeEditMarker(lat, lng) {
  editMarker = L.marker([lat, lng], { draggable: true }).addTo(editMap);
  editMarker.on("dragend", async () => {
    const position = editMarker.getLatLng();
    await setEditLocation(position.lat, position.lng, null, null, "Ajustado arrastrando el marcador.");
  });
}

async function setEditLocation(lat, lng, zoom, addressHint, statusPrefix) {
  editLat = lat;
  editLng = lng;

  if (editMarker) {
    editMarker.setLatLng([lat, lng]);
  } else {
    placeEditMarker(lat, lng);
  }

  editMap.setView([lat, lng], zoom ?? editMap.getZoom());

  if (addressHint) {
    editDireccion = addressHint;
    setEditLocationStatus(`Ubicación: ${addressHint}`);
    return;
  }

  setEditLocationStatus(`${statusPrefix ?? "Ubicación marcada."} Buscando dirección...`);
  editDireccion = await reverseGeocode(lat, lng);
  setEditLocationStatus(editDireccion ? `Ubicación: ${editDireccion}` : "Ubicación marcada (sin dirección disponible).");
}

function setEditLocationStatus(message) {
  elements.editLocationStatus.textContent = message;
}

function handleEditUseMyLocation() {
  if (!navigator.geolocation) {
    setEditLocationStatus("Tu navegador no soporta geolocalización.");
    return;
  }

  setEditLocationStatus("Obteniendo tu ubicación...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      await setEditLocation(position.coords.latitude, position.coords.longitude, 15, null, "Ubicación actual detectada.");
    },
    (error) => {
      console.error(error);
      setEditLocationStatus("No se pudo obtener tu ubicación.");
    }
  );
}

async function handleEditSearchAddress() {
  const query = elements.editAddressSearchInput.value.trim();

  if (!query) {
    return;
  }

  setEditLocationStatus("Buscando...");

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    );
    const results = await response.json();

    if (!results || results.length === 0) {
      setEditLocationStatus(`No se encontró "${query}".`);
      return;
    }

    const { lat, lon, display_name: displayName } = results[0];
    await setEditLocation(Number(lat), Number(lon), 15, displayName, null);
  } catch (error) {
    console.error(error);
    setEditLocationStatus("No se pudo buscar la dirección.");
  }
}

async function handleEditSubmit(event) {
  event.preventDefault();

  if (!editingPlaceId) {
    return;
  }

  const submitButton = elements.editForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      nombre: elements.editNameInput.value.trim(),
      tipo: elements.editTipoInput.value,
      pais: elements.editPaisInput.value.trim() || null,
      ciudad: elements.editCiudadInput.value.trim() || null,
      nota: elements.editNotaInput.value.trim() || null,
      latitud: editLat,
      longitud: editLng,
      direccion: editDireccion,
    })
    .eq("id", editingPlaceId);

  submitButton.disabled = false;

  if (error) {
    renderError(error);
    return;
  }

  closeEditModal();
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

function buildPopupHtml(place) {
  const autor = profilesMap.get(place.user_id) || "alguien";
  return `
    <strong>${getTipoEmoji(place.tipo)} ${escapeHtml(place.nombre)}</strong><br />
    ${escapeHtml([place.ciudad, place.pais].filter(Boolean).join(", "))}
    ${place.direccion ? `<br />${escapeHtml(place.direccion)}` : ""}
    ${place.nota ? `<br /><em>${escapeHtml(place.nota)}</em>` : ""}
    <br /><span class="popup-autor">Añadido por ${escapeHtml(autor)}</span>
    <br /><a class="popup-maps-link" href="https://www.google.com/maps/search/?api=1&query=${place.latitud},${place.longitud}" target="_blank" rel="noopener">🧭 Cómo llegar (Google Maps)</a>
  `;
}

function renderMapMarkers(places) {
  mainMarkersLayer.clearLayers();

  const placesWithLocation = places.filter(
    (place) => place.latitud != null && place.longitud != null
  );

  for (const place of placesWithLocation) {
    L.marker([place.latitud, place.longitud])
      .bindPopup(buildPopupHtml(place))
      .addTo(mainMarkersLayer);
  }

  if (placesWithLocation.length > 0) {
    const bounds = L.latLngBounds(
      placesWithLocation.map((place) => [place.latitud, place.longitud])
    );
    mainMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }
}

function focusPlaceOnMap(place) {
  if (place.latitud == null || place.longitud == null) {
    window.alert("Este lugar no tiene ubicación guardada.");
    return;
  }

  switchTab("mapa");

  setTimeout(() => {
    mainMap.invalidateSize();
    mainMap.setView([place.latitud, place.longitud], 15);
    L.popup()
      .setLatLng([place.latitud, place.longitud])
      .setContent(buildPopupHtml(place))
      .openOn(mainMap);
  }, 150);
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