# FotoShare 📸

Aplicación web para compartir, valorar y vender fotografías en línea.  
**Desarrollado por:** Villegas Kevin Aron  
**Materia:** Programación Web II — Universidad de La Punta  

---

## 🌐 Aplicación en producción

**URL:** https://fotaza2-5dew.onrender.com

> ⚠️ El servidor gratuito de Render puede tardar hasta 50 segundos en responder la primera vez si estuvo inactivo. Esperar y recargar.

---

## 🛠️ Stack tecnológico

- **Backend:** Node.js + Express
- **Vistas:** Pug (server-side rendering)
- **Base de datos:** PostgreSQL
- **Autenticación:** JWT (JSON Web Tokens)
- **CSS:** Bootstrap 5 + CSS personalizado
- **Subida de imágenes:** Multer
- **Marca de agua:** Sharp

---

## 👥 Usuarios de prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| juan@example.com | user1234 | Usuario normal |
| maria@example.com | user1234 | Usuario normal |
| validador@fotaza.com | validator1234 | Validador de contenidos |
| admin@fotaza.com | admin1234 | Administrador |

---

## ⚙️ Instalación local

### Requisitos previos
- [Node.js](https://nodejs.org) v18 o superior
- [PostgreSQL](https://www.postgresql.org) v14 o superior

### Pasos

**1. Clonar el repositorio**
```bash
git clone https://github.com/kevinaronvillegas222-ui/fotaza2.git
cd fotaza2
```

**2. Instalar dependencias**
```bash
npm install
```

**3. Configurar variables de entorno**

Copiar el archivo de ejemplo y completar con los datos locales:
```bash
cp .env.example .env
```

Editar `.env` con los datos de tu PostgreSQL:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fotaza2
DB_USER=postgres
DB_PASSWORD=tu_contraseña
JWT_SECRET=un_secreto_largo_y_seguro
PORT=3000
NODE_ENV=development
APP_NAME=FotoShare
APP_URL=http://localhost:3000
```

**4. Crear la base de datos en PostgreSQL**

Desde pgAdmin o psql, crear una base de datos llamada `fotaza2`.

**5. Inicializar tablas y datos de prueba**
```bash
npm run db:init
```

**6. Iniciar la aplicación**
```bash
npm start
```

**7. Acceder en el navegador**
```
http://localhost:3000
```

---

## ✅ Funcionalidades implementadas

### 1. Autenticación
- Registro e inicio de sesión con JWT
- Contraseñas encriptadas con bcrypt
- Usuarios anónimos solo ven imágenes sin copyright

### 2. Gestión de publicaciones
- Crear publicaciones con título, descripción, imágenes y etiquetas
- Licencias: con o sin copyright
- Marca de agua personalizada para imágenes con copyright
- Denunciar publicaciones (con motivo y descripción)
- Publicaciones con +3 denuncias pasan a revisión del validador
- Cerrar comentarios de una publicación
- Cuentas inactivadas automáticamente con 3+ publicaciones bajadas

### 3. Valoraciones y comentarios
- Valorar imágenes (1-5 estrellas, una vez por usuario)
- Comentar publicaciones
- Denunciar comentarios
- El autor puede borrar comentarios denunciados

### 4. Buscador
- Búsqueda por título, descripción y etiquetas
- Filtros combinables

### 5. Followers
- Seguir / dejar de seguir usuarios
- Ver publicaciones de usuarios que sigo
- Contador de seguidores y seguidos en el perfil

### 6. Notificaciones
- Notificación al recibir: comentario, valoración, "me interesa", nuevo seguidor
- Marcar notificaciones como leídas

### 7. Colecciones / Favoritos
- Guardar publicaciones en colecciones personales
- Crear colecciones con nombre personalizado
- Colecciones privadas (solo el usuario las ve)

### 8. Mensajería
- Botón "me interesa" en publicaciones
- Mensajería privada entre usuarios interesados y autores

### 9. Validador de contenidos
- Panel exclusivo para el rol validador
- Dar de baja publicaciones denunciadas o desestimar denuncias

### 10. Home inteligente
- 70% publicaciones mejor valoradas
- 30% publicaciones aleatorias para balance

---

## 🗄️ Base de datos

El archivo `scripts/db_init.js` crea automáticamente todas las tablas e inserta los datos de prueba.

También se incluye `database/backup.sql` con el esquema completo para restauración manual:
```bash
psql -U postgres -d fotaza2 -f database/backup.sql
```

---

## 📁 Estructura del proyecto

```
fotaza2/
├── config/
│   └── db.js                 # Configuración de PostgreSQL
├── src/
│   ├── app.js                # Entrada principal de Express
│   ├── controllers/          # Lógica de negocio
│   ├── models/               # Consultas a la BD
│   ├── routes/               # Rutas de la app
│   └── middlewares/          # Auth, upload
├── views/                    # Vistas Pug
├── public/                   # CSS, JS, imágenes estáticas
├── scripts/
│   └── db_init.js            # Script de inicialización de BD
├── database/
│   └── backup.sql            # Backup del esquema SQL
├── .env.example              # Variables de entorno de ejemplo
├── package.json
└── README.md
```

---

## 🐛 Problemas encontrados y soluciones

### 1. Conexión SSL con Render
**Problema:** PostgreSQL en Render requiere SSL obligatorio. La conexión fallaba con `SSL/TLS required`.  
**Solución:** Se agregó `ssl: { rejectUnauthorized: false }` en la configuración del pool de pg cuando `NODE_ENV=production`.

### 2. Rutas relativas incorrectas
**Problema:** Los `require('../config/db')` fallaban porque el ZIP generaba una carpeta anidada.  
**Solución:** Se corrigieron todas las rutas relativas en modelos y middlewares.

### 3. Archivo .env con nombre incorrecto en Windows
**Problema:** Windows no permitía renombrar un archivo a `.env` (sin nombre, solo extensión).  
**Solución:** Se creó el archivo desde el Bloc de notas usando "Guardar como" → "Todos los archivos" y escribiendo `.env` como nombre.

### 4. Puerto en uso al reiniciar
**Problema:** Al detener y reiniciar el servidor, el puerto 3000 quedaba ocupado.  
**Solución:** Usar `taskkill /f /im node.exe` en Windows para liberar el proceso.

---

## 📋 Variables de entorno (.env.example)

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fotaza2
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=
PORT=3000
NODE_ENV=development
APP_NAME=FotoShare
APP_URL=http://localhost:3000
```
