Issue #88: Implementar Front-end

State: OPEN

## Body

Objetivo: Implementar a interface web do sistema seguindo o protótipo do Claude Design

Link: https://canva.link/ue07hhr8sp73244
Zippado (pasta com os arquivos crus que o claude design criou, da para usar de contexto): [recommend-a.zip](https://github.com/user-attachments/files/27378799/recommend-a.zip)

Stack:
- Next 16
- TypeScript
- TailwindCSS

* Não iniciar as tasks de telas antes das sub-issues 90 até 92 estarem prontas e commitadas na main para evitar conflito 


# Issue #90: Setup inicial do Front-end

State: OPEN

## Body

Configurar estrutura inicial e configurações básicas do frontend

* Criar projeto 
* Configurar ts 
* Configurar eslint/prettier 
* Instalar dependencias iniciais 
* Criar estrutura de pastas

Critério de aceite:

* Projeto roda localmente
* Lint funcionando
* Rotas funcionando


# Issue #91: Implementar Design System / UI base

State: OPEN

## Body

Objetivo: Facilitar o uso e organização das cores, espaçamentos, fontes e etc. 

Checklist:

* Cores globais
* Tipografia

Critério de aceite:

* Possibilitar a utilização por meio de variáveis do tailwind das propriedades de UI (cor, espaçamento etc.)


# Issue #92: Criar layout principal da aplicação

State: OPEN

## Body

Objetivo: Implementar componentes principais da aplicação (header, sidebar, footer, wrapper do layout das páginas)

Checklist:

* Navbar
* Sidebar
* Footer
* Layout wrapper das páginas

Critério de aceite: Utilização dos componentes citados



# Issue #93: Tela de login e register

State: OPEN

## Body

Objetivo: Implementar tela de login e register integrada ao Cognito

Checklist:

* Formulário login
* Formulário register
* Validação
* Integração Cognito
* Armazenamento do token
* Logout
* Responsividade em dispositivos de celular, tablet e computador (~375px -> ~768px -> 1440px)
* Utilizar apenas variáveis criadas no tailwind para seguir o padrão do design

Critério de aceite: Seguir fielmente o design criado e possibilitar a criação de um usuário e login usando a UI


# Issue #94: Criar sistema de autenticação e rotas protegidas

State: OPEN

## Body

Objetivo: Garantir que apenas usuários autenticados consigam acessar áreas privadas da aplicação, controlando sessão, redirecionamentos e proteção das rotas no frontend.

Checklist:

* Criar contexto global de autenticação
* Configurar proteção de rotas
* Tratar acesso inválido/expiração de sesão
* Persistência de sessão
* Redirecionamento para login

Critério de aceite: 

- [ ] Usuário não autenticado não consegue acessar páginas privadas
- [ ] Usuário autenticado consegue acessar rotas protegidas normalmente
- [ ] Sessão permanece ativa após atualizar a página
- [ ] Logout remove acesso às rotas privadas
- [ ] Usuário é redirecionado para `/login` ao perder autenticação
- [ ] Navegação entre rotas protegidas funciona sem erros


# Issue #95: Tela home/hero

State: OPEN

## Body

Objetivo: Implementar tela home

Checklist:

* Utilizar apenas variáveis criadas no tailwind para seguir o padrão do design
* Escolher uma das 3 opções para desenvolver
* Seguir fielmente o design previamente criado (link e download dos arquivos crus estão na issue-pai)
* Responsividade em dispositivos de celular, tablet e computador (~375px -> ~768px -> 1440px)

Critério de aceite: Homepage utilizável (mockada)


# Issue #96: Tela de recomendação de filme

State: OPEN

## Body

Objetivo: Implementar tela que é apresentada após clicar no botão de recomendar filme da homepage (chamada de Recommendation result no design criado)

Checklist:

* Utilizar apenas variáveis criadas no tailwind para seguir o padrão do design
* Seguir fielmente o design previamente criado (link e download dos arquivos crus estão na issue-pai)
* Responsividade em dispositivos de celular, tablet e computador (~375px -> ~768px -> 1440px)

Objetivo: Recommendation result page utilizável (mockada)


# Issue #97: Tela de preferências

State: OPEN

## Body

Objetivo: Implementar tela preferences

Checklist:

- [ ] Utilizar apenas variáveis criadas no tailwind para seguir o padrão do design
- [ ] Rota protegida
- [ ] Seguir fielmente o design previamente criado (link e download dos arquivos crus estão na issue-pai)
- [ ] Responsividade em dispositivos de celular, tablet e computador (~375px -> ~768px -> 1440px)

Critério de aceite: Tela preferences utilizável (mockada)


# Issue #98: Tela de histórico

State: OPEN

## Body

Objetivo: Implementar tela history

Checklist:

- [ ] Utilizar apenas variáveis criadas no tailwind para seguir o padrão do design
- [ ] Rota protegida
- [ ] Seguir fielmente o design previamente criado (link e download dos arquivos crus estão na issue-pai)
- [ ] Responsividade em dispositivos de celular, tablet e computador (~375px -> ~768px -> 1440px)

Critério de aceite: Tela history utilizável (mockada)


# Issue #99: Tela de assistir depois

State: OPEN

## Body

Objetivo: Implementar tela watch-later

Checklist:

- [ ] Utilizar apenas variáveis criadas no tailwind para seguir o padrão do design
- [ ] Rota protegida
- [ ] Seguir fielmente o design previamente criado (link e download dos arquivos crus estão na issue-pai)
- [ ] Responsividade em dispositivos de celular, tablet e computador (~375px -> ~768px -> 1440px)

Critério de aceite: Tela watch-later utilizável (mockada)


