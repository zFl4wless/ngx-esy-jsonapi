# docker build -f Dockerfile . -t ubuntu24.04-node-22-ngx-esy-jsonapi
FROM ubuntu:24.04 AS ubuntu24.04-node-22-ngx-esy-jsonapi
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get upgrade -y && apt-get install -y openssh-server openssh-client git curl nano build-essential sudo

RUN curl -sL https://deb.nodesource.com/setup_22.x | sudo -E bash -

RUN apt-get update && apt-get install -y nodejs

RUN npm install -g npm

RUN echo "ubuntu ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/ubuntu

USER ubuntu

WORKDIR /home/ubuntu

ENV APP_PATH /home/ubuntu/ngx-esy-jsonapi
SHELL ["/bin/bash", "-l", "-c"]
RUN mkdir -p $APP_PATH

WORKDIR $APP_PATH
