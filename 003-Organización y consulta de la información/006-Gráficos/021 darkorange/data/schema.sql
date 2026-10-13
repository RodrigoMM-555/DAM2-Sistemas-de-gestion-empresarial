-- Activa la comprobación de claves foráneas en esta conexión SQLite.
PRAGMA foreign_keys = ON;

-- Tabla de clientes de la aplicación.
CREATE TABLE clientes(
    nombre TEXT,
    pais TEXT,
    telefono TEXT,
    email TEXT,
    identificador INTEGER PRIMARY KEY AUTOINCREMENT
);

-- Tabla de productos disponibles.
CREATE TABLE productos(
    nombre TEXT,
    tipo TEXT,
    precio REAL,
    capacidad INTEGER,
    autonomia INTEGER,
    identificador INTEGER PRIMARY KEY AUTOINCREMENT
);

-- Tabla de empleados.
CREATE TABLE empleados(
    nombre TEXT,
    apellidos TEXT,
    departamento TEXT,
    puesto TEXT,
    salario REAL,
    identificador INTEGER PRIMARY KEY AUTOINCREMENT
);

-- Tabla de proveedores.
CREATE TABLE proveedores(
    nombre TEXT,
    pais TEXT,
    especialidad TEXT,
    email TEXT,
    identificador INTEGER PRIMARY KEY AUTOINCREMENT
);

-- Pedidos realizados por los clientes.
CREATE TABLE pedidos(
    fecha TEXT,
    estado TEXT,
    cliente_id INTEGER,
    total REAL,
    identificador INTEGER PRIMARY KEY AUTOINCREMENT,
    FOREIGN KEY(cliente_id) REFERENCES clientes(identificador)
);

-- Líneas que relacionan cada pedido con sus productos.
CREATE TABLE lineaspedido(
    pedido_id INTEGER,
    producto_id INTEGER,
    cantidad INTEGER,
    precio_unitario REAL,
    identificador INTEGER PRIMARY KEY AUTOINCREMENT,
    FOREIGN KEY(pedido_id) REFERENCES pedidos(identificador),
    FOREIGN KEY(producto_id) REFERENCES productos(identificador)
);

-- Componentes almacenados y sus proveedores.
CREATE TABLE componentes(
    nombre TEXT,
    tipo TEXT,
    proveedor_id INTEGER,
    precio REAL,
    stock INTEGER,
    identificador INTEGER PRIMARY KEY AUTOINCREMENT,
    FOREIGN KEY(proveedor_id) REFERENCES proveedores(identificador)
);