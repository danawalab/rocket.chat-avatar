#!/bin/sh
podman build -t dcr.danawa.io/metaverse/rocket-chat-avatar .
podman push dcr.danawa.io/metaverse/rocket-chat-avatar
# manual command >>  kube1 docker pull dcr.danawa.io/metaverse/rocket-chat-avatar 
