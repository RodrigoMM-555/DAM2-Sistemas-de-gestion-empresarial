USE ingeriar_v3;

INSERT INTO usuarios (nombre, apellidos, email, telefono, `contraseña`, rol) VALUES
('Ana', 'García López', 'ana.garcia@ingeriar.es', '600000001', '', 'administrador'),
('Carlos', 'Martínez Ruiz', 'carlos.martinez@ingeriar.es', '600000002', '', 'scouter'),
('Laura', 'Sánchez Pérez', 'laura.sanchez@ingeriar.es', '600000003', '', 'tutor');

INSERT INTO educandos (nombre, apellidos, DNI, naz) VALUES
('Lucía', 'Fernández Gómez', '00000001A', '2015-05-12'),
('Daniel', 'Moreno Martín', '00000002B', '2014-09-20');

INSERT INTO usuarios_educandos (id_usuario, id_educando) VALUES
(3, 1), (3, 2);

INSERT INTO eventos (nombre, fecha_inicio, fecha_fin, id_responsable, tipo) VALUES
('Campamento de bienvenida', '2026-01-17 09:00:00', '2026-01-18 18:00:00', 2, 'Campamento');
