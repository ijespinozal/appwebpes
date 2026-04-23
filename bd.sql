 -- =============================================================
  -- PES TOURNAMENT MANAGER — Database Schema
  -- Engine: MySQL 8.0+
  -- =============================================================
  CREATE DATABASE IF NOT EXISTS pes_tournament
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;

  USE pes_tournament;

  -- -----------------------------------------------------------
  -- 1. USUARIOS (jugadores y admins)
  -- -----------------------------------------------------------
  CREATE TABLE users (
      id              INT             AUTO_INCREMENT PRIMARY KEY,
      phone           VARCHAR(20)     NOT NULL UNIQUE,          -- login identifier
      name            VARCHAR(100)    NOT NULL,
      password_hash   VARCHAR(255)    NOT NULL,
      role            ENUM('player','admin') NOT NULL DEFAULT 'player',
      team_name       VARCHAR(100),                             -- ej. "Real Madrid"
      profile_photo   VARCHAR(500),                             -- URL/path
      birth_date      DATE,                                     -- para calcular edad en cartelera
      is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP
  );

  -- -----------------------------------------------------------
  -- 2. TORNEOS
  -- -----------------------------------------------------------
  CREATE TABLE tournaments (
      id                  INT             AUTO_INCREMENT PRIMARY KEY,
      name                VARCHAR(150)    NOT NULL,
      inscription_fee     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,   -- en Soles
      prize_first_pct     DECIMAL(5,2)    NOT NULL DEFAULT 70.00,  -- % al 1er lugar
      prize_second_pct    DECIMAL(5,2)    NOT NULL DEFAULT 30.00,  -- % al 2do lugar
      format              ENUM('league','groups_knockout')
                                          NOT NULL DEFAULT 'league',
      num_groups          TINYINT UNSIGNED DEFAULT NULL,            -- solo para groups_knockout
      status              ENUM('draft','registration','in_progress','finished')
                                          NOT NULL DEFAULT 'draft',
      created_by          INT             NOT NULL,
      created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                  ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_tournament_admin
          FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- -----------------------------------------------------------
  -- 3. INSCRIPCIONES AL TORNEO
  --    El pozo = COUNT(*) WHERE payment_confirmed = TRUE * inscription_fee
  -- -----------------------------------------------------------
  CREATE TABLE tournament_inscriptions (
      id                  INT         AUTO_INCREMENT PRIMARY KEY,
      tournament_id       INT         NOT NULL,
      user_id             INT         NOT NULL,
      payment_confirmed   BOOLEAN     NOT NULL DEFAULT FALSE,   -- admin confirma pago
      donation_brought    BOOLEAN     NOT NULL DEFAULT FALSE,   -- admin confirma donación
      confirmed_by        INT         DEFAULT NULL,             -- id del admin que confirmó
      confirmed_at        TIMESTAMP   NULL,
      created_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

      UNIQUE KEY uq_inscription (tournament_id, user_id),

      CONSTRAINT fk_insc_tournament
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      CONSTRAINT fk_insc_user
          FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
      CONSTRAINT fk_insc_confirmed_by
          FOREIGN KEY (confirmed_by)  REFERENCES users(id)       ON DELETE SET NULL
  );

  -- -----------------------------------------------------------
  -- 4. GRUPOS (solo formato groups_knockout)
  -- -----------------------------------------------------------
  CREATE TABLE tournament_groups (
      id              INT         AUTO_INCREMENT PRIMARY KEY,
      tournament_id   INT         NOT NULL,
      name            VARCHAR(10) NOT NULL,   -- 'A', 'B', 'C' …
      created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

      UNIQUE KEY uq_group (tournament_id, name),

      CONSTRAINT fk_group_tournament
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
  );

  -- -----------------------------------------------------------
  -- 5. MIEMBROS DE GRUPO
  -- -----------------------------------------------------------
  CREATE TABLE group_members (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      group_id    INT NOT NULL,
      user_id     INT NOT NULL,

      UNIQUE KEY uq_group_member (group_id, user_id),

      CONSTRAINT fk_gm_group
          FOREIGN KEY (group_id) REFERENCES tournament_groups(id) ON DELETE CASCADE,
      CONSTRAINT fk_gm_user
          FOREIGN KEY (user_id)  REFERENCES users(id)             ON DELETE CASCADE
  );

  -- -----------------------------------------------------------
  -- 6. PARTIDOS / FIXTURE
  --    Generado por sorteo del admin.
  --    Sirve también para la Cartelera de Versus.
  -- -----------------------------------------------------------
  CREATE TABLE matches (
      id                  INT             AUTO_INCREMENT PRIMARY KEY,
      tournament_id       INT             NOT NULL,
      home_player_id      INT             NOT NULL,
      away_player_id      INT             NOT NULL,
      home_goals          TINYINT UNSIGNED DEFAULT NULL,   -- NULL = no jugado aún
      away_goals          TINYINT UNSIGNED DEFAULT NULL,
      round_number        TINYINT UNSIGNED NOT NULL,       -- jornada o ronda
      phase               ENUM(
                              'league',       -- liga todos contra todos
                              'group_stage',  -- fase de grupos
                              'round_of_16',
                              'quarterfinal',
                              'semifinal',
                              'third_place',
                              'final'
                          ) NOT NULL DEFAULT 'league',
      group_id            INT             DEFAULT NULL,    -- solo en group_stage
      status              ENUM('scheduled','completed') NOT NULL DEFAULT 'scheduled',
      scheduled_at        TIMESTAMP       NULL,
      played_at           TIMESTAMP       NULL,
      created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                  ON UPDATE CURRENT_TIMESTAMP,

      CONSTRAINT chk_different_players
          CHECK (home_player_id <> away_player_id),

      CONSTRAINT fk_match_tournament
          FOREIGN KEY (tournament_id)  REFERENCES tournaments(id)      ON DELETE CASCADE,
      CONSTRAINT fk_match_home
          FOREIGN KEY (home_player_id) REFERENCES users(id),
      CONSTRAINT fk_match_away
          FOREIGN KEY (away_player_id) REFERENCES users(id),
      CONSTRAINT fk_match_group
          FOREIGN KEY (group_id)       REFERENCES tournament_groups(id) ON DELETE SET NULL
  );

  -- -----------------------------------------------------------
  -- 7. TABLA DE POSICIONES (Standings)
  --    Se actualiza al cargar cada resultado.
  --    Una fila por jugador por torneo.
  --    group_id presente solo en formato groups_knockout.
  -- -----------------------------------------------------------
  CREATE TABLE standings (
      id              INT             AUTO_INCREMENT PRIMARY KEY,
      tournament_id   INT             NOT NULL,
      user_id         INT             NOT NULL,
      group_id        INT             DEFAULT NULL,

      -- Stats manuales (actualizadas por trigger/app al guardar resultado)
      played          TINYINT UNSIGNED NOT NULL DEFAULT 0,    -- PJ
      won             TINYINT UNSIGNED NOT NULL DEFAULT 0,    -- PG
      drawn           TINYINT UNSIGNED NOT NULL DEFAULT 0,    -- PE
      lost            TINYINT UNSIGNED NOT NULL DEFAULT 0,    -- PP
      goals_for       SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- GF
      goals_against   SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- GC

      -- Columnas calculadas (MySQL 8.0 generated columns)
      goal_difference INT GENERATED ALWAYS AS
                          (CAST(goals_for AS SIGNED) - CAST(goals_against AS SIGNED))
                          STORED,                             -- DG
      points          SMALLINT GENERATED ALWAYS AS
                          (won * 3 + drawn)
                          STORED,                             -- PTS

      updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                         ON UPDATE CURRENT_TIMESTAMP,

      UNIQUE KEY uq_standing (tournament_id, user_id),

      CONSTRAINT fk_standing_tournament
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      CONSTRAINT fk_standing_user
          FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
      CONSTRAINT fk_standing_group
          FOREIGN KEY (group_id)      REFERENCES tournament_groups(id) ON DELETE SET NULL
  );

  -- -----------------------------------------------------------
  -- ÍNDICES DE CONSULTA FRECUENTE
  -- -----------------------------------------------------------
  CREATE INDEX idx_matches_tournament_status   ON matches (tournament_id, status);
  CREATE INDEX idx_matches_tournament_phase    ON matches (tournament_id, phase);
  CREATE INDEX idx_standings_tournament_points ON standings (tournament_id, points DESC);
  CREATE INDEX idx_inscriptions_confirmed      ON tournament_inscriptions (tournament_id, payment_confirmed);

  -- -----------------------------------------------------------
  -- SEED: Admin por defecto
  -- Ejecutar: cd backend && node scripts/create-admin.js
  -- para generar el hash bcrypt real antes de usar esto en prod.
  -- -----------------------------------------------------------
  INSERT INTO users (phone, name, password_hash, role)
  VALUES ('999000000', 'Administrador', '$2b$10$PLACEHOLDER_HASH_FOR_admin123', 'admin');
