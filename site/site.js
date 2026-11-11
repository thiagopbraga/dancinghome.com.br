// Script leve do site institucional (/), página do placar (/placar) e painel de moderação (/admin/).
// Zero dependências externas, zero cookies, criação segura de DOM apenas com textContent / createTextNode.

function criarElemento(tag, attrs, filhos) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (typeof v === 'function' && k.startsWith('on')) {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v === true) {
        node.setAttribute(k, '');
      } else {
        node.setAttribute(k, String(v));
      }
    }
  }
  if (Array.isArray(filhos)) {
    for (const f of filhos) {
      if (f === null || f === undefined || f === false) continue;
      if (typeof f === 'string' || typeof f === 'number') {
        node.appendChild(document.createTextNode(String(f)));
      } else {
        node.appendChild(f);
      }
    }
  }
  return node;
}

function textoEstrelas(n) {
  const qtd = Math.max(1, Math.min(3, Number(n) || 1));
  return '★'.repeat(qtd) + '☆'.repeat(3 - qtd);
}

function nomeNivel(nivel) {
  return nivel === 'normal' ? 'Normal' : 'Fácil';
}

// 1. Painel "Destaques da semana" na página inicial (/)
async function carregarHeroPlacar() {
  const container = document.getElementById('placar-conteudo');
  const contador = document.getElementById('placar-contador');
  if (!container) return;

  try {
    const res = await fetch('/api/destaques', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.ok || !Array.isArray(data.itens)) return;

    if (contador && typeof data.totalSemana === 'number' && data.totalSemana > 0) {
      contador.textContent =
        data.totalSemana === 1 ? '1 dança esta semana' : `${data.totalSemana} danças esta semana`;
    }

    if (data.itens.length === 0) return;

    const lista = criarElemento('ol', { class: 'placar-lista' }, []);
    for (const item of data.itens) {
      const li = criarElemento('li', { class: 'placar-item' }, [
        criarElemento('div', {}, [
          criarElemento('div', { class: 'placar-apelido' }, [`${item.posicao}. ${item.apelido}`]),
          criarElemento('div', { class: 'placar-musica' }, [
            `${item.musicaTitulo || item.musica} · ${nomeNivel(item.nivel)}`,
          ]),
        ]),
        criarElemento('div', { class: 'placar-estrelas' }, [
          `${textoEstrelas(item.estrelas)} · ${item.pontos} pts`,
        ]),
      ]);
      lista.appendChild(li);
    }

    const verMais = criarElemento('p', { class: 'placar-nota', style: 'margin-bottom: 0.6rem' }, [
      criarElemento('a', { href: '/placar' }, ['Ver placar completo →']),
    ]);

    container.replaceChildren(lista, verMais);
  } catch {
    // Em modo offline ou falha da API, mantém o estado estático "Dance e apareça aqui!".
  }
}

// 2. Página dedicada do placar (/placar)
function iniciarPaginaPlacar() {
  const raiz = document.getElementById('placar-pagina');
  if (!raiz) return;

  const estado = {
    musica: 'ensaio-aquecimento',
    nivel: 'facil',
    periodo: 'semana',
  };

  const corpoLista = document.getElementById('placar-lista-completa');
  const estadoVazio = document.getElementById('placar-vazio-pagina');
  const subtituloFiltro = document.getElementById('placar-resumo-filtro');

  function atualizarBotoesFiltro() {
    for (const btn of raiz.querySelectorAll('[data-filtro-musica]')) {
      const ativo = btn.getAttribute('data-filtro-musica') === estado.musica;
      btn.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      btn.classList.toggle('filtro-ativo', ativo);
    }
    for (const btn of raiz.querySelectorAll('[data-filtro-nivel]')) {
      const ativo = btn.getAttribute('data-filtro-nivel') === estado.nivel;
      btn.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      btn.classList.toggle('filtro-ativo', ativo);
    }
    for (const btn of raiz.querySelectorAll('[data-filtro-periodo]')) {
      const ativo = btn.getAttribute('data-filtro-periodo') === estado.periodo;
      btn.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      btn.classList.toggle('filtro-ativo', ativo);
    }
  }

  async function buscarPlacar() {
    atualizarBotoesFiltro();
    if (!corpoLista || !estadoVazio) return;
    const qs = new URLSearchParams(estado).toString();
    try {
      const res = await fetch(`/api/placar?${qs}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Falha ao carregar placar');
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.itens)) throw new Error('Formato inválido');

      if (subtituloFiltro) {
        const periodoTexto = estado.periodo === 'sempre' ? 'Todos os tempos' : `Semana ${data.semana}`;
        subtituloFiltro.textContent = `${data.musicaTitulo || estado.musica} · Nível ${nomeNivel(estado.nivel)} · ${periodoTexto}`;
      }

      if (data.itens.length === 0) {
        corpoLista.replaceChildren();
        estadoVazio.hidden = false;
        return;
      }

      estadoVazio.hidden = true;
      const itensDom = data.itens.map((item) =>
        criarElemento('li', { class: 'placar-item' }, [
          criarElemento('div', {}, [
            criarElemento('div', { class: 'placar-apelido' }, [`#${item.posicao} ${item.apelido}`]),
            criarElemento('div', { class: 'placar-musica' }, [
              `${item.perfeitos}/${item.poses} perfeitos · Semana ${item.semana}`,
            ]),
          ]),
          criarElemento('div', { class: 'placar-estrelas' }, [
            `${textoEstrelas(item.estrelas)} · ${item.pontos} pts`,
          ]),
        ]),
      );
      corpoLista.replaceChildren(...itensDom);
    } catch {
      corpoLista.replaceChildren();
      estadoVazio.hidden = false;
    }
  }

  for (const btn of raiz.querySelectorAll('[data-filtro-musica]')) {
    btn.addEventListener('click', () => {
      estado.musica = btn.getAttribute('data-filtro-musica') || 'ensaio-aquecimento';
      void buscarPlacar();
    });
  }
  for (const btn of raiz.querySelectorAll('[data-filtro-nivel]')) {
    btn.addEventListener('click', () => {
      estado.nivel = btn.getAttribute('data-filtro-nivel') || 'facil';
      void buscarPlacar();
    });
  }
  for (const btn of raiz.querySelectorAll('[data-filtro-periodo]')) {
    btn.addEventListener('click', () => {
      estado.periodo = btn.getAttribute('data-filtro-periodo') || 'semana';
      void buscarPlacar();
    });
  }

  void buscarPlacar();
}

// 3. Painel de moderação (/admin/)
function iniciarPainelAdmin() {
  const raiz = document.getElementById('admin-painel');
  if (!raiz) return;

  const listaPontuacoes = document.getElementById('admin-pontuacoes-lista');
  const listaMusicas = document.getElementById('admin-musicas-lista');
  const statusBox = document.getElementById('admin-status');
  const campoToken = document.getElementById('admin-token');
  const btnAtualizar = document.getElementById('admin-atualizar');

  function cabecalhosAdmin() {
    const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
    const token = campoToken && 'value' in campoToken ? String(campoToken.value).trim() : '';
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  function avisar(msg) {
    if (statusBox) statusBox.textContent = msg;
  }

  async function alternarOculta(id, novaOculta) {
    try {
      const res = await fetch(`/api/admin/pontuacoes/${id}/ocultar`, {
        method: 'POST',
        headers: cabecalhosAdmin(),
        body: JSON.stringify({ oculta: novaOculta }),
      });
      if (!res.ok) {
        avisar('Não foi possível alterar a visibilidade da pontuação.');
        return;
      }
      avisar(novaOculta ? `Pontuação #${id} ocultada.` : `Pontuação #${id} reexibida.`);
      await carregarAdmin();
    } catch {
      avisar('Erro de rede ao moderar pontuação.');
    }
  }

  async function apagarPontuacao(id) {
    try {
      const res = await fetch(`/api/admin/pontuacoes/${id}`, {
        method: 'DELETE',
        headers: cabecalhosAdmin(),
      });
      if (!res.ok) {
        avisar('Não foi possível apagar a pontuação.');
        return;
      }
      avisar(`Pontuação #${id} apagada definitivamente.`);
      await carregarAdmin();
    } catch {
      avisar('Erro de rede ao apagar pontuação.');
    }
  }

  async function alternarMusica(id, nivel, novaAtiva) {
    try {
      const res = await fetch(`/api/admin/musicas/${id}/ativa`, {
        method: 'POST',
        headers: cabecalhosAdmin(),
        body: JSON.stringify({ ativa: novaAtiva, nivel }),
      });
      if (!res.ok) {
        avisar('Não foi possível alterar o estado da música.');
        return;
      }
      avisar(`Música ${id} (${nivel}) ${novaAtiva ? 'ativada' : 'pausada'}.`);
      await carregarAdmin();
    } catch {
      avisar('Erro de rede ao atualizar música.');
    }
  }

  async function carregarAdmin() {
    if (!listaPontuacoes || !listaMusicas) return;
    try {
      const res = await fetch('/api/admin/pontuacoes', { headers: cabecalhosAdmin() });
      if (res.status === 401) {
        avisar('Não autorizado. Informe o token administrativo se configurado.');
        return;
      }
      if (!res.ok) {
        avisar('Erro ao carregar dados de moderação.');
        return;
      }
      const data = await res.json();
      if (!data || !data.ok) return;

      // Renderiza músicas
      const itensMusicas = (data.musicas || []).map((m) =>
        criarElemento('li', { class: 'placar-item', 'data-admin-musica': `${m.id}:${m.nivel}` }, [
          criarElemento('div', {}, [
            criarElemento('div', { class: 'placar-apelido' }, [`${m.titulo} (${nomeNivel(m.nivel)})`]),
            criarElemento('div', { class: 'placar-musica' }, [
              `${m.id} · ${m.numPoses} poses · ${Math.round(m.duracaoMs / 1000)}s · ${m.ativa ? 'Ativa' : 'Pausada'}`,
            ]),
          ]),
          criarElemento(
            'button',
            {
              type: 'button',
              class: 'botao-filtro',
              'data-acao-musica': `${m.id}:${m.nivel}`,
              onclick: () => void alternarMusica(m.id, m.nivel, !m.ativa),
            },
            [m.ativa ? 'Pausar envios' : 'Ativar envios'],
          ),
        ]),
      );
      listaMusicas.replaceChildren(...itensMusicas);

      // Renderiza últimas 50 pontuações
      if (!Array.isArray(data.pontuacoes) || data.pontuacoes.length === 0) {
        listaPontuacoes.replaceChildren(
          criarElemento('li', { class: 'placar-item' }, ['Nenhuma pontuação registrada.']),
        );
        return;
      }

      const itensPontuacoes = data.pontuacoes.map((p) =>
        criarElemento('li', { class: 'placar-item', 'data-admin-pontuacao': String(p.id) }, [
          criarElemento('div', {}, [
            criarElemento('div', { class: 'placar-apelido' }, [
              `#${p.id} · ${p.apelido} ${p.oculta ? '(OCULTA)' : ''}`,
            ]),
            criarElemento('div', { class: 'placar-musica' }, [
              `${p.musicaTitulo} (${nomeNivel(p.nivel)}) · ${p.pontos} pts · ${textoEstrelas(p.estrelas)} · ${p.semana}`,
            ]),
          ]),
          criarElemento('div', { class: 'admin-acoes' }, [
            criarElemento(
              'button',
              {
                type: 'button',
                class: 'botao-filtro',
                'data-ocultar-id': String(p.id),
                onclick: () => void alternarOculta(p.id, !p.oculta),
              },
              [p.oculta ? 'Reexibir' : 'Ocultar'],
            ),
            criarElemento(
              'button',
              {
                type: 'button',
                class: 'botao-filtro botao-perigo',
                'data-apagar-id': String(p.id),
                onclick: () => void apagarPontuacao(p.id),
              },
              ['Apagar'],
            ),
          ]),
        ]),
      );
      listaPontuacoes.replaceChildren(...itensPontuacoes);
    } catch {
      avisar('Não foi possível conectar à API de moderação.');
    }
  }

  if (btnAtualizar) {
    btnAtualizar.addEventListener('click', () => void carregarAdmin());
  }
  void carregarAdmin();
}

void carregarHeroPlacar();
iniciarPaginaPlacar();
iniciarPainelAdmin();
