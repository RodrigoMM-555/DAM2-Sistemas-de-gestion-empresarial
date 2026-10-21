PRAGMA foreign_keys = ON;

INSERT INTO usuarios (nombre, apellidos, email, telefono, rol) VALUES
('Ana', 'García López', 'ana.garcia@ingeriar.es', '600000001', 'administrador'),
('Carlos', 'Martínez Ruiz', 'carlos.martinez@ingeriar.es', '600000002', 'scouter'),
('Laura', 'Sánchez Pérez', 'laura.sanchez@ingeriar.es', '600000003', 'tutor'),
('Miguel', 'Torres Díaz', 'miguel.torres@ingeriar.es', '600000004', 'scouter'),
('Sofía', 'Navarro Romero', 'sofia.navarro@ingeriar.es', '600000005', 'tutor');

INSERT INTO educandos (nombre, apellidos, dni) VALUES
('Lucía', 'Fernández Gómez', '00000001A'),
('Daniel', 'Moreno Martín', '00000002B'),
('Paula', 'Jiménez Sánchez', '00000003C'),
('Hugo', 'Ortega Ruiz', '00000004D'),
('Martina', 'Vidal Castro', '00000005E'),
('Alejandro', 'Ramírez Molina', '00000006F'),
('Emma', 'Iglesias Torres', '00000007G'),
('Leo', 'Núñez Navarro', '00000008H');

INSERT INTO educando_usuario (educando_id, usuario_id) VALUES
(1, 3),
(2, 3),
(3, 5),
(4, 5),
(5, 3),
(6, 5),
(7, 3),
(8, 5);

INSERT INTO eventos (nombre, fecha_inicio, fecha_final, tipo) VALUES
('Campamento de bienvenida', '2026-01-17 09:00', '2026-01-18 18:00', 'Campamento'),
('Taller de orientación', '2026-02-07 10:00', '2026-02-07 14:00', 'Taller'),
('Ruta por la sierra', '2026-03-14 08:30', '2026-03-14 17:30', 'Excursión'),
('Jornada de convivencia', '2026-04-25 11:00', '2026-04-25 19:00', 'Convivencia'),
('Taller de primeros auxilios', '2026-05-09 10:00', '2026-05-09 13:30', 'Taller'),
('Campamento de verano', '2026-06-20 09:00', '2026-06-21 18:00', 'Campamento'),
('Actividad de educación ambiental', '2026-09-26 10:00', '2026-09-26 14:00', 'Actividad'),
('Encuentro de familias', '2026-10-17 11:00', '2026-10-17 14:00', 'Reunión');
