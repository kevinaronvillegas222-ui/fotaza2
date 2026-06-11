# 📸 Fotaza 2

Plataforma web para compartir, buscar, vender y gestionar fotografías en comunidad.

**Stack:** Node.js · Express · Pug · PostgreSQL · JWT · Bootstrap 5

---

## 🚀 Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/fotaza2.git
cd fotaza2

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL y JWT_SECRET

# 4. Inicializar la base de datos
npm run db:init

# 5. Iniciar la aplicación
npm start
```

La app queda disponible en: **http://localhost:3000**

---

## ⚙️ Variables de entorno (.env)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto | `5432` |
| `DB_NAME` | Nombre de la BD | `fotaza2` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña | `mi_password` |
| `JWT_SECRET` | Secreto para firmar tokens | `secreto_muy_largo` |
| `JWT_EXPIRES_IN` | Duración del token | `7d` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `development` |

---

## 👥 Usuarios de prueba

| Usuario | Email | Contraseña | Rol |
|---|---|---|---|
| admin | admin@fotaza.com | admin1234 | Administrador |
| validador | validador@fotaza.com | validator1234 | Validador |
| juan_foto | juan@example.com | user1234 | Usuario |
| maria_art | maria@example.com | user1234 | Usuario |
| carlos_pic | carlos@example.com | user1234 | Usuario |

---

## 📋 Funcionalidades implementadas

- ✅ Autenticación con JWT (registro, login, logout)
- ✅ Gestión de publicaciones (crear con imágenes, etiquetas, licencias)
- ✅ Marcas de agua para imágenes con copyright
- ✅ Sistema de denuncias (imágenes y comentarios)
- ✅ Panel de validador de contenidos
- ✅ Inactivación automática de cuentas con 3+ bajas
- ✅ Valoraciones de imágenes (1-5 estrellas)
- ✅ Botón "me interesa" con mensajería privada
- ✅ Comentarios con apertura/cierre por el autor
- ✅ Motor de búsqueda con filtros combinables
- ✅ Sistema de seguidores (follow/unfollow)
- ✅ Sección "Publicaciones de usuarios que sigo"
- ✅ Notificaciones en tiempo real (comentarios, votos, interés, seguidor)
- ✅ Colecciones personales (favoritos)
- ✅ Mensajería privada
- ✅ Home inteligente (70% top valoradas + 30% variedad)
- ✅ Acceso anónimo solo a imágenes libres

## 🗂️ Estructura del proyecto

```
fotaza2/
├── config/          # Configuración de BD
├── scripts/         # db_init.js
├── src/
│   ├── app.js
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   └── routes/
├── views/           # Templates Pug
├── public/          # CSS, JS, uploads
├── test/            # Tests unitarios
├── .env.example
└── package.json
```

## 🧪 Tests

```bash
npm test
```
