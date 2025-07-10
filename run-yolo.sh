#!/bin/bash

# Run the Claude Safe YOLO container
docker run --rm -it --name claude-safe \
  --cap-add NET_ADMIN --cap-add NET_RAW \
  -v "$(pwd)":/workspace \
  claude-safe-yolo \
  /bin/bash