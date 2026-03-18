ARG BASE_IMAGE=mcr.microsoft.com/devcontainers/python:3.11-bookworm
FROM $BASE_IMAGE

ARG USERNAME=devuser
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# 1. User and Permission Configuration
# Dynamically create or modify the user to match the host machine's UID/GID.
# This prevents "Permission Denied" errors when editing files on the host.
RUN if id -u 1000 >/dev/null 2>&1; then \
        ID_EXISTENTE=$(id -un 1000); \
        usermod -l ${USERNAME} ${ID_EXISTENTE} \
        && groupmod -n ${USERNAME} ${ID_EXISTENTE} \
        && usermod -d /home/${USERNAME} -m ${USERNAME}; \
    else \
        groupadd --gid ${USER_GID} ${USERNAME} \
        && useradd --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME}; \
    fi \
    && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME}

# 2. Install essential system tools for Robotics & Network debugging
# Includes mosquitto-clients for testing VDA5050 MQTT messages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y \
    curl \
    mosquitto-clients \
    net-tools \
    iputils-ping \
    docker.io \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Install Node.js v20 directly from NodeSource (Frontend / TS requirements)
# Bypassing ghcr.io features to avoid 403 token expiration errors
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 4. Grant the development user access to the Docker group
RUN usermod -aG docker ${USERNAME} || true

USER $USERNAME
ENV SHELL /bin/bash