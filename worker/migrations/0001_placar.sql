-- worker/migrations/0001_placar.sql

-- Catálogo das músicas públicas que aceitam pontuação no placar.
-- Previne envio de pontuações para músicas caseiras ou inventadas.
CREATE TABLE IF NOT EXISTS musica (
  id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('facil', 'normal')),
  versao INTEGER NOT NULL DEFAULT 1,
  duracao_ms INTEGER NOT NULL,
  num_poses INTEGER NOT NULL,
  ativa INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (id, nivel)
);

-- Pontuações públicas (sem IP, sem cookie, sem identificador de dispositivo).
CREATE TABLE IF NOT EXISTS pontuacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  musica_id TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('facil', 'normal')),
  versao INTEGER NOT NULL,
  apelido TEXT NOT NULL,
  pontos INTEGER NOT NULL CHECK (pontos >= 0),
  estrelas INTEGER NOT NULL CHECK (estrelas BETWEEN 1 AND 3),
  perfeitos INTEGER NOT NULL CHECK (perfeitos >= 0),
  poses INTEGER NOT NULL CHECK (poses > 0),
  semana TEXT NOT NULL, -- formato ISO 'YYYY-Www' para placar semanal rápido
  criado_em INTEGER NOT NULL, -- timestamp Unix arredondado para a hora cheia (privacidade)
  oculta INTEGER NOT NULL DEFAULT 0, -- 1 = ocultada pela moderação
  FOREIGN KEY (musica_id, nivel) REFERENCES musica (id, nivel)
);

CREATE INDEX IF NOT EXISTS idx_placar
  ON pontuacao (musica_id, nivel, oculta, semana, pontos DESC, criado_em ASC);

-- Fichas de partida já usadas (evita replay de pontuação; limpa por cron).
CREATE TABLE IF NOT EXISTS ficha_usada (
  jti TEXT PRIMARY KEY,
  expira_em INTEGER NOT NULL
);
