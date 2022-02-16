#!/bin/sh
#podman build -t dcr.danawa.io/metaverse/rocket-chat-avatar .
#podman push dcr.danawa.io/metaverse/rocket-chat-avatar

podman build -t ghcr.io/danawalab/rocket-chat-avatar . --no-cache
podman push ghcr.io/danawalab/rocket-chat-avatar
