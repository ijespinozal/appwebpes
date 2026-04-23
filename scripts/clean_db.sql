-- =============================================================
-- PES TOURNAMENT MANAGER — Database Cleanup Script
-- Opciones:
--   SECCIÓN A: Limpieza parcial (borra datos, conserva estructura + admin)
--   SECCIÓN B: Reset total     (elimina y recrea la BD desde cero)
-- Ejecutar solo UNA sección.
-- =============================================================

-- ============================================================= --
--  SECCIÓN A — LIMPIEZA PARCIAL                                  --
--  Borra todos los datos transaccionales.                        --
--  Conserva: estructura de tablas, índices, el usuario admin.    --
-- ============================================================= --

USE pes_tournament;

-- Desactivar checks de FK temporalmente para poder truncar en cualquier orden
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE standings;
TRUNCATE TABLE matches;
TRUNCATE TABLE group_members;
TRUNCATE TABLE tournament_groups;
TRUNCATE TABLE tournament_inscriptions;
TRUNCATE TABLE tournaments;

-- Borra jugadores pero conserva al admin (role = 'admin')
DELETE FROM users WHERE role = 'player';

-- Resetear AUTO_INCREMENT de todas las tablas
ALTER TABLE standings              AUTO_INCREMENT = 1;
ALTER TABLE matches                AUTO_INCREMENT = 1;
ALTER TABLE group_members          AUTO_INCREMENT = 1;
ALTER TABLE tournament_groups      AUTO_INCREMENT = 1;
ALTER TABLE tournament_inscriptions AUTO_INCREMENT = 1;
ALTER TABLE tournaments            AUTO_INCREMENT = 1;

-- Reactivar checks de FK
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Limpieza parcial completada. Admin conservado.' AS resultado;


-- ============================================================= --
--  SECCIÓN B — RESET TOTAL                                       --
--  Elimina la BD completa y la recrea desde cero con el admin.   --
--  ¡IRREVERSIBLE! Comentar la Sección A antes de ejecutar esto.  --
-- ============================================================= --

/*

DROP DATABASE IF EXISTS pes_tournament;
CREATE DATABASE pes_tournament CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pes_tournament;

-- Pegar aquí el contenido completo de bd.sql (tablas + índices + seed admin)

SELECT 'Reset total completado. BD recreada con admin por defecto.' AS resultado;

*/
