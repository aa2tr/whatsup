#!/bin/bash

set -e

cd $(dirname $0)

npm run build
rsync -a build/ kc2feb@kc2feb.org:~/whatsup/root
rsync -a update.py kc2feb@kc2feb.org:~/whatsup/update.py
