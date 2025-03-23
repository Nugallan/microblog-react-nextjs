'use client'

import { useState, useEffect, useOptimistic, useTransition } from "react";
import { getAuthor, getBlog, editPost, saveNewPost, deletePost } from "./api";
import { useRef } from "react";

function Post({ id, autoria, contenido, fecha, editedDate, onChange }) {
  const [nombre, setNombre] = useState("");
  /* const [pendiente, iniciarTransicion] = useTransition(); */
  const fechaObj = new Date(editedDate || fecha);
  /* const dia = fechaObj.getUTCDate();
  const mes = fechaObj.getUTCMonth() + 1;
  const año = fechaObj.getUTCFullYear(); */
  
  const fechaFormateada = `${fechaObj.getUTCDate()}/${fechaObj.getUTCMonth() + 1}/${fechaObj.getUTCFullYear()}`;

  const handleSubmit = async (formData, e) => {
    try {
      const nuevoContenido = formData.get("postContent");
      const formElement = document.getElementById(`form-editar-${id}`);
      // Enviar acción completa
      onChange({ 
        type: "edit", 
        id: id, 
        newContent: nuevoContenido 
      });
      
      await editPost(id, nuevoContenido);
      formElement.reset();
    } catch (error) {
      console.error("Error editando:", error);
      onChange({
        type: "edit-revert",
        id: id,
        originalContent: contenido
      });
    }
  };

/*   useEffect(() => {
    iniciarTransicion(async () => {
      const n = await getAuthor(autoria)
      setNombre(n?.nombre)
    });
  }, [autoria]); */
  
  useEffect(() => {
    const cargarAutor = async () => {
      const autor = await getAuthor(autoria);
      setNombre(autor?.nombre || "");
    };
    cargarAutor();
  }, [autoria]);

  /* const handleClick = () => {
    deletePost(id).then(onChange);
  }; */

  return (
    <div className="post">
      <div className={nombre ? "aut" : "aut pendiente"}>
        {nombre || "Cargando..."}
      </div>
      <div className="date">
        {fechaFormateada}
        {editedDate && <span className="edited-label"> (Editado)</span>}
      </div>
      <div className="text">{contenido}</div>
      <div className="opt">
        <button onClick={() => deletePost(id).then(onChange)}>Eliminar</button>
        <FormularioEdicion onSubmit={handleSubmit} id={`form-editar-${id}`} />
      </div>
    </div>
  );
}

function FormularioEdicion({ onSubmit, id }) {
  return (
    <details>
      <summary>Editar...</summary>
      <form 
        id={id} // Usar el ID proporcionado
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.target));
        }}
      >
        <textarea name="postContent" placeholder="Editar post" required />
        <button type="submit">Publicar edición</button>
      </form>
    </details>
  );
}

/* const useFlag = (valorDefecto = false) => {
  const [valor, setValor] = useState(valorDefecto);
  return [valor, () => setValor(true), () => setValor(false)];
}; */

function App() {
  const formRef = useRef(null);
  const [blog, setBlog] = useState([]);
  const [necesitaActualizacion, setNecesitaActualizacion] = useState(false);
  /* const [obsoleto, set, unset] = useFlag(); */
  const [blogOptimista, agregarPostOptimista] = useOptimistic(
    blog,
    (state, action) => {
      switch (action.type) {
        case "add":
          return [
            {
              id: "pendingPost",
              autoria: 1,
              contenido: action.contenido,
              fecha: new Date(),
            },
            ...state,
          ];
          
        case "edit":
          return state.map(post => 
            post.id === action.id ? { 
              ...post, 
              contenido: action.newContent, 
              editedDate: new Date().toISOString() 
            } : post
          );
        
        case "edit":
          return state.map(post => 
            post.id === action.id ? {
              ...post,
              contenido: action.newContent,
              editedDate: new Date().toISOString(),
              isOptimistic: true
            } : post
          );
          
        case "edit-revert":
          return state.map(post => 
            post.id === action.id ? {
              ...post,
              contenido: action.originalContent,
              isOptimistic: false
            } : post
          );
          
        default:
          return state;
      }
    }
  );

  // Efecto para carga inicial y actualizaciones periódicas
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const blogData = await getBlog();
        
        setBlog(prev => {
          // Conservar posts optimistas no confirmados
          const optimistasNoConfirmados = prev.filter(p => p.isOptimistic);
          
          return [
            ...blogData.filter(serverPost => 
              !optimistasNoConfirmados.some(o => o.id === serverPost.id)
            ),
            ...optimistasNoConfirmados
          ].sort((a, b) => 
            new Date(b.editedDate || b.fecha) - new Date(a.editedDate || a.fecha)
          );
        });
        
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    };
  
    const interval = setInterval(cargarDatos, 15000);
    cargarDatos();
    return () => clearInterval(interval);
  }, [necesitaActualizacion]);

  const manejarNuevoPost = async (formData) => {
    try {
      const postContent = formData.get("postContent");
      agregarPostOptimista({ type: "add", contenido: postContent });
      formRef.current?.reset();
      
      const nuevoPost = await saveNewPost(postContent);
      setBlog(prev => [nuevoPost, ...prev.filter(p => p.id !== "pendingPost")]);
      setNecesitaActualizacion(prev => !prev);
    } catch (error) {
      console.error("Error:", error.message);
      setBlog(prev => prev.filter(p => p.id !== "pendingPost"));
    }
  };

  return (
    <div className="App">
      <h1>Microblog personal</h1>
      
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          manejarNuevoPost(new FormData(e.target));
        }} 
        className="new" 
        ref={formRef}
      >
        <textarea placeholder="Nuevo post" name="postContent" required />
        <button type="submit">Publicar</button>
      </form>

      {blogOptimista.map((p) => (
        <Post 
          key={p.id}
          {...p}
          onChange={(action) => {
            agregarPostOptimista(action);
            setNecesitaActualizacion(prev => !prev);
          }}
        />
      ))}
    </div>
  );
}

export default App;