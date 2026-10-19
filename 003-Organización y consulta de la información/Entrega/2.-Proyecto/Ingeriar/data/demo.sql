PRAGMA foreign_keys = ON;

INSERT INTO usuarios (nombre, apellidos, email, rol) VALUES
('Ana', 'García López', 'ana.garcia@ingeriar.es', 'administrador'),
('Carlos', 'Martínez Ruiz', 'carlos.martinez@ingeriar.es', 'scouter'),
('Laura', 'Sánchez Pérez', 'laura.sanchez@ingeriar.es', 'tutor'),
('Miguel', 'Torres Díaz', 'miguel.torres@ingeriar.es', 'scouter'),
('Sofía', 'Navarro Romero', 'sofia.navarro@ingeriar.es', 'tutor');

INSERT INTO educandos (nombre, apellidos) VALUES
('Lucía', 'Fernández Gómez'),
('Daniel', 'Moreno Martín'),
('Paula', 'Jiménez Sánchez'),
('Hugo', 'Ortega Ruiz'),
('Martina', 'Vidal Castro'),
('Alejandro', 'Ramírez Molina'),
('Emma', 'Iglesias Torres'),
('Leo', 'Núñez Navarro');

INSERT INTO eventos (nombre, fecha_inicio, fecha_final, tipo) VALUES
('Campamento de bienvenida', '2026-01-17 09:00', '2026-01-18 18:00', 'Campamento'),
('Taller de orientación', '2026-02-07 10:00', '2026-02-07 14:00', 'Taller'),
('Ruta por la sierra', '2026-03-14 08:30', '2026-03-14 17:30', 'Excursión'),
('Jornada de convivencia', '2026-04-25 11:00', '2026-04-25 19:00', 'Convivencia'),
('Taller de primeros auxilios', '2026-05-09 10:00', '2026-05-09 13:30', 'Taller'),
('Campamento de verano', '2026-06-20 09:00', '2026-06-21 18:00', 'Campamento'),
('Actividad de educación ambiental', '2026-09-26 10:00', '2026-09-26 14:00', 'Actividad'),
('Encuentro de familias', '2026-10-17 11:00', '2026-10-17 14:00', 'Reunión');
