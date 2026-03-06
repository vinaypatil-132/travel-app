pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "vinu890/travel-app"
        EC2_HOST = "18.227.161.192"
    }

    stages {

        stage('Clone Repo') {
            steps {
                git 'https://github.com/vinaypatil-132/travel-app.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $DOCKER_IMAGE:latest .'
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                usernameVariable: 'DOCKER_USER',
                passwordVariable: 'DOCKER_PASS')]) {

                    sh '''
                    echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                    docker push $DOCKER_IMAGE:latest
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sshagent(['ec2-ssh']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ubuntu@$EC2_HOST '
                        kubectl rollout restart deployment travel-app -n travel-app
                    '
                    """
                }
            }
        }

    }
}