#!/bin/bash

set -e

cd $(dirname $0)

npm run build
rsync -a --exclude build/data.json build/ kc2feb@kc2feb.org:~/whatsup/root
rsync -a update.py kc2feb@kc2feb.org:~/whatsup/update.py
