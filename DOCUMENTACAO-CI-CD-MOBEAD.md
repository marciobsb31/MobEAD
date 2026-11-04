# Documento de implementação do CI/CD do MobEAD

## Visão geral

Este projeto foi preparado para executar um pipeline de CI/CD com:

- testes automatizados em Node.js
- análise estática com SonarQube
- build da imagem Docker
- publicação no Docker Hub
- deploy em ambiente de desenvolvimento
- aprovação manual para produção
- deploy em ambiente de produção

O objetivo foi deixar a aplicação pronta para ser executada em um ambiente real de integração contínua e entrega contínua, além de manter um processo de validação claro antes do deploy em produção.

## O que foi implementado

### 1. Dockerfile
O projeto agora contém um container baseado em `nginx:alpine`, com a pasta da aplicação publicada no diretório padrão do Nginx.
O arquivo `nginx.conf` também mapeia o prefixo `/MobEAD/` usado pelas URLs
absolutas das fontes Font Awesome legadas para os arquivos servidos na raiz do
container.

Arquivo:
- `Dockerfile`
- `nginx.conf`

### 2. Jenkinsfile
Foi criado um pipeline Jenkins com as seguintes etapas:

1. Identificação do build
2. Testes automatizados
3. Análise SonarQube
4. Quality Gate
5. Build e publicação da imagem Docker
6. Deploy em desenvolvimento
7. Aprovação manual para produção
8. Deploy em produção

Arquivo:
- `Jenkinsfile`

### 3. Configuração do SonarQube
Foi adicionado o arquivo de configuração:

- `sonar-project.properties`

Esse arquivo define o nome do projeto, a pasta de origem e o padrão de inclusão dos testes.

### 4. Arquivo de ignorados do Docker
Foi adicionado:

- `.dockerignore`

Esse arquivo evita copiar arquivos desnecessários para o contexto do Docker, reduzindo o tempo de build e o peso da imagem.

### 5. Configuração do projeto para testes
Foi ajustado o `package.json` para permitir execução dos testes com Node.js nativo:

- `"test": "node --test"`

### 6. Testes automatizados
Foi criado um conjunto de testes em Node para validar a lógica principal da aplicação:

- `tests/mobead.test.js`

Esses testes conferem:
- carregamento das provas
- seleção da prova
- navegação entre questões
- marcação e desmarcação de alternativas
- aprovação/reprovação da prova
- verificação de arquivo HTML e assets locais

## Estado atual

A parte de automatização está pronta e validada localmente. Os testes passaram com sucesso.

Validação executada:
- `npm test -- --test-reporter=spec`
- resultado: 6 testes aprovados, 0 falhas

Conclusão:
- a lógica do projeto está funcionando no ambiente de desenvolvimento local
- a parte do pipeline de CI/CD foi montada no código
- ainda faltam as configurações do ambiente real (GitHub, Jenkins, Docker Hub, SonarQube e SSH) para que o processo funcione de fato em produção

## Requisitos para reproduzir em um ambiente real

Você precisará de:

- conta no GitHub
- fork do projeto original
- servidor Jenkins com acesso à internet
- agente Jenkins com Docker instalado
- Node.js instalado no agente Jenkins
- Docker Hub com acesso para publicar imagens
- servidor SonarQube
- duas máquinas/hosts remotos para desenvolvimento e produção
- acesso SSH para os hosts de deploy

## Passo a passo para replicar

### 1. Preparar o repositório no GitHub

No seu fork pessoal (`marciobsb31/MobEAD`), clone o repositório:

```bash
git clone https://github.com/marciobsb31/MobEAD.git
cd MobEAD
```

Se você já está trabalhando no clone do repositório original, configure o fork
como `origin` e o repositório original como `upstream`:

```bash
git remote rename origin upstream
git remote add origin https://github.com/marciobsb31/MobEAD.git
git remote -v
```

Crie a branch da tarefa:

```bash
git checkout -b feat/jenkins-cicd-marcio
```

Se o fork ainda não existir, crie-o primeiro no GitHub a partir de
`osanam-giordane/MobEAD`. Os comandos de envio abaixo pressupõem que o fork
esteja disponível em `https://github.com/marciobsb31/MobEAD`.

### 2. Validar localmente

Antes de enviar qualquer alteração, rode:

```bash
npm test
git status
git diff --check
git diff
```

### 3. Enviar para o fork

```bash
git add Jenkinsfile Dockerfile .dockerignore package.json tests/mobead.test.js sonar-project.properties comandos-git.txt PIPELINE.md
git commit -m "Add Jenkins CI/CD pipeline with SonarQube and gated production deploy"
git push -u origin feat/jenkins-cicd-marcio
```

### 4. Configurar o Jenkins

Crie um job do tipo Pipeline com o nome:

- `MobEAD-Márcio-CI-CD`

No job, configure:

- GitHub como origem do código
- branch: `feat/jenkins-cicd-marcio` ou `main` após merge
- caminho do script: `Jenkinsfile`

### 5. Parametrizar o job

No Jenkins, informar os parâmetros:

- `DOCKERHUB_REPOSITORY` -> `marciobsb31/mobead`, se esse namespace existir no Docker Hub
- `DEV_SSH_TARGET` -> exemplo: `usuario@host-dev`
- `DEV_URL` -> exemplo: `http://host-dev` ou `https://host-dev`
- `PROD_SSH_TARGET` -> exemplo: `usuario@host-prod`
- `PROD_URL` -> exemplo: `http://host-prod` ou `https://host-prod`

O nome de usuário do GitHub é `marciobsb31`. O Docker Hub é um serviço separado:
use `marciobsb31/mobead` somente se esse repositório também existir na sua conta
Docker Hub; caso contrário, informe o namespace correto do Docker Hub.

### 6. Configurar credenciais do Jenkins

#### Docker Hub
Criar credencial com ID:

- `dockerhub`

Tipo:
- username/password

#### SSH para deploy
Criar credencial com ID:

- `mobead-deploy-ssh`

Essa credencial deve ter acesso para rodar `docker` nos hosts remotos.

#### SonarQube
No Jenkins, configurar o servidor SonarQube com nome:

- `SonarQube-MobEAD`

Também configure a ferramenta SonarScanner com nome:

- `SonarScanner`

### 7. Configurar SonarQube

No arquivo `sonar-project.properties`, o projeto está apontado para o bloco principal:

```properties
sonar.projectKey=mobead-marcio
sonar.projectName=MobEAD - Marcio
sonar.sources=Scripts/mobEAD.js,Scripts/mobEAD.dataAccess.js,index.html
sonar.tests=tests
sonar.test.inclusions=tests/**/*.test.js
sonar.sourceEncoding=UTF-8
```

No SonarQube, certifique-se de que o projeto exista e que o Quality Gate esteja configurado corretamente.

### 8. Configurar hosts remotos

Os hosts de desenvolvimento e produção precisam de:

- Docker instalado
- porta 80 liberada
- acesso ao Docker Hub
- instruções de deploy para remover e recriar os contêineres

A pipeline usa comandos SSH parecidos com:

```bash
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$DEV_SSH_TARGET" "docker pull '$IMAGE' && if docker container inspect mobead-dev >/dev/null 2>&1; then docker rm -f mobead-dev; fi && docker run -d --name mobead-dev --restart unless-stopped -p 80:80 '$IMAGE'"
```

e idem para produção.

### 9. Executar o pipeline

Após a criação do job e configuração das credenciais:

1. acesse o Jenkins
2. abra o job `MobEAD-Márcio-CI-CD`
3. clique em `Build with Parameters`
4. preencha os valores requisitados
5. execute o pipeline

### 10. Validação da execução real

Durante a execução, verifique:

- testes automatizados
- análise SonarQube
- sucesso do Quality Gate
- build da imagem Docker
- publicação no Docker Hub
- deploy em desenvolvimento
- teste HTTP em `DEV_URL`
- aprovação manual para produção
- deploy em produção
- teste HTTP em `PROD_URL`

## Observações importantes

### Sobre o Docker
A imagem publicada é do tipo Nginx, e o container expõe a porta 80.

### Sobre o deploy
A estratégia adotada é substituir os contêineres `mobead-dev` e `mobead-prod` em cada ambiente remoto.
Para demonstração sem hosts remotos, o parâmetro `LOCAL_LAB_MODE` executa
deploys isolados em containers locais (`mobead-dev-local` e
`mobead-prod-local`), nas portas 18081 e 18082. Esse modo não publica a imagem
no Docker Hub nem substitui containers dos ambientes remotos.

### Sobre a aprovação
A etapa de produção é protegida por uma entrada manual:

- `Aprovação para produção`

Isso garante que a aplicação só vá para produção após validação do ambiente de desenvolvimento.

## Checklist final antes de considerar o ambiente pronto

- [ ] fork do projeto realizado
- [ ] branch criada no GitHub
- [ ] Jenkins configurado
- [ ] credenciais Docker Hub criadas
- [ ] credenciais SSH criadas
- [ ] SonarQube conectado ao Jenkins
- [ ] scanner configurado
- [ ] hosts remotos com Docker e porta 80 funcionando
- [ ] pipeline executado com sucesso
- [ ] deploy em desenvolvimento validado
- [ ] aprovação de produção concedida
- [ ] deploy em produção validado

## Resultado esperado

Ao concluir todos os passos acima, a aplicação MobEAD deve ficar disponível em ambientes reais com:

- automação de testes
- análise estática de código
- imagens Docker versionadas
- deploy automatizado em dev
- controle manual para produção
- consistência e rastreabilidade do processo de entrega

## Conclusão

A implementação realizada já deixou o projeto preparado para uma pipeline real de CI/CD. O que ainda depende do ambiente externo é a execução dessa pipeline em Jenkins com as credenciais, hosts e acessos reais.

Se a intenção for testar em ambiente real, o próximo passo é:

1. subir a branch para o fork
2. configurar o Jenkins
3. preencher os parâmetros da pipeline
4. rodar o build
5. validar o deploy em desenvolvimento
6. aprovar e validar produção

---

Documento gerado para uso de replicação e validação do processo de CI/CD do MobEAD.
