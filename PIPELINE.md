# MobEAD - pipeline Jenkins

O nome sugerido para o job é **MobEAD-Márcio-CI-CD**. O `Jenkinsfile` também
identifica cada build com esse nome. A sequência é: testes automatizados,
análise SonarQube, aprovação do Quality Gate, build/publicação da imagem,
deploy e teste HTTP em desenvolvimento, aprovação manual e deploy/teste em
produção.

## Pré-requisitos no Jenkins

- Agente Linux com o label `linux-docker`, Node.js (18 ou superior), Docker
  Engine/CLI, `curl` e acesso SSH aos dois ambientes.
- Plugins: Pipeline, Docker Pipeline, SonarQube Scanner for Jenkins e SSH Agent.
- Ferramentas globais: Node.js disponível como `node`; SonarQube Scanner
  configurado com o nome `SonarScanner`.
- Servidor SonarQube configurado no Jenkins com o nome `SonarQube-MobEAD`.
  Configure também o webhook do SonarQube para
  `https://SEU_JENKINS/sonarqube-webhook/`, necessário para o Quality Gate.
- Credencial Docker Hub do tipo usuário/senha, ID `dockerhub`. O repositório
  Docker Hub usado pela pipeline deve ser público para que os hosts remotos
  possam baixar a imagem sem credenciais adicionais.
- Credencial SSH, ID `mobead-deploy-ssh`, autorizada a executar Docker nos
  hosts de desenvolvimento e produção. Instale as chaves dos hosts no
  `known_hosts` do agente Jenkins; a pipeline valida as chaves estritamente.
- Os dois hosts precisam ter Docker instalado, porta 80 liberada e acesso ao
  Docker Hub. Os endereços em `DEV_URL` e `PROD_URL` devem chegar ao serviço.

## Criar o job

1. Crie um job **Pipeline** com o nome `MobEAD-Márcio-CI-CD`.
2. Em Pipeline, selecione **Pipeline script from SCM**, Git, e informe a URL do
   seu fork. Use a branch `feat/jenkins-cicd-marcio` (ou `main` depois do merge)
   e o caminho do script `Jenkinsfile`.
3. Execute o job. Informe os parâmetros `DOCKERHUB_REPOSITORY`,
   `DEV_SSH_TARGET`, `DEV_URL`, `PROD_SSH_TARGET` e `PROD_URL`. O primeiro deve
   ter o formato `usuario-dockerhub/mobead`; os destinos SSH, `usuario@host`.
4. Revise os testes, o resultado do Quality Gate e o site em desenvolvimento.
   Só então aceite **Aprovar deploy em produção**. Se não aprovar, cancele a
   etapa de entrada.

Os deploys substituem os contêineres `mobead-dev` e `mobead-prod` nos
respectivos hosts, publicando a porta 80. Ajuste essa estratégia se seus
ambientes usarem outro método de deploy.

## Evidências que devem ser capturadas após uma execução real

- Página do job mostrando `MobEAD-Márcio-CI-CD` e o resultado bem-sucedido.
- Console Output com os testes, análise/Quality Gate e logs finais.
- Etapa de aprovação manual para produção.
- Aplicação aberta no endereço de desenvolvimento e no de produção.

Não reutilize logs ou capturas de exemplo como se fossem resultados reais.
