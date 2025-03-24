const API_BASEURL = process.env.API_BASEURL || "http://localhost:3001";

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
  }
  return response.json();
};

const api = async (endpoint, method = "GET", body = null) => {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null
    };

    const response = await fetch(API_BASEURL + endpoint, options);
    return await handleResponse(response);
  } catch (error) {
    console.error(`Error en ${method} ${endpoint}:`, error.message);
    throw error;
  }
};

// Helpers para operaciones comunes
const get = (endpoint) => api(endpoint);
const patch = (endpoint, data) => api(endpoint, "PATCH", data);
const post = (endpoint, data) => api(endpoint, "POST", data);
const del = (endpoint) => api(endpoint, "DELETE");

export const getBlog = () => 
  // Parámetros query de json-server para que servidor ordene los resultados
  get("/posts?_sort=editedDate,fecha&_order=desc").catch(() => []);

export const getAuthor = (autorId) => 
  get(`/cuentas/${autorId}`).catch(() => ({ nombre: "Anónimo" }));

export const editPost = (id, contenido) => 
  patch(`/posts/${id}`, {
    contenido,
    editedDate: new Date().toISOString()
  });

export const saveNewPost = (contenido) => 
  post("/posts", {
    contenido,
    autoria: 1,
    fecha: new Date().toISOString(),
    editedDate: null
  });

export const deletePost = (id) => del(`/posts/${id}`);