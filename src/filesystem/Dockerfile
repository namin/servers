FROM node:22.12-alpine AS builder

WORKDIR /app

COPY src/filesystem /app
COPY tsconfig.json /tsconfig.json

RUN --mount=type=cache,target=/root/.npm npm install

RUN --mount=type=cache,target=/root/.npm-production npm ci --ignore-scripts --omit-dev

FROM node:22-alpine AS release

RUN apk add chez-scheme
RUN apk add make cmake g++ python3-dev z3

RUN apk add docker-cli

RUN apk add --no-cache python3 py3-pip
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN pip install --upgrade pip

# RUN pip install z3-solver

ARG USERNAME=nonroot
ARG UID=1001
ARG GID=1001

# Create non-root user and add to docker group
RUN addgroup -S -g $GID $USERNAME && \
    addgroup -S docker && \
    adduser -S -u $UID -G $USERNAME $USERNAME && \
    addgroup $USERNAME docker

# Set working directory and permissions
WORKDIR /home/$USERNAME
RUN chown $USERNAME:$USERNAME /home/$USERNAME

RUN mkdir /home/$USERNAME/projects

# Switch to non-root user
USER $USERNAME

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

RUN npm ci --ignore-scripts --omit-dev

ENTRYPOINT ["node", "/app/dist/index.js"]