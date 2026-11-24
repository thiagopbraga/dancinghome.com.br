# Política de Segurança

A segurança e a privacidade das crianças e famílias que usam o **Ensaio de Dança** são nossa prioridade máxima.

## Escopo

Temos interesse especial em relatos de vulnerabilidades que afetem:

- **Privacidade e dados:** qualquer risco de envio não autorizado de imagem, áudio ou dados pessoais a partir do jogo (`/jogar/`);
- **API do Placar e Cloudflare Worker (`worker/`):** falsificação de assinatura de fichas, injeção de SQL no D1, contorno da lista fechada de apelidos, bypass de autenticação nas rotas `/api/admin/*` ou vazamento de IP/dados nos logs;
- **Política de Segurança de Conteúdo (CSP) e XSS:** execução de scripts de terceiros no site ou na Área dos Pais.

## Como Reportar uma Vulnerabilidade

**Por favor, NÃO abra uma issue pública no GitHub para relatar falhas de segurança.**

1. Use o recurso [**Private vulnerability reporting** do GitHub](https://github.com/thiagopbraga/ensaio-de-danca/security/advisories/new) (aba **Security → Report a vulnerability** deste repositório).
2. Caso prefira, envie um relato detalhado pelo contato informado em `/privacidade` no site do projeto.

Inclua no relato:

- Descrição clara do problema e do impacto potencial;
- Passos para reproduzir (sem incluir dados reais de usuários);
- Sugestão de correção, se tiver.

## Prazo de Resposta

Este é um projeto independente mantido nos fins de semana, mas levamos segurança a sério:

- **Confirmação de recebimento:** em até **72 horas**;
- **Avaliação e correção:** até **7 dias** para falhas críticas que envolvam privacidade ou exposição de dados, e até **14 dias** para demais casos.

Depois que a correção estiver publicada, daremos o devido crédito no aviso de segurança (se você desejar).
