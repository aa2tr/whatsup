#!/bin/bash

set -e

cd $(dirname $0)

npm run build
rsync -a --progress build/ kc2feb@kc2feb.org:~/whatsup/root
