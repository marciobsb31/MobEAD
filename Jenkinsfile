pipeline {
    agent {
        label 'linux-docker'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    parameters {
        string(
            name: 'DOCKERHUB_REPOSITORY',
            defaultValue: 'marciobsb31/mobead',
            description: 'Repositório público no Docker Hub; ajuste se o namespace do Docker Hub for diferente'
        )
        string(
            name: 'DEV_SSH_TARGET',
            defaultValue: '',
            description: 'Destino SSH do ambiente de desenvolvimento, no formato usuario@host'
        )
        string(
            name: 'DEV_URL',
            defaultValue: '',
            description: 'URL HTTP/HTTPS pública do ambiente de desenvolvimento'
        )
        string(
            name: 'PROD_SSH_TARGET',
            defaultValue: '',
            description: 'Destino SSH do ambiente de produção, no formato usuario@host'
        )
        string(
            name: 'PROD_URL',
            defaultValue: '',
            description: 'URL HTTP/HTTPS pública do ambiente de produção'
        )
    }

    environment {
        SONARQUBE_SERVER = 'SonarQube-MobEAD'
        SONAR_SCANNER = 'SonarScanner'
        DOCKERHUB_CREDENTIALS = 'dockerhub'
        DEPLOY_SSH_CREDENTIALS = 'mobead-deploy-ssh'
    }

    stages {
        stage('Identificação') {
            steps {
                script {
                    currentBuild.displayName = "#${env.BUILD_NUMBER} - MobEAD-Márcio-CI-CD"

                    if (!(params.DOCKERHUB_REPOSITORY ==~
                        /[a-z0-9]+(?:[._-][a-z0-9]+)*\/[a-z0-9]+(?:[._-][a-z0-9]+)*/)) {
                        error('Informe um repositório válido do Docker Hub em DOCKERHUB_REPOSITORY.')
                    }

                    env.IMAGE = "${params.DOCKERHUB_REPOSITORY}:${env.BUILD_NUMBER}"
                }
                echo 'Pipeline MobEAD-Márcio-CI-CD'
            }
        }

        stage('Testes automatizados') {
            steps {
                sh 'node --test'
            }
        }

        stage('Análise SonarQube') {
            steps {
                script {
                    def scannerHome = tool env.SONAR_SCANNER
                    withSonarQubeEnv(env.SONARQUBE_SERVER) {
                        sh "\"${scannerHome}/bin/sonar-scanner\""
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build e publicação da imagem') {
            steps {
                script {
                    def appImage = docker.build(env.IMAGE)
                    docker.withRegistry('https://index.docker.io/v1/', env.DOCKERHUB_CREDENTIALS) {
                        appImage.push()
                    }
                }
            }
        }

        stage('Deploy em desenvolvimento') {
            steps {
                script {
                    if (!(params.DEV_SSH_TARGET ==~ /[A-Za-z0-9._-]+@[A-Za-z0-9.-]+/)) {
                        error('Informe DEV_SSH_TARGET no formato usuario@host.')
                    }
                    if (!(params.DEV_URL ==~ /https?:\/\/[A-Za-z0-9.-]+(:[0-9]+)?(\/.*)?/)) {
                        error('Informe uma URL HTTP/HTTPS válida em DEV_URL.')
                    }
                }
                sshagent(credentials: [env.DEPLOY_SSH_CREDENTIALS]) {
                    sh '''
                        ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$DEV_SSH_TARGET" \
                          "docker pull '$IMAGE' && \
                          if docker container inspect mobead-dev >/dev/null 2>&1; then docker rm -f mobead-dev; fi && \
                          docker run -d --name mobead-dev --restart unless-stopped -p 80:80 '$IMAGE'"
                    '''
                }
                sh 'curl --fail --retry 5 --retry-delay 3 --retry-connrefused -- "$DEV_URL/"'
            }
        }

        stage('Aprovação para produção') {
            steps {
                input message: 'Os testes e o deploy de desenvolvimento passaram. Autorizar deploy em PRODUÇÃO?',
                      ok: 'Aprovar deploy em produção'
            }
        }

        stage('Deploy em produção') {
            steps {
                script {
                    if (!(params.PROD_SSH_TARGET ==~ /[A-Za-z0-9._-]+@[A-Za-z0-9.-]+/)) {
                        error('Informe PROD_SSH_TARGET no formato usuario@host.')
                    }
                    if (!(params.PROD_URL ==~ /https?:\/\/[A-Za-z0-9.-]+(:[0-9]+)?(\/.*)?/)) {
                        error('Informe uma URL HTTP/HTTPS válida em PROD_URL.')
                    }
                }
                sshagent(credentials: [env.DEPLOY_SSH_CREDENTIALS]) {
                    sh '''
                        ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$PROD_SSH_TARGET" \
                          "docker pull '$IMAGE' && \
                          if docker container inspect mobead-prod >/dev/null 2>&1; then docker rm -f mobead-prod; fi && \
                          docker run -d --name mobead-prod --restart unless-stopped -p 80:80 '$IMAGE'"
                    '''
                }
                sh 'curl --fail --retry 5 --retry-delay 3 --retry-connrefused -- "$PROD_URL/"'
            }
        }
    }
}
