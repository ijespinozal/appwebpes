// Fisher-Yates shuffle
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Algoritmo Round-Robin estándar.
 * Genera una jornada por ronda fijando el primer elemento
 * y rotando el resto en sentido horario.
 * Si el número de jugadores es impar, agrega un "bye" (null).
 */
function buildRoundRobin(playerIds) {
  let list = [...playerIds];
  if (list.length % 2 !== 0) list.push(null); // bye

  const totalRounds = list.length - 1;
  const half        = list.length / 2;
  const matches     = [];

  for (let r = 0; r < totalRounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[list.length - 1 - i];
      if (home !== null && away !== null) {
        matches.push({
          home_player_id: home,
          away_player_id: away,
          round_number:   r + 1,
          phase:          'league',
          groupIndex:     null,
        });
      }
    }
    // Rotar: fijar index 0, rotar el resto hacia la derecha
    const last = list.splice(list.length - 1, 1)[0];
    list.splice(1, 0, last);
  }

  return matches;
}

/**
 * Genera grupos y partidos de fase de grupos.
 * Reparte jugadores con distribución snake para equilibrar.
 * Retorna:
 *   groups  → [{ name: 'A', players: [id, ...] }, ...]
 *   matches → [..., { ..., groupIndex: 0 }]  (groupIndex = índice en groups[])
 */
function buildGroupStage(playerIds, numGroups) {
  const shuffled = shuffleArray(playerIds);

  const groups = Array.from({ length: numGroups }, (_, i) => ({
    name:    String.fromCharCode(65 + i), // 'A', 'B', 'C' …
    players: [],
  }));

  // Distribución circular
  shuffled.forEach((id, idx) => {
    groups[idx % numGroups].players.push(id);
  });

  const matches = [];
  groups.forEach((group, groupIndex) => {
    const groupMatches = buildRoundRobin(group.players).map(m => ({
      ...m,
      phase:      'group_stage',
      groupIndex,
    }));
    matches.push(...groupMatches);
  });

  return { groups, matches };
}

module.exports = { shuffleArray, buildRoundRobin, buildGroupStage };
